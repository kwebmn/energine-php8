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
        $jsmap_file = HTDOCS_DIR . '/system.jsmap.php';
        if (file_exists($jsmap_file)) {
            $jsmap = include $jsmap_file;
            $includes = [];

            $xpath = new DOMXPath($this->doc);
            $behaviors = $xpath->query('//javascript/behavior');
            if ($behaviors && $behaviors->length) {
                foreach ($behaviors as $node) {
                    /** @var DOMElement $node */
                    $path = $node->getAttribute('path');
                    if ($path && substr($path, -1) !== '/') {
                        $path .= '/';
                    }
                    $cls = ($path ? $path : '') . $node->getAttribute('name');
                    $this->createJavascriptDependencies([$cls], $jsmap, $includes);
                }
            }

            $jsNode = $this->doc->createElement('javascript');
            foreach ($includes as $js) {
                $lib = $this->doc->createElement('library');
                $lib->setAttribute('path', (string)$js);
                $jsNode->appendChild($lib);
            }
            $root->appendChild($jsNode);
        }
    }

    /**
     * Create unique flat array of connected .js-files and their dependencies.
     */
    protected function createJavascriptDependencies(array $dependencies, array $jsmap, array &$js_includes): void
    {
        foreach ($dependencies as $dep) {
            if (isset($jsmap[$dep])) {
                $this->createJavascriptDependencies((array)$jsmap[$dep], $jsmap, $js_includes);
            }
            if (!in_array($dep, $js_includes, true)) {
                $js_includes[] = $dep;
            }
        }
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
