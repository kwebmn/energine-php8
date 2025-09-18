<?php

declare(strict_types=1);

/** @var array<int, string> $alerts */
?>
<?php if ($alerts !== []): ?>
    <ul class="alerts">
        <?php foreach ($alerts as $alert): ?>
            <li><?= htmlspecialchars($alert, ENT_QUOTES, 'UTF-8') ?></li>
        <?php endforeach; ?>
    </ul>
<?php endif; ?>
