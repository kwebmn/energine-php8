<?php
declare(strict_types=1);

/**
 * Page document.
 *
 * final class Document;
 */
final class Document extends DBWorker implements IDocument
{
    /** Reserved URL segment for 'single'-mode */
    public const SINGLE_SEGMENT = 'single';

    /** Path to the directory with templates */
    public const TEMPLATES_DIR = 'templates/';

    /** Name of the BreadCrumbs default class */
    private string $breadCrumbsClass = 'BreadCrumbs';

    /** Document ID */
    private int $id;

    /** Document language ID */
    private int $lang;

    /** Info about system language */
    protected Language $language;

    /** Site map */
    protected Sitemap $sitemap;

    /** Request */
    private Request $request;

    /** Component manager */
    public ComponentManager $componentManager;

    /** Result document */
    private ?DOMDocument $doc = null;

    /**
     * User rights for document.
     * Rights:
     *  - ACCESS_NONE = 0
     *  - ACCESS_READ = 1
     *  - ACCESS_EDIT = 2
     *  - ACCESS_FULL = 3
     */
    private int $rights = ACCESS_NONE;

    /** Document properties */
    private array $properties = [];

    /** Current user */
    public AuthUser $user;

    /** Document information (Sitemap::getDocumentInfo()) */
    private array $documentInfo = [];

    /** Translation constants to export */
    private array $translations = [];

    /** Cached map of script identifiers to relative paths. */
    private ?array $scriptIndex = null;

    public function __construct()
    {
        parent::__construct();

        $this->user      = E()->getAUser();
        $this->language  = E()->getLanguage();
        $this->lang      = (int)$this->language->getCurrent();
        $this->sitemap   = E()->getMap();
        $this->request   = E()->getRequest();
        $this->componentManager = new ComponentManager($this);

        // Resolve document ID from URL segments (single-mode trims them)
        $segments = $this->request->getPath();
        if (isset($segments[0]) && $segments[0] === self::SINGLE_SEGMENT) {
            $segments = [];
        }

        $this->id = (int)$this->sitemap->getIDByURI($segments);
        if ($this->id === 0) {
            throw new SystemException('ERR_404', SystemException::ERR_404);
        }

        // Rights
        $this->rights = (int)$this->sitemap->getDocumentRights($this->getID(), $this->user->getGroups());
        if ($this->rights === ACCESS_NONE) {
            throw new SystemException('ERR_403', SystemException::ERR_403);
        }

        // Document info
        $this->documentInfo = (array)$this->sitemap->getDocumentInfo($this->getID());
        if (!$this->documentInfo) {
            throw new SystemException('ERR_404', SystemException::ERR_404);
        }

        // Redirect if needed
        if (!empty($this->documentInfo['RedirectUrl'])) {
            E()->getResponse()->setStatus('301');
            E()->getResponse()->setRedirect(Response::prepareRedirectURL($this->documentInfo['RedirectUrl']));
        }

        // Common properties
        $this->setProperty('keywords',     (string)($this->documentInfo['MetaKeywords'] ?? ''));
        $this->setProperty('description',  (string)($this->documentInfo['MetaDescription'] ?? ''));
        $this->setProperty('robots',       (string)($this->documentInfo['MetaRobots'] ?? ''));
        $this->setProperty('ID',           (string)$this->getID());
        $this->setProperty('default',      (string)((int)($this->sitemap->getDefault() == $this->getID())));

        // Flags: admin / user
        if (in_array('1', E()->getAUser()->getGroups(), true)) {
            $this->setProperty('is_admin', '1');
        }
        $this->setProperty('is_user', E()->getAUser()->getID() ? '1' : '0');

        // SEO snippets
        $currentSite = E()->getSiteManager()->getCurrentSite();
        if ($currentSite->isIndexed) {
            if ($verifyCode = $this->getConfigValue('google.verify')) {
                $this->setProperty('google_verify', (string)$verifyCode);
            }
            $analyticsCode = $currentSite->gaCode ?: $this->getConfigValue('google.analytics');
            if (!empty($analyticsCode)) {
                $this->setProperty('google_analytics', (string)$analyticsCode);
            }
        }

        // Resolve core Energine script location for debug resource loading.
        $energineScript = $this->resolveLibrarySource('share', 'Energine');
        if (is_string($energineScript) && $energineScript !== '') {
            $this->setProperty('energine_script', $energineScript);
            $lastSlash = strrpos($energineScript, '/');
            if ($lastSlash !== false) {
                $this->setProperty('scripts_base', substr($energineScript, 0, $lastSlash + 1));
            }
        }
    }

    /** Get document ID */
    public function getID(): int
    {
        return $this->id;
    }

    /** Get language ID */
    public function getLang(): int
    {
        return $this->lang;
    }

    /**
     * Override BreadCrumbs class name.
     * @throws SystemException
     */
    public function setBreadCrumbs(string $breadCrumbsClass): void
    {
        if (!class_exists($breadCrumbsClass)) {
            throw new SystemException('ERR_BAD_BREADCRUMBS_CLASS', SystemException::ERR_DEVELOPER, $breadCrumbsClass);
        }
        $this->breadCrumbsClass = $breadCrumbsClass;
    }

    /** Build resulting XML document */
    public function build(): void
    {
        $this->doc = new DOMDocument('1.0', 'UTF-8');
        $root = $this->doc->createElement('document');
        $root->setAttribute('debug', (string)$this->getConfigValue('site.debug'));
        $root->setAttribute('editable', $this->isEditable() ? '1' : '0');
        $this->setProperty('url', (string)$this->request->getURI());
        $this->doc->appendChild($root);

        if (!isset($this->properties['title'])) {
            $this->setProperty('title', strip_tags((string)($this->documentInfo['Name'] ?? '')));
        }

        // <properties>
        $propsNode = $this->doc->createElement('properties');
        foreach ($this->properties as $name => $value) {
            $prop = $this->doc->createElement('property');
            $prop->setAttribute('name', (string)$name);
            if ($name === 'title') {
                $prop->setAttribute('alt', (string)($this->documentInfo['HtmlTitle'] ?? ''));
            }
            $prop->appendChild($this->doc->createTextNode((string)($value ?? '')));
            $propsNode->appendChild($prop);
        }
        $root->appendChild($propsNode);

        // Extra properties with attributes
        $baseURL = E()->getSiteManager()->getCurrentSite()->base;
        $prop = $this->doc->createElement('property', $baseURL);
        $prop->setAttribute('name', 'base');
        $prop->setAttribute('static', (string)($this->getConfigValue('site.static') ?: $baseURL));
        $prop->setAttribute('media',  (string)($this->getConfigValue('site.media')  ?: $baseURL));
        $prop->setAttribute('resizer',(string)($this->getConfigValue('site.resizer') ?: (E()->getSiteManager()->getDefaultSite()->base . 'resizer/')));
        $prop->setAttribute('folder', E()->getSiteManager()->getCurrentSite()->folder);
        $prop->setAttribute('default', E()->getSiteManager()->getDefaultSite()->base);
        $propsNode->appendChild($prop);

        $prop = $this->doc->createElement('property', (string)$this->getLang());
        $prop->setAttribute('name', 'lang');
        $prop->setAttribute('abbr',     (string)$this->request->getLangSegment());
        $prop->setAttribute('default',  (string)E()->getLanguage()->getDefault());
        $prop->setAttribute('real_abbr',(string)E()->getLanguage()->getAbbrByID($this->getLang()));
        $propsNode->appendChild($prop);

        // <variables>
        if (($docVars = $this->getConfigValue('site.vars')) && is_array($docVars)) {
            $varsNode = $this->doc->createElement('variables');
            foreach ($docVars as $varName => $varValue) {
                $var = $this->doc->createElement('var', (string)$varValue);
                $var->setAttribute('name', strtoupper((string)$varName));
                $varsNode->appendChild($var);
            }
            $root->appendChild($varsNode);
        }

        // Components
        foreach ($this->componentManager as $component) {
            $componentResult = null;
            try {
                if ($component->enabled() && ($this->getRights() >= $component->getCurrentStateRights())) {
                    $componentResult = $component->build();
                }
            } catch (DummyException $e) {
                // swallow
            }

            if ($componentResult instanceof DOMDocument && $componentResult->documentElement) {
                try {
                    $import = $this->doc->importNode($componentResult->documentElement, true);
                    $root->appendChild($import);
                } catch (Exception $e) {
                    // ignore invalid fragment
                }
            }
        }

        // <translations>
        if (!empty($this->translations)) {
            $tNode = $this->doc->createElement('translations');
            $root->appendChild($tNode);
            $json = [];
            foreach ($this->translations as $const => $componentName) {
                $val = $this->translate((string)$const);
                $tr = $this->doc->createElement('translation', $val);
                $tr->setAttribute('const', (string)$const);
                if ($componentName !== null) {
                    $tr->setAttribute('component', (string)$componentName);
                }
                $tNode->appendChild($tr);
                $json[(string)$const] = $val;
            }
            $tNode->setAttribute('json', json_encode($json, JSON_UNESCAPED_UNICODE));
        }

        // Javascript dependencies
        $includes = $this->collectJavascriptIncludes();
        if (!empty($includes)) {
            $jsNode = $this->doc->createElement('javascript');
            foreach ($includes as $entry) {
                $path = $entry['path'];
                $loader = $entry['loader'];
                $lib = $this->doc->createElement('library');
                $lib->setAttribute('path', (string)$path);
                if ($loader) {
                    $lib->setAttribute('loader', (string)$loader);
                }
                if (!empty($entry['module'])) {
                    $lib->setAttribute('module', (string)$entry['module']);
                }
                if (!empty($entry['src'])) {
                    $lib->setAttribute('src', (string)$entry['src']);
                }
                $jsNode->appendChild($lib);
            }
            $root->appendChild($jsNode);
        }
    }

    protected function isGlobalLibrary(string $path): bool
    {
        $classicPrefixes = [
            'ckeditor/',
            'jstree/',
            'codemirror/',
            'fancytree/',
        ];
        foreach ($classicPrefixes as $prefix) {
            if (strpos($path, $prefix) === 0) {
                return true;
            }
        }

        $classicNames = [
            'jquery',
            'jquery.min',
            'bootstrap.bundle',
            'bootstrap.bundle.min',
        ];
        foreach ($classicNames as $name) {
            if ($path === $name || strpos($path, $name . '.') === 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * Build a list of JavaScript libraries declared in component configuration.
     *
     * @return array<int,array{path:string,loader:string|null}>
     */
    protected function collectJavascriptIncludes(): array
    {
        $xpath = new DOMXPath($this->doc);
        $classicIncludes = [];
        $moduleIncludes  = [];
        $seenClassic     = [];
        $seenModule      = [];
        $libraries       = $xpath->query('//component/javascript/library');

        $registerInclude = static function (
            array &$bucket,
            array &$seen,
            string $path,
            string $loader,
            string $module,
            ?string $resolved
        ): void {
            if (isset($seen[$path])) {
                $idx = $seen[$path];
                if ($resolved !== null && $bucket[$idx]['src'] === null) {
                    $bucket[$idx]['src'] = $resolved;
                }
                if ($module !== '' && $bucket[$idx]['module'] === '') {
                    $bucket[$idx]['module'] = $module;
                }
                return;
            }
            $bucket[] = [
                'path'   => $path,
                'loader' => $loader,
                'module' => $module,
                'src'    => $resolved,
            ];
            $seen[$path] = array_key_last($bucket);
        };

        if ($libraries && $libraries->length) {
            /** @var DOMElement $library */
            foreach ($libraries as $library) {
                $path = trim((string)$library->getAttribute('path'));
                if (!$path) {
                    $path = trim((string)$library->textContent);
                }
                if ($path === '') {
                    continue;
                }

                $normalizedPath = $this->normalizeLibraryPath($path);
                if ($normalizedPath === '') {
                    continue;
                }

                $loaderAttr = strtolower((string)$library->getAttribute('loader'));
                $loader = $loaderAttr !== '' ? $loaderAttr : ($this->isGlobalLibrary($normalizedPath) ? 'classic' : 'module');
                $moduleName = $this->detectElementModule($library);
                $resolvedSrc = $this->resolveLibrarySource($moduleName, $normalizedPath);

                if ($loader === 'classic') {
                    $registerInclude($classicIncludes, $seenClassic, $normalizedPath, 'classic', $moduleName, $resolvedSrc);
                } else {
                    if (isset($seenClassic[$normalizedPath])) {
                        continue;
                    }
                    $registerInclude($moduleIncludes, $seenModule, $normalizedPath, $loader, $moduleName, $resolvedSrc);
                }
            }
        }

        $behaviors = $xpath->query('//component/javascript/behavior');
        if ($behaviors && $behaviors->length) {
            /** @var DOMElement $behavior */
            foreach ($behaviors as $behavior) {
                $name = trim((string)$behavior->getAttribute('name'));
                if ($name === '') {
                    continue;
                }

                $path = trim((string)$behavior->getAttribute('path'));
                if ($path !== '' && substr($path, -1) !== '/') {
                    $path .= '/';
                }

                $fullPath = $this->normalizeLibraryPath($path . $name);
                if ($fullPath === '') {
                    continue;
                }

                $loader = $this->isGlobalLibrary($fullPath) ? 'classic' : 'module';
                $moduleName = $this->detectElementModule($behavior);
                $resolvedSrc = $this->resolveLibrarySource($moduleName, $fullPath);

                if ($loader === 'classic') {
                    $registerInclude($classicIncludes, $seenClassic, $fullPath, 'classic', $moduleName, $resolvedSrc);
                } else {
                    if (isset($seenClassic[$fullPath])) {
                        continue;
                    }
                    $registerInclude($moduleIncludes, $seenModule, $fullPath, 'module', $moduleName, $resolvedSrc);
                }
            }
        }

        return array_merge($classicIncludes, $moduleIncludes);
    }

    protected function normalizeLibraryPath(string $path): string
    {
        $path = trim($path);
        if ($path === '') {
            return '';
        }

        if (preg_match('#^(?:[a-z]+:)?//#i', $path)) {
            return $path;
        }

        $path = preg_replace('/\.(?:m|c)?js$/i', '', $path);
        if (!is_string($path)) {
            return '';
        }

        return $this->sanitizeLibraryKey($path);
    }

    protected function detectElementModule(DOMElement $element): string
    {
        $current = $element;
        while ($current !== null) {
            $parent = $current->parentNode;
            if (!$parent instanceof DOMElement) {
                break;
            }
            if ($parent->tagName === 'component') {
                $module = trim((string)$parent->getAttribute('module'));
                return $module !== '' ? $module : '';
            }
            $current = $parent;
        }

        return '';
    }

    protected function resolveLibrarySource(?string $module, string $path): ?string
    {
        $path = trim($path);
        if ($path === '') {
            return null;
        }

        if (preg_match('#^(?:[a-z]+:)?//#i', $path)) {
            return $path;
        }

        $normalized = $this->sanitizeLibraryKey($path);
        if ($normalized === '') {
            return null;
        }

        $index = $this->getScriptIndex();
        if ($module !== null && $module !== '') {
            $moduleKey = $module . '/' . $normalized;
            if (isset($index[$moduleKey])) {
                return $index[$moduleKey];
            }
        }

        return $index[$normalized] ?? null;
    }

    private function getScriptIndex(): array
    {
        if ($this->scriptIndex !== null) {
            return $this->scriptIndex;
        }

        $this->scriptIndex = $this->buildScriptIndex();
        return $this->scriptIndex;
    }

    private function buildScriptIndex(): array
    {
        $index = [];

        $documentRoot = defined('HTDOCS_DIR')
            ? (string)HTDOCS_DIR
            : (string)($_SERVER['DOCUMENT_ROOT'] ?? '');
        if ($documentRoot === '') {
            $documentRoot = getcwd() ?: '';
        }
        $documentRoot = rtrim(str_replace('\\', '/', $documentRoot), '/');

        $scriptDirs = [];

        $engineModules = $documentRoot . '/engine/core/modules';
        if (is_dir($engineModules)) {
            foreach (glob($engineModules . '/*/scripts', GLOB_ONLYDIR) ?: [] as $dir) {
                $moduleName = basename(dirname($dir));
                $scriptDirs[] = [
                    'dir'    => $dir,
                    'prefix' => 'engine/core/modules/' . $moduleName . '/scripts',
                    'module' => $moduleName,
                ];
            }
        }

        $coreBaseDir = (defined('CORE_DIR') ? (string)CORE_DIR : '') . '/modules';
        $coreRelBase = trim((string)(defined('CORE_REL_DIR') ? CORE_REL_DIR : 'core'), '/');
        if ($coreRelBase !== '' && is_dir($coreBaseDir)) {
            foreach (glob($coreBaseDir . '/*/scripts', GLOB_ONLYDIR) ?: [] as $dir) {
                $moduleName = basename(dirname($dir));
                $scriptDirs[] = [
                    'dir'    => $dir,
                    'prefix' => $coreRelBase . '/modules/' . $moduleName . '/scripts',
                    'module' => $moduleName,
                ];
            }
        }

        $siteBaseDir = (defined('SITE_DIR') ? (string)SITE_DIR : '') . '/modules';
        $siteRelBase = trim((string)(defined('SITE_REL_DIR') ? SITE_REL_DIR : 'site'), '/');
        if ($siteRelBase !== '' && is_dir($siteBaseDir)) {
            foreach (glob($siteBaseDir . '/*/scripts', GLOB_ONLYDIR) ?: [] as $dir) {
                $moduleName = basename(dirname($dir));
                $scriptDirs[] = [
                    'dir'    => $dir,
                    'prefix' => $siteRelBase . '/modules/' . $moduleName . '/scripts',
                    'module' => $moduleName,
                ];
            }
        }

        $rootScripts = $documentRoot . '/scripts';
        if (is_dir($rootScripts)) {
            $scriptDirs[] = [
                'dir'    => $rootScripts,
                'prefix' => 'scripts',
                'module' => '',
            ];
        }

        foreach ($scriptDirs as $entry) {
            $dir    = $entry['dir'];
            $prefix = $entry['prefix'];
            $module = $entry['module'];

            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS)
            );
            /** @var \SplFileInfo $fileInfo */
            foreach ($iterator as $fileInfo) {
                if (!$fileInfo->isFile()) {
                    continue;
                }
                $ext = strtolower($fileInfo->getExtension());
                if (!in_array($ext, ['js', 'mjs', 'cjs'], true)) {
                    continue;
                }

                $relativeInside = substr($fileInfo->getPathname(), strlen($dir) + 1);
                if ($relativeInside === false) {
                    continue;
                }
                $relativeInside = str_replace('\\', '/', $relativeInside);

                $key = $this->sanitizeLibraryKey(substr($relativeInside, 0, - (strlen($ext) + 1)));
                if ($key === '') {
                    continue;
                }

                $relativePath = $prefix . '/' . $relativeInside;
                $relativePath = preg_replace('#/+#', '/', $relativePath);
                if (!is_string($relativePath)) {
                    continue;
                }
                $relativePath = ltrim($relativePath, '/');

                if (!isset($index[$key])) {
                    $index[$key] = $relativePath;
                }

                if ($module !== '' && !isset($index[$module . '/' . $key])) {
                    $index[$module . '/' . $key] = $relativePath;
                }
            }
        }

        return $index;
    }

    private function sanitizeLibraryKey(string $path): string
    {
        $path = str_replace('\\', '/', $path);
        $path = preg_replace('#/+#', '/', $path);
        if (!is_string($path)) {
            return '';
        }
        $path = trim($path, '/');

        if ($path === '' || str_contains($path, '..')) {
            return '';
        }

        return $path;
    }

    /**
     * Define and load page components into the ComponentManager.
     * (legacy flow preserved)
     */
    public function loadComponents(): void
    {
        $templateData = self::getTemplatesData($this->getID());
        $contentXML   = $templateData->content;
        $layoutXML    = $templateData->layout;
        $contentFile  = $templateData->contentFile;
        $layoutFile   = $templateData->layoutFile;

        // single-mode?
        $actionParams = $this->request->getPath(Request::PATH_ACTION);
        if (count($actionParams) > 1 && $actionParams[0] === self::SINGLE_SEGMENT) {
            // shift path: existing segments + reserved segment + component name
            $this->request->setPathOffset($this->request->getPathOffset() + 2);
            $this->setProperty('single', 'single');

            if ($actionParams[1] === 'pageToolBar') {
                $this->componentManager->add(
                    $this->componentManager->createComponent(
                        'pageToolBar',
                        'share',
                        'DivisionEditor',
                        ['state' => 'showPageToolbar']
                    )
                );
            } else {
                $blockDescription =
                    ComponentManager::findBlockByName($layoutXML,  $actionParams[1]) ?:
                        ComponentManager::findBlockByName($contentXML, $actionParams[1]);

                if (!$blockDescription) {
                    throw new SystemException('ERR_NO_SINGLE_COMPONENT', SystemException::ERR_CRITICAL, $actionParams[1]);
                }

                if (E()->getController()->getViewMode() === DocumentController::TRANSFORM_STRUCTURE_XML) {
                    $int = new IRQ();
                    $int->addBlock($blockDescription);
                    throw $int;
                }

                $this->componentManager->add(
                    ComponentManager::createBlockFromDescription($blockDescription)
                );
            }
            return;
        }

        // structure XML preview?
        if (E()->getController()->getViewMode() === DocumentController::TRANSFORM_STRUCTURE_XML) {
            $int = new IRQ();
            $int->addBlock($layoutXML);
            $int->addBlock($contentXML);
            throw $int;
        }

        foreach ([$layoutXML, $contentXML] as $XML) {
            $this->componentManager->add(
                ComponentManager::createBlockFromDescription(
                    $XML,
                    ['file' => ($XML === $contentXML) ? $contentFile : $layoutFile]
                )
            );
        }

        // default components
        $this->componentManager->add(
            $this->componentManager->createComponent('breadCrumbs', 'share', $this->breadCrumbsClass)
        );

        // Cross-domain auth iframe for non-auth users when domains differ
        if (
            !$this->user->isAuthenticated() &&
            (strpos(E()->getSiteManager()->getCurrentSite()->host, (string)$this->getConfigValue('site.domain')) === false)
        ) {
            $this->componentManager->add(
                $this->componentManager->createComponent('cdAuth', 'share', 'CrossDomainAuth')
            );
        }

        $this->componentManager->add(
            $this->componentManager->createComponent('jsdata', 'default', 'JSData')
        );
    }

    /** Run all components */
    public function runComponents(): void
    {
        foreach ($this->componentManager as $block) {
            if ($block->enabled() && ($this->getRights() >= $block->getCurrentStateRights())) {
                $block->run();
            }
        }
    }

    public function getResult(): DOMDocument
    {
        // ensure build() was called
        if (!$this->doc instanceof DOMDocument) {
            $this->build();
        }
        return $this->doc;
    }

    /** Get current user */
    public function getUser(): AuthUser
    {
        return $this->user;
    }

    /** Get user rights */
    public function getRights(): int
    {
        return $this->rights;
    }

    /** Set document property */
    public function setProperty(string $propName, string $propValue): void
    {
        $this->properties[$propName] = $propValue;
    }

    /** Get document property */
    public function getProperty(string $propName): string|false
    {
        return $this->properties[$propName] ?? false;
    }

    /** Remove property */
    public function removeProperty(string $propName): void
    {
        unset($this->properties[$propName]);
    }

    /** Add translation constant */
    public function addTranslation(string $const, Component $component = null): void
    {
        $this->translations[$const] = $component ? $component->getName() : null;
    }

    /** Check if the page is editable */
    public function isEditable(): bool
    {
        if ($this->getRights() > ACCESS_EDIT) {
            return $this->getConfigValue('site.debug') ? isset($_REQUEST['editMode']) : isset($_POST['editMode']);
        }
        return false;
    }

    /**
     * Get the information about document XML-code.
     * If the 'xml' value is missed or incorrect then it will try to load XML from the file.
     *
     * @throws SystemException 'ERR_WRONG_[type]'
     * @throws SystemException 'ERR_BAD_DOC_ID'
     */
    public static function getTemplatesData(int $documentID): object
    {
        $loadDataFromFile = static function (string $fileName, string $type) {
            $file = self::TEMPLATES_DIR . constant('DivisionEditor::TMPL_' . strtoupper($type)) . '/' . $fileName;
            if (!is_file($file)) {
                $raw = '';
            } else {
                $raw = stripslashes(trim((string)file_get_contents($file)));
            }
            $xml = @simplexml_load_string($raw);
            if (!$xml) {
                throw new SystemException('ERR_WRONG_' . strtoupper($type));
            }
            return $xml;
        };

        $rowset = E()->getDB()->select(
            'share_sitemap',
            ['smap_content_xml as content', 'smap_layout_xml as layout', 'smap_content as content_file', 'smap_layout as layout_file'],
            ['smap_id' => $documentID]
        );
        if (!$rowset) {
            throw new SystemException('ERR_BAD_DOC_ID');
        }
        [$templateData] = $rowset;

        libxml_use_internal_errors(true);
        foreach ([DivisionEditor::TMPL_LAYOUT, DivisionEditor::TMPL_CONTENT] as $type) {
            if (empty($templateData[$type])) {
                $templateData[$type] = $loadDataFromFile($templateData[$type . '_file'], $type);
            } else {
                $xml = @simplexml_load_string(stripslashes((string)$templateData[$type]));
                if (!$xml) {
                    $templateData[$type] = $loadDataFromFile($templateData[$type . '_file'], $type);
                    // clear invalid xml in DB
                    E()->getDB()->modify(
                        QAL::UPDATE,
                        'share_sitemap',
                        ['smap_' . $type . '_xml' => ''],
                        ['smap_id' => $documentID]
                    );
                } else {
                    $templateData[$type] = $xml;
                }
            }
            $templateData[$type . 'File'] = $templateData[$type . '_file'];
            unset($templateData[$type . '_file']);
        }
        libxml_use_internal_errors(false);

        return (object)$templateData;
    }

    public function getXMLDocument(): ?DOMDocument
    {
        return $this->doc;

    }
}
