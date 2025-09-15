<?php

declare(strict_types=1);
class MailMessage extends DBWorker
{
	private static $instance;

	public static function getInstance() {
		if (!isset(self::$instance)) {
			self::$instance = new MailMessage();
		}
		return self::$instance;
	}

	public function sendMessage($to, $subject, $message, $data = false)
	{
		$mailer = new Mail();
		$mailer->setFrom($this->getConfigValue('mail.from'))->
		setSubject($subject)->
		setText($message, $data)->
		addTo($to);
		try {
			$mailer->send();
			return true;
		}
		catch (Exception $e)
		{
			return false;
		}
	}

}