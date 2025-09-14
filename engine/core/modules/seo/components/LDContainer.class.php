<?php

class LDContainer extends DBWorker
{

    private static $instance;


    public static function getInstance()
    {
        if (!isset(self::$instance)) {
            self::$instance = new LDContainer();
        }
        return self::$instance;
    }

    private $container;

    public function __construct()
    {
        parent::__construct();
        $this->container = array();

//        $search = array(
//            '@context' => 'https://schema.org',
//            'type' => 'WebSite',
//            'url' => 'https://www.agronom.info',
//            'potentialAction' => array(
//                '@type' => 'SearchAction',
//                'target' => 'https://www.agronom.info/search?q={search_term_string}',
//                'query-input' => 'required name=search_term_string'
//            )
//        );


        $logo = array(
            '@context' => 'https://schema.org',
            '@type' => 'Organization',
            'url' => 'https://www.agronom.info',
            'logo' => 'https://www.agronom.info/images/default/logo.svg',
            'legalName' => 'Агроном Инфо'
        );

        $this->addLD('logo', $logo);

    }
    
    function addLD($name, $data)
    {
        $this->container[$name] = $data;

    }
    
    public function getLD()
    {
        $arr = array();
        if (sizeof($this->container) > 0 and is_array($this->container))
        {
            foreach ($this->container as $key => $row)
            {
                $arr[] = array(
                    'ld_id' => $key,
                    'ld_body' => json_encode($row, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
                );
            }
        }
        return $arr;
    }
}