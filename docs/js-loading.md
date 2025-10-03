# Схема загрузки JavaScript

## 1. Почему PageSpeed ругается

- Базовый шаблон `site/modules/default/transformers/energine.xslt:65` подключает несколько крупных бандлов (`bootstrap.bundle.min.js`, `sweetalert2.min.js`, `default.js`) и общий вызов `START_ENERGINE_JS`, даже если страница не использует связанные компоненты.
- Большинство скриптов лежит в каталоге `scripts/` и грузится как глобальные IIFE без ленивой инициализации. В `system.jsmap.php:1` видно, что зависимости завязаны на названия поведений (`Form`, `GridManager`, `Toolbar`) и всегда подгружаются целиком.
- Google PageSpeed фиксирует: блокировку основного потока (все теги `<script>` исполняются сразу после HTML), неиспользуемый JavaScript на страницах без соответствующих виджетов, отсутствие кэш-контроля с хэшем, а также внешние CDN (Google Fonts) без оптимизированной стратегии.

## 2. Цели оптимизации

- Исключить рендер-блокирующие скрипты (переносим всё в `defer`, `async` либо `type="module"`).
- Разнести код по уровням критичности: критический минимальный bootstrap, базовые зависимости, функциональные модули.
- Подгружать функциональные модули только там, где они реально используются.
- Сократить объём JavaScript, собрать бандлы «по требованию» и добавить контроль версий через манифест.
- Обеспечить совместимость с существующим «наследием» Energine и плавно мигрировать к модульному подходу.

## 3. Архитектура загрузки

### 3.1 Слои JavaScript

1. **Critical (inline, ≤1 KB)** — минимальные настройки (набор переменных окружения, флаг о включённом JavaScript). Этот код добавляется прямо в шаблон `<head>`.
2. **Base (`base.bundle.js`)** — инфраструктура фронтенда: легковесная обёртка над Event Bus, polyfills, глобальный Bootstrap (без компонентов) и базовые хелперы. Загружается с `defer`, чтобы HTML рендерился без пауз.
3. **Feature модули** — отдельные бандлы для каждого блока/поведения. Пример: `feature.gallery.js`, `feature.feedback-form.js`. Загружаются динамически через `import()` и исполняются только при наличии атрибута `data-module`.
4. **Legacy/Admin (`legacy/*.js`)** — текущие файлы из `scripts/`, собранные в один или несколько бандлов через Rollup/webpack без трансформации. Они подключаются только в административном интерфейсе или на страницах, требующих совместимости.

### 3.2 Структура директорий

```text
assets/
  js/
    critical/inline.js          # миниатюрный inline, собирается в шаблон
    base/index.ts               # точка входа базового бандла
    modules/
      gallery.ts
      feedback-form.ts
      ...
    legacy/
      energine.entry.js        # обёртка для существующих scripts/*.js
  styles/
    ...
public/
  scripts/
    base.[hash].js
    modules/gallery.[hash].js
    modules/feedback-form.[hash].js
    legacy/energine.[hash].js
```

- `assets/js/legacy/` содержит require/import старых файлов из `scripts/`. Например, `energine.entry.js` просто импортирует `../scripts/Energine.js`, `GridManager.js` и т. п., чтобы webpack/Vite собрал их в единый файл.
- `public/scripts/` — результирующие файлы, на которые ссылается шаблон XSLT.
- Манифест (`public/scripts/manifest.json`) хранит соответствие «логическое имя → файл с хэшем» и считывается PHP.

### 3.3 Манифест и конфигурация PHP

- Создаём PHP-хелпер `core/tools/AssetManager.php`, который считывает `public/scripts/manifest.json` и подставляет правильные пути.
- Обновляем `system.jsmap.php` так, чтобы значения соответствовали ключам манифеста (например, `GridManager => modules/admin-grid`). Вместо прямых путей сохраняем только логические имена.
- В `system.config.php` добавляем параметр `assets_manifest` с путём к JSON.

## 4. Грузим модули в шаблоне

### 4.1 Базовый шаблон XSLT

```xml
<!-- site/modules/default/transformers/energine.xslt -->
<xsl:template match="/">
  <html lang="en">
    <head>
      ...
      <script id="js-critical">/* INLINE из assets/js/critical */</script>
    </head>
    <body>
      ...
      <script type="module" src="{$STATIC}{assets:resolve('scripts/base.js')}"></script>
      <script defer nomodule src="{$STATIC}{assets:resolve('scripts/legacy.js')}"></script>
    </body>
  </html>
</xsl:template>
```

- Функция `assets:resolve()` — обёртка вокруг `AssetManager`, которая находит актуальный путь по ключу. Её можно реализовать как XSLT-расширение на PHP.
- Бандл `legacy.js` подгружается только при необходимости (номедул).

### 4.2 Механизм автозагрузки модулей

```js
// assets/js/base/bootstrap.ts
const modulesMap = {
  'gallery': () => import('../modules/gallery'),
  'feedback-form': () => import('../modules/feedback-form'),
  'energine-grid': () => import('../legacy/energine-grid'),
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-module]').forEach((node) => {
    const name = node.getAttribute('data-module');
    modulesMap[name]?.().then(({ default: init }) => init(node));
  });
});
```

- Любой компонент добавляет `data-module="gallery"` и при необходимости `data-module-options` с JSON.
- Legacy-поведения (`GridManager`, `Form`) получают адаптеры, которые внутри `import()` вызывают старый глобальный код (`window.Energine.GridManager.init(node)`), но при этом грузятся лениво.

### 4.3 Админка Energine

- В административном шаблоне оставляем `legacy`-бандл как «основной». Однако вводим точку расширения: добавляем `data-behavior="GridManager"` и даём базовому бандлу возможность импортировать только нужные скрипты.
- Чтобы сохранить поддержку `system.jsmap.php:1`, пишем адаптер `assets/js/legacy/energine-loader.ts`, который считывает карту зависимостей и динамически `import('../legacy/GridManager')`.

## 5. План внедрения

1. **Аудит** — описываем какие поведения реально используются на публичных страницах. Для этого добавляем временный логгер в `START_ENERGINE_JS`, чтобы собрать статистику (1 неделя).
2. **Инфраструктура** — инициализируем Node-проект (`npm init`), добавляем Vite/webpack, настраиваем сборку в `package.json` (`build`, `dev`).
3. **Critical/Base слой** — выносим в TypeScript/ESM только общие вещи (автозагрузка по `data-module`). Проверяем, что без других модулей сайт работает.
4. **Legacy-адаптеры** — для каждого поведения (`GridManager`, `Form`, `Toolbar`) создаём модуль-обёртку. На этом этапе Google PageSpeed уже перестанет ругаться на «unused JS» для страниц без админских компонентов.
5. **Декомпозиция публичных модулей** — пишем по одному модулю в директории `assets/js/modules`. Переносим конкретный код из `default.js` или inline-скриптов.
6. **Оптимизация третьих сторон** — локализуем `SweetAlert2`, подключаем только нужные функции, при необходимости заменяем на аналог без jQuery. Шрифты Font Awesome и Google Fonts грузим через `preconnect` + `display=swap`, либо self-hosted.
7. **Автотесты** — добавляем Lighthouse CI/psi-webhook, который проверяет показатели при каждом деплое.

## 6. Чек-лист перед релизом

- Все `<script>` в публичной части используют `type="module"` или `defer`.
- Для каждой записи в `system.jsmap.php` есть модуль или адаптер, который подключается лениво.
- В `public/scripts/manifest.json` нет неиспользуемых ключей; хэши обновляются при сборке.
- Lighthouse показывает «Eliminate render-blocking resources» = Passed, «Reduce unused JavaScript» ≤ 10 KB.
- Нагрузочные страницы без JavaScript (no-JS режим) корректно отображаются: все критичные элементы доступны в HTML.
- Применена политика кэширования `Cache-Control: public, max-age=31536000, immutable` для всех собранных файлов.
- Документация обновлена в README (ссылка на данный документ) и команда понимает, как добавлять новые модули.

## 7. Поддержка и дальнейшие шаги

- Постепенно переносим логики из `scripts/*.js` в новые ESM-модули. Каждый перенос сопровождаем тестами и удалением старого файла из legacy-бандла.
- Следим за размером базового бандла (`< 35 KB gzip`). Если растёт — выносим функциональность в отдельный модуль.
- Для сложных страниц внедряем `IntersectionObserver` и грузим модули только при появлении блока в вьюпорте.
- Добавляем линтер (ESLint) и форматирование (Prettier) в пайплайн, чтобы повысить качество JS-кода.
- Раз в квартал запускаем PageSpeed по ключевым страницам и сравниваем показатели с базовой линией.
