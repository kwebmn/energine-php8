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

    /** Cached class-to-script index */
    private static ?array $scriptIndex = null;

    /** Cached fingerprint for the current index */
    private static ?string $scriptIndexHash = null;

    /** Cached manifest describing production bundles */
    private static ?array $bundleManifest = null;

    /** Manifest file path currently loaded */
    private static ?string $bundleManifestFile = null;

    /** Manifest file modification time */
    private static ?int $bundleManifestMTime = null;

    /** Track which bundle warnings have been issued */
    private static array $bundleWarnings = [];

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

        if (!$this->getConfigValue('site.debug')) {
            $this->exposeProductionBundles();
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

        $this->appendJavascriptIncludes($root);
    }

    /**
     * Collect `data-energine-js` declarations and append the required scripts for debug mode.
     */
    private function appendJavascriptIncludes(DOMElement $root): void
    {
        if (!$this->getConfigValue('site.debug')) {
            return;
        }

        $requirements = $this->collectComponentRequirements();

        $vendorScripts = $this->determineVendorScripts($requirements['classes'], $requirements['flags']);
        $componentScripts = $this->resolveComponentScripts($requirements['classes'], $requirements['overrides']);
        $coreScripts = $this->getCoreScriptEntries();
        $scripts = $this->combineScriptLists($vendorScripts, $componentScripts, $coreScripts);

        // The loader must run after every module has been evaluated so it can locate constructors.
        $loaderPath = 'engine/core/modules/share/scripts/loader.js';
        $alreadyIncludesLoader = array_reduce(
            $scripts,
            static function (bool $carry, array $entry) use ($loaderPath): bool {
                return $carry || ($entry['src'] ?? '') === $loaderPath;
            },
            false
        );

        if (!$alreadyIncludesLoader) {
            $scripts[] = [
                'src'  => $loaderPath,
                'type' => 'classic',
            ];
        }

        if (!$scripts) {
            return;
        }

        $jsNode = $this->doc->createElement('javascript');
        foreach ($scripts as $entry) {
            $lib = $this->doc->createElement('library');
            $lib->setAttribute('src', $entry['src']);
            if (!empty($entry['type']) && $entry['type'] === 'module') {
                $lib->setAttribute('type', 'module');
            }
            $jsNode->appendChild($lib);
        }
        $root->appendChild($jsNode);
    }

    /**
     * Gather component class declarations, optional overrides, and feature flags.
     *
     * @return array{classes: string[], overrides: array<string,string>, flags: array<string, bool>}
     */
    private function collectComponentRequirements(): array
    {
        $result = [
            'classes'   => [],
            'overrides' => [],
            'flags'     => [],
        ];

        if (!$this->doc instanceof DOMDocument) {
            return $result;
        }

        $xpath = new DOMXPath($this->doc);
        $nodes = $xpath->query('//*[@data-energine-js]');
        if (!$nodes) {
            return $result;
        }

        $seen = [];
        /** @var DOMElement $node */
        foreach ($nodes as $node) {
            $classAttr = trim($node->getAttribute('data-energine-js'));
            if ($classAttr === '') {
                continue;
            }

            $moduleOverride = trim((string)$node->getAttribute('data-energine-module'));
            $classes = preg_split('/\s+/', $classAttr, -1, PREG_SPLIT_NO_EMPTY) ?: [];
            foreach ($classes as $className) {
                if (!isset($seen[$className])) {
                    $result['classes'][] = $className;
                    $seen[$className] = true;
                }
                if ($moduleOverride !== '') {
                    $result['overrides'][$className] = $moduleOverride;
                }
            }

            if ($node->hasAttribute('data-energine-param-codemirror')) {
                $value = strtolower(trim((string)$node->getAttribute('data-energine-param-codemirror')));
                if ($value === '1' || $value === 'true' || $value === 'yes') {
                    $result['flags']['codemirror'] = true;
                }
            }
        }

        return $result;
    }

    /**
     * Determine admin-only vendor scripts (jQuery, jsTree, CKEditor, CodeMirror).
     *
     * @param string[] $classes
     * @param array<string,bool> $flags
     *
     * @return string[]
     */
    private function determineVendorScripts(array $classes, array $flags): array
    {
        $scripts = [];
        $added = [];
        $classLookup = array_fill_keys($classes, true);

        if ($this->isAdminContext()) {
            $needsJsTree = (bool)array_intersect(array_keys($classLookup), ['DivManager', 'DivTree', 'DivSidebar', 'FiltersTreeEditor']);
            if ($needsJsTree) {
                $this->appendScript($scripts, $added, 'engine/core/modules/share/scripts/jquery.min.js');
                $this->appendScript($scripts, $added, 'engine/core/modules/share/scripts/jstree/jstree.js');
            }

            if (isset($classLookup['PageEditor'])) {
                $this->appendScript($scripts, $added, 'engine/core/modules/share/scripts/ckeditor/ckeditor.js');
            }

            if (!empty($flags['codemirror'])) {
                $this->appendScript($scripts, $added, 'engine/core/modules/share/scripts/codemirror/lib/codemirror.js');
                $this->appendScript($scripts, $added, 'engine/core/modules/share/scripts/codemirror/mode/xml/xml.js');
                $this->appendScript($scripts, $added, 'engine/core/modules/share/scripts/codemirror/mode/javascript/javascript.js');
                $this->appendScript($scripts, $added, 'engine/core/modules/share/scripts/codemirror/mode/css/css.js');
                $this->appendScript($scripts, $added, 'engine/core/modules/share/scripts/codemirror/mode/htmlmixed/htmlmixed.js');
            }
        }

        if (isset($classLookup['VKI'])) {
            $this->appendScript($scripts, $added, '//vk.com/js/api/openapi.js?95');
        }

        return $scripts;
    }

    /**
     * Resolve component classes to script paths using the filesystem index.
     *
     * @param string[]               $classes
     * @param array<string,string>   $overrides
     *
     * @return string[]
     */
    private function resolveComponentScripts(array $classes, array $overrides): array
    {
        if (!$classes) {
            return [];
        }

        $index = $this->getScriptIndex();
        $scripts = [];
        $added = [];
        $missing = [];

        foreach ($classes as $className) {
            if (isset($overrides[$className])) {
                $src = trim($overrides[$className]);
                if ($src !== '' && !isset($added[$src])) {
                    $scripts[] = $src;
                    $added[$src] = true;
                }
                continue;
            }

            if (isset($index[$className])) {
                $src = $index[$className];
                if (!isset($added[$src])) {
                    $scripts[] = $src;
                    $added[$src] = true;
                }
            } else {
                $missing[] = $className;
            }
        }

        if ($missing) {
            trigger_error(
                sprintf('Energine loader: unable to resolve JS class(es): %s', implode(', ', $missing)),
                E_USER_WARNING
            );
        }

        return $scripts;
    }

    /**
     * Merge vendor and component scripts into a single ordered list.
     *
     * @param string[] $vendor
     * @param string[] $component
     *
     * @return string[]
     */
    private function combineScriptLists(array $vendor, array $component, array $core = []): array
    {
        $result = [];
        $index = [];

        foreach ($core as $entry) {
            if (empty($entry['src'])) {
                continue;
            }
            $result[] = [
                'src'  => $entry['src'],
                'type' => $entry['type'] ?? 'classic',
            ];
            $index[$entry['src']] = count($result) - 1;
        }

        foreach ($vendor as $src) {
            if (!isset($index[$src])) {
                $result[] = ['src' => $src, 'type' => 'classic'];
                $index[$src] = count($result) - 1;
            }
        }

        foreach ($component as $src) {
            if (isset($index[$src])) {
                $result[$index[$src]]['type'] = 'module';
                continue;
            }
            $result[] = ['src' => $src, 'type' => 'module'];
            $index[$src] = count($result) - 1;
        }

        return $result;
    }

    /**
     * Core scripts required on every debug page before component modules.
     *
     * @return array<int,array{src:string,type:string}>
     */
    private function getCoreScriptEntries(): array
    {
        return [
            [
                'src'  => 'engine/core/modules/share/scripts/Energine.js',
                'type' => 'module',
            ],
        ];
    }

    /**
     * Append a script path to the list while preventing duplicates.
     */
    private function appendScript(array &$list, array &$seen, string $src): void
    {
        if (!isset($seen[$src])) {
            $list[] = $src;
            $seen[$src] = true;
        }
    }

    /**
     * Ensure production bundle paths are exposed to the XSLT layer.
     */
    private function exposeProductionBundles(): void
    {
        $siteBundle = $this->getProductionBundlePath('site');
        if (is_string($siteBundle) && $siteBundle !== '') {
            $this->setProperty('site_bundle', $siteBundle);
        }

        if ($this->isAdminContext()) {
            $adminBundle = $this->getProductionBundlePath('admin');
            if (is_string($adminBundle) && $adminBundle !== '') {
                $this->setProperty('admin_bundle', $adminBundle);
            }
        }
    }

    /**
     * Resolve a bundled entry file from the Vite manifest.
     */
    private function getProductionBundlePath(string $entry): ?string
    {
        $manifest = $this->loadBundleManifest();
        if (!$manifest) {
            $this->maybeWarnMissingBundle('manifest');
            return null;
        }

        $candidates = [
            $entry,
            $entry . '.js',
            $entry . '.entry.js',
            'engine/core/modules/share/scripts/' . $entry . '.entry.js',
        ];

        foreach ($candidates as $candidate) {
            if (!isset($manifest[$candidate]) || !is_array($manifest[$candidate])) {
                continue;
            }

            $file = $manifest[$candidate]['file'] ?? null;
            if (!is_string($file) || $file === '') {
                continue;
            }

            $file = ltrim($file, '/');
            if (!str_starts_with($file, 'assets/')) {
                $file = 'assets/' . $file;
            }

            return $file;
        }

        $this->maybeWarnMissingBundle($entry);

        return null;
    }

    /**
     * Load and cache the Vite manifest describing production bundles.
     *
     * @return array<string, array<string, mixed>>
     */
    private function loadBundleManifest(): array
    {
        $manifestFile = $this->findBundleManifestFile();
        if ($manifestFile === null) {
            self::$bundleManifest = [];
            self::$bundleManifestFile = null;
            self::$bundleManifestMTime = null;
            return [];
        }

        $mtime = (int)@filemtime($manifestFile);

        if (
            self::$bundleManifest !== null &&
            self::$bundleManifestFile === $manifestFile &&
            self::$bundleManifestMTime === $mtime
        ) {
            return self::$bundleManifest;
        }

        $contents = @file_get_contents($manifestFile);
        if ($contents === false) {
            self::$bundleManifest = [];
        } else {
            $decoded = json_decode($contents, true);
            self::$bundleManifest = is_array($decoded) ? $decoded : [];
        }

        self::$bundleManifestFile = $manifestFile;
        self::$bundleManifestMTime = $mtime;

        return self::$bundleManifest ?? [];
    }

    /**
     * Locate the manifest file emitted by the Vite build.
     */
    private function findBundleManifestFile(): ?string
    {
        $candidates = [
            HTDOCS_DIR . '/assets/manifest.json',
            HTDOCS_DIR . '/assets/.vite/manifest.json',
        ];

        foreach ($candidates as $candidate) {
            if (is_file($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * Emit a warning when a bundle or manifest cannot be located.
     */
    private function maybeWarnMissingBundle(string $entry): void
    {
        if (!isset(self::$bundleWarnings[$entry])) {
            self::$bundleWarnings[$entry] = true;
            trigger_error(
                sprintf('Energine: unable to locate production bundle manifest entry "%s"', $entry),
                E_USER_WARNING
            );
        }
    }

    /**
     * Build or fetch the cached class-to-script index.
     *
     * @return array<string,string>
     */
    private function getScriptIndex(): array
    {
        if (self::$scriptIndex !== null && self::$scriptIndexHash !== null) {
            return self::$scriptIndex;
        }

        $directories = $this->discoverScriptDirectories();
        $fingerprint = $this->computeScriptsFingerprint($directories);

        if (self::$scriptIndex !== null && self::$scriptIndexHash === $fingerprint) {
            return self::$scriptIndex;
        }

        $cache = $this->loadScriptIndexFromCache();
        if ($cache && $cache['hash'] === $fingerprint) {
            self::$scriptIndex = $cache['index'];
            self::$scriptIndexHash = $cache['hash'];
            return self::$scriptIndex;
        }

        $index = $this->buildScriptIndex($directories);
        self::$scriptIndex = $index;
        self::$scriptIndexHash = $fingerprint;
        $this->storeScriptIndexToCache($index, $fingerprint);

        return $index;
    }

    /**
     * Discover all `scripts` directories across modules.
     *
     * @return string[] absolute paths
     */
    private function discoverScriptDirectories(): array
    {
        $roots = [
            HTDOCS_DIR . '/scripts',
            CORE_DIR . '/modules',
            SITE_DIR . '/modules',
            HTDOCS_DIR . '/app/modules',
        ];

        $directories = [];
        $seen = [];

        foreach ($roots as $root) {
            if (!is_dir($root)) {
                continue;
            }

            if (basename($root) === 'scripts') {
                $normalized = $this->normalizePath($root);
                if (!isset($seen[$normalized])) {
                    $directories[] = $root;
                    $seen[$normalized] = true;
                }
                continue;
            }

            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );

            /** @var SplFileInfo $fileInfo */
            foreach ($iterator as $fileInfo) {
                if ($fileInfo->isDir() && $fileInfo->getFilename() === 'scripts') {
                    $path = $fileInfo->getPathname();
                    $normalized = $this->normalizePath($path);
                    if (!isset($seen[$normalized])) {
                        $directories[] = $path;
                        $seen[$normalized] = true;
                    }
                }
            }
        }

        return $directories;
    }

    /**
     * Compute a fingerprint based on the modification times of `scripts` directories.
     *
     * @param string[] $directories
     */
    private function computeScriptsFingerprint(array $directories): string
    {
        $parts = [];
        foreach ($directories as $directory) {
            $mtime = @filemtime($directory);
            $parts[] = $this->normalizePath($directory) . ':' . (string)($mtime ?: 0);
        }
        sort($parts);

        return hash('sha256', implode('|', $parts));
    }

    /**
     * Build the index of class names to relative script paths.
     *
     * @param string[] $directories
     *
     * @return array<string,string>
     */
    private function buildScriptIndex(array $directories): array
    {
        $index = [];

        foreach ($directories as $directory) {
            if (!is_dir($directory)) {
                continue;
            }

            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS)
            );

            /** @var SplFileInfo $fileInfo */
            foreach ($iterator as $fileInfo) {
                if (!$fileInfo->isFile()) {
                    continue;
                }

                $extension = strtolower($fileInfo->getExtension());
                if (!in_array($extension, ['js', 'mjs'], true)) {
                    continue;
                }

                $absolutePath = $fileInfo->getPathname();
                $relativePath = $this->makeRelativeScriptPath($absolutePath);
                $classNames = $this->extractClassNamesFromFile($absolutePath);

                if ($classNames) {
                    foreach ($classNames as $className) {
                        $index[$className] = $relativePath;
                    }
                } else {
                    $fallback = $fileInfo->getBasename('.' . $extension);
                    $index[$fallback] = $relativePath;
                }
            }
        }

        return $index;
    }

    /**
     * Extract exported or declared class/function names from a script file.
     *
     * @return string[]
     */
    private function extractClassNamesFromFile(string $absolutePath): array
    {
        $content = @file_get_contents($absolutePath);
        if ($content === false) {
            return [];
        }

        $names = [];

        $patterns = [
            '/export\s+default\s+class\s+([A-Z][A-Za-z0-9_]*)/m',
            '/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/m',
            '/class\s+([A-Z][A-Za-z0-9_]*)\s*/m',
            '/(?:var|let|const)\s+([A-Z][A-Za-z0-9_]*)\s*=\s*function\b/m',
            '/function\s+([A-Z][A-Za-z0-9_]*)\s*\(/m',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match_all($pattern, $content, $matches)) {
                foreach ($matches[1] as $name) {
                    $names[$name] = true;
                }
            }
        }

        return array_keys($names);
    }

    /**
     * Convert an absolute path into a project-relative path suitable for inclusion.
     */
    private function makeRelativeScriptPath(string $absolutePath): string
    {
        $normalizedRoot = rtrim($this->normalizePath(HTDOCS_DIR), '/') . '/';
        $normalizedPath = $this->normalizePath($absolutePath);

        if (str_starts_with($normalizedPath, $normalizedRoot)) {
            $normalizedPath = substr($normalizedPath, strlen($normalizedRoot));
        }

        return ltrim($normalizedPath, '/');
    }

    /**
     * Normalize a filesystem path for consistent hashing.
     */
    private function normalizePath(string $path): string
    {
        return str_replace('\\', '/', $path);
    }

    /**
     * Load the script index from cache if present.
     *
     * @return array{index: array<string,string>, hash: string}|null
     */
    private function loadScriptIndexFromCache(): ?array
    {
        $cacheFile = $this->getScriptIndexCacheFile();
        if (!is_file($cacheFile)) {
            return null;
        }

        $data = @include $cacheFile;
        if (!is_array($data) || !isset($data['index'], $data['hash']) || !is_array($data['index'])) {
            return null;
        }

        return $data;
    }

    /**
     * Persist the script index cache to a temporary file.
     *
     * @param array<string,string> $index
     */
    private function storeScriptIndexToCache(array $index, string $hash): void
    {
        $cacheFile = $this->getScriptIndexCacheFile();
        $payload = ['index' => $index, 'hash' => $hash];
        $data = '<?php return ' . var_export($payload, true) . ';';

        @file_put_contents($cacheFile, $data, LOCK_EX);
    }

    /**
     * Resolve cache file location.
     */
    private function getScriptIndexCacheFile(): string
    {
        $tmpDir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR);
        return $tmpDir . DIRECTORY_SEPARATOR . 'energine-js-class-index.php';
    }

    /**
     * Determine whether we are in an administrative context.
     */
    private function isAdminContext(): bool
    {
        return $this->getProperty('is_admin') === '1';
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
                $this->componentManager->addComponent(
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
            $raw = file_get_contents_stripped($file);
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
