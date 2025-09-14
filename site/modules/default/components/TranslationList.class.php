<?php

class TranslationList extends DataSet
{
	public function __construct($name, $module, array $params = null) {
        parent::__construct($name, $module, $params);

        $this->document->addTranslation('TXT_COPYRIGHT', $this);

	}

}