<?php
declare(strict_types=1);

use Symfony\Component\HttpFoundation\Session\Storage\Handler\AbstractSessionHandler;

/**
 * Обработчик сессий, сохраняющий данные в таблицу share_session.
 * Делегирует базовую логику Symfony, но повторяет поведение старого Energine-хранилища.
 */
final class ShareSessionHandler extends AbstractSessionHandler
{
    private const TABLE = 'share_session';

    private readonly QAL $db;
    private readonly int $lifespan;
    private readonly string $userAgent;

    public function __construct(QAL $db, int $lifespan, string $userAgent)
    {
        $this->db = $db;
        $this->lifespan = $lifespan;
        $this->userAgent = $userAgent;
    }

    /**
     * Есть ли актуальная запись о сессии в БД?
     */
    public function isValid(string $sessionId): bool
    {
        $res = $this->db->select(
            'SELECT 1 FROM ' . self::TABLE . ' WHERE session_native_id = %s AND session_expires >= UNIX_TIMESTAMP()',
            addslashes($sessionId)
        );

        return is_array($res) && !empty($res);
    }

    /**
     * Удалить запись о сессии без побочных эффектов.
     */
    public function deleteById(string $sessionId): void
    {
        $this->db->modify(QAL::DELETE, self::TABLE, null, ['session_native_id' => $sessionId]);
    }

    protected function doRead(string $sessionId): string
    {
        $res = $this->db->select(
            'SELECT session_data FROM ' . self::TABLE . ' WHERE session_native_id = %s AND session_expires >= UNIX_TIMESTAMP()',
            addslashes($sessionId)
        );

        return (is_array($res) && isset($res[0]['session_data'])) ? (string) $res[0]['session_data'] : '';
    }

    protected function doWrite(string $sessionId, string $data): bool
    {
        $now = time();

        $payload = [
            'session_data' => $data,
            'session_last_impression' => $now,
            'session_expires' => $now + $this->lifespan,
        ];

        if (isset($_SESSION['userID'])) {
            $payload['u_id'] = (int) $_SESSION['userID'];
        }

        if ($this->userAgent !== '') {
            $payload['session_user_agent'] = $this->userAgent;
        }

        $updated = $this->db->modify(QAL::UPDATE, self::TABLE, $payload, ['session_native_id' => $sessionId]);

        if ($updated !== true) {
            $payload['session_native_id'] = $sessionId;
            $payload['session_created'] = $now;
            $payload['session_ip'] = E()->getRequest()->getClientIP(true);

            $this->db->modify(QAL::INSERT, self::TABLE, $payload);
        }

        return true;
    }

    protected function doDestroy(string $sessionId): bool
    {
        $this->deleteById($sessionId);

        return true;
    }

    public function gc(int $max_lifetime): int|false
    {
        try {
            $pdo = $this->db->getPDO();
            $stmt = $pdo->prepare('DELETE FROM ' . self::TABLE . ' WHERE session_expires < UNIX_TIMESTAMP()');
            $stmt->execute();

            return $stmt->rowCount();
        } catch (\Throwable) {
            return false;
        }
    }
}
