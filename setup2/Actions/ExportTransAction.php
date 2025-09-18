<?php

declare(strict_types=1);

namespace Setup2\Actions;

use JsonException;
use Setup2\ActionResult;
use Setup2\Paths;

final class ExportTransAction implements ActionInterface
{
    /**
     * @param array<mixed> $args
     */
    public function execute(array $args = []): ActionResult
    {
        $exportDirectory = Paths::resolve('var/export');
        $translationsDirectory = Paths::resolve('var/export/translations');

        if (!Paths::ensureDirectory($exportDirectory) || !Paths::ensureDirectory($translationsDirectory)) {
            return ActionResult::failure('Не удалось подготовить директории для экспорта.', [
                'directories' => [
                    Paths::relativeToRoot($exportDirectory),
                    Paths::relativeToRoot($translationsDirectory),
                ],
            ]);
        }

        $modules = $this->collectModules();

        $payload = [
            'generated_at' => date(DATE_ATOM),
            'module_count' => count($modules),
            'modules' => $modules,
            'args' => $args,
        ];

        try {
            $json = json_encode($payload, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } catch (JsonException $exception) {
            return ActionResult::failure('Не удалось подготовить JSON-файл с переводами.', [
                'error' => $exception->getMessage(),
            ]);
        }

        $fileName = sprintf('translations-%s.json', date('Ymd-His'));
        $filePath = $translationsDirectory . DIRECTORY_SEPARATOR . $fileName;
        $bytesWritten = @file_put_contents($filePath, $json);

        if ($bytesWritten === false) {
            return ActionResult::failure('Не удалось записать файл экспорта.', [
                'file' => Paths::relativeToRoot($filePath),
            ]);
        }

        // TODO: выгружать реальные строки из базы данных и файлов локализации.

        return ActionResult::success('Экспорт переводов завершён.', [
            'file' => Paths::relativeToRoot($filePath),
            'bytesWritten' => $bytesWritten,
            'moduleCount' => count($modules),
        ]);
    }

    /**
     * @return list<array{module:string, type:string, translationFiles:list<string>}>
     */
    private function collectModules(): array
    {
        $roots = [
            'engine/core/modules' => 'core',
            'site/modules' => 'site',
        ];

        $modules = [];

        foreach ($roots as $relativeRoot => $type) {
            $absoluteRoot = Paths::resolve($relativeRoot);

            if (!is_dir($absoluteRoot)) {
                continue;
            }

            $directoryIterator = scandir($absoluteRoot);

            if ($directoryIterator === false) {
                continue;
            }

            foreach ($directoryIterator as $entry) {
                if ($entry === '.' || $entry === '..') {
                    continue;
                }

                $absoluteModulePath = $absoluteRoot . DIRECTORY_SEPARATOR . $entry;

                if (!is_dir($absoluteModulePath)) {
                    continue;
                }

                $modules[] = [
                    'module' => $entry,
                    'type' => $type,
                    'translationFiles' => $this->findTranslationFiles($absoluteModulePath),
                ];
            }
        }

        return $modules;
    }

    /**
     * @return list<string>
     */
    private function findTranslationFiles(string $modulePath): array
    {
        $files = [];
        $candidates = ['lang', 'i18n', 'translations'];

        foreach ($candidates as $folder) {
            $directory = $modulePath . DIRECTORY_SEPARATOR . $folder;

            if (!is_dir($directory)) {
                continue;
            }

            $iterator = scandir($directory);

            if ($iterator === false) {
                continue;
            }

            foreach ($iterator as $entry) {
                if ($entry === '.' || $entry === '..') {
                    continue;
                }

                $filePath = $directory . DIRECTORY_SEPARATOR . $entry;

                if (is_file($filePath)) {
                    $files[] = Paths::relativeToRoot($filePath);
                }
            }
        }

        return array_values(array_unique($files));
    }
}
