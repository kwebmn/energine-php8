<?php

declare(strict_types=1);

/**
 * Alternative to FileInfo: извлекает метаданные файла из БД (share_uploads) или с ФС.
 */
class FileRepoInfo extends DBWorker
{
    /** Метатипы файла. */
    public const META_TYPE_IMAGE  = 'image';
    public const META_TYPE_VIDEO  = 'video';
    public const META_TYPE_AUDIO  = 'audio';
    public const META_TYPE_ZIP    = 'zip';
    public const META_TYPE_TEXT   = 'text';
    public const META_TYPE_FOLDER = 'folder';
    public const META_TYPE_UNKNOWN = 'unknown';

    /** @var \finfo */
    private \finfo $finfo;

    /** @var PDOStatement|null */
    private ?PDOStatement $getFInfoSQL = null;

    public function __construct()
    {
        parent::__construct();

        $this->finfo = new \finfo(FILEINFO_MIME_TYPE);

        // Подготовленный запрос к share_uploads по полному пути файла
        $pdo = $this->dbh->getPDO();
        $this->getFInfoSQL = $pdo->prepare(
            'SELECT 
                upl_internal_type AS type,
                upl_mime_type     AS mime,
                upl_width         AS width,
                upl_height        AS height,
                upl_is_mp4        AS is_mp4,
                upl_is_webm       AS is_webm,
                upl_is_flv        AS is_flv
             FROM share_uploads
             WHERE upl_path = ?'
        );
    }

    /**
     * Анализ файла.
     *
     * Пытается получить метаданные из БД (share_uploads) по полному пути.
     * Если нет — читает с ФС (finfo/getimagesize). На любой сбой возвращает UNKNOWN.
     *
     * @param string $filename
     * @param bool   $forceReadFromFile Принудительно читать с ФС, игнорируя БД.
     * @return object stdClass с полями: type, mime, width, height, is_mp4, is_webm, is_flv, ready
     */
    public function analyze(string $filename, bool $forceReadFromFile = false): object
    {
        try
        {
            $result = null;

            if (
                !$forceReadFromFile &&
                $this->getFInfoSQL &&
                $this->getFInfoSQL->execute([$filename]) &&
                ($row = $this->getFInfoSQL->fetch(PDO::FETCH_ASSOC))
            ) {
                $result = $row;
            }
            else
            {
                $result = $this->getFileInfoData($filename);
                if (!$result)
                {
                    throw new \RuntimeException('Unable to read file info');
                }
            }
        }
        catch (\Throwable $e)
        {
            // Гарантированный безопасный ответ
            $result = [
                'type'    => self::META_TYPE_UNKNOWN,
                'mime'    => 'unknown/mime-type',
                'width'   => null,
                'height'  => null,
                'is_flv'  => false,
                'is_webm' => false,
                'is_mp4'  => false,
                'ready'   => false,
            ];
        }

        // Приведение типов и наполнение отсутствующих ключей
        $result += [
            'type'    => self::META_TYPE_UNKNOWN,
            'mime'    => 'unknown/mime-type',
            'width'   => null,
            'height'  => null,
            'is_flv'  => false,
            'is_webm' => false,
            'is_mp4'  => false,
            'ready'   => false,
        ];

        // Преобразуем width/height к числам, если пришли строками
        if ($result['width'] !== null && $result['width'] !== '')
        {
            $result['width'] = (int)$result['width'];
        }
        else
        {
            $result['width'] = null;
        }
        if ($result['height'] !== null && $result['height'] !== '')
        {
            $result['height'] = (int)$result['height'];
        }
        else
        {
            $result['height'] = null;
        }

        // Булевы признаки формируем надёжно
        $result['is_mp4']  = (bool)$result['is_mp4'];
        $result['is_webm'] = (bool)$result['is_webm'];
        $result['is_flv']  = (bool)$result['is_flv'];

        return (object)$result;
    }

    /**
     * Извлечение метаданных файла с ФС.
     *
     * @param string $filename
     * @return array<string,mixed>
     */
    private function getFileInfoData(string $filename): array
    {
        // Значения по умолчанию
        $result = [
            'width'   => null,
            'height'  => null,
            'is_mp4'  => false,
            'is_webm' => false,
            'is_flv'  => false,
            'mime'    => 'unknown/mime-type',
            'type'    => self::META_TYPE_UNKNOWN,
            'ready'   => false,
        ];

        // Временный хотфикc (как в исходнике): окружение без поддержки https://
        if (strpos($filename, 'https://') === 0)
        {
            return $result; // оставляем UNKNOWN
        }

        if (is_dir($filename))
        {
            $result['type'] = self::META_TYPE_FOLDER;
            return $result;
        }

        if (!file_exists($filename))
        {
            // Файл не найден
            return $result;
        }

        // MIME через finfo
        $mime = $this->finfo->file($filename) ?: 'unknown/mime-type';
        $result['mime'] = $mime;

        switch ($mime)
        {
            // Изображения
            case 'image/webp':
            case 'image/jpeg':
            case 'image/png':
            case 'image/gif': {
                $img = @getimagesize($filename);
                if (is_array($img))
                {
                    $result['type']   = self::META_TYPE_IMAGE;
                    $result['width']  = (int)$img[0];
                    $result['height'] = (int)$img[1];
                }
                else
                {
                    $result['type'] = self::META_TYPE_IMAGE;
                }
                break;
            }

                // Видео (минимальный набор, как в исходнике)
            case 'video/x-flv':
            case 'video/mp4': {
                $result['type'] = self::META_TYPE_VIDEO;
                // Проставим флаги форматов по mime
                if ($mime === 'video/x-flv')
                {
                    $result['is_flv'] = true;
                }
                elseif ($mime === 'video/mp4')
                {
                    $result['is_mp4'] = true;
                }
                break;
            }

                // Текст
            case 'text/csv':
            case 'text/plain': {
                $result['type'] = self::META_TYPE_TEXT;
                break;
            }

                // Архив
            case 'application/zip': {
                $result['type'] = self::META_TYPE_ZIP;
                break;
            }

            default: {
                $result['type'] = self::META_TYPE_UNKNOWN;
                break;
            }
        }

        return $result;
    }

    /**
     * Получить инстанс репозитория по ID записи share_uploads.
     *
     * @throws SystemException
     */
    public function getRepositoryInstanceById(int $upl_id): IFileRepository
    {
        $upl_path = (string)$this->dbh->getScalar('share_uploads', 'upl_path', ['upl_id' => $upl_id]);
        $upl_root = $this->getRepositoryRoot($upl_path);
        return $this->getRepositoryInstanceByRepoPath($upl_root);
    }

    /**
     * Получить инстанс репозитория по полному пути файла.
     *
     * @throws SystemException
     */
    public function getRepositoryInstanceByPath(string $upl_path): IFileRepository
    {
        $upl_root = $this->getRepositoryRoot($upl_path);
        return $this->getRepositoryInstanceByRepoPath($upl_root);
    }

    /**
     * Вернуть корень репозитория (например, "uploads/public") из полного пути.
     *
     * @throws SystemException
     */
    public function getRepositoryRoot(string $upl_path): string
    {
        $upl_junks = explode('/', $upl_path, 3);
        if (empty($upl_junks[1]))
        {
            // Совместимость: возвращаем пустую строку, как в исходнике.
            return '';
        }
        return $upl_junks[0] . '/' . $upl_junks[1];
    }

    /**
     * Получить инстанс IFileRepository по корню репозитория.
     *
     * Логика:
     *  - ищем upl_id по корню;
     *  - проверяем маппинг репозиториев по mime (repositories.mapping);
     *  - если найденный класс реализует IFileRepository — возвращаем его;
     *  - иначе — FileRepositoryLocal как fallback.
     */
    protected function getRepositoryInstanceByRepoPath(string $upl_root): IFileRepository
    {
        $repo_id = (int)$this->dbh->getScalar('share_uploads', 'upl_id', ['upl_path' => $upl_root]);
        $cfg = E()->getConfigValue('repositories.mapping');

        if ($cfg)
        {
            $repo_mime = (string)$this->dbh->getScalar('share_uploads', 'upl_mime_type', ['upl_id' => $repo_id]);
            if (!empty($cfg[$repo_mime]))
            {
                $repo_class_name = $cfg[$repo_mime];
                $instance = new $repo_class_name($repo_id, $upl_root);
                if ($instance instanceof IFileRepository)
                {
                    return $instance;
                }
            }
        }

        // Fallback как в исходнике: локальный репозиторий на uploads/public
        return new FileRepositoryLocal($repo_id, 'uploads/public');
    }
}
