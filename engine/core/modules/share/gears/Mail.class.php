<?php

/**
 * Mail (Symfony Mailer adapter, drop-in replacement)
 *
 * Требует пакеты: symfony/mailer, symfony/mime, symfony/http-client
 * DSN берётся из конфигурации 'mail.dsn' или переменной окружения MAILER_DSN.
 */

use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

final class Mail extends BaseObject
{
    /** Совместимость со старым кодом */
    public const EOL = "\n";

    /** @var MailerInterface */
    private $mailer;

    /** @var string|null */
    private $subject = null;

    /** @var string|null */
    private $sender = null;

    /** @var array<string,string> email => formatted */
    private $to = [];

    /** @var array<string,string> email => formatted */
    private $replyTo = [];

    /** @var string|null HTML-тело письма (мы сформируем и text-версию автоматически) */
    private $text = null;

    /** @var array<int,array{path:string,name:?string}> */
    private $attachments = [];

    public function __construct(?MailerInterface $mailer = null)
    {
        // Адрес отправителя по умолчанию из конфига (как и раньше)
        $this->sender = $this->getConfigValue('mail.from');

        if ($mailer)
        {
            $this->mailer = $mailer;
            return;
        }

        // Транспорт из конфига или окружения
        $dsn = $this->getConfigValue('mail.dsn');
        if (!$dsn)
        {
            $dsn = getenv('MAILER_DSN') ?: 'sendmail://default';
        }

        // Инициализация Mailer
        $this->mailer = new Mailer(Transport::fromDsn($dsn));
    }

    /** Установить From */
    public function setFrom($email, $name = false)
    {
        $this->sender = $name ? (string) (new Address($email, $name)) : (string) (new Address($email));
        return $this;
    }

    /** Тема */
    public function setSubject($subject)
    {
        // Symfony сам корректно кодирует тему в UTF-8
        $this->subject = (string) $subject;
        return $this;
    }

    /** Добавить получателя */
    public function addTo($email, $name = false)
    {
        $email = trim((string)$email);
        $this->to[$email] = $name ? (string) (new Address($email, $name)) : $email;
        return $this;
    }

    /** Очистить список получателей */
    public function clearRecipientList()
    {
        $this->to = [];
        return $this;
    }

    /** Добавить Reply-To */
    public function addReplyTo($email, $name = false)
    {
        $email = trim((string)$email);
        $this->replyTo[$email] = $name ? (string) (new Address($email, $name)) : $email;
        return $this;
    }

    /**
     * Установить тело письма.
     * Подстановка плейсхолдеров вида {var} из $data (без eval).
     */
    public function setText($text, $data = false)
    {
        $html = (string)$text;

        if (is_array($data) && $data)
        {
            // безопасная подстановка {key} => value
            $repl = [];
            foreach ($data as $k => $v)
            {
                $repl['{'.$k.'}'] = (string)$v;
            }
            // Дополнительно предоставим {host}, как было в старом коде
            if (!isset($repl['{host}']))
            {
                $repl['{host}'] = E()->getSiteManager()->getDefaultSite()->base;
            }
            $html = strtr($html, $repl);
        }

        $this->text = $html;
        return $this;
    }

    /** Получить тело */
    public function getText()
    {
        return $this->text;
    }

    /** Вложение (из файла) */
    public function addAttachment($file, $fileName = false)
    {
        $path = (string)$file;
        if (is_file($path))
        {
            $this->attachments[] = ['path' => $path, 'name' => $fileName ? (string)$fileName : null];
        }
        // Тихо игнорируем отсутствующие файлы, как и прежде
        return $this;
    }

    /**
     * Отправить письмо
     * @return bool
     */
    public function send()
    {
        if (empty($this->to))
        {
            return false;
        }

        $email = new Email();

        // From: если не задан — возьмём из конфигурации
        $from = $this->sender ?: $this->getConfigValue('mail.from') ?: 'no-reply@localhost';
        $email->from($from);

        // To
        foreach ($this->to as $addr)
        {
            // Address::create безопасно распарсит "Name <email>" и просто email
            $email->addTo(Address::create($addr));
        }

        // Reply-To
        if (!empty($this->replyTo))
        {
            foreach ($this->replyTo as $addr)
            {
                $email->addReplyTo(Address::create($addr));
            }
        }
        else
        {
            $email->addReplyTo(Address::create($from));
        }

        // Subject
        if ($this->subject)
        {
            $email->subject($this->subject);
        }

        // Тело: HTML + авто text-версия
        $html = (string)($this->text ?? '');
        $plain = trim(strip_tags($html));
        $email->html($html)->text($plain);

        // Вложения
        foreach ($this->attachments as $att)
        {
            $name = $att['name'] ?? null;
            $email->attachFromPath($att['path'], $name);
        }

        try
        {
            $this->mailer->send($email);
            return true;
        }
        catch (TransportExceptionInterface $e)
        {
            // здесь можно логировать $e->getMessage()
            return false;
        }
    }
}
