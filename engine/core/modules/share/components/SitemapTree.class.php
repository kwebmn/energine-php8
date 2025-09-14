<?php
/**
 * @file
 * SitemapTree
 *
 * It contains the definition to:
 * @code
class SitemapTree;
@endcode
 *
 * @author dr.Pavka
 * @copyright Energine 2006
 *
 * @version 1.0.0 68326f5
 */


/**
 * Site map.
 *
 * @code
class SitemapTree;
@endcode
 */
class SitemapTree extends DataSet {
    //todo VZ: This can be removed.
    /**
     * Initialize site map dataset.
     *
     * @param string     $name   Имя компонента.
     * @param string     $module Имя модуля.
     * @param array|null $params Параметры компонента.
     */
    public function __construct($name, $module, ?array $params = null) {
        parent::__construct($name, $module, $params);

    }

    /**
     * Load information about site map tree.
     *
     * @return array|false|null Массив узлов дерева сайта.
     */
    protected function loadData(): array|false|null {
        $sitemap = E()->getMap();
        $res = $sitemap->getInfo();
        $result = [];

        foreach ($res as $id => $info) {
            $result[] = [
                'Id' => $id,
                'Pid' => $info['Pid'],
                'Name' => $info['Name'],
                'Segment' => $sitemap->getURLByID($id)
            ];
        }

        return $result;
    }

    /**
     * Create builder for tree representation.
     *
     * @return TreeBuilder Настроенный построитель дерева.
     */
    protected function createBuilder() {
        $builder  = new TreeBuilder();
        $builder->setTree(E()->getMap()->getTree());
        return $builder;
    }
}