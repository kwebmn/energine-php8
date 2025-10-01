<?php
declare(strict_types=1);

/**
 * Saver for sites editor.
 *
 * @code
 * class SiteSaver;
 * @endcode
 */
class SiteSaver extends Saver
{
    /**
     * Modules directory segment.
     */
    private const MODULES = 'modules';

    /**
     * Save site and perform post-save routines:
     * - ensure single default site
     * - attach unlinked domains to the site
     * - write tags
     * - create (or copy) initial structure on insert
     *
     * @return mixed ID on insert, true on update (as in Saver::save)
     */
    public function save() : mixed
    {
        $mainTable = 'share_sites';

        // Ensure only one site is marked as default
        if (isset($_POST[$mainTable]['site_is_default']) && $_POST[$mainTable]['site_is_default'] !== '0') {
            $this->dbh->modify(QAL::UPDATE, $mainTable, ['site_is_default' => 0]);
        }

        $result = parent::save();

        // Resolve current site id
        $siteId = ($this->getMode() === QAL::INSERT)
            ? (int)$result
            : (int)$this->getData()->getFieldByName('site_id')->getRowData(0);

        // Attach any domains that aren’t linked yet
        $this->attachUnlinkedDomains($siteId);

        // Write tags
        // Correct constructor args: (DataDescription, Data, main table name)
        $tm = new TagManager($this->getDataDescription(), $this->getData(), $mainTable);
        $tm->save($siteId);

        // On insert, create site structure
        if ($this->getMode() === QAL::INSERT) {
            if (isset($_POST['copy_site_structure'])) {
                $this->copyStructure((int)$_POST['copy_site_structure'], $siteId);
            } else {
                $this->createMainPage($siteId);
            }
        }

        return $result;
    }

    /**
     * Attach all unlinked domains to the given site.
     */
    private function attachUnlinkedDomains(int $siteId): void
    {
        $domainIDs = simplifyDBResult(
            $this->dbh->select(
                'SELECT domain_id FROM share_domains WHERE domain_id NOT IN (SELECT domain_id FROM share_domain2site)'
            ),
            'domain_id'
        );

        if (!empty($domainIDs)) {
            foreach ($domainIDs as $domainID) {
                $this->dbh->modify(QAL::INSERT, 'share_domain2site', [
                    'site_id'   => $siteId,
                    'domain_id' => (int)$domainID,
                ]);
            }
        }
    }

    /**
     * Create a minimal main page for the site, copy translations and rights from default site.
     */
    private function createMainPage(int $siteId): void
    {
        // Determine templates
        $module   = (string)$this->getData()->getFieldByName('site_folder')->getRowData(0);
        $content  = $this->resolveTemplate($module, 'content');
        $layout   = $this->resolveTemplate($module, 'layout');

        // Create root sitemap node
        $smapId = (int)$this->dbh->modify(QAL::INSERT, 'share_sitemap', [
            'smap_content' => $content,
            'smap_layout'  => $layout,
            'site_id'      => $siteId,
            'smap_segment' => QAL::EMPTY_STRING,
        ]);

        // Insert translations (site name as page name)
        $translationTableName = 'share_sites_translation';
        if (isset($_POST[$translationTableName]) && is_array($_POST[$translationTableName])) {
            foreach ($_POST[$translationTableName] as $langID => $siteInfo) {
                $this->dbh->modify(QAL::INSERT, 'share_sitemap_translation', [
                    'lang_id' => (int)$langID,
                    'smap_id' => $smapId,
                    'smap_name' => $siteInfo['site_name'] ?? '',
                ]);
            }
        }

        // Copy access rights from default site's root
        $this->dbh->modifyRequest(
            'INSERT IGNORE INTO share_access_level (smap_id, right_id, group_id)
             SELECT %s, al.right_id, al.group_id
             FROM share_access_level al
             LEFT JOIN share_sitemap s ON s.smap_id = al.smap_id
             WHERE s.smap_pid IS NULL AND s.site_id = %s',
            $smapId,
            E()->getSiteManager()->getDefaultSite()->id
        );
    }

    /**
     * Resolve template path for content/layout with graceful fallbacks.
     *
     * Priority:
     *  1) site/modules/{module}/templates/{type}/* with attribute default="1"
     *  2) site/modules/{module}/templates/{type}/default.{type}.xml
     *  3) default.{type}.xml
     */
    private function resolveTemplate(string $module, string $type): string
    {
        // 1) Find file with default="1"
        $pattern = implode(DIRECTORY_SEPARATOR, [SITE_DIR, self::MODULES, $module, 'templates', $type, '*']);
        foreach (glob($pattern) ?: [] as $path) {
            $xml = @simplexml_load_file($path);
            if ($xml && isset($xml['default'])) {
                return $module . '/' . basename($path);
            }
        }

        // 2) Module default.{type}.xml
        $moduleDefault = implode(DIRECTORY_SEPARATOR, [
            SITE_DIR, self::MODULES, $module, 'templates', $type, "default.$type.xml"
        ]);
        if (file_exists($moduleDefault)) {
            return $module . '/' . "default.$type.xml";
        }

        // 3) Fallback to global default
        return "default.$type.xml";
    }

    /**
     * Copy full sitemap structure from one site to another, including translations, tags and rights.
     */
    private function copyStructure(int $sourceSiteID, int $destinationSiteID): void
    {
        $source = $this->dbh->select(
            'share_sitemap',
            ['smap_id', 'smap_layout', 'smap_content', 'smap_pid', 'smap_segment', 'smap_order_num', 'smap_redirect_url'],
            ['site_id' => $sourceSiteID]
        );

        if (!is_array($source) || !$source) {
            return;
        }

        $oldToNew = $this->copyRows($source, null, '', $destinationSiteID);

        foreach ($oldToNew as $oldID => $newID) {
            // Translations
            $this->dbh->modifyRequest(
                'INSERT INTO share_sitemap_translation (smap_id, lang_id, smap_name, smap_description_rtf, smap_html_title, smap_meta_keywords, smap_meta_description, smap_is_disabled)
                 SELECT %s, lang_id, smap_name, smap_description_rtf, smap_html_title, smap_meta_keywords, smap_meta_description, smap_is_disabled
                 FROM share_sitemap_translation
                 WHERE smap_id = %s',
                $newID,
                $oldID
            );

            // Tags
            $this->dbh->modifyRequest(
                'INSERT INTO share_sitemap_tags (smap_id, tag_id)
                 SELECT %s, tag_id
                 FROM share_sitemap_tags
                 WHERE smap_id = %s',
                $newID,
                $oldID
            );

            // Rights
            $this->dbh->modifyRequest(
                'INSERT INTO share_access_level (smap_id, right_id, group_id)
                 SELECT %s, al.right_id, al.group_id
                 FROM share_access_level al
                 WHERE al.smap_id = %s',
                $newID,
                $oldID
            );
        }
    }

    /**
     * Recursive copy of sitemap rows, preserving parent-child relationships.
     *
     * @param array            $source All source rows for the site.
     * @param int|string|null  $PID    Parent id to copy from (null for root).
     * @param int|string       $newPID New parent id in destination.
     * @param int              $siteID Destination site id.
     * @return array<int,int>  Map: old smap_id => new smap_id
     */
    private function copyRows(array $source, $PID, $newPID, int $siteID): array
    {
        $map = [];

        foreach ($source as $row) {
            if ($row['smap_pid'] == $PID) {
                $newRow = $row;
                $newRow['site_id']  = $siteID;
                $newRow['smap_pid'] = $newPID;

                if ($row['smap_segment'] === '') {
                    $newRow['smap_segment'] = QAL::EMPTY_STRING;
                }

                $oldId = (int)$row['smap_id'];
                unset($newRow['smap_id']);

                $newId = (int)$this->dbh->modify(QAL::INSERT, 'share_sitemap', $newRow);
                $map[$oldId] = $newId;

                // Recurse for children
                $map += $this->copyRows($source, $oldId, $newId, $siteID);
            }
        }

        return $map;
    }
}
