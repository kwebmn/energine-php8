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
    'linker' => [
        'title' => 'Создать ссылки',
        'description' => 'Создать симлинки модулей и ресурсов.',
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
            'details' => null,
            'logPointer' => null,
        ];

        if (is_array($rawAlert)) {
            $lastAlert['message'] = (string) ($rawAlert['message'] ?? '');
            $lastAlert['status'] = (string) ($rawAlert['status'] ?? 'info');
            $lastAlert['log'] = (string) ($rawAlert['log'] ?? '');
            $lastAlert['action'] = (string) ($rawAlert['action'] ?? '');
            $lastAlert['details'] = $rawAlert['details'] ?? null;
            $lastAlert['logPointer'] = isset($rawAlert['logPointer']) ? (string) $rawAlert['logPointer'] : null;
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

$formatDetails = static function (mixed $details): string {
    if ($details === null) {
        return '';
    }

    if (is_string($details)) {
        return $details;
    }

    if (is_scalar($details)) {
        return (string) $details;
    }

    if ($details instanceof \Stringable) {
        return (string) $details;
    }

    if (is_array($details)) {
        $encoded = json_encode($details, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        if (is_string($encoded)) {
            return $encoded;
        }

        return trim(print_r($details, true));
    }

    return trim(print_r($details, true));
};

$actionLabels = [];
foreach ($availableActions as $actionValue => $meta) {
    $actionLabels[$actionValue] = (string) ($meta['title'] ?? $actionValue);
}

$actionLabelsJson = json_encode($actionLabels, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if (!is_string($actionLabelsJson)) {
    $actionLabelsJson = '{}';
}

$statusTitlesJson = json_encode($statusTitles, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if (!is_string($statusTitlesJson)) {
    $statusTitlesJson = '{}';
}

$lastAlertStatusClass = 'info';
$lastAlertStatusLabel = '';
$lastAlertDetails = '';
$lastAlertActionName = '';
$lastAlertLogPointer = '';
if ($lastAlert !== null) {
    $lastAlertStatusClass = strtolower(preg_replace('/[^a-z0-9_-]+/i', '-', $lastAlert['status']));
    if ($lastAlertStatusClass === '') {
        $lastAlertStatusClass = 'info';
    }

    $lastAlertStatusLabel = (string) ($statusTitles[strtolower($lastAlert['status'])] ?? ucfirst($lastAlert['status']));

    $lastAlertDetails = $formatDetails($lastAlert['details']);

    if ($lastAlert['action'] !== '') {
        $lastAlertActionName = (string) ($availableActions[$lastAlert['action']]['title'] ?? $lastAlert['action']);
    }

    if (is_string($lastAlert['logPointer']) && $lastAlert['logPointer'] !== '') {
        $lastAlertLogPointer = $lastAlert['logPointer'];
    }
}

$hasLastAlert = $lastAlert !== null;

?>
<section class="dashboard">
    <div class="dashboard__panel">
        <h2 class="dashboard__title">Действия</h2>
        <p class="dashboard__hint">Выберите задачу для выполнения. Все операции защищены CSRF-токеном.</p>
        <form method="post" class="actions-grid" data-actions-form data-action-labels='<?= htmlspecialchars($actionLabelsJson, ENT_QUOTES, 'UTF-8') ?>'>
            <input type="hidden" name="_csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8') ?>">
            <?php foreach ($availableActions as $actionValue => $meta): ?>
                <button class="action-tile" type="submit" name="action" value="<?= htmlspecialchars($actionValue, ENT_QUOTES, 'UTF-8') ?>">
                    <span class="action-tile__title"><?= htmlspecialchars($meta['title'], ENT_QUOTES, 'UTF-8') ?></span>
                    <span class="action-tile__description"><?= htmlspecialchars($meta['description'], ENT_QUOTES, 'UTF-8') ?></span>
                </button>
            <?php endforeach; ?>
        </form>
    </div>

    <aside class="dashboard__panel dashboard__panel--log" id="log-panel" data-log-panel data-status-titles='<?= htmlspecialchars($statusTitlesJson, ENT_QUOTES, 'UTF-8') ?>'>
        <h2 class="dashboard__title">Лог выполнения</h2>
        <p class="log-placeholder" data-log-placeholder<?= $hasLastAlert ? ' hidden' : '' ?>>История действий появится после выполнения одной из команд.</p>
        <div class="log-content" data-log-content<?= $hasLastAlert ? '' : ' hidden' ?>>
            <dl class="log-meta">
                <div class="log-meta__row" data-log-action-row<?= $lastAlertActionName !== '' ? '' : ' hidden' ?>>
                    <dt>Действие</dt>
                    <dd data-log-action><?= htmlspecialchars($lastAlertActionName, ENT_QUOTES, 'UTF-8') ?></dd>
                </div>
                <div class="log-meta__row">
                    <dt>Статус</dt>
                    <dd class="log-status log-status--<?= htmlspecialchars($lastAlertStatusClass, ENT_QUOTES, 'UTF-8') ?>" data-log-status>
                        <?= htmlspecialchars($lastAlertStatusLabel, ENT_QUOTES, 'UTF-8') ?>
                    </dd>
                </div>
            </dl>
            <pre class="log-output" data-log-output><?= htmlspecialchars($lastAlert['log'] ?? '', ENT_QUOTES, 'UTF-8') ?></pre>
            <details class="accordion log-details" data-log-details<?= $lastAlertDetails !== '' ? '' : ' hidden' ?>>
                <summary class="accordion__summary">Раскрыть детали</summary>
                <pre class="accordion__content" data-log-details-content><?= htmlspecialchars($lastAlertDetails, ENT_QUOTES, 'UTF-8') ?></pre>
            </details>
            <p class="log-pointer" data-log-pointer<?= $lastAlertLogPointer !== '' ? '' : ' hidden' ?>>
                Лог:
                <a href="<?= htmlspecialchars($lastAlertLogPointer, ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener" data-log-pointer-link><?= htmlspecialchars($lastAlertLogPointer, ENT_QUOTES, 'UTF-8') ?></a>
            </p>
        </div>
    </aside>
</section>
