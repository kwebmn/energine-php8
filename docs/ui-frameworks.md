# Переключение UI-фреймворков (Bootstrap 5 / MDBootstrap)

Документ описывает, как выбрать активный UI-стек (Bootstrap 5 или MDBootstrap), как собрать соответствующие ассеты и какие дополнительные возможности появляются в XSLT-шаблонах.

---

## 1. Общая концепция

Проект поддерживает два визуальных стека:

- `bootstrap5` — текущий базовый вариант (по умолчанию).
- `mdbootstrap` — альтернативная тема на базе MDBootstrap.

Выбор фреймворка влияет на:

1. **Набор подключаемых бандлов** (`energine.vendor.*` или `energine.mdvendor.*`).
2. **XSLT-шаблоны** — используется пакет `transformers/bootstrap/…` или `transformers/mdbootstrap/…`.
3. **Свойство `ui`** в XML документа — позволяет писать UI-условия в XSLT.

---

## 2. Настройка через `system.config.php`

В корне проекта откройте `system.config.php` и задайте ключ `ui_framework`:

```php
'ui_framework' => 'bootstrap5', // или 'mdbootstrap'
```

- Если параметр отсутствует, автоматически используется `bootstrap5`.
- Значение приводится к нижнему регистру, неподдерживаемые варианты игнорируются и также ведут к `bootstrap5`.

---

## 3. Сборка ассетов

Для разработки и продакшена доступны следующие npm-скрипты:

| Команда | Назначение | Результат |
| ------- | ---------- | --------- |
| `npm run dev` | Сборка обоих UI-бандлов (удобно при локальной отладке). | В `assets/` появятся `energine.vendor.*` и `energine.mdvendor.*`. |
| `npm run build:ui:bootstrap` | Сборка только Bootstrap-набора. | В каталоге `assets/` **нет** файлов `energine.mdvendor.*`. |
| `npm run build:ui:md` | Сборка только MDBootstrap-набора. | В каталоге `assets/` **нет** файлов `energine.vendor.*`. |

> Скрипты используют переменную окружения `UI_FRAMEWORK`, которую читает `engine/vite/build.mjs`. Команда `npm run build` (без префикса) эквивалентна режиму разработки и собирает оба набора.

---

## 4. XSLT и документ

### 4.1 Выбор include-файлов

При инициализации `XSLTTransformer` автоматически подставляется нужный пакет:

- `transformers/bootstrap/include.xslt` — для Bootstrap.
- `transformers/mdbootstrap/include.xslt` — для MDBootstrap.

Это значит, что все специфичные переопределения можно складывать в подкаталог `mdbootstrap/`, не копируя целиком базовые шаблоны.

### 4.2 Свойство `ui` в документе

В XML документа присутствует проперти:

```xml
<property name="ui" value="mdbootstrap">mdbootstrap</property>
```

Соответственно, в XSLT можно переключаться так:

```xsl
<xsl:choose>
    <xsl:when test="$DOC_PROPS[@name='ui']/@value = 'mdbootstrap'">
        <!-- специфичная разметка -->
    </xsl:when>
    <xsl:otherwise>
        <!-- дефолтный Bootstrap -->
    </xsl:otherwise>
</xsl:choose>
```

---

## 5. Рекомендации по разработке

1. **Ассеты**: перед тестированием в другом режиме обязательно собрать соответствующие бандлы (`npm run build:ui:bootstrap` или `npm run build:ui:md`).
2. **Кеши**: если используется файловый кеш или CDN, убедитесь, что при переключении фреймворка старые файлы недоступны (измените версии, очистите кеш).
3. **XSLT-условия**: общие шаблоны оставляйте в `bootstrap/`, а специфичные блоки класть в `mdbootstrap/` и подключать через `include.xslt`. Это позволит избежать расходящихся копий.
4. **Проверки**: по возможности проверяйте интерфейс в обоих режимах, особенно формы, тулбары и модальные окна — именно их структура различается в MDBootstrap.

---

## 6. Краткая шпаргалка

```bash
# Включить MDBootstrap
vim system.config.php   # ui_framework => 'mdbootstrap'
npm run build:ui:md

# Вернуться к Bootstrap
vim system.config.php   # ui_framework => 'bootstrap5'
npm run build:ui:bootstrap
```

После изменения конфигурации перезапустите веб-приложение (или очистите OPCache), чтобы новое значение подтянулось в рантайм.

