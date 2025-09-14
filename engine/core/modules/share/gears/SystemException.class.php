<?php
declare(strict_types=1);

/**
 * Базовое системное исключение Energine (совместимо с легаси).
 *
 * Особенности:
 * - Сохраняет все константы и поведение перевода сообщений.
 * - Добавлены поля httpStatus/publicMessage/context (BC-safe).
 * - JSON/ошибочные страницы могут использовать toArray().
 */
class SystemException extends Exception
{
    /** Критическая ошибка. */
    public const ERR_CRITICAL   = 0;
    /** 404 Not Found. */
    public const ERR_404        = 1;
    /** 403 Forbidden. */
    public const ERR_403        = 2;
    /** Ошибка БД. */
    public const ERR_DB         = 3;
    /** Ошибка разработчика. */
    public const ERR_DEVELOPER  = 4;
    /** Ошибка зависимости (внимание: значение совпадает с ERR_LANG в легаси). */
    public const ERR_DEPENDENCY = 5;

    /** Предупреждение. */
    public const ERR_WARNING    = 10;
    /** Уведомление. */
    public const ERR_NOTICE     = 20;

    /**
     * Ошибка, связанная с мультиязычностью (легаси-константа).
     * ВНИМАНИЕ: в старом коде имеет то же значение, что и ERR_DEPENDENCY (=5).
     * Сохраняем значение ради совместимости.
     */
    public const ERR_LANG       = 5;

    /** Экземпляр Response (если доступен). */
    protected ?Response $response = null;

    /** Дополнительные сообщения/детали. */
    protected array $customMessages = [];

    /** Публичное (пользовательское) сообщение — опционально. */
    protected ?string $publicMessage = null;

    /**
     * Рекомендуемый HTTP-статус для этого исключения.
     * Применяется к Response только для некоторых кодов (см. конструктор).
     */
    protected int $httpStatus = 500;

    /** Контекст ошибки (ключ-значение) — пригоден для логирования/JSON. */
    protected array $context = [];

    /**
     * @param string            $message         Сообщение (обычно ключ перевода).
     * @param int               $code            Код (см. константы).
     * @param mixed             $customMessages  Доп. сведения (строка или массив).
     * @param string|null       $publicMessage   Сообщение для пользователя (опц.).
     * @param array             $context         Контекст (опц.).
     */
    public function __construct(
        string $message,
        int $code = self::ERR_CRITICAL,
        mixed $customMessages = null,
        ?string $publicMessage = null,
        array $context = []
    ) {
        $this->response      = E()->getResponse();
        $this->publicMessage = $publicMessage;
        $this->context       = $context;

        if ($customMessages !== null) {
            $this->customMessages = is_array($customMessages)
                ? $customMessages
                : [$customMessages];
        }

        // Подберём рекомендуемый HTTP-статус (для внешнего использования/логики).
        $this->httpStatus = $this->mapHttpStatus($code);

        // Перевод и выставление статуса Response — строго по легаси-поведению.
        // ERR_LANG → 503 + Retry-After, перевести в язык по умолчанию;
        // 403/404 → выставить статус и перевести на текущий язык;
        // прочее (кроме ERR_DB) → перевести на текущий язык; для ERR_DB — без перевода.
        $lang = E()->getLanguage();
        if ($code === self::ERR_LANG) {
            $this->setResponseStatus(503);
            $this->setResponseHeader('Retry-After', '20');
            $message = DBWorker::_translate($message, $lang->getDefault());
        } elseif ($code === self::ERR_403) {
            $this->setResponseStatus(403);
            $message = DBWorker::_translate($message, $lang->getCurrent());
        } elseif ($code === self::ERR_404) {
            $this->setResponseStatus(404);
            $message = DBWorker::_translate($message, $lang->getCurrent());
        } elseif ($code !== self::ERR_DB) {
            $message = DBWorker::_translate($message, $lang->getCurrent());
        }
        // Легаси-ветка для ERR_DB оставляем без изменения статуса/перевода.

        parent::__construct($message, $code);
    }

    /**
     * Рекомендуемая мапа кодов исключений → HTTP-статус.
     * (Независима от того, применили ли мы статус к Response — это внешний совет).
     */
    protected function mapHttpStatus(int $code): int
    {
        return match ($code) {
            self::ERR_403     => 403,
            self::ERR_404     => 404,
            self::ERR_LANG    => 503,
            default           => 500,
        };
    }

    /** Установить статус ответа, если Response доступен. */
    protected function setResponseStatus(int $status): void
    {
        if ($this->response) {
            $this->response->setStatus($status);
        }
    }

    /** Установить заголовок ответа, если Response доступен. */
    protected function setResponseHeader(string $name, string $value): void
    {
        if ($this->response) {
            $this->response->setHeader($name, $value);
        }
    }

    /**
     * Получить дополнительные сообщения (новое имя, предпочтительно).
     * @return array
     */
    public function getCustomMessages(): array
    {
        return $this->customMessages;
    }

    /**
     * Легаси-алиас (оставлен для совместимости со старым кодом).
     * @return array
     */
    public function getCustomMessage(): array
    {
        return $this->customMessages;
    }

    /** Публичное (пользовательское) сообщение, если задано. */
    public function getPublicMessage(): ?string
    {
        return $this->publicMessage;
    }

    /** Установить публичное сообщение (chainable). */
    public function setPublicMessage(?string $message): static
    {
        $this->publicMessage = $message;
        return $this;
    }

    /** Рекомендуемый HTTP-статус. */
    public function getHttpStatus(): int
    {
        return $this->httpStatus;
    }

    /** Контекст ошибки. */
    public function getContext(): array
    {
        return $this->context;
    }

    /** Установить/дополнить контекст (chainable). */
    public function withContext(array $context): static
    {
        // поверхностное объединение; вложенности можно мержить снаружи при желании
        $this->context = $context + $this->context;
        return $this;
    }

    /**
     * Преобразовать исключение к массиву — удобно для JSON/ErrorDocument.
     */
    public function toArray(): array
    {
        return [
            'message'        => $this->getMessage(),
            'publicMessage'  => $this->publicMessage,
            'code'           => $this->getCode(),
            'httpStatus'     => $this->httpStatus,
            'file'           => $this->file,
            'line'           => $this->line,
            'customMessages' => $this->customMessages,
            'context'        => $this->context,
        ];
    }

    /**
     * Принудительно переопределить файл (chainable).
     * Используется, например, из обработчика ошибок.
     */
    public function setFile(string $file): static
    {
        $this->file = $file;
        return $this;
    }

    /**
     * Принудительно переопределить строку (chainable).
     */
    public function setLine(int $line): static
    {
        $this->line = $line;
        return $this;
    }
}
