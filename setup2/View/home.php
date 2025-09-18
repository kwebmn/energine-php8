<?php

declare(strict_types=1);

/** @var list<string> $actions */
/** @var string $csrfToken */
/** @var array<int, mixed> $alerts */

$actionCards = [
    'install' => [
        'title' => 'Install',
        'description' => 'Полная установка приложения.',
    ],
    'clear-cache' => [
        'title' => 'Clear Cache',
        'description' => 'Очистить кэш системы и шаблонов.',
    ],
    'sync-uploads' => [
        'title' => 'Sync Uploads',
        'description' => 'Синхронизировать пользовательские файлы.',
    ],
    'export-trans' => [
        'title' => 'Export Translations',
        'description' => 'Выгрузить языковые файлы.',
    ],
    'uninstall' => [
        'title' => 'Uninstall',
        'description' => 'Удалить установку и очистить данные.',
    ],
    'check-env' => [
        'title' => 'Check Env',
        'description' => 'Проверка окружения и зависимостей.',
    ],
];

$availableActions = [];
foreach ($actionCards as $key => $meta) {
    if (in_array($key, $actions, true)) {
        $availableActions[$key] = $meta;
    }
}

$lastAlert = null;
if ($alerts !== []) {
    $lastKey = array_key_last($alerts);
    if ($lastKey !== null) {
        $rawAlert = $alerts[$lastKey];
        $lastAlert = [
            'message' => '',
            'status' => 'info',
            'log' => '',
            'action' => '',
        ];

        if (is_array($rawAlert)) {
            $lastAlert['message'] = (string) ($rawAlert['message'] ?? '');
            $lastAlert['status'] = (string) ($rawAlert['status'] ?? 'info');
            $lastAlert['log'] = (string) ($rawAlert['log'] ?? '');
            $lastAlert['action'] = (string) ($rawAlert['action'] ?? '');
        } else {
            $lastAlert['message'] = (string) $rawAlert;
        }

        if ($lastAlert['log'] === '') {
            $lastAlert['log'] = $lastAlert['message'];
        }
    }
}

$statusTitles = [
    'success' => 'Успешно',
    'error' => 'Ошибка',
    'info' => 'Информация',
];

?>
<section class="dashboard">
    <div class="dashboard__panel">
        <h2 class="dashboard__title">Действия</h2>
        <p class="dashboard__hint">Выберите задачу для выполнения. Все операции защищены CSRF-токеном.</p>
        <form method="post" class="actions-grid">
            <input type="hidden" name="_csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8') ?>">
            <?php foreach ($availableActions as $actionValue => $meta): ?>
                <button class="action-tile" type="submit" name="action" value="<?= htmlspecialchars($actionValue, ENT_QUOTES, 'UTF-8') ?>">
                    <span class="action-tile__title"><?= htmlspecialchars($meta['title'], ENT_QUOTES, 'UTF-8') ?></span>
                    <span class="action-tile__description"><?= htmlspecialchars($meta['description'], ENT_QUOTES, 'UTF-8') ?></span>
                </button>
            <?php endforeach; ?>
        </form>
    </div>

    <aside class="dashboard__panel dashboard__panel--log" id="log-panel">
        <h2 class="dashboard__title">Лог выполнения</h2>
        <?php if ($lastAlert !== null): ?>
            <dl class="log-meta">
                <?php if ($lastAlert['action'] !== ''): ?>
                    <div class="log-meta__row">
                        <dt>Действие</dt>
                        <dd>
                            <?php
                            $actionName = $availableActions[$lastAlert['action']]['title'] ?? $lastAlert['action'];
                            echo htmlspecialchars($actionName, ENT_QUOTES, 'UTF-8');
                            ?>
                        </dd>
                    </div>
                <?php endif; ?>
                <div class="log-meta__row">
                    <dt>Статус</dt>
                    <dd class="log-status log-status--<?= htmlspecialchars(strtolower(preg_replace('/[^a-z0-9_-]+/i', '-', $lastAlert['status'])), ENT_QUOTES, 'UTF-8') ?>">
                        <?= htmlspecialchars($statusTitles[strtolower($lastAlert['status'])] ?? ucfirst($lastAlert['status']), ENT_QUOTES, 'UTF-8') ?>
                    </dd>
                </div>
            </dl>
            <pre class="log-output"><?= htmlspecialchars($lastAlert['log'], ENT_QUOTES, 'UTF-8') ?></pre>
        <?php else: ?>
            <p class="log-placeholder">История действий появится после выполнения одной из команд.</p>
        <?php endif; ?>
    </aside>
</section>
