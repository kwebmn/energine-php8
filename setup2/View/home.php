<?php

declare(strict_types=1);

/** @var list<string> $actions */
/** @var string $csrfToken */
?>
<section>
    <h2>Available actions</h2>
    <form method="post" class="installer-form">
        <input type="hidden" name="_csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8') ?>">
        <label for="action">Select action</label>
        <select id="action" name="action">
            <?php foreach ($actions as $action): ?>
                <option value="<?= htmlspecialchars($action, ENT_QUOTES, 'UTF-8') ?>">
                    <?= htmlspecialchars($action, ENT_QUOTES, 'UTF-8') ?>
                </option>
            <?php endforeach; ?>
        </select>
        <button type="submit">Run</button>
    </form>
    <ul>
        <?php foreach ($actions as $action): ?>
            <li><?= htmlspecialchars($action, ENT_QUOTES, 'UTF-8') ?></li>
        <?php endforeach; ?>
    </ul>
</section>
