<?php
/**
 * @file
 * Site.
 *
 * It contains the definition to:
 * @code
class Site;
@endcode
 *
 * @author d.pavka
 * @copyright ...
 *
 * @version 1.0.0
 */
declare(strict_types=1);

/**
 * Site.
 *
 * @code
class Site;
@endcode
 */
class Site extends DBWorker {
    /**
     * Site data.
     * @var array
     */
    private $data;

    /**
     * Site translations cache: [lang_id][site_id] => ['site_name' => ... , ...]
     * @var array
     */
    private static $siteTranslationsData;

    /**
     * Flag: does table `share_sites_properties` exist?
     * (normalized to true/false once per process)
     */
    public static ?bool $isPropertiesTableExists = null;

    /**
     * @param array $data Data.
     */
    public function __construct($data) {
        parent::__construct();
        $this->data = convertFieldNames($data, 'site_');

        // Normalize tableExists() result to bool for typed property compatibility
        if (self::$isPropertiesTableExists === null) {
            $raw = $this->dbh->tableExists('share_sites_properties');

            if (is_bool($raw)) {
                $exists = $raw;
            } elseif (is_numeric($raw)) {
                $exists = ((int)$raw) !== 0;
            } elseif (is_string($raw)) {
                $v = strtolower(trim($raw));
                // cover common truthy strings returned by various DB layers
                $exists = in_array($v, ['1', 'true', 't', 'yes', 'y'], true);
            } else {
                $exists = (bool)$raw;
            }

            self::$isPropertiesTableExists = $exists;
        }
    }

    /**
     * Load all sites and prefetch translations.
     *
     * @return Site[] [site_id => Site]
     */
    public static function load() {
        $result = array();

        // Base site rows
        $res = E()->getDB()->select('share_sites');
        foreach ($res as $siteData) {
            $result[$siteData['site_id']] = new Site($siteData);
        }

        // Translations cache
        $res = E()->getDB()->select('share_sites_translation');
        self::$siteTranslationsData = array();

        $stripKeys = function ($row) {
            unset($row['lang_id'], $row['site_id']);
            return $row;
        };

        foreach ($res as $row) {
            self::$siteTranslationsData[$row['lang_id']][$row['site_id']] = $stripKeys($row);
        }

        return $result;
    }

    /**
     * Attach domain row to the site and compute base URL.
     *
     * @param array $domainData
     */
    public function setDomain($domainData) {
        $this->data = array_merge($this->data, $domainData);

        $protocol = $this->data['protocol'] ?? 'http';
        $host     = $this->data['host'] ?? '';
        $port     = (int)($this->data['port'] ?? 80);
        $root     = $this->data['root'] ?? '/';

        // Normalize root to start with "/" and without trailing slash (except "/")
        if ($root === '' || $root[0] !== '/') {
            $root = '/' . $root;
        }

        $this->data['base'] = $protocol . '://' . $host . (($port === 80) ? '' : ':' . $port) . $root;
    }

    /**
     * Magic getter.
     *
     * @param string $propName
     * @return mixed
     */
    public function __get($propName) {
        $result = null;

        if (isset($this->data[$propName])) {
            // direct property from site row / domain row
            $result = $this->data[$propName];

        } elseif (strtolower($propName) === 'name') {
            // translated site name
            $langId = E()->getLanguage()->getCurrent();
            $siteId = $this->data['id'];
            $result = $this->data[$propName] = self::$siteTranslationsData[$langId][$siteId]['site_name'] ?? null;

        } elseif (self::$isPropertiesTableExists) {
            // extended property from share_sites_properties (site-specific overrides first)
            $res = $this->dbh->getScalar(
                'SELECT prop_value FROM share_sites_properties
                 WHERE prop_name = %s
                   AND (site_id = %s OR site_id IS NULL)
                 ORDER BY site_id DESC
                 LIMIT 1',
                $propName,
                $this->data['id']
            );

            if ($res !== false) {
                $this->data[$propName] = $res;
                $result = $res;
            }
        }

        return $result;
    }
}
