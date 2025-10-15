<?php

declare(strict_types=1);

/**
 * Saver for site properties. Transliterates property name for each new property.
 */
class SitePropertiesSaver extends ExtendedSaver
{
    /**
     * Normalize and transliterate prop_name before saving.
     */
    public function setData(Data $data): void
    {
        parent::setData($data);

        $fPropName = $this->getData()->getFieldByName('prop_name');
        if ($fPropName)
        {
            $rawName = (string)$fPropName->getRowData(0);

            // Transliterate to ASCII with underscores, then keep only [A-Za-z0-9_]
            $name = Translit::transliterate($rawName, '_');
            $name = preg_replace('/[^A-Za-z0-9_]/', '', $name ?? '') ?? '';

            // If name becomes empty after normalization, fall back to a safe placeholder
            if ($name === '')
            {
                $name = 'prop_' . substr(md5($rawName), 0, 6);
            }

            // Write back into the dataset (raw)
            $fPropName->setData($name, true);
        }
    }

    /**
     * Save data into the table of uploads and tags.
     *
     * On insert with a specific site_id:
     * - If no property with this name exists (neither site-specific nor default), create a default one (site_id = NULL).
     * - If both default and a site-specific property already exist (count > 1), throw ERR_PROPERTY_EXIST.
     *
     * @return mixed Inserted ID or true (depending on parent::save contract)
     * @throws SystemException
     */
    public function save(): mixed
    {
        $data = $this->getData();

        $sIdField = $data->getFieldByName('site_id');
        $propField = $data->getFieldByName('prop_name');

        $siteId   = $sIdField ? (int)$sIdField->getRowData(0) : 0;
        $propName = $propField ? (string)$propField->getRowData(0) : '';

        if ($siteId && $this->getMode() !== QAL::UPDATE)
        {
            // Count existing properties by name for this site OR default (NULL)
            $propCount = (int)$this->dbh->getScalar(
                'SELECT COUNT(prop_id)
                   FROM share_sites_properties
                  WHERE prop_name = %s
                    AND (site_id = %s OR site_id IS NULL)',
                $propName,
                $siteId
            );

            if ($propCount === 0)
            {
                // No default or site-specific record exists — create a default one (NULL site_id)
                $sIdField->setData('', true); // DB layer treats '' as NULL
            }
            elseif ($propCount > 1)
            {
                // Default + site-specific already exist — duplication would occur
                throw new SystemException('ERR_PROPERTY_EXIST');
            }
            // If $propCount === 1, default exists — we will create a site-specific override (keep $siteId)
        }

        return parent::save();
    }
}
