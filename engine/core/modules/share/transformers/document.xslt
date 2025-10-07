<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet 
    version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"

    >
    <xsl:variable name="DOC_PROPS" select="/document/properties/property"/>
    <xsl:variable name="COMPONENTS" select="//component[@name][@module]"/>
    <xsl:variable name="TRANSLATION" select="/document/translations/translation"/>
    <xsl:variable name="ID" select="$DOC_PROPS[@name='ID']"/>
	<xsl:variable name="BASE" select="$DOC_PROPS[@name='base']"/>
    <xsl:variable name="FOLDER" select="$DOC_PROPS[@name='base']/@folder"/>
	<xsl:variable name="LANG_ID" select="$DOC_PROPS[@name='lang']"/>
	<xsl:variable name="LANG_ABBR" select="$DOC_PROPS[@name='lang']/@abbr"/>
	<xsl:variable name="NBSP"><xsl:text disable-output-escaping="yes">&amp;nbsp;</xsl:text></xsl:variable>
    <xsl:variable name="STATIC_URL"><xsl:value-of select="$BASE/@static"/></xsl:variable>
    <xsl:variable name="MEDIA_URL"><xsl:value-of select="$BASE/@media"/></xsl:variable>
    <xsl:variable name="RESIZER_URL"><xsl:value-of select="$BASE/@resizer"/></xsl:variable>
    <xsl:variable name="MAIN_SITE"><xsl:value-of select="$DOC_PROPS[@name='base']/@default"/><xsl:value-of select="$LANG_ABBR"/></xsl:variable>

    <!--@deprecated-->
    <!--Оставлено для обратной совместимости, сейчас рекомендуется определять обработчик рута в модуле сайта и взывать рутовый шаблон в режиме head-->

    <xsl:template match="/" mode="title">
        <title><xsl:choose>
            <xsl:when test="string-length($DOC_PROPS[@name='title_alt']) > 0">
                <xsl:value-of select="$DOC_PROPS[@name='title_alt']" />
            </xsl:when>
            <xsl:when test="$DOC_PROPS[@name='title']/@alt = ''">
                <xsl:for-each select="$COMPONENTS[@name='breadCrumbs']/recordset/record">
                    <xsl:sort data-type="text" order="descending" select="position()"/>
                    <xsl:if test="3 > position()">
                        <xsl:choose>
                            <xsl:when test="position() = last()">
                                <xsl:if test="$ID = field[@name='Id'] and (field[@name='Name'] != '' or field[@name='Title'] != '')">
                                    <xsl:choose>
                                        <xsl:when test="field[@name='Title'] != ''">
                                            <xsl:value-of select="field[@name='Title']"/>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <xsl:value-of select="field[@name='Name']"/>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                    <xsl:text> </xsl:text>
                                </xsl:if>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:if test="field[@name='Name'] != '' or field[@name='Title'] != ''">
                                    <xsl:if test="position() = 2">
                                        <xsl:text> - </xsl:text>
                                    </xsl:if>
                                    <xsl:choose>
                                        <xsl:when test="field[@name='Title'] != ''">
                                            <xsl:value-of select="field[@name='Title']"/>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <xsl:value-of select="field[@name='Name']"/>
                                        </xsl:otherwise>
                                    </xsl:choose>

                                </xsl:if>
                            </xsl:otherwise>
                        </xsl:choose>

                    </xsl:if>
                </xsl:for-each>
                <xsl:text> | </xsl:text>
                <xsl:value-of select="$COMPONENTS[@name='breadCrumbs']/@site"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="$DOC_PROPS[@name='title']/@alt"/>
            </xsl:otherwise>
        </xsl:choose></title>
    </xsl:template>

    <xsl:template match="/" mode="favicon">
        <link rel="shortcut icon" href="{$STATIC_URL}favicon.ico" type="image/x-icon"/>
    </xsl:template>

    <xsl:template match="/" mode="stylesheets">

    </xsl:template>

    <xsl:template match="/" mode="scripts">
        <xsl:if test="not($DOC_PROPS[@name='single'])"><!-- User JS is here--></xsl:if>

    </xsl:template>

    <xsl:template match="/" mode="og">
    </xsl:template>

    <xsl:template match="/" mode="head">
        <xsl:apply-templates select="." mode="title"/>
        <base href="{$BASE}"/>
        <xsl:apply-templates select="." mode="favicon"/>

        <xsl:choose>
            <xsl:when test="not($DOC_PROPS[@name='single'])">
                <xsl:apply-templates select="." mode="stylesheets"/>
            </xsl:when>
            <xsl:otherwise>
                <!--<script type="text/javascript">window.singleMode = true;</script>-->
            </xsl:otherwise>
        </xsl:choose>
        <xsl:if test="$DOC_PROPS[@name='google_verify']">
            <meta name="google-site-verification" content="{$DOC_PROPS[@name='google_verify']}"/>
        </xsl:if>
<!--        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>-->
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="keywords" content="{$DOC_PROPS[@name='keywords']}"/>
        <meta name="description" content="{$DOC_PROPS[@name='description']}"/>
        <link href="stylesheets/default/bootstrap.min.css" rel="stylesheet" />
        <xsl:if test="$DOC_PROPS[@name='robots']!=''">
            <meta name="robots" content="{$DOC_PROPS[@name='robots']}"/>
        </xsl:if>
        <!-- <xsl:if test="//property[@name='single']">
           <script type="text/javascript" src="scripts/jquery.min.js"></script>
       </xsl:if> -->

        <script type="text/javascript">
            (function (global) {
                if (global.__energineBridge) {
                    return;
                }

                const pending = {
                    config: {},
                    tasks: [],
                    translations: {},
                };
                let runtime = null;

                const methodNames = ['request', 'cancelEvent', 'resize', 'confirmBox', 'alertBox', 'noticeBox', 'loadCSS', 'run', 'createDatePicker', 'createDateTimePicker'];

                const translationFacade = {
                    get(constant) {
                        if (runtime &amp;&amp; runtime.translations) {
                            return runtime.translations.get(constant);
                        }
                        return Object.prototype.hasOwnProperty.call(pending.translations, constant)
                            ? pending.translations[constant]
                            : null;
                    },
                    set(constant, value) {
                        if (runtime &amp;&amp; runtime.translations) {
                            runtime.translations.set(constant, value);
                        } else {
                            pending.translations[constant] = value;
                        }
                    },
                    extend(values) {
                        if (runtime &amp;&amp; runtime.translations) {
                            runtime.translations.extend(values);
                        } else {
                            Object.assign(pending.translations, values);
                        }
                    }
                };

                function queueTask(task, priority = 5) {
                    if (typeof task !== 'function') {
                        return;
                    }

                    if (runtime) {
                        runtime.addTask(task, priority);
                    } else {
                        pending.tasks.push({ task, priority });
                    }
                }

                function extendTranslations(values) {
                    if (!values || typeof values !== 'object') {
                        return;
                    }

                    translationFacade.extend(values);
                }

                function setRuntime(instance) {
                    runtime = instance;
                    Object.assign(runtime, pending.config);
                    if (runtime.translations &amp;&amp; Object.keys(pending.translations).length) {
                        runtime.translations.extend(pending.translations);
                        pending.translations = {};
                    }
                    if (pending.tasks.length) {
                        pending.tasks.forEach(({ task, priority }) => runtime.addTask(task, priority));
                        pending.tasks = [];
                    }
                }

                const api = new Proxy({}, {
                    get(_, prop) {
                        if (prop === '__setRuntime') {
                            return setRuntime;
                        }
                        if (prop === 'translations') {
                            return translationFacade;
                        }
                        if (prop === 'addTask') {
                            return queueTask;
                        }
                        if (prop === 'tasks') {
                            if (runtime) {
                                return runtime.tasks;
                            }
                            return pending.tasks;
                        }
                        if (runtime) {
                            const value = runtime[prop];
                            return typeof value === 'function' ? value.bind(runtime) : value;
                        }
                        if (methodNames.includes(prop)) {
                            return function (...args) {
                                if (!runtime || typeof runtime[prop] !== 'function') {
                                    throw new Error('Energine runtime is not ready yet');
                                }
                                return runtime[prop](...args);
                            };
                        }
                        if (Object.prototype.hasOwnProperty.call(pending.config, prop)) {
                            return pending.config[prop];
                        }
                        return undefined;
                    },
                    set(_, prop, value) {
                        if (prop === 'translations') {
                            translationFacade.extend(value);
                            return true;
                        }
                        if (runtime) {
                            runtime[prop] = value;
                        } else {
                            pending.config[prop] = value;
                        }
                        return true;
                    }
                });

                global.Energine = api;
                global.ScriptLoader = global.ScriptLoader || { load() {} };
                global.__energineBridge = {
                    setRuntime,
                    pendingConfig: pending.config,
                    queueTask,
                    extendTranslations,
                };
            })(window);
        </script>
        <script type="text/javascript">
            (function (bridge) {
                const target = bridge &amp;&amp; bridge.pendingConfig ? bridge.pendingConfig : (window.Energine || {});
                Object.assign(target, {
                <xsl:if test="document/@debug=1">debug: true,</xsl:if>
                base: '<xsl:value-of select="$BASE"/>',
                static: '<xsl:value-of select="$STATIC_URL"/>',
                resizer: '<xsl:value-of select="$RESIZER_URL"/>',
                media: '<xsl:value-of select="$MEDIA_URL"/>',
                root: '<xsl:value-of select="$MAIN_SITE"/>',
                lang: '<xsl:value-of select="$DOC_PROPS[@name='lang']/@real_abbr"/>',
                singleMode: <xsl:value-of select="boolean($DOC_PROPS[@name='single'])"/>
                });
            })(window.__energineBridge || null);
        </script>
        <script type="module" src="{$STATIC_URL}scripts/Energine.js"></script>
<!--        <xsl:apply-templates select="." mode="og"/>-->

<!--        <xsl:if test="$DOC_PROPS[@name='single'] or $DOC_PROPS[@name='is_user'] > 0">-->
<!--            <xsl:call-template name="START_ENERGINE_JS" />-->
<!--        </xsl:if>-->

       <!-- <xsl:if test="//property[@name='single']">
           <script type="text/javascript" src="scripts/jquery.min.js"></script>
       </xsl:if> -->

    </xsl:template>

    <xsl:template name="START_ENERGINE_JS">
<!--        <xsl:choose>-->
<!--            <xsl:when test="document/@debug=1">-->
<!--                <script type="text/javascript" src="{$STATIC_URL}scripts/mootools.js"></script>-->
<!--            </xsl:when>-->
<!--            <xsl:otherwise>-->
<!--                <script type="text/javascript" src="{$STATIC_URL}scripts/mootools.min.js"></script>-->
<!--            </xsl:otherwise>-->
<!--        </xsl:choose>-->
<!--        <link href="assets/minified.css" rel="stylesheet" />-->
        <!-- <script type="text/javascript" src="assets/minified.js" /> -->

        <xsl:apply-templates select="/document//javascript/variable" mode="head"/>
        <xsl:apply-templates select="/document/javascript/library" mode="head"/>
        <xsl:apply-templates select="." mode="scripts"/>
        <xsl:apply-templates select="document/translations"/>
        <script type="module">
            // NOTE: downstream Energine modules must import helpers from this entrypoint instead of relying on globals.
            import { bootEnergine, attachToWindow, createConfigFromProps, safeConsoleError } from "<xsl:value-of select="$STATIC_URL"/>scripts/Energine.js";

            const config = createConfigFromProps({
            <xsl:if test="document/@debug=1">debug: true,</xsl:if>
            base: '<xsl:value-of select="$BASE"/>',
            static: '<xsl:value-of select="$STATIC_URL"/>',
            resizer: '<xsl:value-of select="$RESIZER_URL"/>',
            media: '<xsl:value-of select="$MEDIA_URL"/>',
            root: '<xsl:value-of select="$MAIN_SITE"/>',
            lang: '<xsl:value-of select="$DOC_PROPS[@name='lang']/@real_abbr"/>',
            singleMode: <xsl:value-of select="boolean($DOC_PROPS[@name='single'])"/>
            });

            const runtime = bootEnergine(config);
            if (window.__energineBridge &amp;&amp; typeof window.__energineBridge.setRuntime === 'function') {
                window.__energineBridge.setRuntime(runtime);
            }
            const Energine = attachToWindow(window, runtime);

            const componentToolbars = window.componentToolbars = [];

            <xsl:if test="count($COMPONENTS[recordset]/javascript/behavior[@name!='PageEditor']) &gt; 0">
                <xsl:for-each select="$COMPONENTS[recordset]/javascript[behavior[@name!='PageEditor']]">
                    globalThis['<xsl:value-of select="generate-id(../recordset)"/>'] = globalThis['<xsl:value-of select="generate-id(../recordset)"/>'] || null;
                </xsl:for-each>
            </xsl:if>

            <xsl:if test="$COMPONENTS[@componentAction='showPageToolbar']">
                Energine.addTask(function () {
             <xsl:variable name="PAGE_TOOLBAR" select="$COMPONENTS[@componentAction='showPageToolbar']"></xsl:variable>
            const pageToolbar = new <xsl:value-of select="$PAGE_TOOLBAR/javascript/behavior/@name" />('<xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="$PAGE_TOOLBAR/@single_template" />', <xsl:value-of select="$ID" />, '<xsl:value-of select="$PAGE_TOOLBAR/toolbar/@name"/>', [
            <xsl:for-each select="$PAGE_TOOLBAR/toolbar/control">
                { <xsl:for-each select="@*[name()!='mode']">'<xsl:value-of select="name()"/>':'<xsl:value-of select="."/>'<xsl:if test="position()!=last()">,</xsl:if></xsl:for-each>}<xsl:if test="position()!=last()">,</xsl:if></xsl:for-each>
            ]<xsl:if
                test="$PAGE_TOOLBAR/toolbar/properties/property">, <xsl:for-each select="$PAGE_TOOLBAR/toolbar/properties/property">{'<xsl:value-of select="@name"/>':'<xsl:value-of
                select="."/>'<xsl:if test="position()!=last()">,</xsl:if>}</xsl:for-each></xsl:if>);

                });
            </xsl:if>
            <xsl:for-each select="$COMPONENTS[@componentAction!='showPageToolbar']/javascript/behavior[@name!='PageEditor']">
                <xsl:variable name="objectID" select="generate-id(../../recordset[not(@name)])"/>
                if (document.getElementById('<xsl:value-of select="$objectID"/>')) {
                    try {
                         globalThis['<xsl:value-of select="$objectID"/>'] = new <xsl:value-of select="@name"/>(document.getElementById('<xsl:value-of select="$objectID"/>'));
                    }
                    catch (e) {
                        safeConsoleError(e);
                    }
                }
            </xsl:for-each>
            <xsl:if test="$COMPONENTS/javascript/behavior[@name='PageEditor']">
                <xsl:if test="position()=1">
                    <xsl:variable name="objectID" select="generate-id($COMPONENTS[javascript/behavior[@name='PageEditor']]/recordset)"/>
                    try {
                    globalThis['<xsl:value-of select="$objectID"/>'] = new PageEditor();
                    }
                    catch (e) {
                    safeConsoleError(e);
                    }
                </xsl:if>
            </xsl:if>

            document.addEventListener('DOMContentLoaded', () => Energine.run());
        </script>

        <xsl:if test="not(//property[@name='single'])">
            <xsl:if test="$DOC_PROPS[@name='google_analytics'] and ($DOC_PROPS[@name='google_analytics'] != '')">
                <xsl:value-of select="$DOC_PROPS[@name='google_analytics']" disable-output-escaping="yes"/>
            </xsl:if>
        </xsl:if>

    </xsl:template>

    <!-- Single mode document -->
    <xsl:template match="document[properties/property[@name='single']]">
        <xsl:attribute name="class">e-singlemode-layout</xsl:attribute>
        <xsl:apply-templates select="container | component"/>
    </xsl:template>

    <xsl:template match="layout | content | container">
        <xsl:apply-templates/>
    </xsl:template>
    
    <xsl:template match="/document/translations"/>

    <xsl:template match="component/javascript"/>
    
    <!-- Выводим переводы для WYSIWYG -->
    <xsl:template match="/document/translations[translation[@component=//component[@editable]/@name]]">
        <script type="module">
            import { stageTranslations } from "<xsl:value-of select="$STATIC_URL"/>scripts/Energine.js";
            stageTranslations(<xsl:value-of select="/document/translations/@json" />);
        </script>
    </xsl:template>

    <xsl:template match="/document/javascript"/>

    <xsl:template match="/document/javascript/library"/>

    <xsl:template match="/document//javascript/variable"/>

    <xsl:template match="/document/javascript/library" mode="head">
        <xsl:choose>
            <xsl:when test="@loader='classic'">
                <script type="text/javascript" src="{$STATIC_URL}scripts/{@path}.js"></script>
            </xsl:when>
            <xsl:otherwise>
                <script type="module" src="{$STATIC_URL}scripts/{@path}.js"></script>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="/document//javascript/variable" mode="head">
        <script type="text/javascript">
            <xsl:text>window["</xsl:text>
            <xsl:value-of select="@name"/>
            <xsl:text>"] = </xsl:text>
            <xsl:choose>
                <xsl:when test="@type='json'">
                    <xsl:value-of select="."/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:text>"</xsl:text>
                    <xsl:value-of select="."/>
                    <xsl:text>"</xsl:text>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:text>;</xsl:text>
        </script>
    </xsl:template>

    <xsl:template match="component[@class='SiteProperties']">
        <xsl:value-of select="." disable-output-escaping="yes"/>
    </xsl:template>

</xsl:stylesheet>
