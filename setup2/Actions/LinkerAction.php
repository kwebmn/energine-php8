<?php

declare(strict_types=1);

namespace Setup2\Actions;

use Setup2\ActionResult;
use Setup2\Paths;

final class LinkerAction implements ActionInterface
{
    private const CONFIG_FILE = 'system.config.php';

    /**
     * @var list<string>
     */
    private const HTDOCS_DIRECTORIES = [
        'images',
        'scripts',
        'stylesheets',
        'templates/content',
        'templates/icons',
        'templates/layout',
    ];

    /**
     * @param array<mixed> $args
     */
    public function execute(array $args = []): ActionResult
    {
        $details = [
            'modules' => [
                'linked' => [],
                'failed' => [],
            ],
            'resources' => [],
        ];

        $configPath = Paths::resolve(self::CONFIG_FILE);

        if (!is_file($configPath)) {
            return ActionResult::failure('Конфигурационный файл system.config.php не найден.', [
                'path' => Paths::relativeToRoot($configPath),
            ]);
        }

        /** @var array<mixed>|false $config */
        $config = include $configPath;

        if (!is_array($config)) {
            return ActionResult::failure('system.config.php должен возвращать массив конфигурации.');
        }

        $modules = $config['modules'] ?? null;

        if (!is_array($modules) || $modules === []) {
            return ActionResult::failure('В system.config.php не задан список модулей (ключ modules).');
        }

        $coreRelDir = $this->normalizeRelativeDirectory($config['core_rel_dir'] ?? null, 'core');
        $siteRelDir = $this->normalizeRelativeDirectory($config['site_rel_dir'] ?? null, 'site');

        $coreModulesRelative = $coreRelDir === '' ? 'modules' : $coreRelDir . '/modules';
        $modulesDir = Paths::resolve($coreModulesRelative);
        $siteModulesRelative = $siteRelDir === '' ? 'modules' : $siteRelDir . '/modules';
        $siteModulesRoot = Paths::resolve($siteModulesRelative);

        if (!Paths::ensureDirectory($modulesDir)) {
            return ActionResult::failure('Не удалось подготовить директорию для символьных ссылок модулей.', [
                'directory' => Paths::relativeToRoot($modulesDir),
            ]);
        }

        $moduleFailures = [];

        foreach ($modules as $module => $path) {
            if (!is_string($path) || $path === '') {
                $moduleFailures[] = [
                    'module' => (string) $module,
                    'error' => 'Некорректный путь к модулю в конфигурации.',
                ];
                continue;
            }

            $sourcePath = rtrim($path, DIRECTORY_SEPARATOR);
            $resolvedSource = realpath($sourcePath);
            if ($resolvedSource !== false) {
                $sourcePath = $resolvedSource;
            }

            if (!is_dir($sourcePath)) {
                $moduleFailures[] = [
                    'module' => (string) $module,
                    'source' => Paths::relativeToRoot($sourcePath),
                    'error' => 'Каталог модуля не найден.',
                ];
                continue;
            }

            $destinationPath = $modulesDir . DIRECTORY_SEPARATOR . (string) $module;

            if ((file_exists($destinationPath) || is_link($destinationPath)) && !$this->removePath($destinationPath)) {
                $moduleFailures[] = [
                    'module' => (string) $module,
                    'source' => Paths::relativeToRoot($sourcePath),
                    'target' => Paths::relativeToRoot($destinationPath),
                    'error' => 'Не удалось удалить предыдущую ссылку на модуль.',
                ];
                continue;
            }

            if (@symlink($sourcePath, $destinationPath)) {
                $details['modules']['linked'][] = [
                    'module' => (string) $module,
                    'source' => Paths::relativeToRoot($sourcePath),
                    'target' => Paths::relativeToRoot($destinationPath),
                ];
            } else {
                $moduleFailures[] = [
                    'module' => (string) $module,
                    'source' => Paths::relativeToRoot($sourcePath),
                    'target' => Paths::relativeToRoot($destinationPath),
                    'error' => 'Не удалось создать символическую ссылку на модуль.',
                ];
            }
        }

        $details['modules']['failed'] = $moduleFailures;

        $useSymlinkForResources = (bool) ($config['site']['debug'] ?? false);

        $resourceFailures = false;

        foreach (self::HTDOCS_DIRECTORIES as $relativeDir) {
            $resourceDetails = [
                'directory' => $relativeDir,
                'mode' => $useSymlinkForResources ? 'symlink' : 'copy',
                'coreLinked' => 0,
                'siteLinked' => 0,
                'coreMissing' => [],
                'siteMissing' => [],
                'failures' => [],
            ];

            $destinationDir = Paths::resolve($relativeDir);

            if (!Paths::ensureDirectory($destinationDir)) {
                $resourceDetails['failures'][] = [
                    'stage' => 'prepare',
                    'target' => Paths::relativeToRoot($destinationDir),
                    'error' => 'Не удалось создать директорию назначения.',
                ];
                $details['resources'][$relativeDir] = $resourceDetails;
                $resourceFailures = true;
                continue;
            }

            $cleanupErrors = $this->clearDirectory($destinationDir);
            if ($cleanupErrors !== []) {
                foreach ($cleanupErrors as $cleanupError) {
                    $cleanupError['stage'] = 'cleanup';
                    $resourceDetails['failures'][] = $cleanupError;
                }
            }

            foreach (array_reverse($modules, true) as $module => $modulePath) {
                if (!is_string($modulePath) || $modulePath === '') {
                    continue;
                }

                $sourceDir = $this->joinPath($modulePath, $relativeDir);
                $resolvedSourceDir = realpath($sourceDir);
                if ($resolvedSourceDir !== false) {
                    $sourceDir = $resolvedSourceDir;
                }

                if (!is_dir($sourceDir)) {
                    $resourceDetails['coreMissing'][] = [
                        'module' => (string) $module,
                        'source' => Paths::relativeToRoot($sourceDir),
                    ];
                    continue;
                }

                $failures = [];
                $linked = $this->mirrorDirectory($sourceDir, $destinationDir, $useSymlinkForResources, $failures);
                $resourceDetails['coreLinked'] += $linked;

                if ($failures !== []) {
                    foreach ($failures as &$failure) {
                        $failure['module'] = (string) $module;
                    }
                    unset($failure);
                    $resourceDetails['failures'] = array_merge($resourceDetails['failures'], $failures);
                }
            }

            if (is_dir($siteModulesRoot)) {
                $siteModules = glob($siteModulesRoot . DIRECTORY_SEPARATOR . '*', GLOB_ONLYDIR);
                if ($siteModules === false) {
                    $resourceDetails['failures'][] = [
                        'stage' => 'scan-site-modules',
                        'source' => Paths::relativeToRoot($siteModulesRoot),
                        'error' => 'Не удалось получить список модулей сайта.',
                    ];
                } else {
                    foreach ($siteModules as $siteModulePath) {
                        $moduleName = basename($siteModulePath);
                        $sourceDir = $this->joinPath($siteModulePath, $relativeDir);
                        $resolvedSourceDir = realpath($sourceDir);
                        if ($resolvedSourceDir !== false) {
                            $sourceDir = $resolvedSourceDir;
                        }

                        if (!is_dir($sourceDir)) {
                            $resourceDetails['siteMissing'][] = [
                                'module' => $moduleName,
                                'source' => Paths::relativeToRoot($sourceDir),
                            ];
                            continue;
                        }

                        $moduleDestination = $destinationDir . DIRECTORY_SEPARATOR . $moduleName;
                        if (!Paths::ensureDirectory($moduleDestination)) {
                            $resourceDetails['failures'][] = [
                                'stage' => 'prepare-site-module',
                                'module' => $moduleName,
                                'target' => Paths::relativeToRoot($moduleDestination),
                                'error' => 'Не удалось создать директорию назначения для модулей сайта.',
                            ];
                            continue;
                        }

                        $failures = [];
                        $linked = $this->mirrorDirectory($sourceDir, $moduleDestination, $useSymlinkForResources, $failures);
                        $resourceDetails['siteLinked'] += $linked;

                        if ($failures !== []) {
                            foreach ($failures as &$failure) {
                                $failure['module'] = $moduleName;
                            }
                            unset($failure);
                            $resourceDetails['failures'] = array_merge($resourceDetails['failures'], $failures);
                        }
                    }
                }
            }

            if ($resourceDetails['failures'] !== []) {
                $resourceFailures = true;
            }

            $details['resources'][$relativeDir] = $resourceDetails;
        }

        $hasFailures = $moduleFailures !== [] || $resourceFailures;

        $message = $hasFailures
            ? 'Во время связывания произошли ошибки. Проверьте детали.'
            : 'Символические ссылки модулей и ресурсов обновлены.';

        return $hasFailures
            ? ActionResult::failure($message, $details)
            : ActionResult::success($message, $details);
    }

    /**
     * @param mixed $value
     */
    private function normalizeRelativeDirectory(mixed $value, string $default): string
    {
        if (!is_string($value)) {
            $value = $default;
        }

        $value = trim($value);

        if ($value === '') {
            $value = $default;
        }

        $value = str_replace(['\\', '/'], '/', $value);

        return trim($value, '/');
    }

    /**
     * @return list<array{path:string,target?:string,error:string}>
     */
    private function clearDirectory(string $directory): array
    {
        if (!is_dir($directory)) {
            return [];
        }

        $items = @scandir($directory);

        if ($items === false) {
            return [[
                'path' => Paths::relativeToRoot($directory),
                'error' => 'Не удалось прочитать директорию для очистки.',
            ]];
        }

        $errors = [];

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $path = $directory . DIRECTORY_SEPARATOR . $item;

            if (!$this->removePath($path)) {
                $errors[] = [
                    'path' => Paths::relativeToRoot($path),
                    'error' => 'Не удалось удалить существующий элемент перед связыванием.',
                ];
            }
        }

        return $errors;
    }

    /**
     * @param array<int, array{source:string,target:string,error:string}> $failures
     */
    private function mirrorDirectory(string $sourceDir, string $targetDir, bool $useSymlink, array &$failures): int
    {
        if (!is_dir($sourceDir)) {
            return 0;
        }

        $items = @scandir($sourceDir);

        if ($items === false) {
            $failures[] = [
                'source' => Paths::relativeToRoot($sourceDir),
                'target' => Paths::relativeToRoot($targetDir),
                'error' => 'Не удалось прочитать директорию источника.',
            ];

            return 0;
        }

        $linked = 0;

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $sourcePath = $sourceDir . DIRECTORY_SEPARATOR . $item;
            $destinationPath = $targetDir . DIRECTORY_SEPARATOR . $item;

            if (is_dir($sourcePath) && !is_link($sourcePath)) {
                if (!Paths::ensureDirectory($destinationPath)) {
                    $failures[] = [
                        'source' => Paths::relativeToRoot($sourcePath),
                        'target' => Paths::relativeToRoot($destinationPath),
                        'error' => 'Не удалось создать директорию назначения.',
                    ];
                    continue;
                }

                $linked += $this->mirrorDirectory($sourcePath, $destinationPath, $useSymlink, $failures);
                continue;
            }

            if ((file_exists($destinationPath) || is_link($destinationPath)) && !$this->removePath($destinationPath)) {
                $failures[] = [
                    'source' => Paths::relativeToRoot($sourcePath),
                    'target' => Paths::relativeToRoot($destinationPath),
                    'error' => 'Не удалось удалить существующий файл назначения.',
                ];
                continue;
            }

            if ($useSymlink) {
                if (@symlink($sourcePath, $destinationPath)) {
                    $linked++;
                } else {
                    $failures[] = [
                        'source' => Paths::relativeToRoot($sourcePath),
                        'target' => Paths::relativeToRoot($destinationPath),
                        'error' => 'Не удалось создать символическую ссылку.',
                    ];
                }
            } else {
                if (@copy($sourcePath, $destinationPath)) {
                    $linked++;
                } else {
                    $failures[] = [
                        'source' => Paths::relativeToRoot($sourcePath),
                        'target' => Paths::relativeToRoot($destinationPath),
                        'error' => 'Не удалось скопировать файл.',
                    ];
                }
            }
        }

        return $linked;
    }

    private function removePath(string $path): bool
    {
        if (is_link($path)) {
            return @unlink($path);
        }

        if (!file_exists($path)) {
            return true;
        }

        if (is_file($path)) {
            return @unlink($path);
        }

        if (is_dir($path)) {
            $items = @scandir($path);

            if ($items === false) {
                return false;
            }

            foreach ($items as $item) {
                if ($item === '.' || $item === '..') {
                    continue;
                }

                if (!$this->removePath($path . DIRECTORY_SEPARATOR . $item)) {
                    return false;
                }
            }

            return @rmdir($path);
        }

        return @unlink($path);
    }

    private function joinPath(string $base, string $relative): string
    {
        $normalizedRelative = str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $relative);

        if ($normalizedRelative === '') {
            return rtrim($base, DIRECTORY_SEPARATOR);
        }

        return rtrim($base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . ltrim($normalizedRelative, DIRECTORY_SEPARATOR);
    }
}
