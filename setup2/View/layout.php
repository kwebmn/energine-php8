<?php

declare(strict_types=1);

/** @var string $content */
/** @var array<int, string> $alerts */
$alerts = $alerts ?? [];
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Setup 2</title>
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
<div class="page">
    <header class="page__header">
        <h1 class="page__title">Setup 2</h1>
        <p class="page__subtitle">Инструменты для обслуживания установки Energine.</p>
    </header>

    <?php include __DIR__ . '/partials/alerts.php'; ?>

    <main class="page__content">
        <?= $content ?>
    </main>
</div>
</body>
</html>
