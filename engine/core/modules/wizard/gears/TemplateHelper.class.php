<?php

class TemplateHelper extends DBWorker
{
    /**
     * Tracks files created or modified during template generation.
     * Array path => original contents (null if file did not exist).
     */
    private array $fileChanges = [];

    public function createTemplate($templateId)
    {
        $transactionStarted = false;
        $this->fileChanges = [];

        try
        {
            $template = $this->dbh->select(
                'site_generator',
                true,
                [
                    'sg_id' => $templateId
                ]
            );

            if (!is_array($template) || !count($template))
            {
                throw new \RuntimeException('Template with ID ' . $templateId . ' was not found.');
            }

            $template = $template[0];

            if ($template['sg_is_disabled'] == '1')
            {
                $this->log('This template is DISABLED for building.');
                $this->revertFileChanges();
                return;
            }

            $transactionStarted = $this->dbh->beginTransaction();

            $primaryKey = $template['sg_tablename'] . '_id';

            $fields = $this->prepareFields($template['sg_fields']);
            $fieldsTr = $this->prepareFields($template['sg_fields_tr']);

            echo '<pre>';

            /**
             * Grid Editor + List
             */
            if ($template['sg_type'] == '1')
            {
                /**
                 * List
                 */
                $this->createClassList('DefaultTemplateList', $template['sg_class_name'], TemplateWizard::TABLE_PREFIX . $template['sg_tablename']);
                $this->createClassListConfig('DefaultTemplateList', $template['sg_class_name'], $primaryKey, $fields, $fieldsTr, $template['sg_is_translation'], $template['sg_is_js']);

                if ($template['sg_is_js'])
                {
                    $this->createClassJs('DefaultTemplateJs', $template['sg_class_name']);
                }

                /**
                 * Grid
                 */
                $this->createClassList('DefaultTemplateGrid', $template['sg_class_name'] . 'Editor', TemplateWizard::TABLE_PREFIX . $template['sg_tablename']);
                $this->createClassListConfig('DefaultTemplateGrid', $template['sg_class_name'] . 'Editor', $primaryKey, $fields, $fieldsTr, $template['sg_is_translation'], $template['sg_is_js']);

                /**
                 * Template
                 */
                $this->createTemplateFile('default_template_list', $template['sg_template_name'], $template['sg_tablename'], $template['sg_class_name']);
                $this->createTemplateFile('default_template_list_editor', $template['sg_template_name'] . '_editor', $template['sg_tablename'] . '_editor', $template['sg_class_name'] . 'Editor');
            }
            elseif ($template['sg_type'] == '2')
            {
                /**
                 * List
                 */
                $this->createClassList('DefaultTemplateFeed', $template['sg_class_name'] . 'Feed', TemplateWizard::TABLE_PREFIX . $template['sg_tablename']);
                $this->createClassListConfig('DefaultTemplateFeed', $template['sg_class_name'] . 'Feed', $primaryKey, $fields, $fieldsTr, $template['sg_is_translation'], $template['sg_is_js'], $template['sg_type']);

                if ($template['sg_is_js'])
                {
                    $this->createClassJs('DefaultTemplateJs', $template['sg_class_name'] . 'Feed');
                }

                /**
                 * Feed
                 */
                $this->createClassList('DefaultTemplateFeedEditor', $template['sg_class_name'] . 'FeedEditor', TemplateWizard::TABLE_PREFIX . $template['sg_tablename']);
                $this->createClassListConfig('DefaultTemplateFeedEditor', $template['sg_class_name'] . 'FeedEditor', $primaryKey, $fields, $fieldsTr, $template['sg_is_translation'], $template['sg_is_js'], $template['sg_type']);

                /**
                 * Template
                 */
                $this->createTemplateFile('default_template_feed', $template['sg_template_name'], $template['sg_tablename'], $template['sg_class_name']);
            }

            /**
             * DB
             */
            $this->createTemplateXSLTFile('template', $template['sg_template_name'], $template['sg_template_name'], $primaryKey);
            $this->createDB($fields, $primaryKey, $fieldsTr, $template);

            $this->dbh->modify(
                QAL::UPDATE,
                'site_generator',
                [
                    'sg_build_date' => date('Y-m-d H:i:s')
                ],
                [
                    'sg_id' => $templateId
                ]
            );

            if ($transactionStarted && $this->isTransactionActive())
            {
                $this->dbh->commit();
            }
        }
        catch (\Throwable $e)
        {
            if ($transactionStarted && $this->isTransactionActive())
            {
                try
                {
                    $this->dbh->rollback();
                }
                catch (\Throwable)
                {
                    // The transaction might have been implicitly committed by DDL.
                }
            }
            $this->revertFileChanges();
            throw $e;
        }
        finally
        {
            $this->fileChanges = [];
        }
    }
    public function createTemplateXSLTFile($source, $target, $componentName, $parentKey)
    {
        $content = file_get_contents(TemplateWizard::WIZARD_PATH . 'transformers/' . $source.  '.xslt');

        $content = str_replace('template_name', $target . '.content.xml', $content);
        $content = str_replace('templateName', $componentName, $content);
        $content = str_replace('templatePrimaryKey', $parentKey, $content);

        $file = TemplateWizard::TEMPLATES_PATH . 'transformers/' . $target . '.xslt';
        $this->log('Building XSLT file ' . $file);
        $this->writeFile($file, $content);

        $includeTxt = '<xsl:include href="' . $target. '.xslt"/>';
        $nextTxt = '<!--next-->';

        $xsltIncludeFile = TemplateWizard::TEMPLATES_PATH . 'transformers/include.xslt';
        $content = file_get_contents($xsltIncludeFile);
        if (strpos($content, $includeTxt) === false)
        {
            $content = str_replace(
                $nextTxt,
                "\t" . $includeTxt . "\n" . $nextTxt,
                $content
            );
            $this->writeFile($xsltIncludeFile, $content);
            $this->log('Building XSLT.');
        }
        else
        {
            $this->log('XSLT file already builded.');
        }

    }

    public function createDB($fields, $pk, $fieldsTr, $template)
    {
        $this->log('Builing DB.');

        $this->dbh->modifyRequest('SET FOREIGN_KEY_CHECKS=0;');

        try
        {
            $tableName = TemplateWizard::TABLE_PREFIX . $template['sg_tablename'];
            $orderNum = $template['sg_tablename'] . '_order_num';
            $tableNameTr  = $tableName . '_translation';
            $tableNameUploads  = $tableName . '_uploads';
            $tableNameUploadsTr  = $tableName . '_uploads_translation';

            $tableNameFilter  = $tableName . '_filter';
            $tableNameFilterTr  = $tableName . '_filter_translation';
            $tableNameFilterData  = $tableName . '_filter_data';

            $this->dbh->modifyRequest('DROP TABLE IF EXISTS `' . $tableName .  '`;');
            $this->dbh->modifyRequest('DROP TABLE IF EXISTS `' . $tableNameTr . '`;');
            $this->dbh->modifyRequest('DROP TABLE IF EXISTS `' . $tableNameUploads . '`;');
            $this->dbh->modifyRequest('DROP TABLE IF EXISTS `' . $tableNameUploadsTr . '`;');
            $this->dbh->modifyRequest('DROP TABLE IF EXISTS `' . $tableNameFilter . '`;');
            $this->dbh->modifyRequest('DROP TABLE IF EXISTS `' . $tableNameFilterTr . '`;');
            $this->dbh->modifyRequest('DROP TABLE IF EXISTS `' . $tableNameFilterData . '`;');

            /**
             * Base table
             */

            $f = '`' . $pk . '` int(10) UNSIGNED NOT NULL,' . "\n";

            $f .= '`' . $orderNum . '` int(10) UNSIGNED DEFAULT \'1\',' . "\n";

            if ($template['sg_type'] == '2')
            {
                $f .= '`smap_id` int(10) UNSIGNED NOT NULL,';
            }

            if (is_array($fields) && count($fields) > 0)
            {
                $array_keys = array_keys($fields);
                $last_key = end($array_keys);
                foreach ($fields as $key => $row)
                {
                    $f .= $row;
                    if ($last_key != $key)
                    {
                        $f .= ",\n";
                    }
                    else
                    {
                        $f .= '';
                    }
                }
            }
            $sql = 'CREATE TABLE `' . $tableName . '` (
                     ' . $f . '
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;';

            $this->dbh->modifyRequest($sql);


            $sql = 'ALTER TABLE `' . $tableName . '`
                      ADD PRIMARY KEY (`' . $pk .  '`),
                      ADD KEY `' . $orderNum . '` (`' . $orderNum .'`);';

            $this->dbh->modifyRequest($sql);

            if ($template['sg_type'] == '2')
            {
                $sql = 'ALTER TABLE `' . $tableName . '`
                      ADD KEY `smap_id` (`smap_id`)';
                $this->dbh->modifyRequest($sql);
            }


            $sql = 'ALTER TABLE `' . $tableName . '`
                    MODIFY `' . $pk .  '` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;';
            $this->dbh->modifyRequest($sql);


            if ($template['sg_type'] == '2')
            {
                $sql = 'ALTER TABLE `' . $tableName . '`
                          ADD CONSTRAINT `' .$tableName . '_smap_id` FOREIGN KEY (`smap_id`) REFERENCES `share_sitemap` (`smap_id`) ON DELETE CASCADE ON UPDATE CASCADE;';

                $this->dbh->modifyRequest($sql);
            }


            /**
             * Base table translation
             */
            if ($template['sg_is_translation'])
            {


                $f = '`' . $pk . '` int(10) UNSIGNED NOT NULL,' . "\n";
                $f .= '`lang_id` int(10) UNSIGNED NOT NULL,';

                if (is_array($fieldsTr) && count($fieldsTr) > 0)
                {
                    $array_keys = array_keys($fieldsTr);
                    $last_key = end($array_keys);

                    foreach ($fieldsTr as $key => $row)
                    {
                        $f .= $row;
                        if ($last_key != $key)
                        {
                            $f .= ",\n";
                        }
                        else
                        {
                            $f .= '';
                        }
                    }
                }
                $sql = 'CREATE TABLE `' . $tableNameTr . '` (
                     ' . $f . '
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;';
                $this->dbh->modifyRequest($sql);

                $sql = 'ALTER TABLE `' . $tableNameTr . '`
                          ADD PRIMARY KEY (`' . $pk . '`,`lang_id`),
                          ADD KEY `lang_id` (`lang_id`);';
                $this->dbh->modifyRequest($sql);


                $sql = 'ALTER TABLE `' . $tableNameTr . '`
                          ADD CONSTRAINT `' .$tableNameTr . '_0_' . $pk . '` FOREIGN KEY (`' . $pk .'`) REFERENCES `' . $tableName . '` (`' . $pk . '`) ON DELETE CASCADE ON UPDATE CASCADE,
                          ADD CONSTRAINT `' .$tableNameTr . '_1_lang_id' . '` FOREIGN KEY (`lang_id`) REFERENCES `share_languages` (`lang_id`) ON DELETE CASCADE ON UPDATE CASCADE;';
                $this->dbh->modifyRequest($sql);

            }

            /**
             * Uploads
             */
            if ($template['sg_is_uploads'])
            {

                $sql = 'CREATE TABLE `' . $tableNameUploads . '` (
                        `au_id` int(10) UNSIGNED NOT NULL,
                        `' . $pk . '` int(10) UNSIGNED DEFAULT NULL,
                        `upl_id` int(10) UNSIGNED NOT NULL,
                        `au_order_num` int(10) UNSIGNED NOT NULL DEFAULT "1",
                        `session_id` varchar(255) DEFAULT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;';
                $this->dbh->modifyRequest($sql);

                $sql = 'ALTER TABLE `' . $tableNameUploads . '`
                          ADD PRIMARY KEY (`au_id`),
                          ADD KEY `' . $pk . '` (`' . $pk . '`),
                          ADD KEY `upl_id` (`upl_id`);';
                $this->dbh->modifyRequest($sql);

                $sql = 'ALTER TABLE `' . $tableNameUploads . '`
                    MODIFY `au_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;';
                $this->dbh->modifyRequest($sql);


                $sql = 'ALTER TABLE `' .$tableNameUploads . '`
                          ADD CONSTRAINT `' . $tableNameUploads . '_0_' .  $pk . '` FOREIGN KEY (`' . $pk . '`) REFERENCES `' . $tableName . '` (`' . $pk . '`) ON DELETE CASCADE ON UPDATE CASCADE,
                          ADD CONSTRAINT `' . $tableNameUploads . '_upl_id' . '` FOREIGN KEY (`upl_id`) REFERENCES `share_uploads` (`upl_id`) ON DELETE CASCADE ON UPDATE CASCADE;';
                $this->dbh->modifyRequest($sql);


                $sql = 'CREATE TABLE `' . $tableNameUploadsTr . '` (
              `au_id` int(10) UNSIGNED NOT NULL,
              `lang_id` int(10) UNSIGNED NOT NULL,
              `file_alt` varchar(255) DEFAULT NULL
               ) ENGINE=InnoDB DEFAULT CHARSET=utf8;';
                $this->dbh->modifyRequest($sql);

                $sql = 'ALTER TABLE `' . $tableNameUploadsTr . '`
                      ADD PRIMARY KEY (`au_id`,`lang_id`),
                      ADD KEY `lang_id` (`lang_id`);';
                $this->dbh->modifyRequest($sql);

                $sql = 'ALTER TABLE `' . $tableNameUploadsTr . '`
                      ADD CONSTRAINT `' . $tableNameUploadsTr . '_au_id' . '` FOREIGN KEY (`au_id`) REFERENCES `' . $tableNameUploads . '` (`au_id`) ON DELETE CASCADE ON UPDATE CASCADE,
                      ADD CONSTRAINT `' . $tableNameUploadsTr . '_lang_id' . '` FOREIGN KEY (`lang_id`) REFERENCES `share_languages` (`lang_id`) ON DELETE CASCADE ON UPDATE CASCADE;';
                $this->dbh->modifyRequest($sql);

            }




            /**
             * Filter
             */
            if ($template['sg_is_filter'])
            {

                $sql = 'CREATE TABLE `' . $tableNameFilter . '` (
                          `filter_id` int(10) UNSIGNED NOT NULL,
                          `filter_pid` int(10) UNSIGNED DEFAULT NULL,
                          `filter_order_num` int(10) NOT NULL DEFAULT \'1\',
                          `filter_img` varchar(255) DEFAULT NULL,
                          `filter_is_active` tinyint(1) NOT NULL DEFAULT \'1\',
                          `filter_is_feature` tinyint(1) NOT NULL DEFAULT \'1\',
                          `filter_system_name` varchar(255) DEFAULT NULL,
                          `filter_is_similar_product` tinyint(1) NOT NULL DEFAULT \'0\'
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;';
                $this->dbh->modifyRequest($sql);

                $sql = 'CREATE TABLE `' . $tableNameFilterData . '` (
                          `fd_id` int(10) UNSIGNED NOT NULL,
                          `filter_id` int(10) UNSIGNED NOT NULL,
                          `target_id` int(10) UNSIGNED DEFAULT NULL,
                          `session_id` varchar(255) DEFAULT NULL
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;';
                $this->dbh->modifyRequest($sql);

                $sql = 'CREATE TABLE `' . $tableNameFilterTr . '` (
                          `filter_id` int(10) UNSIGNED NOT NULL,
                          `lang_id` int(10) UNSIGNED NOT NULL,
                          `filter_name` varchar(255) NOT NULL,
                          `filter_descr_rtf` text
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;';
                $this->dbh->modifyRequest($sql);

                $sql = 'ALTER TABLE `'. $tableNameFilter . '`
                          ADD PRIMARY KEY (`filter_id`),
                          ADD KEY `filter_pid` (`filter_pid`),
                          ADD KEY `filter_order_num` (`filter_order_num`);';
                $this->dbh->modifyRequest($sql);

                $sql = 'ALTER TABLE `' . $tableNameFilterData . '`
                          ADD PRIMARY KEY (`fd_id`),
                          ADD KEY `filter_id` (`filter_id`),
                          ADD KEY `target_id` (`target_id`);;';
                $this->dbh->modifyRequest($sql);

                $sql = 'ALTER TABLE `' . $tableNameFilterTr .  '`
                          ADD PRIMARY KEY (`filter_id`,`lang_id`),
                          ADD KEY `lang_id` (`lang_id`);';
                $this->dbh->modifyRequest($sql);

                $sql = 'ALTER TABLE `' . $tableNameFilter . '`
                          MODIFY `filter_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;';
                $this->dbh->modifyRequest($sql);

                $sql = 'ALTER TABLE `' . $tableNameFilterData . '`
                          MODIFY `fd_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;';
                $this->dbh->modifyRequest($sql);

                $sql = 'ALTER TABLE `' . $tableNameFilter . '`
                            ADD CONSTRAINT `' . $tableNameFilter . '_filter_id_pid' . '` FOREIGN KEY (`filter_pid`) REFERENCES `' . $tableNameFilter . '` (`filter_id`) ON DELETE CASCADE ON UPDATE CASCADE;';
                $this->dbh->modifyRequest($sql);

                $sql = 'ALTER TABLE `' . $tableNameFilterData . '`
                          ADD CONSTRAINT `' . $tableNameFilterData . '_filter_id_id' . '` FOREIGN KEY (`filter_id`) REFERENCES `' . $tableNameFilter. '` (`filter_id`) ON DELETE CASCADE ON UPDATE CASCADE,
                          ADD CONSTRAINT `' . $tableNameFilterData . '_target_id_id' . '` FOREIGN KEY (`target_id`) REFERENCES `' . $tableName . '` (`' . $pk . '`) ON DELETE CASCADE ON UPDATE CASCADE;';
                $this->dbh->modifyRequest($sql);

            }

        }
        finally
        {
            $this->dbh->modifyRequest('SET FOREIGN_KEY_CHECKS=1;');
        }

    }

    public function createTemplateFile($source, $target, $componentName, $className)
    {
        $content = file_get_contents(TemplateWizard::WIZARD_PATH . 'templates/content/' . $source.  '.xml');

        $content = str_replace('default_template_name', $componentName, $content);
        $content = str_replace('default_template_class', $className, $content);

        $file = TemplateWizard::TEMPLATES_PATH . 'templates/content/' . $target . '.content.xml';
        $this->log('Building file ' . $file);
        $this->writeFile($file, $content);
    }

    public function createClassList($source, $className, $tableName)
    {
        $content = file_get_contents(TemplateWizard::WIZARD_PATH . 'components/' . $source.  '.class.php');

        $content = str_replace($source, $className, $content);
        $content = str_replace('DefaultTemplateTableName', $tableName, $content);

        $file = TemplateWizard::TEMPLATES_PATH . 'components/' . $className . '.class.php';
        $this->log('Building file ' . $file);
        $this->writeFile($file, $content);
    }

    public function createClassJs($source, $className)
    {
        $content = file_get_contents(TemplateWizard::WIZARD_PATH . 'scripts/' . $source.  '.js');

        $content = str_replace($source, $className, $content);

        $file = TemplateWizard::TEMPLATES_PATH . 'scripts/' . $className . '.js';
        $this->log('Building file ' . $file);
        $this->writeFile($file, $content);
    }

    public function createClassListConfig($source, $className, $pk, $fields, $fieldsTr, $isTr, $isJs, $isFeed = 0)
    {
        $content = file_get_contents(TemplateWizard::WIZARD_PATH . 'config/' . $source . '.component.xml');

        $j = '<javascript>
			<behavior name="' . $className .  '"/>
		</javascript>';

        $f = '<field name="' . $pk . '"/>' . "\n";

        if ($isTr)
        {
            $f .= "\t\t\t" . '<field name="lang_id"/>' . "\n";
        }

        if ($isFeed == 2)
        {
            $f .= "\t\t\t" . '<field name="smap_id"/>' . "\n";
        }

        if (is_array($fields) && count($fields))
        {
            foreach ($fields as $key => $row)
            {
                $f .= "\t\t\t" . '<field name="' . $key . '"/>' . "\n";
            }
        }

        if ($isTr && is_array($fieldsTr) && count($fieldsTr))
        {
            foreach ($fieldsTr as $key => $row)
            {
                $f .= "\t\t\t" . '<field name="' . $key . '"/>' . "\n";
            }
        }

        $content = str_replace('<!--fields-->', $f, $content);
        if ($isJs)
        {
            $content = str_replace('<!--js-->', $j, $content);
        }


        $file = TemplateWizard::TEMPLATES_PATH . 'config/' . $className . '.component.xml';
        $this->log('Building file ' . $file);
        $this->writeFile($file, $content);
    }

    public function prepareFields($fields)
    {

        $result = [];
        if (is_string($fields) && strlen($fields) > 0)
        {
            $fields = explode("\n", $fields);
            foreach ($fields as $field)
            {
                $field = trim($field);

                if (strlen($field) == 0)
                {
                    continue;
                }

                $result[$field] = $field;

                if (strpos($field, '_id') !== false || strpos($field, '_number') !== false)
                {
                    $result[$field] = 'INT(10) UNSIGNED DEFAULT NULL';
                }
                elseif (strpos($field, '_is_') !== false)
                {
                    $result[$field] = 'TINYINT(1) NOT NULL DEFAULT \'0\'';
                }
                elseif (strpos($field, '_date') !== false)
                {
                    $result[$field] = 'DATETIME DEFAULT NULL';
                }
                elseif (strpos($field, '_rtf') !== false)
                {
                    $result[$field] = 'TEXT DEFAULT NULL';
                }
                elseif (strpos($field, '_text') !== false)
                {
                    $result[$field] = 'TEXT DEFAULT NULL';
                }
                elseif (strpos($field, '_price') !== false)
                {
                    $result[$field] = 'DECIMAL (10,2) DEFAULT NULL';
                }
                else
                {
                    $result[$field] = 'VARCHAR(255) DEFAULT NULL';
                }

                $result[$field] = '`' . $field .'` ' . $result[$field];

            }
        }
        return $result;
    }


    public function isTableExists($tableName)
    {
        $result = false;
        $query = 'SHOW TABLES LIKE \'' . $tableName . '\'';
        $res = $this->dbh->selectRequest($query);
        if (is_array($res) && count($res) > 0)
        {
            $result = true;
        }

        return $result;
    }

    public function log($message)
    {
        echo $message . "\n";
    }

    private function writeFile(string $path, string $content): void
    {
        if (!array_key_exists($path, $this->fileChanges))
        {
            $this->fileChanges[$path] = file_exists($path) ? file_get_contents($path) : null;
        }

        $directory = dirname($path);
        if (!is_dir($directory))
        {
            if (!mkdir($directory, 0777, true) && !is_dir($directory))
            {
                throw new \RuntimeException('Cannot create directory: ' . $directory);
            }
        }

        file_put_contents($path, $content);
    }

    private function revertFileChanges(): void
    {
        if (!$this->fileChanges)
        {
            return;
        }

        foreach (array_reverse($this->fileChanges, true) as $path => $originalContent)
        {
            if ($originalContent === null)
            {
                if (file_exists($path))
                {
                    @unlink($path);
                }
            }
            else
            {
                file_put_contents($path, $originalContent);
            }
        }
    }

    private function isTransactionActive(): bool
    {
        try
        {
            $pdo = $this->dbh->getPDO();
            if ($pdo instanceof \PDO && $pdo->inTransaction())
            {
                return true;
            }
        }
        catch (\Throwable)
        {
        }

        try
        {
            $dbal = $this->dbh->getDbal();
            if ($dbal instanceof \Doctrine\DBAL\Connection && $dbal->isTransactionActive())
            {
                return true;
            }
        }
        catch (\Throwable)
        {
        }

        return false;
    }
}
