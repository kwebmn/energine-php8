<?php
declare(strict_types=1);

/**
 * Component for generation Google Sitemap, Google Sitemap Index and Google Video Sitemap.
 *
 * @note Должен использоваться в пустом layout.
 * @see http://www.sitemaps.org/protocol.php
 * @see http://www.google.com/support/webmasters/bin/answer.py?answer=80472
 */
class GoogleSitemap extends SitemapTree
{
    /**
     * Maximal amount of records with information about video in file <video sitemap>.
     */
    private int $maxVideos;

    /**
     * PDO instance.
     */
    private PDO $pdoDB;

    public const DEFAULT_MAX_VIDEOS = 40000;

    /**
     * @copydoc SitemapTree::__construct
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        E()->getResponse()->setHeader('Content-Type', 'text/xml; charset=utf-8');
        $this->pdoDB = $this->dbh->getPDO();

        $cfg = (int)$this->getConfigValue('seo.maxVideosInMap');
        $this->maxVideos = $cfg > 0 ? $cfg : self::DEFAULT_MAX_VIDEOS;
    }

    protected function defineParams(): array
    {
        return array_merge(
            parent::defineParams(),
            [
                'index.xslt' => 'core/modules/seo/transformers/google_sitemap_index.xslt',
                'map.xslt'   => 'core/modules/seo/transformers/google_sitemap.xslt',
            ]
        );
    }

    /**
     * Генерирует Google sitemap index.
     */
    protected function main(): void
    {
        E()->getController()->getTransformer()->setFileName($this->getParam('index.xslt'), true);
        parent::main();
        $this->setBuilder(new SimpleBuilder());
    }

    /**
     * Generate Google Sitemap.
     */
    protected function map(): void
    {
        $this->prepare();
        E()->getController()->getTransformer()->setFileName($this->getParam('map.xslt'), true);

        $dd = new DataDescription();
        foreach (
            [
                'Id'      => FieldDescription::FIELD_TYPE_INT,
                'Pid'     => FieldDescription::FIELD_TYPE_INT,
                'Segment' => FieldDescription::FIELD_TYPE_STRING,
                'Site'    => FieldDescription::FIELD_TYPE_STRING,
            ] as $fieldName => $fieldType
        ) {
            $fd = new FieldDescription($fieldName);
            $fd->setType($fieldType);
            if ($fieldName === 'Id') {
                $fd->setProperty('key', 1);
            }
            $dd->addFieldDescription($fd);
        }
        $this->setDataDescription($dd);

        $result = [];
        foreach (E()->getSiteManager() as $siteID => $site) {
            if ($site->isIndexed) {
                $sitemap = E()->getMap($siteID);
                $info = $sitemap->getInfo();
                if (is_array($info)) {
                    foreach ($info as $id => $row) {
                        $result[] = [
                            'Id'      => $id,
                            'Pid'     => $row['Pid'],
                            'Name'    => $row['Name'],
                            'Segment' => $sitemap->getURLByID($id),
                            'Site'    => $site->base,
                        ];
                    }
                }
            }
        }

        $this->getData()->load($result);
    }

    /**
     * Generate video sitemap.
     */
    protected function videomap(): void
    {
        $response = E()->getResponse();

        $params = $this->getStateParams();
        $mapNumber = isset($params[0]) && (int)$params[0] > 0 ? (int)$params[0] : 1;
        $limStart = ($mapNumber - 1) * $this->maxVideos;
        $limEnd   = $this->maxVideos;

        $site = E()->getSiteManager()->getCurrentSite();
        $siteId = (int)$site->id;

        // Безопасная интерполяция целых (LIMIT часто не поддерживает bindValue)
        $sql = sprintf(
            'SELECT * FROM seo_sitemap_videos WHERE site_id = %d ORDER BY videos_date DESC LIMIT %d, %d',
            $siteId,
            $limStart,
            $limEnd
        );
        $videosInfo = $this->pdoDB->query($sql);

        $response->write(
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' .
            'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">' . PHP_EOL
        );

        if ($videosInfo instanceof PDOStatement) {
            while ($video = $videosInfo->fetch(PDO::FETCH_ASSOC)) {
                $response->write(
                    "<url>\n" .
                    '<loc>' . $video['videos_loc'] . "</loc>\n" .
                    "\t<video:video>\n" .
                    "\t\t<video:thumbnail_loc>" . $video['videos_thumb'] . "</video:thumbnail_loc>\n" .
                    "\t\t<video:title>" . $video['videos_title'] . "</video:title>\n" .
                    "\t\t<video:description><![CDATA[" . $video['videos_desc'] . "]]></video:description>\n" .
                    "\t\t<video:content_loc>" . $video['videos_path'] . "</video:content_loc>\n" .
                    "\t\t<video:publication_date>" . $video['videos_date'] . "</video:publication_date>\n" .
                    "\t</video:video>\n" .
                    "</url>\n"
                );
            }
        }

        $response->write('</urlset>' . PHP_EOL);
        $response->commit();
    }

    /**
     * @copydoc SitemapTree::loadData
     */
    protected function loadData(): array
    {
        $site = E()->getSiteManager()->getCurrentSite();
        $sitePath = (string)$site->base;
        $fullPath = $this->request->getPath(1, true);

        // Индексные записи (основная карта; видеокарты при необходимости можно вернуть дополнительно)
        return [
            ['path' => $sitePath . $fullPath . 'map'],
            // Пример для видеокарт:
            // ['path' => $sitePath . $fullPath . 'videomap/1'],
        ];
    }

    /**
     * @copydoc SitemapTree::createDataDescription
     */
    protected function createDataDescription(): DataDescription
    {
        $dd = new DataDescription();
        $fd = new FieldDescription('path');
        $fd->setType(FieldDescription::FIELD_TYPE_STRING);
        $dd->addFieldDescription($fd);
        return $dd;
    }

    /**
     * @copydoc SitemapTree::createBuilder
     */
    protected function createBuilder()
    {
        $builder = new TreeBuilder();

        $sm = E()->getSiteManager();
        $defaultSiteID = $sm->getDefaultSite()->id;

        $mainSiteTree = E()->getMap($defaultSiteID)->getTree();

        foreach ($sm as $siteID => $site) {
            if ($siteID != $defaultSiteID && $site->isIndexed) {
                $tree = E()->getMap($siteID)->getTree();
                if ($tree) {
                    $mainSiteTree->add($tree->getRoot());
                }
            }
        }

        $builder->setTree($mainSiteTree);
        return $builder;
    }
}
