<?php

declare(strict_types=1);

namespace Energine\Setup;

use PDO;
use RuntimeException;
use Throwable;

require_once 'JSqueeze.php';

/**
 * Main system setup.
 */
final class Setup
{
    /**
     * Symlink mode  - for development
     */
    public const MODE_SYMLINK = 'symlink';
    /**
     * Copy minified mode - for production
     */
    public const MODE_COPY = 'copy';

    /**
     * Path to the directory for uploads.
     */
    public const UPLOADS_PATH = 'uploads/public/';

    /**
     * Table name, where customer uploads are stored.
     */
    public const UPLOADS_TABLE = 'share_uploads';

    /**
     * System configurations.
     */
    private array $config;

    /**
     * Array of directories that will be created and where symbolic links will be placed from system core and site.
     */
    private array $htdocsDirs = [
        'images',
        'scripts',
        'stylesheets',
        'templates/content',
        'templates/icons',
        'templates/layout',
    ];

    /**
     * PDO connection.
     */
    private PDO $dbConnect;

    public function __construct(private bool $isFromConsole)
    {
        header('Content-Type: text/plain; charset=' . CHARSET);
        $this->title('Средство настройки CMF Energine');
        $this->checkEnvironment();
    }

    /**
     * Filter input arguments from potential attacks.
     * If input argument contain symbols except letters, numbers, @c "-", @c "." and @c "/" then exception error will be thrown.
     *
     * @param string $var Input argument.
     * @return string
     *
     * @throws RuntimeException 'Некорректные данные системных переменных, возможна атака на сервер.'
     */
    private function filterInput(string $var): string
    {
        if (preg_match('/^[\~\-0-9a-zA-Z\/\.\_]+$/i', $var)) {
            return $var;
        }

        throw new RuntimeException('Некорректные данные системных переменных, возможна атака на сервер.' . $var);
    }

    /**
     * Get site host name.
     *
     * @return string
     */
    private function getSiteHost(): string
    {
        if (
            !isset($_SERVER['HTTP_HOST'])
            || $_SERVER['HTTP_HOST'] == ''
        ) {
            return $this->filterInput($_SERVER['SERVER_NAME']);
        }

        return $this->filterInput($_SERVER['HTTP_HOST']);
    }

    /**
     * Get site root directory.
     *
     * @return string
     */
    private function getSiteRoot(): string
    {
        $siteRoot = $this->filterInput($_SERVER['PHP_SELF']);
        $siteRoot = str_replace('index.php', '', $siteRoot);
        return $siteRoot;
    }

    /**
     * Check system environment.
     * It checks:
     * - PHP version
     * - the presence of configuration file
     * - the presence of file with system modules.
     *
     * @throws RuntimeException 'Вашему РНР нужно еще немного подрости. Минимальная допустимая версия '
     * @throws RuntimeException 'Не найден конфигурационный файл system.config.php. По хорошему, он должен лежать в корне проекта.'
     * @throws RuntimeException 'Странный какой то конфиг. Пользуясь ним я не могу ничего сконфигурить. Или возьмите нормальный конфиг, или - извините.'
     * @throws RuntimeException 'В конфиге ничего не сказано о режиме отладки. Это плохо. Так я работать не буду.'
     * @throws RuntimeException 'Нет. С отключенным режимом отладки я работать не буду, и не просите. Запускайте меня после того как исправите в конфиге ["site"]["debug"] с 0 на 1.'
     * @throws RuntimeException 'Странно. Отсутствует перечень модулей. Я могу конечно и сам посмотреть, что находится в папке core/modules, но как то это не кузяво будет. '
     */
    public function checkEnvironment(): void
    {
        $this->title('Проверка системного окружения');

        // Проверяем версию PHP
        if (version_compare(PHP_VERSION, (string) MIN_PHP_VERSION, '<')) {
            throw new RuntimeException('Вашему PHP нужно ещё немного подрасти. Минимальная допустимая версия ' . MIN_PHP_VERSION);
        }
        $this->text('Версия PHP ', PHP_VERSION, ' соответствует требованиям');

        //При любом действии без конфига нам не обойтись
        if (!file_exists($configName = implode(DIRECTORY_SEPARATOR, [HTDOCS_DIR, 'system.config.php']))) {
            throw new RuntimeException('Не найден конфигурационный файл system.config.php. По хорошему, он должен лежать в корне проекта.');
        }

        $this->config = include($configName);

        // Если скрипт запущен не с консоли, необходимо вычислить хост сайта и его рут директорию
        /*if (!$this->isFromConsole) {
            $this->config['site']['domain'] = $this->getSiteHost();
            $this->config['site']['root'] = $this->getSiteRoot();
        }*/
        //все вышеизложенное - очень подозрительно
        //что нам мешает просто прочитать значения из конфига?
        //Если бы мы потом это в конфиг писали - то еще куда ни шло ... а так ... до выяснения  - закомментировал

        if (!is_array($this->config)) {
            throw new RuntimeException('Странный какой то конфиг. Пользуясь ним я не могу ничего сконфигурить. Или возьмите нормальный конфиг, или - извините.');
        }

        //маловероятно конечно, но лучше убедиться
        if (!isset($this->config['site']['debug'])) {
            throw new RuntimeException('В конфиге ничего не сказано о режиме отладки. Это плохо. Так я работать не буду.');
        }
        $this->text('Конфигурационный файл подключен и проверен');

        //Если режим отладки отключен - то и говорить дальше не о чем
        if (!$this->isFromConsole && !$this->config['site']['debug']) {
            throw new RuntimeException('Нет. С отключенным режимом отладки я работать не буду, и не просите. Запускайте меня после того как исправите в конфиге ["site"]["debug"] с 0 на 1.');
        }
        if ($this->config['site']['debug']) {
            $this->text('Режим отладки включен');
        } else {
            $this->text('Режим отладки выключен');
        }

        //А задан ли у нас перечень модулей?
        if (!isset($this->config['modules']) && empty($this->config['modules'])) {
            throw new RuntimeException('Странно. Отсутствует перечень модулей. Я могу конечно и сам посмотреть, что находится в папке core/modules, но как то это не кузяво будет. ');
        }
        $this->text('Перечень модулей:', PHP_EOL . ' => ' . implode(PHP_EOL . ' => ', array_values($this->config['modules'])));
    }

    /**
     * Update site host and root in table @c share_sites.
     *
     * @throws RuntimeException 'Удивительно.... Не с чем работать. А проверьте все ли хорошо с базой? не пустая ли? похоже некоторых нужных таблиц в ней нет.'
     */
    private function updateSitesTable(): void
    {
        $this->text('Обновляем таблицу share_sites...');

        // получаем все домены из таблицы доменов
        $res = $this->dbConnect->query(
            'SELECT * FROM share_domains'
        );

        if (!$res) {
            throw new RuntimeException('Удивительно.... Не с чем работать. А проверьте все ли хорошо с базой? не пустая ли? похоже некоторых нужных таблиц в ней нет.');
        }
        $domains = $res->fetchAll();
        $res->closeCursor();

        // обновляем таблицу доменов, если:
        // 1. одна запись в таблице
        // 2. больше одной записи, и поле пустое
        // 3. Доменов вообще нет
        if (
            empty($domains)
            ||
            ($domains and (count($domains) == 1 or (count($domains) >= 1 and $domains[0]['domain_host'] == '')))
        ) {
            $this->dbConnect->query(
                ((empty($domains)) ? 'INSERT INTO' : 'UPDATE') . " share_domains SET domain_host = '" . $this->config['site']['domain'] . "',"
                . "domain_root = '" . $this->config['site']['root'] . "'"
            );
            if (empty($domains)) {
                $domainID = $this->dbConnect->lastInsertId();
                $this->dbConnect->query('INSERT INTO share_domain2site SET site_id=1, domain_id=' . $domainID);
            }
        }
    }

    /**
     * Check connection to database.
     *
     * @throws RuntimeException 'В конфиге нет информации о подключении к базе данных'
     * @throws RuntimeException 'Удивительно, но не указан параметр: ' . $description . '  (["database"]["' . $key . '"])'
     * @throws RuntimeException 'Не удалось соединиться с БД по причине: '
     */
    private function checkDBConnection(): void
    {

        $this->text('Проверяем коннект к БД');

        if (!isset($this->config['database']) || empty($this->config['database'])) {
            throw new RuntimeException('В конфиге нет информации о подключении к базе данных');
        }

        $dbInfo = $this->config['database'];

        //валидируем все скопом
        foreach (['host' => 'адрес хоста', 'db' => 'имя БД', 'username' => 'имя пользователя', 'password' => 'пароль'] as $key => $description) {
            if (!isset($dbInfo[$key]) && empty($dbInfo[$key])) {
                throw new RuntimeException('Удивительно, но не указан параметр: ' . $description . '  (["database"]["' . $key . '"])');
            }
        }
        try {
            //Поскольку ошибка при конструировании ПДО объекта генерит кроме исключения еще и варнинги
            //используем пустой обработчик ошибки с запретом всплывания(return true)
            //все это сделано только для того чтобы не выводился варнинг

            function err_handler1()
            {
                return true;
                ;
            }

            set_error_handler("err_handler1");
            $connect = new PDO(
                sprintf(
                    'mysql:host=%s;port=%s;dbname=%s',
                    $dbInfo['host'],
                    (isset($dbInfo['port']) && !empty($dbInfo['port'])) ? $dbInfo['port'] : 3306,
                    $dbInfo['db']
                ),
                $dbInfo['username'],
                $dbInfo['password'],
                [
                    PDO::ATTR_PERSISTENT => false,
                    PDO::ATTR_EMULATE_PREPARES => true,
                    PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true
                ]
            );

            $this->dbConnect = $connect;
        } catch (Throwable $e) {
            throw new RuntimeException('Не удалось соединиться с БД по причине: ' . $e->getMessage());
        }
        restore_error_handler();
        $connect->query('SET NAMES utf8');

        $this->text('Соединение с БД ', $dbInfo['db'], ' успешно установлено');
    }

    /**
     * Function that calls some class method.
     * In fact, it runs one of the system installation modes.
     *
     * @param string $action Method name.
     * @param array $arguments Method arguments.
     *
     * @throws RuntimeException 'Подозрительно все это... Либо программисты че то не учли, либо.... произошло непоправимое.'
     */
    public function execute(string $action, array $arguments): void
    {
        if (!method_exists($this, $methodName = $action . 'Action')) {
            throw new RuntimeException('Подозрительно все это... Либо программисты че то не учли, либо.... произошло непоправимое.');
        }
        call_user_func_array([$this, $methodName], $arguments);
        //$this->{$methodName}();
    }

    /**
     * Clear cache directory.
     * @todo: определится с именем папки
     */
    private function clearCacheAction(): void
    {
        $this->title('Очищаем кеш');
        $this->cleaner(implode(DIRECTORY_SEPARATOR, [HTDOCS_DIR, 'cache']));
    }

    /**
     * Run full system installation.
     * It:
     * - checks connection to database
     * - updates table @c share_sites
     * - generate symlinks
     * - generate file dependency to JavaScript classes
     */
    private function installAction(): void
    {
        $this->checkDBConnection();
        $this->updateSitesTable();
        $this->linkerAction();
        $this->scriptMapAction();
    }

    /**
     * Search and show untranslated constants.
     * To show the information about founded constants on the display use @code $mode='show' @endcode @n
     * To write the information about founded constants into the file use @code $mode='file' @endcode @n
     *
     * @param string $mode Display mode.
     *
     * @throws RuntimeException 'Режим ' . $mode . ' не зарегистрирован'
     */
    private function untranslatedAction(string $mode = 'show'): void
    {
        $this->title('Поиск непереведенных констант');
        $this->checkDBConnection();

        $all = array_merge(
            $this->getTransEngineCalls(),
            $this->getTransXmlCalls()
        );
        $result = $this->getUntranslated($all);
        if ($result) {
            //todo VZ: I think switch is better.
            if ($mode == 'show') {
                foreach ($result as $key => $val) {
                    $this->text($key . ': ' . implode(', ', $val['file']));
                }
            } elseif ($mode = 'file') {
                $this->writeTranslations($this->fillTranslations($result), 'untranslated.csv');
            } else {
                throw new RuntimeException('Режим ' . $mode . ' не зарегистрирован');
            }
        } else {
            $this->text('Все в порядке, все языковые константы переведены');
        }
    }

    /**
     * Export translation constants into the file.
     */
    private function exportTransAction(): void
    {
        $this->title('Экспорт констант в файлы');
        $this->checkDBConnection();
        $all = array_merge(
            $this->getTransEngineCalls(),
            $this->getTransXmlCalls()
        );
        $this->writeTranslations($this->fillTranslations($all));
    }

    /**
     * Load data from the file with translations.
     * File format: "Translation";"abbreviation 1";"abbreviation 2"
     *
     * @param string $path Path.
     * @param string $module Module name.
     *
     * @throws RuntimeException 'Не видать файла:' . $path
     * @throws RuntimeException 'Файл вроде как есть, а вот читать из него невозможно.'
     */
    private function loadTransFileAction(string $path, string $module = 'share'): void
    {
        $this->title('Загрузка файла с переводами: ' . $path . ' в модуль ' . $module);
        if (!file_exists($path)) {
            throw new RuntimeException('Не видать файла:' . $path);
        }
        $row = 0;
        $loadedRows = 0;

        if (($handle = fopen($path, 'r')) !== false) {
            $this->checkDBConnection();
            $langRes = $this->dbConnect->prepare('SELECT lang_id FROM share_languages WHERE lang_abbr= ?', [PDO::ATTR_CURSOR => PDO::CURSOR_SCROLL]);
            $langTagRes = $this->dbConnect->prepare('INSERT IGNORE INTO share_lang_tags(ltag_name, ltag_module) VALUES (?, ?)');
            $langTransTagRes = $this->dbConnect->prepare('INSERT IGNORE INTO share_lang_tags_translation VALUES (?, ?, ?)');
            $this->dbConnect->beginTransaction();
            $langInfo = [];
            try {
                while (($data = fgetcsv($handle, 1000, ";")) !== false) {
                    //На первой строчке определяемся с языками
                    if (!($row++)) {
                        //Отбрасываем первую колонку - Имя
                        array_shift($data);
                        foreach ($data as $langNum => $langAbbr) {
                            if (!$langRes->execute([strtolower($langAbbr)])) {
                                throw new RuntimeException('Что то опять не слава Богу.');
                            }
                            //Создаем масив соответствия порядкового номера колонки - идентификатору языка
                            $langInfo[$langNum + 1] = $langRes->fetch(PDO::FETCH_COLUMN);
                        }
                    } else {
                        if ($r = !$langTagRes->execute([$data[0], $module])) {
                            throw new RuntimeException('Произошла ошибка при вставке в share_lang_tags значения:' . $data[0]);
                        }
                        $ltagID = $this->dbConnect->lastInsertId();
                        if ($ltagID) {
                            $this->text('Пишем в основную таблицу: ' . $ltagID . ', ' . $data[0]);
                            $loadedRows++;
                            foreach ($langInfo as $langNum => $langID) {
                                if (!$langTransTagRes->execute([$ltagID, $langID, stripslashes($data[$langNum])])) {
                                    throw new RuntimeException('Произошла ошибка при вставке в share_lang_tags_translation значения:' . $data[$langNum]);
                                }
                                $this->text('Пишем в таблицу переводов: ' . $ltagID . ', ' . $langID . ', ' . $data[$langNum]);
                            }
                        } else {
                            $this->text('Такая константа уже существует: ' . $data[0] . '- пропускаем.');
                        }
                    }
                }
                $this->dbConnect->commit();
            } catch (Throwable $e) {
                $this->dbConnect->rollBack();
                throw $e;
            }
            fclose($handle);
        } else {
            throw new RuntimeException('Файл вроде как есть, а вот читать из него невозможно.');
        }


        $this->text('Загружено ' . ($loadedRows) . ' значений');
    }

    /**
     * Get an array with information about translations.
     *
     * @param array $transData Translation data.
     * @return mixed
     */
    private function fillTranslations(array $transData): array
    {
        array_walk(
            $transData,
            function (&$transInfo, $transConst, $findTransRes) {
                if ($findTransRes->execute([$transConst])) {
                    if ($data = $findTransRes->fetchAll(PDO::FETCH_ASSOC)) {
                        foreach ($data as $row) {
                            $transInfo['data'][$row['lang_id']] = $row['ltag_value_rtf'];
                        }
                    }
                }
            },
            $this->dbConnect->prepare('select ltag_value_rtf, lang_id FROM share_lang_tags_translation LEFT JOIN share_lang_tags USING(ltag_id) WHERE ltag_name=?')
        );
        return $transData;
    }

    /**
     * Search constants in XML-file.
     *
     * @return array
     */
    private function getTransXmlCalls(): array
    {
        $output = [];

        $result = false;

        $files = array_merge(
            glob(CORE_DIR . '/modules/*/config/*.xml'),
            glob(CORE_DIR . '/modules/*/templates/content/*.xml'),
            glob(CORE_DIR . '/modules/*/templates/layout/*.xml'),
            glob(SITE_DIR . '/modules/*/config/*.xml'),
            glob(SITE_DIR . '/modules/*/templates/content/*.xml'),
            glob(SITE_DIR . '/modules/*/templates/layout/*.xml')
        );

        if ($files) {
            foreach ($files as $file) {
                $doc = new DOMDocument();
                $doc->preserveWhiteSpace = false;
                $doc->load($file);
                $xpath = new DOMXPath($doc);

            // находим теги translation
                $nl = $xpath->query('//translation');
                if ($nl->length > 0) {
                    foreach ($nl as $node) {
                        if ($node instanceof DOMElement) {
                            $result[$file][] = $node->getAttribute('const');
                        }
                    }
                }

            // находим теги control
                $nl = $xpath->query('//control');
                if ($nl->length > 0) {
                    foreach ($nl as $node) {
                        if ($node instanceof DOMElement) {
                            $result[$file][] = $node->getAttribute('title');
                        }
                    }
                }

            // находим теги field
                $nl = $xpath->query('//field');
                if ($nl->length > 0) {
                    foreach ($nl as $node) {
                        if ($node instanceof DOMElement) {
                            $result[$file][] = 'FIELD_' . strtoupper($node->getAttribute('name'));
                        }
                    }
                }
            }
        }

        if ($result) {
            foreach ($result as $file => $res) {
                foreach ($res as $key => $line) {
                    if (isset($output[$line]['count'])) {
                        $output[$line]['count']++;
                        if (!in_array($file, $output[$line]['file'])) {
                            $output[$line]['file'][] = $file;
                        }
                    } else {
                        $output[$line]['count'] = 1;
                        $output[$line]['file'][] = $file;
                    }
                }
            }
        }

        return $output;
    }

    /**
     * Get untranslated constants.
     *
     * @param array $data %Data.
     * @return array
     */
    private function getUntranslated(array $data): array
    {
        $result = [];
        $dbRes = $this->dbConnect->prepare('SELECT ltag_id FROM share_lang_tags WHERE ltag_name=?');

        if ($data) {
            foreach ($data as $const => $val) {
                if (!$const) {
                    continue;
                }
                if ($dbRes->execute([$const])) {
                    $res = $dbRes->fetchColumn();
                    if (empty($res)) {
                        $result[$const] = $val;
                    }
                }
            }
        }

        return $result;
    }

    /**
     * Search constants in the code.
     *
     * @return array
     */
    private function getTransEngineCalls(): array
    {
        $output = [];
        $result = false;

        $files = array_merge(
            glob(CORE_COMPONENTS_DIR . '/*.php'),
            glob(CORE_GEARS_DIR . '/*.php'),
            glob(SITE_COMPONENTS_DIR . '/*.php'),
            glob(SITE_GEARS_DIR . '/*.php'),
            //            glob(SITE_KERNEL_DIR . '/*.php')
        );
//  var_dump(CORE_COMPONENTS_DIR . '/*.php');
//  var_dump(glob(CORE_COMPONENTS_DIR . '/*.php'));
        /*
         * что ищем:
         * ->addTranslation('CONST'[, 'CONST', ..])
         * ->translate('CONST')
         * System RuntimeException('CONST')
         */
        if ($files) {
            foreach ($files as $file) {
                $content = file_get_contents($file);

                if (is_array($content)) {
                    $content = join('', $content);
                }

                $r = [];
                //Ищем в методе динамического добавления переводов
                if (preg_match_all('/addTranslation\(([\'"]+([_A-Z0-9]+)[\'"]+([ ]{0,}[,]{1,1}[ ]{0,}[\'"]+([_A-Z0-9]+)[\'"]){0,})\)/', $content, $r) > 0) {
                    if ($r and isset($r[1])) {
                        foreach ($r[1] as $string) {
                            $string = str_replace(['"', "'", " "], '', $string);
                            $consts = explode(',', $string);
                            if ($consts) {
                                foreach ($consts as $const) {
                                    $result[$file][] = $const;
                                }
                            }
                        }
                    }
                }
                //Ищем в обращениях за переводами
                if (preg_match_all('/->translate\([\'"]+([_A-Z0-9]+)[\'"]+\)/', $content, $r) > 0) {
                    if ($r and isset($r[1])) {
                        foreach ($r[1] as $row) {
                            $result[$file][] = $row;
                        }
                    }
                }
                //Ищем в текстах ошибок
                if (preg_match_all('/new SystemException\([\'"]+([_A-Z0-9]+)[\'"]+\)/', $content, $r) > 0) {
                    if ($r and isset($r[1])) {
                        foreach ($r[1] as $row) {
                            $result[$file][] = $row;
                        }
                    }
                }
            }
        }

        if ($result) {
            foreach ($result as $file => $res) {
                foreach ($res as $key => $line) {
                    if (isset($output[$line]['count'])) {
                        $output[$line]['count']++;
                        if (!in_array($file, $output[$line]['file'])) {
                            $output[$line]['file'][] = $file;
                        }
                    } else {
                        $output[$line]['count'] = 1;
                        $output[$line]['file'][] = $file;
                    }
                }
            }
        }
        return $output;
    }

    /**
     * Write translation data into the file (for each module).
     *
     * @param array $data %Data.
     * @param string $transFileName Filename with translations.
     *
     * @throws RuntimeException 'Директория ' . $dirName . ' отсутствует или недоступна для записи.'
     * @throws RuntimeException 'Произошла ошибка при записи в файл: '
     */
    private function writeTranslations(array $data, string $transFileName = 'translations.csv'): void
    {
        $langRes = $this->dbConnect->query('SELECT lang_id, lang_abbr FROM share_languages');
        while ($row = $langRes->fetch(PDO::FETCH_ASSOC)) {
            $langData[$row['lang_id']] = $row['lang_abbr'];
        }


        //$rows[] = 'CONST;' . implode(';', $langData);
        //Формируем массив вида [тип_модуля][имя_модуля]=>array("Имя константы; Перевод 1; Перевод 2")
        foreach ($data as $ltagName => $ltagInfo) {
            //Берем только первый файл, все остальные вхождения нам не сильно интересны
            $fileName = str_replace(HTDOCS_DIR, '', $ltagInfo['file'][0]);

            if (preg_match('/\/([a-z]+)\/modules\/([a-z]+)\//', $fileName, $matches)) {
                $row = [$ltagName];
                foreach (array_keys($langData) as $langID) {
                    array_push($row, (isset($ltagInfo['data'][$langID])) ? ('"' . addslashes(str_replace("\r\n", '\r\n', $ltagInfo['data'][$langID])) . '"') : '');
                }
                $rows[$matches[1]][$matches[2]][] = implode(';', $row);
            }
        }

        //Пишем в файлы данные массива
        foreach ($rows as $moduleType => $modulesInfo) {
            //Не используем  константы CORE_REL_DIR/SITE_REL_DIR поскольку там могут быть пути
            if ($moduleType == 'core') {
                $filePath = CORE_DIR;
            } elseif ($moduleType == 'site') {
                $filePath = SITE_DIR;
            }
            $filePath .= '/modules/%s/install/';

            foreach ($modulesInfo as $moduleName => $data) {
                if (!file_exists($dirName = sprintf($filePath, $moduleName)) || !is_writable($dirName)) {
                    throw new RuntimeException('Директория ' . $dirName . ' отсутствует или недоступна для записи.');
                }
                array_unshift($data, 'CONST;' . implode(';', $langData));

                if (!file_put_contents($dirName . $transFileName, implode("\r\n", $data))) {
                    throw new RuntimeException('Произошла ошибка при записи в файл: ' . $dirName . $transFileName . '.');
                }
                $this->text('Записываем в файл ' . $dirName . $transFileName . ' (' . sizeof($data) . ')');
            }
        }
    }

    /**
     * Create segment <tt>Google sitemap</tt> into @c share_sitemap.
     * It sets for that segment read-only access for non-authorized users. @n
     * Segment name should be defined in configurations.
     */
    private function createSitemapSegment(): void
    {
        $this->dbConnect->query('INSERT INTO share_sitemap(site_id,smap_layout,smap_content,smap_segment,smap_pid) '
            . 'SELECT sso.site_id,\'' . $this->config['seo']['sitemapTemplate'] . '.layout.xml\','
            . '\'' . $this->config['seo']['sitemapTemplate'] . '.content.xml\','
            . '\'' . $this->config['seo']['sitemapSegment'] . '\','
            . '(SELECT smap_id FROM share_sitemap ss2 WHERE ss2.site_id = sso.site_id AND smap_pid IS NULL LIMIT 0,1) '
            . 'FROM share_sites sso '
            . 'WHERE site_is_indexed AND site_is_active '
            . 'AND (SELECT COUNT(ssi.site_id) FROM share_sites ssi '
            . 'INNER JOIN share_sitemap ssm ON ssi.site_id = ssm.site_id '
            . 'WHERE ssm.smap_segment = \'' . $this->config['seo']['sitemapSegment'] . '\' AND ssi.site_id = sso.site_id) = 0');
        $smIdsInfo = $this->dbConnect->query('SELECT smap_id FROM share_sitemap WHERE '
            . 'smap_segment = \'' . $this->config['seo']['sitemapSegment'] . '\'');
        while ($smIdInfo = $smIdsInfo->fetch()) {
            $this->dbConnect->query('INSERT INTO share_access_level SELECT ' . $smIdInfo[0] . ',group_id,'
                . '(SELECT right_id FROM `user_group_rights` WHERE right_const = \'ACCESS_READ\') FROM `user_groups` ');
            $this->dbConnect->query('INSERT INTO share_sitemap_translation(smap_id,lang_id,smap_name,smap_is_disabled) '
                . 'VALUES (' . $smIdInfo[0] . ',(SELECT lang_id FROM `share_languages` WHERE lang_default),\'Google sitemap\',0)');
        }
    }

    /**
     * Generate symlinks.
     *
     * @throws RuntimeException 'Не существует: ' . $module_path
     * @throws RuntimeException 'Нет доступа на запись: ' . $modules_dir
     */
    private function linkerAction(): void
    {

        $this->title('Связывание данных модулей ');

        foreach ($this->htdocsDirs as $dir) {
            $dir = HTDOCS_DIR . DIRECTORY_SEPARATOR . $dir;

            if (!file_exists($dir)) {
                if (!@mkdir($dir, 0755, true)) {
                    throw new RuntimeException('Невозможно создать директорию:' . $dir);
                }
            } else {
                $this->cleaner($dir);
            }
        }

        // создаем симлинки модулей из их физического расположения, описанного в конфиге
        // в папку CORE_DIR . '/modules/'
        $this->text(PHP_EOL . 'Создание символических ссылок в ' . CORE_DIR . ':');
        foreach ($this->config['modules'] as $module => $module_path) {
            $symlinked_dir = implode(DIRECTORY_SEPARATOR, [CORE_DIR, MODULES, $module]);
            $this->text('Создание символической ссылки ', $module_path, ' -> ', $symlinked_dir);

            if (file_exists($symlinked_dir) || is_link($symlinked_dir)) {
                unlink($symlinked_dir);
            }

            if (!file_exists($module_path)) {
                throw new RuntimeException('Не существует: ' . $module_path);
            }

            $modules_dir = implode(DIRECTORY_SEPARATOR, [CORE_DIR, MODULES]);
            if (!is_writeable($modules_dir)) {
                throw new RuntimeException('Нет доступа на запись: ' . $modules_dir);
            }

            symlink($module_path, $symlinked_dir);
        }

        //На этот момент у нас есть все необходимые директории в htdocs и они пустые
        foreach ($this->htdocsDirs as $dir) {
            $this->text(PHP_EOL . 'Обработка ' . $dir . ':');
            //сначала проходимся по модулям ядра
            foreach (array_reverse($this->config['modules']) as $module => $module_path) {
                $this->linkCore(
                    ($this->config['site']['debug']) ? self::MODE_SYMLINK : self::MODE_COPY,
                    implode(DIRECTORY_SEPARATOR, [CORE_DIR, MODULES, $module, $dir, '*']),
                    implode(DIRECTORY_SEPARATOR, [HTDOCS_DIR, $dir]),
                    sizeof(explode(DIRECTORY_SEPARATOR, $dir))
                );
            }
            $this->linkSite(
                ($this->config['site']['debug']) ? self::MODE_SYMLINK : self::MODE_COPY,
                implode(DIRECTORY_SEPARATOR, [SITE_DIR, MODULES, '*', $dir, '*']),
                implode(DIRECTORY_SEPARATOR, [HTDOCS_DIR, $dir])
            );
        }

        $this->text('Символические ссылки расставлены');
    }

    /**
     * Iterate over uploads.
     *
     * @param string $directory Directory.
     * @param null|int $PID Parent ID.
     *
     * @throws RuntimeException 'ERROR'
     * @throws RuntimeException 'ERROR INSERTING'
     * @throws RuntimeException 'ERROR UPDATING'
     */
    private function iterateUploads(string $directory, ?int $PID = null): void
    {

        //static $counter = 0;

        $iterator = new DirectoryIterator($directory);
        foreach ($iterator as $fileinfo) {
            if (!$fileinfo->isDot() && (substr($fileinfo->getFilename(), 0, 1) != '.')) {
                $uplPath = str_replace('../', '', $fileinfo->getPathname());
                $filename = $fileinfo->getFilename();

                echo $uplPath . PHP_EOL;
                $res = $this->dbConnect->query('SELECT upl_id, upl_pid FROM ' . self::UPLOADS_TABLE . ' WHERE upl_path = "' . $uplPath . '"');
                if (!$res) {
                    throw new RuntimeException('ERROR');
                }

                $data = $res->fetch(PDO::FETCH_ASSOC);

                if (empty($data)) {
                    $uplWidth = $uplHeight = 'NULL';
                    if (!$fileinfo->isDir()) {
                        $childsCount = 'NULL';
                        $finfo = new finfo(FILEINFO_MIME_TYPE);
                        $mimeType = $finfo->file($fileinfo->getPathname());

                        switch ($mimeType) {
                            case 'image/jpeg':
                            case 'image/png':
                            case 'image/gif':
                                $tmp = getimagesize($fileinfo->getPathname());
                                $internalType = 'image';
                                $uplWidth = $tmp[0];
                                $uplHeight = $tmp[1];
                                break;
                            case 'video/x-flv':
                            case 'video/mp4':
                                $internalType = 'video';
                                break;
                            case 'text/csv':
                                $internalType = 'text';
                                break;
                            case 'application/zip':
                                $internalType = 'zip';
                                break;
                            default:
                                $internalType = 'unknown';
                                break;
                        }
                        $title = $fileinfo->getBasename('.' . $fileinfo->getExtension());
                    } else {
                        $mimeType = 'unknown/mime-type';
                        $internalType = 'folder';
                        $childsCount = 0;
                        $title = $fileinfo->getBasename();
                    }

                    $PID = (empty($PID)) ? 'NULL' : $PID;

                    $r = $this->dbConnect->query($q = sprintf('INSERT INTO ' . self::UPLOADS_TABLE . ' (upl_pid, upl_childs_count, upl_path, upl_filename, upl_name, upl_title,upl_internal_type, upl_mime_type, upl_width, upl_height) VALUES(%s, %s, "%s", "%s", "%s", "%s", "%s", "%s", %s, %s)', $PID, $childsCount, $uplPath, $filename, $title, $title, $internalType, $mimeType, $uplWidth, $uplHeight));
                    if (!$r) {
                        throw new RuntimeException('ERROR INSERTING');
                    }
                    //$this->text($uplPath);
                    if ($fileinfo->isDir()) {
                        $newPID = $this->dbConnect->lastInsertId();
                    }

                    //$this->dbConnect->lastInsertId();
                } else {
                    $newPID = $data['upl_pid'];
                    $r = $this->dbConnect->query('UPDATE ' . self::UPLOADS_TABLE . ' SET upl_is_active=1 WHERE upl_id="' . $data['upl_id'] . '"');
                    if (!$r) {
                        throw new RuntimeException('ERROR UPDATING');
                    }
                }
                if ($fileinfo->isDir()) {
                    $this->iterateUploads($fileinfo->getPathname(), $newPID);
                }
            }
        }
    }

    /**
     * Synchronize uploads.
     *
     * @param string $uploadsPath Path to the uploads.
     *
     * @throws RuntimeException 'Репозиторий по такому пути не существует'
     * @throws RuntimeException 'Странный какой то идентификатор родительский.'
     */
    private function syncUploadsAction(string $uploadsPath = self::UPLOADS_PATH): void
    {
        $this->checkDBConnection();
        $this->title('Синхронизация папки с загрузками');
        $this->dbConnect->beginTransaction();
        if (substr($uploadsPath, -1) == '/') {
            $uploadsPath = substr($uploadsPath, 0, -1);
        }
        $r = $this->dbConnect->query('SELECT upl_id FROM ' . self::UPLOADS_TABLE . ' WHERE upl_path LIKE "' . $uploadsPath . '"');
        if (!$r) {
            throw new RuntimeException('Репозиторий по такому пути не существует');
        }
        $PID = $r->fetchColumn();
        if (!$PID) {
            throw new RuntimeException('Странный какой то идентификатор родительский.');
        }
        $uploadsPath .= '/';

        try {
            $this->dbConnect->query('UPDATE ' . self::UPLOADS_TABLE . ' SET upl_is_active=0 WHERE upl_path LIKE "' . $uploadsPath . '%"');
            $this->iterateUploads(implode(DIRECTORY_SEPARATOR, [HTDOCS_DIR, $uploadsPath]), $PID);
            $this->dbConnect->commit();
        } catch (Throwable $e) {
            $this->dbConnect->rollBack();
            throw new RuntimeException($e->getMessage());
        }
    }

    /**
     * Recursive clean directory.
     *
     * @param string $dir Path to the directory.
     */
    private function cleaner(string $dir): void
    {
        if (is_dir($dir)) {
            if ($dh = opendir($dir)) {
                while ((($file = readdir($dh)) !== false)) {
                    if (!in_array($file, ['.', '..'])) {
                        if (is_dir($file = $dir . DIRECTORY_SEPARATOR . $file)) {
                            if (is_link($file)) {
                                unlink($file);
                            } else {
                                $this->cleaner($file);
                                rmdir($file);
                            }
                            $this->text('Удаляем директорию ', $file);
                        } else {
                            $this->text('Удаляем файл ', $file);
                            unlink($file);
                        }
                    }
                }
                closedir($dh);
            }
        }
    }

    //todo VZ: $level is not used.
    /**
     * Create symlinks for core modules.
     *
     * @param string $mode Mode.
     * @param string $globPattern File selection pattern.
     * @param string $module Path to the core module.
     * @param int $level Depth level for relative paths.
     *
     * @throws RuntimeException 'Не удалось создать символическую ссылку'
     */
    private function linkCore(string $mode, string $globPattern, string $module, int $level = 1): void
    {
        $JSMIn = new JSqueeze();
        $fileList = glob($globPattern);

        if (!empty($fileList)) {
            foreach ($fileList as $fo) {
                if (is_dir($fo)) {
                    $dir = $module . DIRECTORY_SEPARATOR . basename($fo);
                    if (!file_exists($dir)) {
                        mkdir($dir);
                        $this->text('Создаем директорию ', $dir);
                    }
                    $this->linkCore($mode, $fo . DIRECTORY_SEPARATOR . '*', $dir, $level + 1);
                } else {
                    //Если одним из низших по приоритету модулей был уже создан симлинк
                    //то затираем его нафиг
                    if (file_exists($dest = $module . DIRECTORY_SEPARATOR . basename($fo))) {
                        unlink($dest);
                    }

                    switch ($mode) {
                        case self::MODE_SYMLINK:
                            $this->text('Создаем симлинк ', $fo, ' --> ', $dest);
                            if (!@symlink($fo, $dest)) {
                                throw new RuntimeException('Не удалось создать символическую ссылку с ' . $fo . ' на ' . $dest);
                            }
                            break;
                        case self::MODE_COPY:
                            $pi = pathinfo($fo);

                            if (isset($pi['extension']) && ($pi['extension'] == 'js')) {
                                if (
                                    (strpos($pi['filename'], 'mootools') === false)
                                    &&
                                    (strpos($pi['filename'], 'Swiff.Uploader') === false)
                                    &&
                                    (strpos($pi['filename'], 'mootools-more') === false)
                                    &&
                                    (strpos($pi['filename'], 'mootools-ext') === false)
                                    &&
                                    (strpos($pi['filename'], 'jwplayer') === false)
                                    &&
                                    (strpos($pi['dirname'], 'ckeditor') === false)
                                    &&
                                    (strpos($pi['dirname'], 'codemirror') === false)
                                    &&
                                    (strpos($pi['dirname'], 'FileAPI') === false)
                                ) {
                                    $this->text('Минифицируем и копируем ', $fo, ' --> ', $dest);
                                    file_put_contents($dest, $JSMIn->squeeze(file_get_contents($fo), true, false, false));
                                } else {
                                    $this->text('Создаем символическую ссылку ', $fo, ' --> ', $dest);
                                    if (!@symlink($fo, $dest)) {
                                        throw new RuntimeException('Не удалось создать символическую ссылку с ' . $fo . ' на ' . $dest);
                                    }
                                }
                            } else {
                                $this->text('Создаем символическую ссылку ', $fo, ' --> ', $dest);
                                if (!@symlink($fo, $dest)) {
                                    throw new RuntimeException('Не удалось создать символическую ссылку с ' . $fo . ' на ' . $dest);
                                }
                            }
                            break;
                    }
                }
            }
        }
    }

    /**
     * Create symlinks for site modules.
     *
     * @param string $mode Mode.
     * @param string $globPattern File selection pattern.
     * @param string $dir Directory where symlinks will be created.
     *
     * @throws RuntimeException 'Не удалось создать символическую ссылку'
     */
    private function linkSite(string $mode, string $globPattern, string $dir): void
    {
        $JSMin = new JSqueeze();

        $fileList = glob($globPattern);
        if (!empty($fileList)) {
            foreach ($fileList as $fo) {
                $fo_stripped = str_replace(SITE_DIR, '', $fo);
                list(, , $module) = explode(DIRECTORY_SEPARATOR, $fo_stripped);
                $new_dir = implode(DIRECTORY_SEPARATOR, [$dir, $module]);

                if (!file_exists($new_dir)) {
                    mkdir($new_dir);
                }

                $srcFile = $fo;
                $linkPath = implode(DIRECTORY_SEPARATOR, [$dir, $module, basename($fo_stripped)]);

                switch ($mode) {
                    case self::MODE_SYMLINK:
                        $this->text('Создаем симлинк ', $srcFile, ' --> ', $linkPath);
                        if (!@symlink($srcFile, $linkPath)) {
                            throw new RuntimeException('Не удалось создать символическую ссылку с ' . $srcFile . ' на ' . $linkPath);
                        }
                        break;
                    case self::MODE_COPY:
                        $pi = pathinfo($srcFile);

                        if (isset($pi['extension']) && ($pi['extension'] == 'js')) {
                            $this->text('Минифицируем и копируем ', $srcFile, ' --> ', $linkPath);
                            file_put_contents($linkPath, $JSMin->squeeze(file_get_contents($srcFile), true, false, false));
                        } else {
                            $this->text('Создаем символическую ссылку ', $srcFile, ' --> ', $linkPath);
                            if (!@symlink($srcFile, $linkPath)) {
                                throw new RuntimeException('Не удалось создать символическую ссылку с ' . $srcFile . ' на ' . $linkPath);
                            }
                        }
                        break;
                }
            }
        }
    }

    /**
     * Show title of current installation action with beauty stars.
     *
     * @param string $text Text.
     */
    private function title(string $text): void
    {
        echo str_repeat('*', 80), PHP_EOL, $text, PHP_EOL, PHP_EOL;
    }

    /**
     * Show all input arguments as string line.
     *
     * @return string
     */
    private function text(): void
    {
        foreach (func_get_args() as $text) {
            echo $text;
        }
        echo PHP_EOL;
    }

    /**
     * Recursive iterate throw all files and directories in the folder @c "scripts" and store the result into @c $result argument.
     *
     * @param string $directory Directory.
     * @param array $result Reference to the result.
     */
    private function iterateScripts(string $directory, array &$result): void
    {

        $iterator = new DirectoryIterator($directory);

        foreach ($iterator as $fileinfo) {
            if ($fileinfo->isFile() && !$fileinfo->isDot() && $fileinfo->getExtension() == 'js') {
                $class = str_replace([HTDOCS_DIR . '/scripts/', '.js'], '', $directory . DIRECTORY_SEPARATOR . $fileinfo->getFilename());
                $result[$class] = $directory . DIRECTORY_SEPARATOR . $fileinfo->getFilename();
            }
        }

        foreach ($iterator as $fileinfo) {
            if ($fileinfo->isDir() && !$fileinfo->isDot()) {
                $this->iterateScripts($fileinfo->getPathname(), $result);
            }
        }
    }

    /**
     * Parse inclusions in <tt>ScriptLoader.load()</tt>
     *
     * @param string $script Full name of JavaScript-file
     * @return array
     */
    private function parseScriptLoader(string $script): array
    {
        $result = [];

        $data = file_get_contents($script);
        $r = [];
        if (preg_match_all('/ScriptLoader\.load\((([\s,]{1,})?((?:\'|")([a-zA-Z\/.-]{1,})(?:\'|")){1,}([\s,]{1,})?){1,}\)/', $data, $r)) {
            $s = str_replace(['ScriptLoader.load', '(', ')', "\r", "\n"], '', (string) $r[0][0]);
            $classes = array_map(static function ($el) {
                return str_replace(['\'', '"', ',', ' '], '', $el);
            }, explode(',', $s));
            $result = $classes;
        }

        return $result;
    }

    /**
     * Write an array of dependencies into @c "system.jsmap.php"
     *
     * @param array $deps Dependencies.
     */
    private function writeScriptMap(array $deps): void
    {
        file_put_contents(HTDOCS_DIR . '/system.jsmap.php', '<?php return ' . var_export($deps, true) . ';');
    }

    /**
     * Create file @c "system.jsmap.php" with dependencies for JavaScript classes.
     */
    private function scriptMapAction(): void
    {
        $this->title('Создание карты зависимости Javascript классов');

        $files = [];
        $this->iterateScripts(HTDOCS_DIR . '/scripts', $files);

        $result = [];

        foreach ($files as $class => $file) {
            $deps = $this->parseScriptLoader($file);
            if ($deps) {
                $class_dir = str_replace([HTDOCS_DIR . '/scripts/', '.js'], '', $file);
                $result[$class_dir] = $deps;
                $this->text($class_dir . ' --> ' . implode(', ', $deps));
            }
        }

        $this->writeScriptMap($result);
    }
}
