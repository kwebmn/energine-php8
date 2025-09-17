<?php
declare(strict_types=1);

final class MailMessage extends DBWorker
{
    private static ?self $instance = null;

    public static function getInstance(): self
    {
        if (!isset(self::$instance)) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    public function sendMessage(string $to, string $subject, string $message, ?array $data = null): bool
    {
        $mailer = new Mail();
        $from = (string)($this->getConfigValue('mail.from') ?? '');
        if ($from !== '') {
            $mailer->setFrom($from);
        }

        $mailer
            ->setSubject($subject)
            ->setText($message, $data)
            ->addTo($to);

        try {
            return $mailer->send();
        } catch (Exception $e) {
            return false;
        }
    }
}

