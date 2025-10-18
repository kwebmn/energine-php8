<?php

declare(strict_types=1);

/**
 * File repository (репозиторий файлов).
 * Совместимо с PHP 8.3. Добавлены строгие типы, аккуратные проверки входных данных,
 * безопасная работа с репозиторием и JSON-ответами.
 */
final class FileRepository extends Grid implements SampleFileRepository
{
    /** Путь к временной директории. */
    public const TEMPORARY_DIR = 'uploads/temp/';

    /** Псевдотип строки для перехода «вверх». */
    public const TYPE_FOLDER_UP = 'folderup';

    /** Имя cookie с последним открытым PID. */
    public const STORED_PID = 'NRGNFRPID';

    /** Информация о репозиториях. */
    protected FileRepoInfo $repoinfo;

    /**
     * @copydoc Grid::__construct
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);

        $this->repoinfo = E()->FileRepoInfo;
        $this->setTableName('share_uploads');
        $this->setFilter(['upl_is_active' => 1]);
        $this->setOrder(['upl_publication_date' => QAL::DESC]);
        $this->addTranslation('TXT_NOT_READY', 'FIELD_UPL_IS_READY', 'ERR_UPL_NOT_READY');

        // Если открыто в модальном окне — зафиксируем последнюю папку
        if (!empty($_POST['modalBoxData']))
        {
            $d = json_decode((string)$_POST['modalBoxData']);
            if ($d)
            {
                $uplPID = null;

                if (isset($d->upl_pid))
                {
                    $uplPID = (int)$this->dbh->getScalar(
                        $this->getTableName(),
                        'upl_id',
                        ['upl_id' => (int)$d->upl_pid]
                    );
                }
                elseif (isset($d->upl_path))
                {
                    $uplPID = (int)$this->dbh->getScalar(
                        $this->getTableName(),
                        'upl_pid',
                        ['upl_path' => (string)$d->upl_path]
                    );
                }

                if ($uplPID)
                {
                    $site = E()->getSiteManager()->getCurrentSite();
                    $this->response->addCookie(
                        self::STORED_PID,
                        (string)$uplPID,
                        0,
                        $site->host,
                        $site->root
                    );
                }
            }
        }
    }

    /**
     * @inheritDoc
     */
    protected function loadDataDescription(): array|false|null
    {
        $description = parent::loadDataDescription();

        if (is_array($description))
        {
            // В мульти-язычном репозитории появляются дубликаты полей загрузки/имени
            // при построении формы. Отключаем для них признак мультиязычности, чтобы
            // выводился только один набор полей вне зависимости от количества языков.
            foreach (['upl_path', 'upl_title', 'upl_name', 'upl_filename'] as $singleLanguageField)
            {
                if (isset($description[$singleLanguageField]['isMultilanguage']))
                {
                    unset($description[$singleLanguageField]['isMultilanguage']);
                }
            }
        }

        return $description;
    }

    /**
     * Прокси-метод редактирования: определяет, файл это или директория.
     */
    protected function edit(): void
    {
        [$uplID] = $this->getStateParams();
        $uplID = (int)$uplID;

        $type = (int)$this->dbh->getScalar(
            $this->getTableName(),
            'upl_internal_type',
            ['upl_id' => $uplID]
        );

        if ($type === FileRepoInfo::META_TYPE_FOLDER)
        {
            $this->editDir($uplID);
        }
        else
        {
            $this->editFile($uplID);
        }
    }

    /**
     * Добавление видео в текстовые блоки.
     */
    protected function putVideo(): void
    {
        [$uplID] = $this->getStateParams();
        $uplID = (int)$uplID;

        $this->setType(self::COMPONENT_TYPE_FORM_ALTER);
        $this->setBuilder($this->createBuilder());
        $this->setDataDescription($this->createDataDescription());
        $this->addFilterCondition(['upl_id' => $uplID]);
        $this->setData($this->createData());

        if ($toolbars = $this->createToolbar())
        {
            $this->addToolbar($toolbars);
        }

        $this->js = $this->buildJS();
        $this->setAction('save/');
    }

    /**
     * Форма редактирования директории.
     */
    private function editDir(int $uplID): void
    {
        $this->setFilter(['upl_id' => $uplID]);
        $this->setType(self::COMPONENT_TYPE_FORM_ALTER);
        $this->setBuilder($this->createBuilder());

        $dd = new DataDescription();

        $fd = new FieldDescription('upl_id');
        $fd->setProperty('tableName', $this->getTableName());
        $fd->setType(FieldDescription::FIELD_TYPE_HIDDEN);
        $fd->setProperty('key', true);
        $dd->addFieldDescription($fd);

        $fd = new FieldDescription('upl_pid');
        $fd->setProperty('tableName', $this->getTableName());
        $fd->setType(FieldDescription::FIELD_TYPE_HIDDEN);
        $dd->addFieldDescription($fd);

        $fd = new FieldDescription('upl_title');
        $fd->setProperty('tableName', $this->getTableName());
        $fd->setType(FieldDescription::FIELD_TYPE_STRING);
        $dd->addFieldDescription($fd);

        $this->setDataDescription($dd);
        $this->setData($this->createData());

        if ($toolbars = $this->createToolbar())
        {
            $this->addToolbar($toolbars);
        }

        $this->js = $this->buildJS();
        $this->setAction('save-dir/');
    }

    /**
     * Форма редактирования файла.
     */
    private function editFile(int $uplID): void
    {
        $this->setType(self::COMPONENT_TYPE_FORM_ALTER);
        $this->setBuilder($this->createBuilder());
        $this->setDataDescription($this->createDataDescription());
        $this->addFilterCondition(['upl_id' => $uplID]);

        $repository = $this->repoinfo->getRepositoryInstanceById($uplID);

        // Если репозиторий только для чтения — поле пути делаем read-only
        if (!$repository->allowsUploadFile())
        {
            if ($fd = $this->getDataDescription()->getFieldDescriptionByName('upl_path'))
            {
                $fd->setMode(FieldDescription::FIELD_MODE_READ);
                $fd->setProperty('title', 'FIELD_UPL_PATH_READ');
            }
        }

        $this->setData($this->createData());

        if ($toolbars = $this->createToolbar())
        {
            $this->addToolbar($toolbars);
        }

        $this->js = $this->buildJS();
        $this->setAction('save/');

        $this->createThumbFields();
    }

    /**
     * Создаёт вкладку с превьюшками (thumbs) согласно конфигу.
     */
    private function createThumbFields(): void
    {
        $thumbs = $this->getConfigValue('thumbnails');
        if (!$thumbs)
        {
            return;
        }

        $tabName = $this->translate('TXT_THUMBS');
        foreach ((array)$thumbs as $name => $data)
        {
            $fd = new FieldDescription((string)$name);
            $fd->setType(FieldDescription::FIELD_TYPE_THUMB);
            $fd->setProperty('tabName', $tabName);
            $fd->setProperty('tableName', 'thumbs');

            foreach ((array)$data as $attrName => $attrValue)
            {
                $fd->setProperty((string)$attrName, $attrValue);
            }

            $this->getDataDescription()->addFieldDescription($fd);
        }
    }

    /**
     * Форма добавления директории.
     */
    protected function addDir(): void
    {
        $sp = $this->getStateParams(true);
        $uplPID = isset($sp['pid']) ? (int)$sp['pid'] : 0;

        $this->setType(self::COMPONENT_TYPE_FORM_ADD);
        $this->setBuilder($this->createBuilder());
        $this->setDataDescription($this->createDataDescription());

        $data = new Data();
        $f = new Field('upl_pid');
        $f->setData($uplPID);
        $data->addField($f);
        $this->setData($data);

        if ($toolbars = $this->createToolbar())
        {
            $this->addToolbar($toolbars);
        }
        $this->js = $this->buildJS();
        $this->setAction('save-dir/');
    }

    /**
     * Сохранение директории.
     *
     * @throws SystemException
     */
    protected function saveDir(): void
    {
        $tx = $this->dbh->beginTransaction();

        try
        {
            $tbl = $this->getTableName();
            $pk  = $this->getPK();

            if (
                empty($_POST[$tbl]) ||
                !isset($_POST[$tbl][$pk], $_POST[$tbl]['upl_title'], $_POST[$tbl]['upl_pid'])
            ) {
                throw new SystemException('ERR_NO_DATA');
            }

            $data = $_POST[$tbl];
            $uplPID = (int)$data['upl_pid'];
            if ($uplPID <= 0)
            {
                throw new SystemException('ERR_BAD_PID');
            }

            $repository = $this->repoinfo->getRepositoryInstanceById($uplPID);

            $mode = (empty($data[$pk])) ? QAL::INSERT : QAL::UPDATE;
            $where = null;

            if ($mode === QAL::INSERT)
            {
                $parent = $this->dbh->select($tbl, ['upl_path'], ['upl_id' => $uplPID]);
                if (empty($parent))
                {
                    throw new SystemException('ERR_BAD_PID');
                }

                $parentPath = (string)current($parent)['upl_path'];
                $parentPath = rtrim($parentPath, '/');

                unset($data[$pk]);
                $safeName = Translit::asURLSegment($data['upl_title']);
                $data['upl_name']             = $safeName;
                $data['upl_filename']         = $safeName;
                $data['upl_mime_type']        = 'unknown/mime-type';
                $data['upl_internal_type']    = FileRepoInfo::META_TYPE_FOLDER;
                $data['upl_childs_count']     = 0;
                $data['upl_publication_date'] = date('Y-m-d H:i:s');
                $data['upl_path']             = $parentPath . '/' . $safeName;

                $repository->createDir($data['upl_path']);
            }
            else
            {
                // Для UPDATE меняем только метаданные каталога
                $where = ['upl_id' => (int)$data['upl_id']];
            }

            $result = $this->dbh->modify($mode, $tbl, $data, $where);

            // фиксация
            $tx = !($this->dbh->commit());

            $uplID = is_int($result) ? $result : (int)$_POST[$tbl][$pk];

            // ВАЖНО: DBA::call ожидает аргументы по ссылке — нельзя передавать литерал массива
            $args = [$uplID, date('Y-m-d H:i:s')];
            $this->dbh->call('proc_update_dir_date', $args);

            $b = new JSONCustomBuilder();
            $b->setProperties([
                'data'   => $uplID,
                'result' => true,
                'mode'   => is_int($result) ? 'insert' : 'update',
            ]);
            $this->setBuilder($b);
        }
        catch (SystemException $e)
        {
            if ($tx)
            {
                $this->dbh->rollback();
            }
            throw $e;
        }
    }

    /**
     * Сохранение превьюшек (альтов).
     *
     * @throws SystemException
     */
    private function saveThumbs(array $thumbsData, string $baseFileName, $repo): void
    {
        $thumbProps = (array)$this->getConfigValue('thumbnails');

        foreach ($thumbsData as $thumbName => $thumbTmpName)
        {
            if (!$thumbTmpName)
            {
                continue;
            }

            $w = (int)($thumbProps[$thumbName]['width']  ?? 0);
            $h = (int)($thumbProps[$thumbName]['height'] ?? 0);

            try
            {
                $repo->uploadAlt($thumbTmpName, $baseFileName, $w, $h);
            }
            catch (\Exception $e)
            {
                throw new SystemException('ERR_SAVE_THUMBNAIL', SystemException::ERR_CRITICAL, (string)$e);
            }
        }
    }

    /**
     * @copydoc Grid::save
     *
     * @throws SystemException
     */
    protected function save(): void
    {
        $tx = $this->dbh->beginTransaction();

        try
        {
            $tbl = $this->getTableName();
            $pk  = $this->getPK();

            if (
                empty($_POST[$tbl]) ||
                !isset($_POST[$tbl][$pk], $_POST[$tbl]['upl_title'], $_POST[$tbl]['upl_pid'])
            ) {
                throw new SystemException('ERR_NO_DATA');
            }

            $data = $_POST[$tbl];
            $uplPID = (int)$data['upl_pid'];
            if ($uplPID <= 0)
            {
                throw new SystemException('ERR_BAD_PID');
            }

            $repository = $this->repoinfo->getRepositoryInstanceById($uplPID);

            $mode = (empty($data[$pk])) ? QAL::INSERT : QAL::UPDATE;

            // INSERT: загрузка нового файла
            if ($mode === QAL::INSERT)
            {
                $tmpFileName = (string)$data['upl_path'];

                $uplPath = (string)$this->dbh->getScalar(
                    $tbl,
                    'upl_path',
                    ['upl_id' => $uplPID]
                );
                $uplPath = rtrim($uplPath, '/');
                if ($uplPath === '')
                {
                    throw new SystemException('ERR_BAD_PID');
                }

                unset($data[$pk]);

                $ext = strtolower((string)pathinfo((string)$data['upl_filename'], PATHINFO_EXTENSION));
                $data['upl_filename']         = self::generateFilename($uplPath . '/', $ext);
                $data['upl_path']             = $uplPath . '/' . $data['upl_filename'];

                $fi = $repository->uploadFile($tmpFileName, $data['upl_path']);
                if (!$fi)
                {
                    throw new SystemException('ERR_SAVE_FILE');
                }

                $data['upl_mime_type']        = $fi->mime;
                $data['upl_internal_type']    = $fi->type;
                $data['upl_width']            = $fi->width;
                $data['upl_height']           = $fi->height;
                $data['upl_is_ready']         = $fi->ready;
                $data['upl_publication_date'] = date('Y-m-d H:i:s');

                // Флаги форматов видео
                switch ($ext)
                {
                    case 'mp4':  $data['upl_is_mp4']  = '1';
                        break;
                    case 'webm': $data['upl_is_webm'] = '1';
                        break;
                    case 'flv':  $data['upl_is_flv']  = '1';
                        break;
                }

                $result = $this->dbh->modify($mode, $tbl, $data);
            }
            // UPDATE: обновление содержимого файла
            else
            {
                $pkVal       = (int)$data[$pk];
                $oldUplPath  = (string)$this->dbh->getScalar($tbl, 'upl_path', [$pk => $pkVal]);
                $newTmpPath  = (string)$data['upl_path'];

                unset($data['upl_path']);

                if ($newTmpPath !== '' && $newTmpPath !== $oldUplPath)
                {
                    $oldMime = (string)$this->dbh->getScalar($tbl, 'upl_mime_type', [$pk => $pkVal]);
                    $newInfo = $repository->analyze($newTmpPath);
                    if ($newInfo && (string)$newInfo->mime !== $oldMime)
                    {
                        throw new SystemException('ERR_INCORRECT_MIME');
                    }

                    if (!$repository->updateFile($newTmpPath, $oldUplPath))
                    {
                        throw new SystemException('ERR_SAVE_FILE');
                    }

                    $fi = $repository->analyze($newTmpPath);
                    if ($fi)
                    {
                        $data['upl_width']  = $fi->width;
                        $data['upl_height'] = $fi->height;
                    }

                    $data['upl_publication_date'] = date('Y-m-d H:i:s');
                }

                $result = $this->dbh->modify($mode, $tbl, $data, [$pk => $pkVal]);
                $data['upl_path'] = $oldUplPath;
            }

            // Превьюшки
            if (!empty($_POST['thumbs']) && is_array($_POST['thumbs']))
            {
                $this->saveThumbs($_POST['thumbs'], (string)$data['upl_path'], $repository);
            }

            // фиксация
            $tx = !($this->dbh->commit());

            $uplID = is_int($result) ? $result : (int)$_POST[$tbl][$pk];

            if ($mode === QAL::INSERT)
            {
                // ВАЖНО: DBA::call ожидает аргументы по ссылке — нельзя передавать литерал массива
                $args = [$uplID, $data['upl_publication_date']];
                $this->dbh->call('proc_update_dir_date', $args, false);
            }

            $b = new JSONCustomBuilder();
            $b->setProperties([
                'data'   => $uplID,
                'result' => true,
                'mode'   => is_int($result) ? 'insert' : 'update',
            ]);
            $this->setBuilder($b);
        }
        catch (SystemException $e)
        {
            if ($tx)
            {
                $this->dbh->rollback();
            }
            throw $e;
        }
    }

    /**
     * @copydoc Grid::add
     */
    protected function add(): void
    {
        $sp = $this->getStateParams(true);
        $uplPID = isset($sp['pid']) ? (int)$sp['pid'] : 0;

        $this->setType(self::COMPONENT_TYPE_FORM_ADD);
        $this->setBuilder($this->createBuilder());
        $this->setDataDescription($this->createDataDescription());

        $data = new Data();
        $f = new Field('upl_pid');
        $f->setData($uplPID);
        $data->addField($f);
        $this->setData($data);

        if ($toolbars = $this->createToolbar())
        {
            $this->addToolbar($toolbars);
        }

        $this->js = $this->buildJS();
        $this->setAction('save/');

        $this->createThumbFields();
    }

    /**
     * @copydoc Grid::loadData
     *
     * В getRawData — добавляет права (allows*) от конкретного репозитория.
     */
    protected function loadData(): array|false|null
    {
        $result = parent::loadData();

        if ($this->getState() === 'getRawData' && is_array($result))
        {
            $sp = $this->getStateParams(true);
            $uplPID = !empty($sp['pid']) ? (int)$sp['pid'] : 0;

            if ($uplPID > 0)
            {
                $repo = $this->repoinfo->getRepositoryInstanceById($uplPID);
                $repo->prepare($result);

                foreach ($result as $i => $row)
                {
                    $result[$i]['upl_allows_create_dir']  = $repo->allowsCreateDir();
                    $result[$i]['upl_allows_upload_file'] = $repo->allowsUploadFile();
                    $result[$i]['upl_allows_edit_dir']    = $repo->allowsEditDir();
                    $result[$i]['upl_allows_edit_file']   = $repo->allowsEditFile();
                    $result[$i]['upl_allows_delete_dir']  = $repo->allowsDeleteDir();
                    $result[$i]['upl_allows_delete_file'] = $repo->allowsDeleteFile();
                }
            }
        }

        return $result;
    }

    /**
     * @copydoc Grid::getRawData
     *
     * Подключает JSONRepoBuilder и добавляет «папку вверх».
     */
    protected function getRawData(): void
    {
        $sp = $this->getStateParams(true);

        // pid может отсутствовать → работаем с корнем (upl_pid IS NULL)
        $uplPID = isset($sp['pid']) ? (int)$sp['pid'] : 0;

        // Если pid передан, а в cookie помним последний pid — проверим валидность.
        if ($uplPID > 0 && isset($_COOKIE[self::STORED_PID]))
        {
            $exists = (int)$this->dbh->getScalar(
                $this->getTableName(),
                'upl_id',
                ['upl_id' => $uplPID]
            );
            if ($exists <= 0)
            {
                $uplPID = 0; // валидности нет → уходим в корень
            }
        }

        // ВАЖНО: для корня используем массив с null, чтобы получить "upl_pid IS NULL"
        if ($uplPID === 0)
        {
            $this->addFilterCondition(['upl_pid' => null]);
        }
        else
        {
            $this->addFilterCondition(['upl_pid' => $uplPID]);
        }

        parent::getRawData();

        // Переопределяем билдер
        $this->setBuilder(new JSONRepoBuilder());
        if ($this->pager)
        {
            $this->getBuilder()->setPager($this->pager);
        }

        // «Папка вверх» + хлебные крошки только если мы внутри какой-то папки
        if ($uplPID > 0)
        {
            $data = $this->getData();

            // Родитель текущего
            $parentId = $this->dbh->getScalar($this->getTableName(), 'upl_pid', ['upl_id' => $uplPID]);
            $parentId = is_null($parentId) ? 0 : (int)$parentId;

            // Права/возможности для виртуальной строки "вверх"
            $repo = $this->repoinfo->getRepositoryInstanceById($uplPID);
            $newRow = [
                'upl_id'                 => $parentId,
                'upl_pid'                => $uplPID,
                'upl_title'              => '...',
                'upl_internal_type'      => self::TYPE_FOLDER_UP,
                'upl_allows_create_dir'  => $repo->allowsCreateDir(),
                'upl_allows_upload_file' => $repo->allowsUploadFile(),
                'upl_allows_edit_dir'    => $repo->allowsEditDir(),
                'upl_allows_edit_file'   => $repo->allowsEditFile(),
                'upl_allows_delete_dir'  => $repo->allowsDeleteDir(),
                'upl_allows_delete_file' => $repo->allowsDeleteFile(),
            ];

            // Хлебные крошки (DBA::call ожидает аргументы по ссылке → используем переменную)
            $args = [$uplPID];
            $res  = $this->dbh->call('proc_get_upl_pid_list', $args);
            if (!empty($res))
            {
                $crumbs = [];
                foreach ($res as $row)
                {
                    $crumbs[$row['id']] = $row['title'];
                }
                $this->getBuilder()->setBreadcrumbs(array_reverse($crumbs, true));
            }

            // Вставка строки «вверх»
            if (!$data->isEmpty())
            {
                foreach ($this->getDataDescription()->getFieldDescriptionList() as $fieldName)
                {
                    if ($f = $data->getFieldByName($fieldName))
                    {
                        $f->addRowData($newRow[$fieldName] ?? '', false);
                    }
                }
            }
            else
            {
                $data->load([$newRow]);
            }
        }
    }

    /**
     * Загрузка ZIP (через временный файл). Черновик.
     */
    protected function uploadZip(): void
    {
        $builder = new JSONCustomBuilder();
        $this->setBuilder($builder);

        $tx = false;
        try
        {
            if (!isset($_POST['data'], $_POST['PID']))
            {
                throw new SystemException('ERR_BAD_DATA', SystemException::ERR_CRITICAL);
            }

            $fileName   = tempnam(self::TEMPORARY_DIR, 'zip');
            $tmpFile    = (string)$_POST['data'];

            $copyError = null;
            set_error_handler(static function (int $severity, string $message) use (&$copyError): bool
            {
                $copyError = $message;
                return true;
            });
            $copied = copy($tmpFile, $fileName);
            restore_error_handler();
            if ($copied === false)
            {
                $context = $copyError !== null ? ['error' => $copyError] : [];
                throw new SystemException('ERR_CANT_CREATE_FILE', SystemException::ERR_CRITICAL, null, null, $context);
            }

            $uplPID = (int)$_POST['PID'];
            $tx = $this->dbh->beginTransaction();

            $extractPath = (string)$this->dbh->getScalar($this->getTableName(), 'upl_path', ['upl_id' => $uplPID]);

            $zip = new ZipArchive();
            $zip->open($fileName);

            for ($i = 0; $i < $zip->numFiles; $i++)
            {
                $stat = $zip->statIndex($i);
                $currentFile = $stat['name'];

                $pi = pathinfo($currentFile);

                // пропуск скрытых и служебных
                if (substr($pi['filename'] ?? '', 0, 1) === '.' || str_contains($currentFile, 'MACOSX'))
                {
                    continue;
                }

                $dir = ($pi['dirname'] ?? '.') === '.' ? '' : Translit::transliterate(addslashes($pi['dirname'])) . '/';
                if (empty($pi['extension']))
                {
                    // директория
                    $zip->renameIndex($i, $dir . Translit::transliterate($pi['filename'] ?? ''));
                }
                else
                {
                    $zip->renameIndex($i, $dir . self::generateFilename('', (string)$pi['extension']));
                }
            }
            $zip->close();

            // Черновик: прерываемся специальной ошибкой
            throw new SystemException('ERR_FAKE');
        }
        catch (SystemException $e)
        {
            if ($tx)
            {
                $this->dbh->rollback();
            }
            // намеренно без rethrow: это экспериментальный путь
        }
    }

    /**
     * Путь к временному файлу.
     */
    public static function getTmpFilePath(string $filename): string
    {
        return self::TEMPORARY_DIR . basename($filename);
    }

    /**
     * Генерация уникального файла в каталоге.
     */
    public static function generateFilename(string $dirPath, string $fileExtension): string
    {
        $dirPath = rtrim($dirPath, '/') . '/';
        $c = 0;
        do
        {
            $filename = time() . rand(1, 10000) . ($c ? (string)$c : '') . '.' . ltrim($fileExtension, '.');
            $c++;
        }
        while (file_exists($dirPath . $filename));

        return $filename;
    }

    /**
     * Загрузка временного файла (XHR/iframe fallback).
     */
    protected function uploadTemporaryFile(): void
    {
        $builder = new JSONCustomBuilder();
        $this->setBuilder($builder);

        header('Content-Type: application/json; charset=utf-8');

        if (!empty($_SERVER['HTTP_ORIGIN']))
        {
            header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
            header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
            header('Access-Control-Allow-Headers: Origin, X-Requested-With');
        }

        if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS')
        {
            exit();
        }

        $response = [
            'name'      => '',
            'type'      => '',
            'tmp_name'  => '',
            'error'     => false,
            'error_message' => '',
            'size'      => 0,
            'preview'   => '',
        ];

        try
        {
            if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST')
            {
                header('HTTP/1.1 201 Created');
                $key = $_POST['key'] ?? 'unknown';

                if (isset($_FILES[$key]) && is_uploaded_file($_FILES[$key]['tmp_name']))
                {
                    $tmpName = self::getTmpFilePath($_FILES[$key]['name']);

                    if (!is_writable(dirname($tmpName)))
                    {
                        throw new SystemException('ERR_TEMP_DIR_WRITE', SystemException::ERR_CRITICAL, dirname($tmpName));
                    }

                    if (move_uploaded_file($_FILES[$key]['tmp_name'], $tmpName))
                    {
                        $response['name']     = $_FILES[$key]['name'];
                        $response['type']     = $_FILES[$key]['type'];
                        $response['tmp_name'] = $tmpName;
                        $response['error']    = (bool)$_FILES[$key]['error'];
                        $response['size']     = (int)$_FILES[$key]['size'];
                    }
                    else
                    {
                        $response['error'] = true;
                        $response['error_message'] = 'ERR_NO_FILE';
                    }
                }
                else
                {
                    $response['error'] = true;
                    $response['error_message'] = 'ERR_NO_FILE';
                }
            }
            else
            {
                $response['error'] = true;
                $response['error_message'] = 'ERR_INVALID_REQUEST_METHOD';
            }
        }
        catch (\Exception $e)
        {
            $response['error'] = true;
            $response['result'] = false;
            $response['error_message'] = (string)$e->getMessage();
        }

        $builder->setProperties($response);
    }

    /**
     * Нормализация data:URI от FileReader.
     *
     * @throws SystemException
     */
    public static function cleanFileData(string $data, int $maxFileSize = 5242880): object
    {
        ini_set('pcre.backtrack_limit', (string)$maxFileSize);

        if (!preg_match('/data\:(.*);base64\,(.*)$/', $data, $m))
        {
            $errorMessage = 'ERR_BAD_FILE';
            switch (preg_last_error())
            {
                case PREG_INTERNAL_ERROR:        $errorMessage = 'ERR_PREG_INTERNAL';
                    break;
                case PREG_BACKTRACK_LIMIT_ERROR: $errorMessage = 'ERR_PREG_BACKTRACK_LIMIT';
                    break;
                case PREG_RECURSION_LIMIT_ERROR: $errorMessage = 'ERR_PREG_RECURSION_LIMIT';
                    break;
                case PREG_BAD_UTF8_ERROR:        $errorMessage = 'ERR_PREG_BAD_UTF8_ERROR';
                    break;
                case PREG_NO_ERROR:
                default:                         $errorMessage = 'ERR_BAD_FILE';
                    break;
            }
            throw new SystemException($errorMessage, SystemException::ERR_WARNING);
        }

        $mime   = (string)$m[1];
        $string = (string)$m[2];

        // Заменяем пробелы на плюсы для корректной base64-строки.
        $string = str_replace(' ', '+', $string);

        return (object)[
            'mime' => $mime,
            'data' => base64_decode($string),
        ];
    }

    /**
     * Удаление файла или директории с физическим удалением в репозитории.
     */
    public function delete()
    {
        [$uplID] = $this->getStateParams();
        $uplID = (int)$uplID;

        $repository = $this->repoinfo->getRepositoryInstanceById($uplID);
        $path = (string)$this->dbh->getScalar($this->getTableName(), 'upl_path', ['upl_id' => $uplID]);

        $isFolder = (int)$this->dbh->getScalar(
            $this->getTableName(),
            'upl_internal_type',
            ['upl_id' => $uplID]
        ) === FileRepoInfo::META_TYPE_FOLDER;

        if ($isFolder)
        {
            $repository->deleteDir($path);
        }
        else
        {
            $repository->deleteFile($path);
        }

        return parent::delete();
    }
}

/**
 * Пустой интерфейс для XSLT-окружения.
 */
interface SampleFileRepository
{
}
