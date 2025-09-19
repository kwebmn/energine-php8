<?php

declare(strict_types=1);

/** @var array<int, mixed> $alerts */

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
?>
<div class="alerts" data-alerts>
    <?php if ($alerts !== []): ?>
        <?php foreach ($alerts as $alert): ?>
            <?php
            $alertData = [
                'message' => '',
                'status' => 'info',
                'log' => '',
                'details' => null,
            ];

            if (is_array($alert)) {
                $alertData['message'] = (string) ($alert['message'] ?? '');
                $alertData['status'] = (string) ($alert['status'] ?? 'info');
                $alertData['log'] = (string) ($alert['log'] ?? '');
                $alertData['details'] = $alert['details'] ?? null;
            } else {
                $alertData['message'] = (string) $alert;
            }

            $statusClass = strtolower(preg_replace('/[^a-z0-9_-]+/i', '-', $alertData['status']));
            if ($statusClass === '') {
                $statusClass = 'info';
            }

            $detailsContent = $formatDetails($alertData['details']);
            ?>
            <div class="alert alert--<?= htmlspecialchars($statusClass, ENT_QUOTES, 'UTF-8') ?>">
                <span class="alert__message"><?= htmlspecialchars($alertData['message'], ENT_QUOTES, 'UTF-8') ?></span>
                <?php if ($alertData['log'] !== ''): ?>
                    <a class="alert__log-link" href="#log-panel">Показать лог</a>
                <?php endif; ?>
                <?php if ($detailsContent !== ''): ?>
                    <details class="alert__details accordion">
                        <summary class="accordion__summary">Раскрыть детали</summary>
                        <pre class="accordion__content"><?= htmlspecialchars($detailsContent, ENT_QUOTES, 'UTF-8') ?></pre>
                    </details>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>
