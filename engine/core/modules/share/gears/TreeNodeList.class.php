<?php
/**
 * TreeNodeList, TreeNode — совместимые с PHP 8.3 сигнатуры.
 */

/* ------------------------- TreeNodeList ------------------------- */

class TreeNodeList implements Iterator
{
    /**
     * @var mixed Текущий ключ итерации (ID узла)
     */
    private $currentKey;

    /**
     * @var array<string|int, TreeNode>
     */
    private $nodeList = array();

    public function __construct() {}

    /**
     * @return TreeNode
     */
    public function add(TreeNode $node) {
        $this->nodeList[$node->getID()] = $node;
        if ($this->currentKey === null) {
            $keys = array_keys($this->nodeList);
            $this->currentKey = $keys ? $keys[0] : null;
        }
        return $node;
    }

    /**
     * @return TreeNode|null
     */
    public function getRoot() {
        if (empty($this->nodeList)) return null;
        $k = array_keys($this->nodeList);
        $k = current($k);
        return isset($this->nodeList[$k]) ? $this->nodeList[$k] : null;
    }

    /**
     * @return TreeNode|null
     */
    public function insertBefore(TreeNode $node, TreeNode $beforeNode) {
        // Исторически не реализовано — оставляем заглушку.
        return null;
    }

    /**
     * @return TreeNode
     */
    public function remove(TreeNode $node) {
        $result = $node;
        unset($this->nodeList[$node->getID()]);

        if ($this->currentKey === $node->getID()) {
            $keys = array_keys($this->nodeList);
            $this->currentKey = $keys ? $keys[0] : null;
        }
        return $result;
    }

    /**
     * @return int
     */
    public function getLength() {
        return (int) sizeof($this->nodeList);
    }

    /**
     * @param int|string $id
     * @return TreeNode|null
     */
    public function getNodeById($id) {
        return $this->findNode($id, $this);
    }

    /**
     * @param int|string $id
     * @return TreeNode|null
     */
    private function findNode($id, TreeNodeList $nodeList) {
        foreach ($nodeList as $node) {
            if ($node && $node->getID() == $id) {
                return $node;
            } elseif ($node && $node->hasChildren()) {
                $result = $this->findNode($id, $node->getChildren());
                if (!is_null($result)) {
                    return $result;
                }
            }
        }
        return null;
    }

    /**
     * @param bool $isRecursive
     * @return array
     */
    public function asList($isRecursive = true) {
        $result = array();
        foreach ($this as $node) {
            if ($node instanceof TreeNode) {
                $result += $node->asList($isRecursive);
            }
        }
        return $result;
    }

    /* ----------- Iterator (PHP 8.1+ сигнатуры) ----------- */

    public function current(): mixed {
        if ($this->currentKey === null) return null;
        return $this->nodeList[$this->currentKey] ?? null;
    }

    public function key(): mixed {
        return $this->currentKey;
    }

    public function next(): void {
        if (empty($this->nodeList)) {
            $this->currentKey = null;
            return;
        }
        $keys = array_keys($this->nodeList);
        $indexes = array_flip($keys);
        $currentIndex = isset($indexes[$this->currentKey]) ? $indexes[$this->currentKey] : -1;
        $currentIndex++;
        $this->currentKey = isset($keys[$currentIndex]) ? $keys[$currentIndex] : null;
    }

    public function rewind(): void {
        if (empty($this->nodeList)) {
            $this->currentKey = null;
            return;
        }
        $keys = array_keys($this->nodeList);
        $this->currentKey = $keys[0];
    }

    public function valid(): bool {
        if ($this->currentKey === null) return false;
        $keys = array_keys($this->nodeList);
        $indexes = array_flip($keys);
        if (!isset($indexes[$this->currentKey])) return false;
        return ($indexes[$this->currentKey] < count($indexes));
    }

    /**
     * @return TreeNodeList
     */
    public function merge(TreeNodeList $newNodeList) {
        $this->nodeList = array_merge($this->nodeList, $newNodeList->nodeList);
        if ($this->currentKey === null && !empty($this->nodeList)) {
            $keys = array_keys($this->nodeList);
            $this->currentKey = $keys[0];
        }
        return $this;
    }
}

/* --------------------------- TreeNode --------------------------- */

final class TreeNode implements IteratorAggregate
{
    /** @var int|string */
    private $id;

    /** @var TreeNode|null */
    private $parent = null;

    /** @var TreeNodeList */
    private $children;

    /**
     * @param int|string $id
     */
    public function __construct($id) {
        $this->children = new TreeNodeList();
        $this->id = $id;
    }

    /** @return int|string */
    public function getID() {
        return $this->id;
    }

    /** @return TreeNode|null */
    public function getParent() {
        return $this->parent;
    }

    /** @return bool */
    public function hasChildren() {
        return (bool) $this->children->getLength();
    }

    /** @return TreeNodeList */
    public function getChildren() {
        return $this->children;
    }

    public function getIterator(): Traversable {
        return $this->getChildren();
    }

    /**
     * @return TreeNode
     */
    public function addChild(TreeNode $node) {
        $node = $this->children->add($node);
        $node->parent = $this;
        return $node;
    }

    /**
     * @return TreeNode
     */
    public function removeChild($node) {
        $this->children->remove($node)->parent = null;
        return $node;
    }

    /**
     * @return TreeNodeList
     */
    public function getParents() {
        $result = new TreeNodeList();
        $node = $this;
        while (!is_null($node)) {
            $node = $node->getParent();
            if (!is_null($node)) {
                $result->add($node);
            }
        }
        return $result;
    }

    /**
     * @return TreeNodeList
     */
    public function getDescendants() {
        return $this->iterateDescendants($this->getChildren());
    }

    /**
     * @return TreeNodeList
     */
    private function iterateDescendants(TreeNodeList $nodeList) {
        $result = new TreeNodeList();
        foreach ($nodeList as $node) {
            if ($node instanceof TreeNode) {
                $result->add($node);
                $result->merge($node->iterateDescendants($node->getChildren()));
            }
        }
        return $result;
    }

    /**
     * @param bool $isRecursive
     * @return array
     */
    public function asList($isRecursive = true) {
        $result = array();
        $result[$this->getID()] = (!is_null($this->getParent())) ? $this->getParent()->getID() : null;
        if ($this->hasChildren() && $isRecursive) {
            $result += $this->getChildren()->asList();
        }
        return $result;
    }
}
