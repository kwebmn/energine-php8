<?php

class TemplateWizard extends Grid
{
    const TABLE_PREFIX = 'auto_';
    const WIZARD_PATH = 'core/modules/wizard/';
    const TEMPLATES_PATH = 'core/modules/auto/';

    protected $templateHelper;

    public function __construct($name, $module, array $params = null) {
        parent::__construct($name, $module, $params);

        $this->setTableName('site_generator');
        $this->setOrder(array('sg_date' => QAL::DESC));

        $this->templateHelper = new TemplateHelper();
    }


    public function saveData()
    {
        $id =  parent::saveData();
        $this->dbh->modify(
            QAL::UPDATE,
            'site_generator',
            array(
                'sg_date' => date('Y-m-d H:i:s')
            ),
            array(
                'sg_id' => $id
            )

        );
        return $id;
    }

    public function builder()
    {
        try
        {
            $id = $this->getStateParams(false);

            if ($id)
            {
                $this->templateHelper->createTemplate($id[0]);
            }
        }
        catch (Exception $e)
        {
            stop($e);
        }

        die();
    }
}