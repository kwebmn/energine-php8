<?php

declare(strict_types=1);

/** @var string $content */
/** @var array<int, mixed> $alerts */
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
<script>
(function () {
    'use strict';

    const form = document.querySelector('[data-actions-form]');
    if (!form) {
        return;
    }

    const alertsContainer = document.querySelector('[data-alerts]');
    const logPanel = document.querySelector('[data-log-panel]');
    const logPlaceholder = logPanel ? logPanel.querySelector('[data-log-placeholder]') : null;
    const logContent = logPanel ? logPanel.querySelector('[data-log-content]') : null;
    const logActionRow = logPanel ? logPanel.querySelector('[data-log-action-row]') : null;
    const logAction = logPanel ? logPanel.querySelector('[data-log-action]') : null;
    const logStatus = logPanel ? logPanel.querySelector('[data-log-status]') : null;
    const logOutput = logPanel ? logPanel.querySelector('[data-log-output]') : null;
    const logDetails = logPanel ? logPanel.querySelector('[data-log-details]') : null;
    const logDetailsContent = logPanel ? logPanel.querySelector('[data-log-details-content]') : null;
    const logPointer = logPanel ? logPanel.querySelector('[data-log-pointer]') : null;
    const logPointerLink = logPanel ? logPanel.querySelector('[data-log-pointer-link]') : null;

    const actionLabels = safeJson(form.getAttribute('data-action-labels'));
    const statusTitles = logPanel ? safeJson(logPanel.getAttribute('data-status-titles')) : {};

    let lastSubmitter = null;

    form.addEventListener('click', function (event) {
        const target = event.target;
        if (target instanceof HTMLButtonElement && target.type === 'submit') {
            lastSubmitter = target;
        }
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        const submitter = (event.submitter && event.submitter instanceof HTMLButtonElement)
            ? event.submitter
            : lastSubmitter;

        lastSubmitter = null;

        if (!submitter) {
            return;
        }

        const actionValue = submitter.value || submitter.getAttribute('value') || '';
        const formData = new FormData(form);
        formData.set('action', actionValue);

        setLoading(submitter, true);

        parseResponse(fetch(form.getAttribute('action') || window.location.href, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        })).then(function (result) {
            const payload = result.data;
            const normalizedStatus = normalizeStatus(typeof payload.status === 'string'
                ? payload.status
                : (result.ok ? 'success' : 'error'));
            const messageText = typeof payload.message === 'string' ? payload.message : '';
            const logText = typeof payload.log === 'string' ? payload.log : '';
            const detailsValue = Object.prototype.hasOwnProperty.call(payload, 'details') ? payload.details : null;
            const logPointerValue = typeof payload.logPointer === 'string' ? payload.logPointer : '';
            const actionName = typeof payload.action === 'string' ? payload.action : actionValue;

            updateAlerts({
                status: normalizedStatus,
                message: messageText,
                log: logText,
                details: detailsValue
            });

            const shouldUpdateLog = result.ok || logText !== '' || detailsValue !== null || logPointerValue !== '';

            if (shouldUpdateLog) {
                updateLog({
                    status: normalizedStatus,
                    action: actionName,
                    log: logText,
                    details: detailsValue,
                    logPointer: logPointerValue
                });
            }
        }).catch(function (error) {
            const fallbackMessage = error && typeof error.message === 'string'
                ? error.message
                : 'Не удалось выполнить запрос.';
            updateAlerts({
                status: 'error',
                message: fallbackMessage
            });
        }).finally(function () {
            setLoading(submitter, false);
        });
    });

    function safeJson(value) {
        if (!value) {
            return {};
        }

        try {
            return JSON.parse(value);
        } catch (error) {
            return {};
        }
    }

    function parseResponse(promise) {
        return promise.then(function (response) {
            const contentType = response.headers.get('Content-Type') || '';
            const isJson = contentType.toLowerCase().indexOf('application/json') !== -1;

            if (!isJson) {
                return response.text().then(function (text) {
                    throw new Error(text || 'Неизвестный ответ сервера.');
                });
            }

            return response.json().then(function (data) {
                if (!data || typeof data !== 'object') {
                    throw new Error('Пустой ответ сервера.');
                }

                return {
                    ok: response.ok,
                    status: response.status,
                    data: data
                };
            }).catch(function () {
                throw new Error('Не удалось разобрать ответ сервера.');
            });
        });
    }

    function setLoading(button, isLoading) {
        const buttons = Array.prototype.slice.call(form.querySelectorAll('button[type="submit"]'));
        buttons.forEach(function (btn) {
            btn.disabled = isLoading;
        });

        if (!(button instanceof HTMLElement)) {
            return;
        }

        if (isLoading) {
            if (!button.querySelector('.action-tile__spinner')) {
                const spinner = document.createElement('span');
                spinner.className = 'action-tile__spinner';
                spinner.setAttribute('aria-hidden', 'true');
                button.appendChild(spinner);
            }

            button.classList.add('action-tile--loading');
            button.setAttribute('aria-busy', 'true');
        } else {
            const spinner = button.querySelector('.action-tile__spinner');
            if (spinner) {
                spinner.remove();
            }

            button.classList.remove('action-tile--loading');
            button.removeAttribute('aria-busy');
        }
    }

    function updateAlerts(payload) {
        if (!alertsContainer) {
            return;
        }

        alertsContainer.innerHTML = '';

        if (!payload || typeof payload !== 'object') {
            return;
        }

        const status = normalizeStatus(payload.status);
        const alert = document.createElement('div');
        alert.className = 'alert alert--' + status;

        const message = document.createElement('span');
        message.className = 'alert__message';
        message.textContent = payload.message || '';
        alert.appendChild(message);

        if (typeof payload.log === 'string' && payload.log !== '') {
            const logLink = document.createElement('a');
            logLink.className = 'alert__log-link';
            logLink.href = '#log-panel';
            logLink.textContent = 'Показать лог';
            alert.appendChild(logLink);
        }

        const detailsContent = formatDetails(payload.details);
        if (detailsContent) {
            const details = document.createElement('details');
            details.className = 'alert__details accordion';

            const summary = document.createElement('summary');
            summary.className = 'accordion__summary';
            summary.textContent = 'Раскрыть детали';

            const pre = document.createElement('pre');
            pre.className = 'accordion__content';
            pre.textContent = detailsContent;

            details.appendChild(summary);
            details.appendChild(pre);
            alert.appendChild(details);
        }

        alertsContainer.appendChild(alert);
    }

    function updateLog(payload) {
        if (!logPanel || !payload || typeof payload !== 'object') {
            return;
        }

        if (logPlaceholder) {
            logPlaceholder.hidden = true;
        }

        if (logContent) {
            logContent.hidden = false;
        }

        const status = normalizeStatus(payload.status);
        const statusLabel = getStatusTitle(status);

        if (logStatus) {
            logStatus.className = 'log-status log-status--' + status;
            logStatus.textContent = statusLabel;
        }

        if (logActionRow && logAction) {
            const actionName = getActionTitle(payload.action);
            if (actionName) {
                logActionRow.hidden = false;
                logAction.textContent = actionName;
            } else {
                logActionRow.hidden = true;
                logAction.textContent = '';
            }
        }

        if (logOutput) {
            logOutput.textContent = typeof payload.log === 'string' ? payload.log : '';
        }

        if (logDetails && logDetailsContent) {
            const detailsContent = formatDetails(payload.details);
            if (detailsContent) {
                logDetails.hidden = false;
                logDetailsContent.textContent = detailsContent;
            } else {
                logDetails.hidden = true;
                logDetailsContent.textContent = '';
            }
        }

        if (logPointer && logPointerLink) {
            const pointer = typeof payload.logPointer === 'string' ? payload.logPointer : '';
            if (pointer) {
                logPointer.hidden = false;
                logPointerLink.textContent = pointer;
                logPointerLink.href = pointer;
            } else {
                logPointer.hidden = true;
                logPointerLink.textContent = '';
                logPointerLink.removeAttribute('href');
            }
        }
    }

    function normalizeStatus(status) {
        if (typeof status !== 'string' || status === '') {
            return 'info';
        }

        const normalized = status.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
        return normalized || 'info';
    }

    function getStatusTitle(status) {
        const normalized = normalizeStatus(status);
        if (Object.prototype.hasOwnProperty.call(statusTitles, normalized)) {
            return statusTitles[normalized];
        }

        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    function getActionTitle(action) {
        if (typeof action !== 'string' || action === '') {
            return '';
        }

        if (Object.prototype.hasOwnProperty.call(actionLabels, action)) {
            return actionLabels[action];
        }

        return action;
    }

    function formatDetails(details) {
        if (details === null || details === undefined) {
            return '';
        }

        if (typeof details === 'string') {
            return details;
        }

        if (typeof details === 'number' || typeof details === 'boolean') {
            return String(details);
        }

        if (Array.isArray(details) || typeof details === 'object') {
            try {
                return JSON.stringify(details, null, 2);
            } catch (error) {
                return String(details);
            }
        }

        return '';
    }
})();
</script>
</body>
</html>
