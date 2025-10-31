# Создание простого модуля и компонента в Energine

Это пошаговое руководство описывает, как с нуля собрать минимальный модуль Energine с PHP-компонентом, конфигурацией `*.component.xml`, шаблонами `*.content.xml`/`*.layout.xml`, XSLT-представлением и ES6-скриптами. Материал ориентирован на новичков и опирается на пример учебного модуля `auto` из ядра репозитория.

## 1. Подготовка окружения

1. Установите backend-зависимости и выполните базовую настройку проекта по инструкции «Быстрый старт» из корневого README: `composer install`, настройка `system.config.php`, запуск установщика и проверка health-check. 【F:README.md†L37-L42】
2. Для сборки клиентских ресурсов используйте Vite: выполните `npm install`, затем `npm run build`. Скрипт `engine/vite/build.mjs` собирает четыре бандла (`energine.vendor`, `energine.extended.vendor`, `energine`, `energine.extended`) и кладёт их в `assets/`. 【F:docs/vite-build.md†L15-L87】
3. Убедитесь, что ваш модуль подключён в конфигурации проекта. В файле `system.config.php` модуль регистрируется в секции `modules` по имени и абсолютному пути. 【F:system.config.php†L21-L30】

## 2. Структура каталога модуля

Новый модуль создаётся в `engine/core/modules/<имя_модуля>/`. Минимальный набор директорий такой же, как у учебного модуля `auto`:

- `components/` — PHP-классы компонентов (например, `Test.class.php`). 【F:engine/core/modules/auto/components/Test.class.php†L1-L21】
- `config/` — XML-конфигурации компонентов (`*.component.xml`). 【F:engine/core/modules/auto/config/Test.component.xml†L1-L46】
- `scripts/` — ES6-скрипты с поведениями для фронтенда. 【F:engine/core/modules/auto/scripts/Test.js†L1-L20】
- `templates/content/` — шаблоны содержимого страниц (`*.content.xml`). 【F:engine/core/modules/auto/templates/content/test.content.xml†L1-L12】
- `templates/layout/` (опционально) — собственные layout-файлы для страницы.
- `transformers/` — XSLT-представления; include-файл подключает конкретные `*.xslt`. 【F:engine/core/modules/auto/transformers/include.xslt†L1-L11】

Добавьте ваш include в `site/modules/<проект>/transformers/main.xslt`, чтобы XSLT-шаблоны модуля стали доступны сайту. 【F:site/modules/default/transformers/main.xslt†L1-L15】

## 3. PHP-компонент (`*.class.php`)

Компонент отвечает за выборку данных и формирование XML. Наследуйте подходящий базовый класс (например, `DBDataSet` для работы с таблицей) и настройте параметры:

```php
class Test extends DBDataSet
{
    public function __construct($name, $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('auto_test');
    }

    protected function defineParams(): array
    {
        $result = array_merge(
            parent::defineParams(),
            [
                'active' => true
            ]
        );
        return $result;
    }
}
```

Класс выше показывает, как задать таблицу и расширить набор параметров по умолчанию. 【F:engine/core/modules/auto/components/Test.class.php†L3-L20】

## 4. Конфигурация компонента (`*.component.xml`)

XML-файл описывает состояния, маршруты, поля и подключаемые поведения. В простейшем случае достаточно состояний `main` и `view`:

```xml
<configuration>
    <state name="view">
        <uri_patterns>
            <pattern>/[id]/</pattern>
        </uri_patterns>
        <javascript>
            <behavior name="Test"/>
        </javascript>
        <fields>
            <field name="test_id"/>
            <field name="test_name"/>
            <!-- другие поля -->
        </fields>
    </state>

    <state name="main">
        <uri_patterns>
            <pattern>/</pattern>
            <pattern>/page-[pageNumber]/</pattern>
        </uri_patterns>
        <javascript>
            <behavior name="Test"/>
        </javascript>
        <fields>
            <field name="test_id"/>
            <field name="test_name"/>
            <!-- другие поля -->
        </fields>
    </state>
</configuration>
```

Структура повторяет учебный файл `Test.component.xml`: для каждого состояния задаются URL-паттерны, фронтенд-поведения и набор полей, которые будут присутствовать в XML компонента. 【F:engine/core/modules/auto/config/Test.component.xml†L1-L42】

## 5. Подключение JavaScript-поведения

1. Создайте ES6-класс в `scripts/` и зарегистрируйте его через `registerBehavior`, чтобы Energine мог автоматически инициализировать поведение по имени:

```js
import { registerBehavior as registerEnergineBehavior } from '../../share/scripts/Energine.js';

class Test {
    constructor(element) {
        this.componentElement = typeof element === 'string'
            ? (document.getElementById(element) || document.querySelector(element))
            : element;
    }
}

export { Test };
export default Test;
if (typeof registerEnergineBehavior === 'function') {
    registerEnergineBehavior('Test', Test);
}
```

В конфигурации компонента `<behavior name="Test"/>` активирует это поведение. 【F:engine/core/modules/auto/scripts/Test.js†L1-L20】【F:engine/core/modules/auto/config/Test.component.xml†L7-L30】

2. Добавьте импорт скрипта в административный бандл `engine/vite/entries/energine.extended.entry.js`, чтобы Vite включил код в итоговый `energine.extended.js`:

```js
import 'engine/core/modules/auto/scripts/Test.js';
```

Учебный модуль подключается именно так — обратите внимание на алиас `engine/`. 【F:engine/vite/entries/energine.extended.entry.js†L1-L32】

3. Пересоберите ассеты (`npm run build`), чтобы изменения попали в `assets/energine.extended.js`. 【F:docs/vite-build.md†L15-L112】

## 6. XSLT-представление (`*.xslt`)

XSLT-шаблон отвечает за финальный HTML. Он подключается из `transformers/include.xslt` и описывает, как отображать контент, который пришёл от компонента:

```xml
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    <xsl:template match="content[@file = 'test.content.xml']">
        <div class="container-fluid">
            <div class="p-5 bg-body-tertiary mb-4">
                <h1><xsl:value-of select="normalize-space(properties/property[@name='title'])"/></h1>
                <nav class="d-flex">
                    <xsl:apply-templates select="$COMPONENTS[@name='breadCrumbs']"/>
                </nav>
            </div>
        </div>
        <div class="container">
            <div class="row">
                <div class="col-sm-12">
                    <xsl:apply-templates/>
                </div>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='test']">
        <xsl:apply-templates select="recordset"/>
        <xsl:apply-templates select="toolbar"/>
    </xsl:template>

    <xsl:template match="component[@name='test']/recordset/record/field">
        <div class="col">
            <xsl:value-of select="."/>
        </div>
    </xsl:template>
</xsl:stylesheet>
```

Это сокращённая версия учебного `test.xslt`, который выводит заголовок страницы, хлебные крошки и записи компонента в сетке Bootstrap. 【F:engine/core/modules/auto/transformers/components/test.xslt†L1-L90】

## 7. Шаблон содержимого (`*.content.xml`)

Content-файл описывает набор компонентов, которые должны быть собраны на странице:

```xml
<content>
    <component name="textBlock_1" module="share" class="TextBlock">
        <params>
            <param name="num">1</param>
        </params>
    </component>

    <component name="test" module="auto" class="Test"/>
</content>
```

Такой файл подключает текстовый блок из модуля `share` и ваш новый компонент `Test`. Его использует XSLT-шаблон, сопоставляя `content[@file='test.content.xml']`. 【F:engine/core/modules/auto/templates/content/test.content.xml†L1-L12】【F:engine/core/modules/auto/transformers/components/test.xslt†L9-L29】

## 8. Шаблон компоновки (`*.layout.xml`)

Layout-файл описывает компоненты, которые формируют «каркас» страницы: меню, футер, панель администратора и т.д. Вы можете создать собственный layout либо использовать существующий (`engine/core/modules/share/templates/layout/default.layout.xml`). Пример готового layout:

```xml
<page>
    <component name="mainMenu" module="share" class="PageList">
        <params>
            <param name="tags">menu</param>
            <param name="recursive">1</param>
            <param name="config">engine/core/modules/share/MainMenu.component.xml</param>
        </params>
    </component>

    <component name="langSwitcher" module="share" class="LangSwitcher"/>
    <component name="footerTextBlock" module="share" class="TextBlock">
        <params>
            <param name="num">footerTextBlock</param>
        </params>
    </component>

    <component name="adminPanel" module="share" class="DivisionEditor">
        <params>
            <param name="state">showPageToolbar</param>
            <param name="rights">3</param>
        </params>
    </component>

    <component name="translationList" module="default" class="TranslationList"/>
</page>
```

Layout подключается к странице через административный интерфейс (см. ниже) и работает совместно с `*.content.xml`, формируя полный набор компонентов страницы. 【F:engine/core/modules/share/templates/layout/default.layout.xml†L1-L69】

## 9. Подключение XSLT к сайту

Чтобы сайт знал о ваших шаблонах, добавьте include-файл модуля в главный трансформер. В демо-проекте это `site/modules/default/transformers/main.xslt`, где уже подключаются include-файлы `share`, `user`, `apps` и `auto`:

```xml
<xsl:include href="../../../../engine/core/modules/auto/transformers/include.xslt"/>
```

Если создаёте модуль в каталоге `site/modules`, используйте аналогичный include со своим путём. 【F:site/modules/default/transformers/main.xslt†L8-L13】

## 10. Запуск и проверка

1. Пересоберите ассеты после правок JS/CSS (`npm run build`). 【F:docs/vite-build.md†L15-L112】
2. В административном интерфейсе Energine:
   - Создайте или откройте страницу в структуре сайта.
   - Выберите ваш layout (`*.layout.xml`) для раздела.
   - В разделе «Содержимое» укажите файл `*.content.xml`, где перечислены компоненты.
3. Откройте страницу на сайте: Energine подставит ваш компонент, применит XSLT-шаблон и подключит JS-поведения, прописанные в `*.component.xml`.

После этих шагов модуль готов к работе: PHP-компонент формирует данные, XSLT отвечает за разметку, а JS — за интерактивность. При необходимости добавляйте новые состояния, toolbar'ы и параметры в XML-конфигурацию и расширяйте XSLT-шаблоны.
