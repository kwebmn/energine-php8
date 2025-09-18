<?php

declare(strict_types=1);

/** @var array<int, string> $alerts */
?>
<?php if ($alerts !== []): ?>
    <div class="alerts">
        <?php foreach ($alerts as $alert): ?>
            <?php
            $alertData = [
                'message' => '',
                'status' => 'info',
                'log' => '',
            ];

            if (is_array($alert)) {
                $alertData['message'] = (string) ($alert['message'] ?? '');
                $alertData['status'] = (string) ($alert['status'] ?? 'info');
                $alertData['log'] = (string) ($alert['log'] ?? '');
            } else {
                $alertData['message'] = (string) $alert;
            }

            $statusClass = strtolower(preg_replace('/[^a-z0-9_-]+/i', '-', $alertData['status']));
            if ($statusClass === '') {
                $statusClass = 'info';
            }
            ?>
            <div class="alert alert--<?= htmlspecialchars($statusClass, ENT_QUOTES, 'UTF-8') ?>">
                <span class="alert__message"><?= htmlspecialchars($alertData['message'], ENT_QUOTES, 'UTF-8') ?></span>
                <?php if ($alertData['log'] !== ''): ?>
                    <a class="alert__log-link" href="#log-panel">Показать лог</a>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>
