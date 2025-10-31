<?php

declare(strict_types=1);

class TemplateWizard extends Grid
{
    public const TABLE_PREFIX = 'auto_';
    public const WIZARD_PATH = 'engine/core/modules/wizard/';
    public const TEMPLATES_PATH = 'engine/core/modules/auto/';

    protected $templateHelper;

    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);

        $this->setTableName('site_generator');
        $this->setOrder(['sg_date' => QAL::DESC]);

        $this->templateHelper = new TemplateHelper();
    }


    public function saveData()
    {
        $id =  parent::saveData();
        $this->dbh->modify(
            QAL::UPDATE,
            'site_generator',
            [
                'sg_date' => date('Y-m-d H:i:s')
            ],
            [
                'sg_id' => $id
            ]
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
        catch (\Throwable $e)
        {
            stop($e);
        }

        die();
    }
}
