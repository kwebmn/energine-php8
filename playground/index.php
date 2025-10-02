<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (!defined('DEBUG') || !DEBUG) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Playground is available only when DEBUG=true.";
    exit;
}

$projectRoot = realpath(dirname(__DIR__));
$defaultStylesheet = 'site/modules/default/transformers/main.xslt';
$defaultXmlPath = __DIR__ . '/sample.xml';
$defaultXml = is_file($defaultXmlPath) ? (string)file_get_contents($defaultXmlPath) : '<document/>';

$stylesheetRequest = isset($_POST['stylesheet']) ? trim((string)$_POST['stylesheet']) : $defaultStylesheet;
$xmlRequest = isset($_POST['xml']) ? (string)$_POST['xml'] : $defaultXml;
$action = $_POST['action'] ?? '';

$transformResult = null;
$messages = [];

$resolvePath = static function (string $root, string $relative): ?string {
    if ($relative === '') {
        return null;
    }
    $candidate = str_replace(['\\', '..'], ['/', ''], $relative);
    $absolute = realpath($root . DIRECTORY_SEPARATOR . $candidate);
    if ($absolute === false) {
        return null;
    }
    return str_starts_with($absolute, $root) ? $absolute : null;
};

if ($action === 'run') {
    libxml_use_internal_errors(true);
    $xml = new DOMDocument();
    $xml->preserveWhiteSpace = false;
    if (!$xml->loadXML($xmlRequest)) {
        foreach (libxml_get_errors() as $error) {
            $messages[] = sprintf('XML error on line %d: %s', $error->line, trim($error->message));
        }
        libxml_clear_errors();
    } else {
        libxml_clear_errors();
        $stylesheetPath = $resolvePath($projectRoot, $stylesheetRequest);
        if ($stylesheetPath === null || !is_file($stylesheetPath)) {
            $messages[] = sprintf('Stylesheet not found or outside project root: %s', $stylesheetRequest);
        } else {
            $xsl = new DOMDocument();
            $xsl->preserveWhiteSpace = false;
            libxml_use_internal_errors(true);
            if (!$xsl->load($stylesheetPath)) {
                foreach (libxml_get_errors() as $error) {
                    $messages[] = sprintf('XSL error on line %d: %s', $error->line, trim($error->message));
                }
                libxml_clear_errors();
            } else {
                libxml_clear_errors();
                $processor = new XSLTProcessor();
                $processor->registerPHPFunctions();
                $processor->importStylesheet($xsl);
                $result = $processor->transformToXML($xml);
                if ($result === false) {
                    $messages[] = 'Transformation failed: see PHP error log for details.';
                } else {
                    $transformResult = $result;
                }
            }
        }
    }
}

function esc(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>XSLT Playground</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
        body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; margin: 2rem; }
        textarea { width: 100%; min-height: 18rem; font-family: 'SFMono-Regular', Consolas, monospace; }
        input[type="text"] { width: 100%; padding: 0.5rem; font-family: inherit; }
        .toolbar { display: flex; gap: 1rem; margin-bottom: 1rem; }
        .messages { background: #fee; border: 1px solid #f99; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
        .messages ul { margin: 0; padding-left: 1.2rem; }
        .result { margin-top: 2rem; }
        .result iframe { width: 100%; min-height: 20rem; border: 1px solid #ccc; border-radius: 0.5rem; }
        .result pre { background: #f7f7f7; padding: 1rem; overflow: auto; border-radius: 0.5rem; }
        .note { color: #555; font-size: 0.9rem; }
    </style>
</head>
<body>
    <h1>XSLT Playground</h1>
    <p class="note">Playground доступен только при <code>DEBUG=true</code>. Используйте его, чтобы локально
        проверить XSLT на примере XML и выбрать нужный шаблон.</p>
    <form method="post">
        <div class="toolbar">
            <div style="flex:2;">
                <label for="stylesheet">Stylesheet (путь относительно корня проекта)</label>
                <input type="text" id="stylesheet" name="stylesheet" value="<?= esc($stylesheetRequest) ?>" />
            </div>
            <div style="align-self:flex-end;">
                <button type="submit" name="action" value="run">Выполнить трансформацию</button>
            </div>
        </div>
        <label for="xml">XML источник</label>
        <textarea id="xml" name="xml"><?= esc($xmlRequest) ?></textarea>
    </form>

    <?php if ($messages): ?>
        <div class="messages">
            <strong>Ошибки:</strong>
            <ul>
                <?php foreach ($messages as $message): ?>
                    <li><?= esc($message) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
    <?php endif; ?>

    <?php if ($transformResult !== null): ?>
        <div class="result">
            <h2>Результат</h2>
            <iframe srcdoc="<?= esc($transformResult) ?>" title="Превью"></iframe>
            <h3>Сырый HTML</h3>
            <pre><?= esc($transformResult) ?></pre>
        </div>
    <?php endif; ?>

    <section class="note">
        <h2>Подсказки</h2>
        <ul>
            <li>Стандартный пример XML лежит в <code>playground/sample.xml</code>.</li>
            <li>Вы можете указать любой XSL-файл из папок <code>engine/</code> или <code>site/</code>.</li>
            <li>Все пути проверяются, чтобы не выходить за пределы рабочей директории.</li>
        </ul>
    </section>
</body>
</html>
