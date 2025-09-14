<?php
declare(strict_types=1);

/**
 * Site manager.
 *
 * Responsible for resolving the current site by request URI/host/port/root,
 * providing access to sites, and iterating over all registered sites.
 */
final class SiteManager extends DBWorker implements Iterator
{
    /**
     * @var array<int,Site> Map of site_id => Site
     */
    private array $data = [];

    /**
     * Iterator position (index into array_keys($data)).
     */
    private int $index = 0;

    /**
     * Current site id (resolved from request).
     */
    private ?int $currentSiteID = null;

    /**
     * @throws SystemException 'ERR_NO_SITE' when no sites or domains are configured
     * @throws SystemException 'ERR_403'     when the resolved site is inactive
     */
    public function __construct()
    {
        parent::__construct();

        $uri       = URI::create();
        $this->data = Site::load();

        // Pull domains either from config (dev override) or from DB
        $domains = $this->loadDomains();

        if (empty($domains)) {
            throw new SystemException('ERR_NO_SITE', SystemException::ERR_DEVELOPER);
        }

        // Prime each site with its first domain as "default" base,
        // and detect which site matches current request.
        foreach ($domains as $row) {
            // Normalize keys: domain_protocol => protocol, domain_host => host, etc.
            $domain = convertFieldNames($row, 'domain_');

            $siteId = isset($domain['site']) ? (int)$domain['site'] : null;
            if ($siteId && isset($this->data[$siteId])) {
                // Set the first encountered domain as site base (if not set yet)
                if (!isset($this->data[$siteId]->base) || $this->data[$siteId]->base === null) {
                    $this->data[$siteId]->setDomain($this->extractDomainProps($domain));
                }
            }

            // If this domain matches the current request, fix the current site
            if ($this->domainMatchesRequest($domain, $uri)) {
                $this->currentSiteID = $siteId;
                if ($siteId && isset($this->data[$siteId])) {
                    $this->data[$siteId]->setDomain($this->extractDomainProps($domain));
                }
            }
        }

        // Fall back to default site if no exact domain match
        if ($this->currentSiteID === null) {
            foreach ($this->data as $siteID => $site) {
                if ((int)$site->isDefault === 1) {
                    $this->currentSiteID = (int)$siteID;
                    break;
                }
            }
        }

        // Still nothing? No site to serve.
        if ($this->currentSiteID === null || !isset($this->data[$this->currentSiteID])) {
            throw new SystemException('ERR_NO_SITE', SystemException::ERR_DEVELOPER);
        }

        // Block inactive sites
        if (!(int)$this->data[$this->currentSiteID]->isActive) {
            throw new SystemException('ERR_403', SystemException::ERR_403);
        }
    }

    /**
     * Get Site by ID.
     *
     * @throws SystemException 'ERR_NO_SITE'
     */
    public function getSiteByID(int $siteID): Site
    {
        if (!isset($this->data[$siteID])) {
            throw new SystemException('ERR_NO_SITE', SystemException::ERR_DEVELOPER, $siteID);
        }
        return $this->data[$siteID];
    }

    /**
     * Get Site by page (sitemap) ID.
     */
    public function getSiteByPage(int $pageID): Site
    {
        $siteId = (int)$this->dbh->getScalar('share_sitemap', 'site_id', ['smap_id' => $pageID]);
        return $this->getSiteByID($siteId);
    }

    /**
     * Get current site (resolved from request).
     */
    public function getCurrentSite(): Site
    {
        // Safety: constructor already guarantees this exists
        return $this->data[(int)$this->currentSiteID];
    }

    /**
     * Get default site.
     *
     * @throws SystemException 'ERR_NO_DEFAULT_SITE'
     */
    public function getDefaultSite(): Site
    {
        foreach ($this->data as $site) {
            if ((int)$site->isDefault === 1) {
                return $site;
            }
        }
        throw new SystemException('ERR_NO_DEFAULT_SITE', SystemException::ERR_DEVELOPER);
    }

    /* =========================
       Iterator implementation
       ========================= */

    public function current(): mixed
    {
        $keys = array_keys($this->data);
        return $this->data[$keys[$this->index]];
    }

    public function key(): mixed
    {
        $keys = array_keys($this->data);
        return $keys[$this->index] ?? null;
    }

    public function next(): void
    {
        $this->index++;
    }

    public function rewind(): void
    {
        $this->index = 0;
    }

    public function valid(): bool
    {
        $keys = array_keys($this->data);
        return isset($keys[$this->index]);
    }

    /* =========================
       Internals
       ========================= */

    /**
     * Load domain mapping rows either from config (dev mode) or DB.
     *
     * @return array<int,array<string,mixed>>
     */
    private function loadDomains(): array
    {
        $debug      = (bool)$this->getConfigValue('site.debug');
        $devDomains = $this->getConfigValue('site.dev_domains');

        if ($debug && is_array($devDomains) && !empty($devDomains)) {
            // Expect same shape as DB rows (domain_* fields and domain_site mapping)
            return $devDomains;
        }

        $sql = '
            SELECT d.*, site_id AS domain_site
            FROM `share_domains` d
            LEFT JOIN share_domain2site d2c USING (domain_id)
        ';
        $res = $this->dbh->select($sql);

        return (is_array($res)) ? $res : [];
    }

    /**
     * Check whether a domain row matches the current request.
     *
     * @param array<string,mixed> $domain Normalized with convertFieldNames('domain_')
     */
    private function domainMatchesRequest(array $domain, URI $uri): bool
    {
        if (
            ($domain['protocol'] ?? null) !== $uri->getScheme() ||
            ($domain['host'] ?? null)     !== $uri->getHost()   ||
            (int)($domain['port'] ?? 80)  !== (int)$uri->getPort()
        ) {
            return false;
        }

        // Compare the beginning of request path with domain root
        $rootSegments = $this->splitPath((string)($domain['root'] ?? ''));
        $reqSegments  = $uri->getPath(false); // assumed to be array of segments

        if (!is_array($reqSegments)) {
            // be defensive if URI implementation changes
            $reqSegments = $this->splitPath((string)$uri->getPath(true));
        }

        $head = array_slice($reqSegments, 0, count($rootSegments));
        return $rootSegments === $head;
    }

    /**
     * Extract only the domain-specific properties used by Site::setDomain.
     *
     * @param array<string,mixed> $domain
     * @return array<string,mixed>
     */
    private function extractDomainProps(array $domain): array
    {
        return [
            'protocol' => $domain['protocol'] ?? 'http',
            'host'     => $domain['host']     ?? '',
            'port'     => isset($domain['port']) ? (int)$domain['port'] : 80,
            'root'     => $domain['root']     ?? '/',
        ];
    }

    /**
     * Split a URL path into clean segments.
     *
     * @return array<int,string>
     */
    private function splitPath(string $path): array
    {
        $trimmed = trim($path, '/');
        if ($trimmed === '') {
            return [];
        }
        return array_values(array_filter(explode('/', $trimmed), static fn($s) => $s !== ''));
    }
}
