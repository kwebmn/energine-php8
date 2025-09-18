<?php

declare(strict_types=1);

/** @var string $content */
/** @var array<int, string> $alerts */
$alerts = $alerts ?? [];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Setup 2</title>
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
<div class="container">
    <h1>Setup 2</h1>
    <?php include __DIR__ . '/partials/alerts.php'; ?>
    <main>
        <?= $content ?>
    </main>
</div>
</body>
</html>
