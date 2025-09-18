<?php

declare(strict_types=1);

namespace Setup2\Actions;

use JsonException;
use Setup2\ActionResult;
use Setup2\Paths;

final class InstallAction implements ActionInterface
{
    /**
     * @var list<string>
     */
    private const REQUIRED_DIRECTORIES = [
        'var',
        'var/cache',
        'var/export',
        'var/log',
        'uploads',
        'uploads/public',
        'uploads/temp',
    ];

    /**
     * @param array<mixed> $args
     */
    public function execute(array $args = []): ActionResult
    {
        $createdDirectories = [];
        $existingDirectories = [];
        $failedDirectories = [];

        foreach (self::REQUIRED_DIRECTORIES as $relativePath) {
            $absolutePath = Paths::resolve($relativePath);

            if (is_dir($absolutePath)) {
                $existingDirectories[] = $relativePath;
                continue;
            }

            if (!Paths::ensureDirectory($absolutePath)) {
                $failedDirectories[] = $relativePath;
                continue;
            }

            $createdDirectories[] = $relativePath;
        }

        if ($failedDirectories !== []) {
            return ActionResult::failure('Не удалось подготовить все необходимые директории.', [
                'created' => $createdDirectories,
                'existing' => $existingDirectories,
                'failed' => $failedDirectories,
            ]);
        }

        $stateFile = Paths::resolve('var/install-state.json');

        try {
            $payload = json_encode([
                'installed_at' => date(DATE_ATOM),
                'args' => $args,
                // TODO: подключить выполнение миграций и модульных установщиков после переноса бизнес-логики.
                'notes' => 'Bootstrap install marker. Migrations and seeding will be attached here later.',
            ], JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        } catch (JsonException $exception) {
            return ActionResult::failure('Не удалось сериализовать параметры установки.', [
                'error' => $exception->getMessage(),
            ]);
        }

        $bytesWritten = @file_put_contents($stateFile, $payload);

        if ($bytesWritten === false) {
            return ActionResult::failure('Не удалось записать файл состояния установки.', [
                'file' => Paths::relativeToRoot($stateFile),
            ]);
        }

        return ActionResult::success('Установка окружения завершена.', [
            'createdDirectories' => $createdDirectories,
            'existingDirectories' => $existingDirectories,
            'stateFile' => Paths::relativeToRoot($stateFile),
            'bytesWritten' => $bytesWritten,
        ]);
    }
}
