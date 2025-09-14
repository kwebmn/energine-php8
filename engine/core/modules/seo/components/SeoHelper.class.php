<?php


class SeoHelper extends DBWorker
{
    const TABLE_CONST_CACHE = 'SEO_TABLE';
    const ALIAS_CONST_CACHE = 'SEO_ALIAS_TABLE';
    private $table;
    private $alias;
    private $params;

    public function __construct()
    {
        parent::__construct();
        $this->buildTable();

    }

    public function getTable()
    {
        $res = array();
//        $res['Товары'] = array(
//            'url' => '/products/',
//            'get' => 'f=1_2_3',
//            'canonical' => true
//        );
//
//        $res['Гербициды_Syngenta'] = array(
//            'url' => '/products/',
//            'get' => 'category=264759&filter=264990',
//            'canonical' => true
//        );
//
        $res['/'] = array(
            'url' => '/',
            'get' => '',
            'canonical' => true
        );


        $res = array_merge($res, $this->buildProductTable());
        $res = array_merge($res, $this->buildCategoriesTable());
        $res = array_merge($res, $this->buildArticleTable());

        //stop($res);

        return $res;
    }

    public function buildTable()
    {
        if (BaseObject::_getConfigValue('site.apcu') == 1)
        {
            $cached = false;
            $cachedData = apcu_fetch(self::TABLE_CONST_CACHE, $cached);

            if ($cached)
            {
                $this->table = $cachedData;
                return true;
            }
        }

        $this->table = $this->getTable();

        if (BaseObject::_getConfigValue('site.apcu') == 1)
        {
            $ttl = 3600;
            if (BaseObject::_getConfigValue('site.apcu_ttl') > 0)
            {
                $ttl = (int)BaseObject::_getConfigValue('site.apcu_ttl');
            }
            apcu_store(self::TABLE_CONST_CACHE, $this->table, $ttl);
        }

    }

    public function check()
    {

        if (BaseObject::_getConfigValue('site.aliases') != 1)
        {
            return false;
        }

        $debug = false;
        if (isset($_GET['debug']))
        {
            $debug = true;
        }

        $url = urldecode($_SERVER['REQUEST_URI']);
        $url = parse_url($url);

        $url = $url['path'];
        $url = trim($url, '/ "');
        if ($url == '')
        {
            return false;
        }
//        stop($this->table);
        if (is_array($this->table) and isset($this->table[$url]))
        {

            if (isset($this->table[$url]['url']))
            {
                $_SERVER['REQUEST_URI'] = $this->table[$url]['url'];

                if ($this->table[$url]['canonical'])
                {
                    $uri = E()->getRequest()->getURI();
                    $canonical = $uri->getScheme() . '://' . $uri->getHost() . '/' . $url;
                    $this->setParam('canonical', $canonical);
                }

            }

            if (isset($this->table[$url]['get']) and is_string($this->table[$url]['get']) and strlen($this->table[$url]['get']) > 0)
            {
                $result = false;
                parse_str($this->table[$url]['get'], $result);
                if (is_array($result) and sizeof($result))
                {
                    $_GET = $result;
                    if ($debug)
                    {
                        $_GET['debug'] = '';
                    }
                }
            }
        }

        /**
         * Товар
         */


        if (preg_match_all('/^cat.*\/(\d+)-.*/', $url, $result))
        {

            if (isset($result[1]))
            {
                $productId = (int)$result[1][0];
//                if ($productId = E()->ProductSeoRedirect->getProductUrlByOldProductId($productId))
//                {
//
////                    stop($productId);
//                    header("Location: /products/" . $productId . '/');
//                    die();
//                }

                $res = $this->dbh->select(
                    'site_product',
                    true,
                    array(
                        'product_id' => $productId
                    )
                );
//
                if (is_array($res) and sizeof($res) > 0 and isset($res[0]['product_segment']) and strlen($res[0]['product_segment']) > 0)
                {
                     Header( "HTTP/1.1 301 Moved Permanently" );
                     header('Location: /' . $res[0]['product_segment'], true, 301);
                     die();
                }
            }
        }

        /**
         * Катгории
         */
        $catList = array(
            "cat/agrochemicals" => "Агрохимия",
            "cat/agrochemicals/pesticides/herbicides" => "Гербициды",
            "cat/agrochemicals/pesticides/desycanty" => "Десиканты",
            "cat/agrochemicals/pesticides/insektsidy" => "Инсектициды,_Акарициды",
            "cat/agrochemicals/pesticides/adhesive" => "Прилипатели",
            "cat/agrochemicals/pesticides/rodenticides" => "Родентициды",
            "cat/agrochemicals/pesticides/adjuvants" => "Адьюванты",
            "cat/agrochemicals/pesticides/retardants" => "Регулятор_роста",
            "cat/agrochemicals/pesticides/fungicides" => "Фунгициды",
            "cat/agrochemicals/fertilizer/fertilizer" => "Удобрения",
            "cat/seeds" => "Сорта",
            "cat/seeds/stone-culture/apricot" => "Абрикос",
            "cat/seeds/stone-culture/alic" => "Алыча",
            "cat/seeds/stone-culture/cherry" => "Вишня,_Черешня",
            "cat/seeds/stone-culture/peach" => "Персик",
            "cat/seeds/stone-culture/plum" => "Слива",
            "cat/seeds/fungus/mushrooms" => "Грибы",
            "cat/seeds/vegetable-seeds/cabbage" => "Семена_Капусты",
            "cat/seeds/vegetable-seeds/onion" => "Семена_Лука",
            "cat/seeds/vegetable-seeds/tomato" => "Семена_Томатов",
            "cat/seeds/vegetable-seeds/cucumber" => "Семена_Огурцов",
            "cat/seeds/vegetable-seeds/carrots" => "Семена_Моркови",
            "cat/seeds/vegetable-seeds/radishes" => "Семена_Редиса",
            "cat/seeds/vegetable-seeds/pepper" => "Семена_Перца",
            "cat/seeds/vegetable-seeds/salad" => "Семена_Салата",
            "cat/seeds/vegetable-seeds/celery" => "Семена_Сельдерея",
            "cat/seeds/vegetable-seeds/eggplant" => "Семена_Баклажана",
            "cat/seeds/vegetable-seeds/sweet-corn" => "Семена_Сахарной_кукурузы",
            "cat/seeds/vegetable-seeds/red-beets" => "Семена_Столовой_свеклы",
            "cat/seeds/vegetable-seeds/spinach" => "Семена_Шпината",
            "cat/seeds/vegetable-seeds/greenpea" => "Семена_Гороха_Овощного",
            "cat/seeds/vegetable-seeds/pasternak" => "Семена_Пастернака",
            "cat/seeds/vegetable-seeds/beans" => "Семена_Фасоли",
            "cat/seeds/pome-culture/quince" => "Айва",
            "cat/seeds/pome-culture/grapes" => "Виноград",
            "cat/seeds/pome-culture/pear" => "Груша",
            "cat/seeds/pome-culture/birdcherry" => "Черемуха",
            "cat/seeds/pome-culture/apple" => "Яблоня",
            "cat/seeds/green-culture/coriander" => "Семена_Кориандра",
            "cat/seeds/green-culture/dill" => "Семена_Укропа",
            "cat/seeds/green-culture/parsley" => "Семена_Петрушки",
            "cat/seeds/melons-and-gourds/watermelon" => "Семена_Арбуза",
            "cat/seeds/melons-and-gourds/melon" => "Семена_Дыни",
            "cat/seeds/melons-and-gourds/pumkin" => "Семена_Тыквы",
            "cat/seeds/melons-and-gourds/squash" => "Семена_Кабачков",
            "cat/seeds/berry-culture/strawberry" => "Земляника,_Клубника",
            "cat/seeds/berry-culture/gooseberry" => "Крыжовник",
            "cat/seeds/berry-culture/raspberries" => "Малина",
            "cat/seeds/berry-culture/currant" => "Смородина",
            "cat/seeds/technical-crop/potato" => "Семена_Картофеля",
            "cat/seeds/technical-crop/sugar-beet" => "Семена_Сахарной_свеклы",
            "cat/seeds/technical-crop/sunflower" => "Семена_Подсолнечника",
            "cat/seeds/technical-crop/canola" => "Семена_Рапса",
            "cat/seeds/technical-crop/soybean" => "Семена_Сои",
            "cat/seeds/technical-crop/hemp" => "Семена_Конопли",
            "cat/seeds/nut-crops/walnut" => "Грецкий_орех",
            "cat/seeds/nut-crops/filbert" => "Фундук,_Лещина",
            "cat/seeds/lawn-grasses/mix-grasses" => "Газонные_травосмеси",
            "cat/seeds/flower-crops/tulips" => "Тюльпаны",
            "cat/seeds/fieldcrop/corn" => "Семена_Кукурузы",
            "cat/seeds/fieldcrop/wheat" => "Семена_Пшеницы",
            "cat/seeds/fieldcrop/rye" => "Семена_Ржи",
            "cat/seeds/fieldcrop/pea" => "Семена_Гороха",
            "cat/seeds/fieldcrop/buckwheat" => "Семена_Гречки",
            "cat/seeds/fieldcrop/barley" => "Семена_Ячменя",
            "cat/seeds/fieldcrop/sorghum" => "Семена_Сорго",
            "cat/seeds/fieldcrop/triticale" => "Семена_Тритикале",
            "cat/seeds/fieldcrop/millet" => "Семена_Проса",
            "cat/seeds/fodder-crop/fodder-beet" => "Семена_Кормовой_свеклы",
            "cat/seeds/fodder-crop/alfalfa" => "Семена_Люцерны",
            "cat/melioration" => "Мелиорация",
            "cat/melioration/dripirrigation/drip-tube" => "Капельная_трубка",
            "cat/melioration/dripirrigation/fitting" => "Фитинги_к_капельному_орошению",
            "cat/melioration/dripirrigation/lft-tube" => "Трубопровод",
            "cat/greenhouses" => "Теплицы",
            "cat/greenhouses/agromaterials/agrovolokno" => "Агроволокно",
            "cat/greenhouses/agromaterials/termoscreen" => "Термоэкраны,_Затеняющие сети",
            "cat/greenhouses/agromaterials/tapestry-grid" => "Шпалерная сетка",
            "cat/greenhouses/hothouses/greenhouse" => "Теплицы",
            "cat/mechanization" => "Механизация",
            "cat/mechanization/agricultural-machinery/tractor" => "Трактора",
            "cat/mechanization/cultivators/motocultivators" => "Мотокультиватор",
            "cat/mechanization/sprayers-machines/sprayers" => "Опрыскиватель",
            "cat/mechanization/seeding-machines/seeders" => "Сеялка",
            "cat/mechanization/garden-tools/gardening" => "Садовый_инвентарь",
            "cat/service" => "Сервис",
            "cat/service/service/agro-service" => "Услуги",
            "cat/other" => "Разное",
            //'info/articles' => 'articles',
            //'info/news' => 'news'
        );
        uksort(
            $catList,
            function($a, $b)
            {
                return strlen($b) - strlen($a);
            }
        );

        foreach($catList as $key => $row)
        {

            if (strpos($url, $key) !== false)
            {
                Header( "HTTP/1.1 301 Moved Permanently" );
                header('Location: /' . $row, true, 301);
                die();
            }
        }

    }

    public function buildProductTable()
    {
        $res = $this->dbh->select(
            'site_product',
            array(
                'product_id',
                'product_segment'
            )
        );

        $result = array();
        if (is_array($res) and sizeof($res) > 0)
        {
//            stop($res);
            foreach ($res as $key => $row)
            {
//                if (isset($result[$row['product_segment']]))
//                {
//                    $i = 1;
//                    while (isset($result[$row['product_segment'] . '_' . $i]))
//                    {
//                        $i++;
//                    }
//                    $row['product_segment'] = $row['product_segment'] . '_' . $i;
////                    inspect($row['product_segment']);
//                }
                $result[$row['product_segment']] = array(
                    'url' => '/products/' . $row['product_id'],
                    'get' => false,
                    'canonical' => true
                );
            }
        }
        return $result;
    }

    public function buildCategoriesTable()
    {
        $res = $this->dbh->select(
            'site_product_filter',
            array(
                'filter_id',
                'filter_seo_url'
            )
        );

        $result = array();
        if (is_array($res) and sizeof($res) > 0)
        {
            foreach ($res as $key => $row)
            {
                $result[$row['filter_seo_url']] = array(
                    'url' => '/products/',
                    'get' => 'category=' . $row['filter_id'],
                    'canonical' => true
                );
            }
        }
        return $result;
    }

    public function buildArticleTable()
    {

        $resCat = $this->dbh->selectRequest(
            'SELECT article_category_id, acategory_segment FROM auto_article_category WHERE LENGTH(acategory_segment) > 0'
        );


        $resCat = convertDBResult(
            $resCat,
            'article_category_id'
        );


        $res = $this->dbh->select(
            'auto_articles',
            array(
                'articles_id',
                'article_url',
                'category_id'
            )
        );


        $result = array();
        if (is_array($res) and sizeof($res) > 0)
        {
            foreach ($res as $key => $row)
            {
                if (strlen($row['article_url']) > 0)
                {
                    $category = 'cat' . $row['category_id'];
                    if (isset($resCat[$row['category_id']]))
                    {
                        $category = $resCat[$row['category_id']]['acategory_segment'];
                    }

                    $url = trim($row['article_url'], '/');

                    $result[$url] = array(
                        'url' => '/articles/' . $category . '/' . $row['articles_id'],
                        'get' => false,
                        'canonical' => true
                    );
                }

            }
        }
        //stop($result);
        return $result;
    }


    public function setParam($param, $value)
    {
        $this->params[$param] = $value;
    }

    public function getParam($param)
    {
        if (isset($this->params[$param]))
        {
            return $this->params[$param];
        }
        else
        {
            return false;
        }
    }

}