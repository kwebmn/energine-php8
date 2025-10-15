<?php

declare(strict_types=1);

/**
 * Manager of the set of the document's components.
 *
 * @final
 */
final class ComponentManager extends BaseObject implements Iterator
{
    /**
     * Quick lookup by name (registered blocks).
     * @var array<string,IBlock>
     */
    private array $registeredBlocks = [];

    /**
     * Document reference (kept for BC; currently unused here).
     */
    private static ?Document $document = null;

    /**
     * Actual blocks added to the manager (components/containers).
     * @var array<string,IBlock>
     */
    private array $blocks = [];

    /**
     * Cached ordered list of block names for iteration.
     * @var string[]
     */
    private array $blockNames = [];

    /** Iterator index. */
    private int $iteratorIndex = 0;

    public function __construct(Document $document)
    {
        self::$document = $document;
    }

    /**
     * Register block in lookup table.
     */
    public function register(IBlock $block): void
    {
        $this->registeredBlocks[$block->getName()] = $block;
    }

    /**
     * Add block to the manager (and register for fast lookup).
     */
    public function add(IBlock $block): void
    {
        $name = $block->getName();
        $this->blocks[$name]            = $block;
        $this->registeredBlocks[$name]  = $block; // keep lookup in sync
    }

    /**
     * @deprecated Use ComponentManager::add(IBlock $block) with components-as-blocks.
     */
    public function addComponent(Component $component): void
    {
        $this->add($component);
    }

    /**
     * Get block by its name.
     *
     * @return IBlock|false
     */
    public function getBlockByName(string $name)
    {
        if (isset($this->registeredBlocks[$name]))
        {
            return $this->registeredBlocks[$name];
        }
        return $this->blocks[$name] ?? false;
    }

    /**
     * Create component from XML description.
     *
     * @throws SystemException ERR_DEV_NO_REQUIRED_ATTRIB [attribute_name]
     */
    public static function createComponentFromDescription(SimpleXMLElement $componentDescription)/*: Component*/
    {
        // required attributes
        $required = ['name', 'module', 'class'];
        foreach ($required as $attrName)
        {
            if (!isset($componentDescription[$attrName]))
            {
                throw new SystemException("ERR_DEV_NO_REQUIRED_ATTRIB $attrName", SystemException::ERR_DEVELOPER);
            }
        }

        $name   = (string)$componentDescription['name'];
        $module = (string)$componentDescription['module'];
        $class  = (string)$componentDescription['class'];

        // extract params
        $params = null;
        if (isset($componentDescription->params))
        {
            $params = [];
            foreach ($componentDescription->params->param as $tagName => $paramDescr)
            {
                if ($tagName !== 'param' || !isset($paramDescr['name']))
                {
                    continue;
                }
                $paramName = (string)$paramDescr['name'];

                // scalar text OR first nested child (BC with original behavior)
                if (!$paramDescr->count())
                {
                    $paramValue = (string)$paramDescr;
                }
                else
                {
                    [$paramValue] = $paramDescr->children();
                }

                if (array_key_exists($paramName, $params))
                {
                    if (!is_array($params[$paramName]))
                    {
                        $params[$paramName] = [$params[$paramName]];
                    }
                    $params[$paramName][] = $paramValue;
                }
                else
                {
                    $params[$paramName] = $paramValue;
                }
            }
        }

        return self::_createComponent($name, $module, $class, $params);
    }

    /**
     * Create component.
     */
    public function createComponent(string $name, string $module, string $class, ?array $params = null)/*: Component*/
    {
        return self::_createComponent($name, $module, $class, $params);
    }

    /**
     * Find block in the component XML description by its name.
     *
     * @return IBlock|SimpleXMLElement|false
     */
    public static function findBlockByName(SimpleXMLElement $containerXMLDescription, string $blockName)
    {
        // Safe literal for XPath: handle quotes inside the name
        if (str_contains($blockName, '"'))
        {
            $literal = 'concat("'.str_replace('"', '",\'"\',"', $blockName).'")';
        }
        else
        {
            $literal = '"' . $blockName . '"';
        }

        $blocks = $containerXMLDescription->xpath(
            'descendant-or-self::*[name()="container" or name()="component"][@name=' . $literal . ']'
        );

        return (!empty($blocks)) ? $blocks[0] : false;
    }

    /**
     * Load the component/container description from the file.
     *
     * @throws SystemException ERR_DEV_NO_CONTAINER_FILE
     * @throws SystemException ERR_DEV_BAD_CONTAINER_FILE
     */
    public static function getDescriptionFromFile(string $blockDescriptionFileName): SimpleXMLElement
    {
        if (!file_exists($blockDescriptionFileName))
        {
            throw new SystemException('ERR_DEV_NO_CONTAINER_FILE', SystemException::ERR_CRITICAL, $blockDescriptionFileName);
        }

        $prev = libxml_use_internal_errors(true);
        $xml  = simplexml_load_file($blockDescriptionFileName);
        $errs = libxml_get_errors();
        libxml_clear_errors();
        libxml_use_internal_errors($prev);

        if (!$xml)
        {
            throw new SystemException('ERR_DEV_BAD_CONTAINER_FILE', SystemException::ERR_CRITICAL, $blockDescriptionFileName);
        }

        return $xml;
    }

    /**
     * Create block (component or container) from description.
     *
     * @throws SystemException ERR_UNKNOWN_BLOCKTYPE
     */
    public static function createBlockFromDescription(SimpleXMLElement $blockDescription, array $additionalProps = [])/*: IBlock*/
    {
        $result = false;

        switch ($blockDescription->getName())
        {
            case 'content':
                $props  = array_merge(['tag' => 'content'], $additionalProps);
                $result = ComponentContainer::createFromDescription($blockDescription, $props);
                break;

            case 'page':
                $props  = array_merge(['tag' => 'layout'], $additionalProps);
                $result = ComponentContainer::createFromDescription($blockDescription, $props);
                break;

            case 'container':
                $result = ComponentContainer::createFromDescription($blockDescription);
                break;

            case 'component':
                $result = self::createComponentFromDescription($blockDescription);
                break;

            default:
                throw new SystemException('ERR_UNKNOWN_BLOCKTYPE', SystemException::ERR_CRITICAL);
        }

        return $result;
    }

    /**
     * Create component by requested parameters.
     *
     * @throws SystemException
     */
    private static function _createComponent(string $name, string $module, string $class, ?array $params = null)/*: Component*/
    {
        try
        {
            /** @var Component $result */
            $result = new $class($name, $module, $params);
            return $result;
        }
        catch (\Throwable $e)
        {
            throw new SystemException(
                $e->getMessage(),
                SystemException::ERR_DEVELOPER,
                [
                    'class' => (($module !== 'site')
                            ? str_replace('*', $module, CORE_COMPONENTS_DIR)
                            : SITE_COMPONENTS_DIR . $module) . '/' . $class . '.class.php',
                    'trace' => $e->getTraceAsString(),
                ]
            );
        }
    }

    // ===== Iterator implementation =====

    public function rewind(): void
    {
        $this->blockNames    = array_keys($this->blocks);
        $this->iteratorIndex = 0;
    }

    public function valid(): bool
    {
        return isset($this->blockNames[$this->iteratorIndex]);
    }

    public function key(): mixed
    {
        return $this->blockNames[$this->iteratorIndex] ?? null;
    }

    public function next(): void
    {
        $this->iteratorIndex++;
    }

    public function current(): mixed
    {
        $key = $this->blockNames[$this->iteratorIndex] ?? null;
        return ($key !== null && isset($this->blocks[$key])) ? $this->blocks[$key] : null;
    }
}

/**
 * Block interface.
 */
interface IBlock
{
    /** Run execution. */
    public function run(): void;

    /** Is enabled? */
    public function enabled(): bool;

    /**
     * Get current rights level of the user for running current action.
     * @return mixed
     */
    public function getCurrentStateRights(): mixed;

    /** Build block. */
    public function build(): DOMDocument;

    /** Get name. */
    public function getName(): string;
}
