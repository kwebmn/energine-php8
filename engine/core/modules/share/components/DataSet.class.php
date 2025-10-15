<?php

declare(strict_types=1);

/**
 * @file
 * DataSet.
 *
 * Abstract parent for form, list and tree; contains methods to work with toolbar and data sets.
 */

/**
 * Abstract data set.
 */
abstract class DataSet extends Component
{
    /**
     * File library.
     */
    protected ?FileRepository $fileLibrary = null;

    /**
     * Image manager.
     */
    protected ?ImageManager $imageManager = null;

    /**
     * Source.
     */
    private ?TextBlockSource $source = null;

    /**
     * Component type: list.
     */
    public const COMPONENT_TYPE_LIST = 'list';

    /**
     * Component type: form.
     */
    public const COMPONENT_TYPE_FORM = 'form';

    /**
     * Form type: insert form.
     */
    public const COMPONENT_TYPE_FORM_ADD = QAL::INSERT;

    /**
     * Form type: edit form.
     */
    public const COMPONENT_TYPE_FORM_ALTER = QAL::UPDATE;

    /**
     * Prefix for toolbar name.
     */
    public const TB_PREFIX = 'toolbar_';

    /**
     * Data description.
     */
    private ?DataDescription $dataDescription = null;

    /**
     * Data provider implementation (optional).
     */
    private ?DataProviderInterface $dataProvider = null;

    /**
     * Data.
     */
    private ?Data $data = null;

    /**
     * Extra managers active for the current build lifecycle.
     *
     * @var array<int, \Energine\Core\ExtraManager\ExtraManagerInterface>
     */
    protected array $activeExtraManagers = [];

    /**
     * Array of toolbars (name => Toolbar).
     * @var array<string, Toolbar>
     */
    private array $toolbar = [];

    /**
     * JavaScript node.
     */
    protected ?\DOMNode $js = null;

    /**
     * Component type.
     */
    private string $type = self::COMPONENT_TYPE_FORM;

    /**
     * List of pages (pager).
     */
    protected ?Pager $pager = null;

    /**
     * Default amount of records per page.
     */
    public const RECORD_PER_PAGE = 50;

    /**
     * @copydoc Component::__construct
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setType(self::COMPONENT_TYPE_FORM);

        if (!$this->getParam('recordsPerPage'))
        {
            $this->setParam('recordsPerPage', self::RECORD_PER_PAGE);
        }

        if ($this->getParam('template'))
        {
            $this->setProperty('template', $this->getParam('template') . '/');
        }

        if ($this->getParam('title'))
        {
            $this->setTitle(
                $this->translate($this->getParam('title'))
            );
        }
    }

    /**
     * @copydoc Component::defineParams
     */
    protected function defineParams(): array
    {
        $this->setProperty('state', '');
        return array_merge(
            parent::defineParams(),
            [
                'datasetAction'  => '',
                'recordsPerPage' => false,
                'title'          => false,
                'template'       => false,
            ]
        );
    }

    /**
     * Set data.
     *
     * @final
     */
    final protected function setData(Data $data): void
    {
        $this->data = $data;
    }

    /**
     * Get data.
     */
    public function getData(): ?Data
    {
        return $this->data;
    }

    /**
     * Get toolbar(s).
     *
     * @param string|false $toolbarName Toolbar name.
     * @return Toolbar|array<string,Toolbar>
     */
    protected function getToolbar(string|false $toolbarName = false): Toolbar|array
    {
        if ($toolbarName === false)
        {
            return $this->toolbar;
        }

        return $this->toolbar[$toolbarName] ?? [];
    }

    /**
     * Add toolbar.
     *
     * @param Toolbar|array<int,Toolbar> $toolbar New toolbar or list.
     *
     * @throws SystemException 'ERR_BAD_TOOLBAR'
     */
    protected function addToolbar(Toolbar|array $toolbar): void
    {
        $toolbars = is_array($toolbar) ? $toolbar : [$toolbar];

        foreach ($toolbars as $tb)
        {
            if ($tb instanceof Toolbar)
            {
                $this->toolbar[$tb->getName()] = $tb;
            }
            else
            {
                throw new SystemException('ERR_BAD_TOOLBAR', SystemException::ERR_DEVELOPER);
            }
        }
    }

    /**
     * Set data description.
     *
     * @final
     */
    final protected function setDataDescription(DataDescription $dataDescription): void
    {
        $this->dataDescription = $dataDescription;
    }

    /**
     * Returns data description.
     *
     * @final
     *
     * @throws SystemException 'ERR_DEV_NO_DATA_DESCRIPTION'
     */
    final protected function getDataDescription(): DataDescription
    {
        if (!$this->dataDescription)
        {
            throw new SystemException('ERR_DEV_NO_DATA_DESCRIPTION', SystemException::ERR_DEVELOPER, $this->getName());
        }

        return $this->dataDescription;
    }

    /**
     * @copydoc Component::prepare
     */
    protected function prepare(): void
    {
        $this->setBuilder($this->createBuilder());
        $this->setDataDescription($this->createDataDescription());
        $this->createPager();

        $data = $this->createData();
        if ($data instanceof Data)
        {
            $this->setData($data);
        }

        $toolbars = $this->createToolbar();
        if (!empty($toolbars))
        {
            $this->addToolbar($toolbars);
        }

        $this->js = $this->buildJS();
    }

    /**
     * Create builder.
     */
    protected function createBuilder(): AbstractBuilder
    {
        if (!isset($this->builder) || !$this->builder)
        {
            return new Builder($this->getTitle());
        }

        return $this->builder;
    }

    /**
     * Create data description.
     *
     * @throws SystemException 'ERR_DEV_LOAD_DATA_DESCR_IS_FUNCTION'
     */
    protected function createDataDescription(): DataDescription
    {
        $configDescription = $this->createConfigDataDescription();

        $externalDataDescription = $this->loadDataDescription();
        if (is_null($externalDataDescription))
        {
            throw new SystemException('ERR_DEV_LOAD_DATA_DESCR_IS_FUNCTION', SystemException::ERR_DEVELOPER);
        }

        if ($externalDataDescription)
        {
            $configDescription = $this->mergeExternalDataDescription(
                $configDescription,
                $externalDataDescription
            );
        }

        return $configDescription;
    }

    /**
     * Build data description from component configuration.
     */
    protected function createConfigDataDescription(): DataDescription
    {
        $configDataDescriptionObject = new DataDescription();
        if ($this->getConfig()->getCurrentStateConfig())
        {
            $configDataDescriptionObject->loadXML($this->getConfig()->getCurrentStateConfig()->fields);
        }

        return $configDataDescriptionObject;
    }

    /**
     * Merge configuration description with external one.
     *
     * @param array<int|string, array<string, mixed>> $external
     */
    protected function mergeExternalDataDescription(DataDescription $configDescription, array $external): DataDescription
    {
        $externalDataDescriptionObject = new DataDescription();
        $externalDataDescriptionObject->load($external);

        return $configDescription->intersect($externalDataDescriptionObject);
    }

    /**
     * Create toolbar.
     *
     * @return array<string,Toolbar>
     */
    protected function createToolbar(): array
    {
        $result = [];

        if ($config = $this->getConfig()->getCurrentStateConfig())
        {
            foreach ($config->toolbar as $toolbarDescription)
            {
                $toolbarName = ((string)$toolbarDescription['name'])
                    ? (string)$toolbarDescription['name']
                    : self::TB_PREFIX . $this->getName();

                $toolbar = new Toolbar($toolbarName);
                $toolbar->attachToComponent($this);
                $toolbar->loadXML($toolbarDescription);
                $toolbar->translate();
                $result[$toolbarName] = $toolbar;
            }
        }

        return $result;
    }

    /**
     * Create pager.
     */
    protected function createPager(): void
    {
        $recordsPerPage = (int)$this->getParam('recordsPerPage');

        if ($recordsPerPage > 0)
        {
            $this->pager = new Pager($recordsPerPage);

            if ($this->isActive() && $this->getType() === self::COMPONENT_TYPE_LIST)
            {
                $actionParams = $this->getStateParams(true);
                $page = isset($actionParams['pageNumber']) ? (int)$actionParams['pageNumber'] : 1;
                $page = $page > 0 ? $page : 1;

                $this->pager->setCurrentPage($page);
            }

            $this->pager->setProperty('title', $this->translate('TXT_PAGES'));
        }
    }

    /**
     * Load data.
     *
     * Return:
     *  - array   → will be loaded into Data
     *  - false   → no data (empty Data)
     *  - null    → developer error (will throw)
     */
    protected function loadData(): array|false|null
    {
        if (!$this->dataProvider instanceof DataProviderInterface)
        {
            return false;
        }

        $options = $this->createQueryOptions();
        $this->beforeLoadData($options);

        $data = $this->dataProvider->fetchData($options);
        if (!is_array($data))
        {
            return $data;
        }

        $description = $this->getDataDescription();
        if ($description instanceof DataDescription)
        {
            $data = $this->dataProvider->modifyData($data, $description);
        }

        $this->afterLoadData($data, $options);

        return $data;
    }

    /**
     * Load data description (external, not from configs).
     *
     * Return:
     *  - array   → will be merged with config description
     *  - false   → nothing to merge
     *  - null    → developer error (will throw)
     */
    protected function loadDataDescription(): array|false|null
    {
        return false;
    }

    /**
     * @copydoc IBlock::build
     *
     * @throws SystemException
     */
    public function build(): DOMDocument
    {
        if ($this->getState() === 'fileLibrary')
        {
            $result = $this->fileLibrary->build();
        }
        elseif ($this->getState() === 'imageManager')
        {
            $result = $this->imageManager->build();
        }
        elseif ($this->getState() === 'source')
        {
            $result = $this->source->build();
        }
        else
        {
            $this->beforeBuildView();

            if (!$this->getBuilder())
            {
                throw new SystemException(
                    'ERR_DEV_NO_BUILDER:' . $this->getName() . ': ' . $this->getState(),
                    SystemException::ERR_CRITICAL,
                    $this->getName()
                );
            }

            // передаем данные и описание данных построителю
            if ($this->getData() && method_exists($this->getBuilder(), 'setData'))
            {
                $this->getBuilder()->setData($this->getData());
            }

            if (method_exists($this->getBuilder(), 'setDataDescription'))
            {
                $this->getBuilder()->setDataDescription($this->getDataDescription());
            }

            // вызываем родительский метод построения
            $result = parent::build();

            if ($this->js)
            {
                $result->documentElement->appendChild($result->importNode($this->js, true));
            }

            $toolbars = $this->getToolbar();
            if (!empty($toolbars))
            {
                foreach ($toolbars as $tb)
                {
                    if ($toolbar = $tb->build())
                    {
                        $result->documentElement->appendChild(
                            $result->importNode($toolbar, true)
                        );
                    }
                }
            }

            if (
                $this->pager
                && $this->getType() === self::COMPONENT_TYPE_LIST
                && ($pagerData = $this->pager->build())
            ) {
                $pager = $result->importNode($pagerData, true);
                $result->documentElement->appendChild($pager);
            }

            // Работа с константами переводов
            if (($methodConfig = $this->getConfig()->getCurrentStateConfig()) && $methodConfig->translations)
            {
                foreach ($methodConfig->translations->translation as $translation)
                {
                    $this->addTranslation((string)$translation['const']);
                }
            }

            if (!empty($this->activeExtraManagers))
            {
                foreach ($this->activeExtraManagers as $manager)
                {
                    $manager->build($result);
                }
            }

            $this->afterBuildView($result);
        }

        return $result;
    }

    /**
     * @copydoc DBDataSet::getConfig
     */
    protected function getConfig(): ComponentConfig
    {
        if (!$this->config)
        {
            $this->config = new DataSetConfig(
                $this->getParam('config'),
                get_class($this),
                $this->module
            );
        }

        return $this->config;
    }

    /**
     * Create data.
     *
     * @throws SystemException 'ERR_DEV_LOAD_DATA_IS_FUNCTION'
     */
    protected function createData(): Data
    {
        $data = $this->loadData();

        if (is_null($data))
        {
            throw new SystemException('ERR_DEV_LOAD_DATA_IS_FUNCTION', SystemException::ERR_DEVELOPER);
        }

        $result = new Data();

        if (is_array($data))
        {
            $result->load($data);
        }

        return $result;
    }

    /**
     * Provide data provider implementation.
     */
    public function setDataProvider(?DataProviderInterface $dataProvider): void
    {
        $this->dataProvider = $dataProvider;
    }

    protected function getDataProvider(): ?DataProviderInterface
    {
        return $this->dataProvider;
    }

    /**
     * Hook executed before the data is requested from the provider.
     */
    protected function beforeLoadData(QueryOptions $options): void
    {
    }

    /**
     * Hook executed after the data has been fetched and processed.
     *
     * @param array<int, array<string, mixed>> $data
     */
    protected function afterLoadData(array &$data, QueryOptions $options): void
    {
    }

    /**
     * Hook executed before the DOM representation is created.
     */
    protected function beforeBuildView(): void
    {
    }

    /**
     * Hook executed after the DOM representation is created.
     */
    protected function afterBuildView(DOMDocument $document): void
    {
    }

    /**
     * Build default query options for the data provider.
     */
    protected function createQueryOptions(): QueryOptions
    {
        return new QueryOptions();
    }

    /**
     * Create description of JS objects.
     */
    protected function buildJS(): ?\DOMNode
    {
        $result = null;

        if (($config = $this->getConfig()->getCurrentStateConfig()) && $config->javascript)
        {
            $result = $this->doc->createElement('javascript');

            foreach ($config->javascript->library as $value)
            {
                $libraryNode = $this->doc->createElement('library');

                $path = isset($value['path']) ? (string)$value['path'] : (string)$value;
                $path = trim($path);
                if ($path !== '')
                {
                    $libraryNode->setAttribute('path', $path);
                }

                if (isset($value['loader']) && (string)$value['loader'] !== '')
                {
                    $libraryNode->setAttribute('loader', (string)$value['loader']);
                }
                if (isset($value['module']) && (string)$value['module'] !== '')
                {
                    $libraryNode->setAttribute('module', (string)$value['module']);
                }
                if (isset($value['src']) && (string)$value['src'] !== '')
                {
                    $libraryNode->setAttribute('src', (string)$value['src']);
                }

                $result->appendChild($libraryNode);
            }

            foreach ($config->javascript->behavior as $value)
            {
                $JSObjectXML = $this->doc->createElement('behavior');

                $name = isset($value['name']) ? (string)$value['name'] : '';
                $path = isset($value['path']) ? (string)$value['path'] : '';

                $JSObjectXML->setAttribute('name', $name);
                $JSObjectXML->setAttribute('path', $path !== '' ? rtrim($path, '/') . '/' : '');

                $result->appendChild($JSObjectXML);
            }

            foreach ($config->javascript->variable as $value)
            {
                $JSObjectXML = $this->doc->createElement('variable');

                $name = isset($value['name']) ? (string)$value['name'] : '';
                $type = isset($value['type']) ? (string)$value['type'] : 'string';
                $text = (string)$value; // внутренний текст узла <variable>...</variable>

                $JSObjectXML->setAttribute('name', $name);
                $JSObjectXML->setAttribute('type', $type);
                $JSObjectXML->appendChild(new \DOMText($text));

                $result->appendChild($JSObjectXML);
            }
        }

        return $result;
    }
    /**
     * Set action for form processor.
     *
     * @final
     */
    final protected function setAction(string $action, bool $isFullURI = false): void
    {
        // если у нас не полностью сформированный путь, то добавляем информацию о языке + путь к шаблону
        if (!$isFullURI)
        {
            $action = $this->request->getLangSegment()
                . $this->request->getPath(Request::PATH_TEMPLATE, true)
                . $action;

            // если в конце нет слеша - добавляем его
            if (!str_ends_with($action, '/'))
            {
                $action .= '/';
            }
        }

        $this->setParam('datasetAction', $action);
        $this->setProperty('action', $action);
    }

    /**
     * Get an address of form processor.
     *
     * @final
     */
    final protected function getDataSetAction(): string
    {
        return (string)$this->getParam('datasetAction');
    }

    /**
     * Set component type.
     *
     * @final
     */
    final protected function setType(string $type): void
    {
        $this->type = $type;

        $publicType = in_array($type, [self::COMPONENT_TYPE_FORM_ADD, self::COMPONENT_TYPE_FORM_ALTER], true)
            ? self::COMPONENT_TYPE_FORM
            : $type;

        $this->setProperty('type', $publicType);
    }

    /**
     * Get component type.
     *
     * @final
     */
    final protected function getType(): string
    {
        return $this->type;
    }

    /**
     * Set component title.
     *
     * @final
     */
    final protected function setTitle(string $title): void
    {
        $this->setProperty('title', $title);
    }

    /**
     * Get component title.
     *
     * @final
     */
    final protected function getTitle(): string
    {
        return (string)$this->getProperty('title');
    }

    /**
     * Add translation(s).
     *
     * @final
     */
    final protected function addTranslation(string ...$tags): void
    {
        foreach ($tags as $tag)
        {
            $this->document->addTranslation($tag, $this);
        }
    }

    /**
     * Download file.
     *
     * @final
     */
    final protected function downloadFile(string $data, string $MIMEType, string $fileName): void
    {
        $this->response->setHeader('Content-Type', $MIMEType);
        $this->response->setHeader('Content-Disposition', 'attachment; filename="' . $fileName . '"');
        $this->response->write($data);
        $this->response->commit();
    }

    /**
     * Clean up.
     */
    protected function cleanup(): void
    {
        $data = $_POST['data'] ?? '';
        $data = self::cleanupHTML((string)$data);
        $this->response->setHeader('Content-Type', 'text/html; charset=utf-8');
        $this->response->write($data);
        $this->response->commit();
    }

    /**
     * Add translations for WYSIWYG toolbar.
     *
     * @note It is called from children.
     *
     * @final
     */
    final protected function addWYSIWYGTranslations(): void
    {
        $translations = [
            'BTN_ITALIC',
            'BTN_HREF',
            'BTN_UL',
            'BTN_OL',
            'BTN_ALIGN_LEFT',
            'TXT_PREVIEW',
            'BTN_FILE_LIBRARY',
            'BTN_INSERT_IMAGE',
            'BTN_INSERT_IMAGE_URL',
            'BTN_VIEWSOURCE',
            'TXT_PREVIEW',
            'TXT_RESET',
            'TXT_H1',
            'TXT_H2',
            'TXT_H3',
            'TXT_H4',
            'TXT_H5',
            'TXT_H6',
            'TXT_ADDRESS',
            'TXT_ERROR_NOT_VIDEO_FILE',
            'BTN_SAVE',
            'BTN_BOLD',
            'BTN_ALIGN_CENTER',
            'BTN_ALIGN_RIGHT',
            'BTN_ALIGN_JUSTIFY',
            'BTN_EXT_FLASH',
            'BTN_ACTIVATE',
        ];

        $this->addTranslation(...$translations);
    }

    /**
     * Get file library.
     */
    protected function fileLibrary(): void
    {
        $this->request->shiftPath(1);

        $this->fileLibrary = $this->document->componentManager->createComponent(
            'filelibrary',
            'share',
            'FileRepository',
            ['config' => 'engine/core/modules/share/config/FileRepositorySelect.component.xml']
        );

        $this->fileLibrary->run();
    }

    /**
     * Run source.
     */
    protected function source(): void
    {
        $this->source = $this->document->componentManager->createComponent(
            'textblocksource',
            'share',
            'TextBlockSource',
            null
        );
        $this->source->run();
    }

    /**
     * Show image manager.
     */
    protected function imageManager(): void
    {
        $this->imageManager = $this->document->componentManager->createComponent(
            'imagemanager',
            'share',
            'ImageManager',
            null
        );
        $this->imageManager->run();
    }

    /**
     * Player for embedding in text areas.
     */
    protected function embedPlayer(): void
    {
        $sp = $this->getStateParams();
        [$uplId] = $sp;

        $fileInfo = $this->dbh->select(
            'share_uploads',
            [
                'upl_path',
                'upl_name',
            ],
            [
                'upl_id'            => (int)$uplId,
                'upl_internal_type' => FileRepoInfo::META_TYPE_VIDEO,
            ]
        );

        if (!is_array($fileInfo))
        {
            throw new SystemException('ERROR_NO_VIDEO_FILE', SystemException::ERR_404);
        }

        // Using array_values to transform associative index to key index
        [$file, $name] = array_values($fileInfo[0]);

        $dd = new DataDescription();
        foreach ([
                     'file' => FieldDescription::FIELD_TYPE_STRING,
                     'name' => FieldDescription::FIELD_TYPE_STRING,
                 ] as $fName => $fType)
        {
            $fd = new FieldDescription($fName);
            $fd->setType($fType);
            $dd->addFieldDescription($fd);
        }

        $this->setBuilder(new SimpleBuilder());
        $this->setDataDescription($dd);

        $data = new Data();
        $data->load([
            [
                'file' => $file,
                'name' => $name,
            ],
        ]);
        $this->setData($data);

        $this->js = $this->buildJS();

        E()->getController()->getTransformer()->setFileName(
            'engine/core/modules/share/transformers/embed_player.xslt',
            true
        );
    }

    /**
     * Remove malicious and redundant HTML code.
     */
    public static function cleanupHTML(string $data): string
    {
        $aggressive = BaseObject::_getConfigValue('site.aggressive_cleanup', false);

        if (!$aggressive)
        {
            return self::stripSiteBase($data);
        }

        // If tidy is available (kept as reference for potential enablement)
        /*
        if (function_exists('tidy_get_output') && $aggressive) {
            try {
                $tidy = new tidy();
                $config = [
                    'bare' => true,
                    'drop-proprietary-attributes' => true,
                    'hide-comments' => true,
                    'logical-emphasis' => true,
                    'numeric-entities' => true,
                    'show-body-only' => true,
                    'quote-nbsp' => false,
                    'indent' => 'auto',
                    'wrap' => 72,
                    'output-html' => true,
                    'word-2000' => true,
                    'drop-empty-paras' => true,
                ];
                $data = $tidy->repairString($data, $config, 'utf8');
            } catch (Exception $dummyError) {
                // ignore
            }
            unset($tidy);
        }
        */

        $config = HTMLPurifier_Config::createDefault();
        $config->set('Cache.DefinitionImpl', null);
        $config->set('Attr.EnableID', true);
        $config->set('Attr.AllowedFrameTargets', ['_blank', '_self', '_parent', '_top']);
        $config->set('Attr.AllowedRel', ['noopener', 'noreferrer', 'nofollow', 'ugc', 'sponsored']);
        $config->set('Attr.AllowedClasses', null);
        $config->set('CSS.Trusted', true);
        $config->set('CSS.AllowedProperties', null);
        $config->set('HTML.SafeIframe', true);
        $config->set('URI.SafeIframeRegexp', '#^(https?:)?//#i');
        $config->set('URI.AllowedSchemes', [
            'http' => true,
            'https' => true,
            'mailto' => true,
            'tel' => true,
            'data' => true,
        ]);

        $purifier = new HTMLPurifier($config);
        $data = $purifier->purify($data);

        $data = self::stripSiteBase($data);

        return $data;
    }

    /**
     * Remove site base from URLs to keep markup portable.
     */
    private static function stripSiteBase(string $data): string
    {
        $base = E()->getSiteManager()->getCurrentSite()->base;
        $encodedBase = str_contains($data, '%7E') ? str_replace('~', '%7E', $base) : $base;
        return str_replace($encodedBase, '', $data);
    }
}
