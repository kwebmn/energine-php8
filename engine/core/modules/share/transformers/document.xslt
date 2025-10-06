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
<!--        <xsl:apply-templates select="." mode="og"/>-->

<!--        <xsl:if test="$DOC_PROPS[@name='single'] or $DOC_PROPS[@name='is_user'] > 0">-->
<!--            <xsl:call-template name="START_ENERGINE_JS" />-->
<!--        </xsl:if>-->

<!--        <xsl:if test="//property[@name='single']">-->
<!--            <script type="text/javascript" src="scripts/jquery.min.js"></script>-->
<!--        </xsl:if>-->

    </xsl:template>

    <xsl:template name="INIT_ENERGINE_GLOBALS">
        <script type="text/javascript">
            var ScriptLoader = window.ScriptLoader = window.ScriptLoader || { load: function () {} };

            if (typeof window.safeConsoleError !== 'function') {
                window.safeConsoleError = function (e) {
                    if (window.console &amp;&amp; typeof window.console.error === 'function') {
                        window.console.error(e);
                    }
                };
            }

            var Energine = window.Energine;
            if (typeof Energine !== 'object' || Energine === null) {
                Energine = {};
                window.Energine = Energine;
            }

            if (!Array.isArray(Energine.tasks)) {
                Energine.tasks = [];
            }

            if (typeof Energine.addTask !== 'function') {
                Energine.addTask = function (task, priority) {
                    const level = typeof priority === 'number' ? priority : 5;

                    if (!this.tasks[level]) {
                        this.tasks[level] = [];
                    }

                    this.tasks[level].push(task);
                };
            }

            if (typeof Energine.run !== 'function') {
                Energine.run = function () {
                    if (!Array.isArray(this.tasks)) {
                        return;
                    }

                    for (const group of this.tasks) {
                        if (!Array.isArray(group)) {
                            continue;
                        }

                        for (const task of group) {
                            try {
                                task();
                            }
                            catch (e) {
                                if (typeof window.safeConsoleError === 'function') {
                                    window.safeConsoleError(e);
                                }
                                else if (window.console &amp;&amp; typeof window.console.error === 'function') {
                                    window.console.error(e);
                                }
                            }
                        }
                    }
                };
            }

            Object.assign(Energine, {
            <xsl:if test="document/@debug=1">'debug' :true,</xsl:if>
            'base' : '<xsl:value-of select="$BASE"/>',
            'static' : '<xsl:value-of select="$STATIC_URL"/>',
            'resizer' : '<xsl:value-of select="$RESIZER_URL"/>',
            'media' : '<xsl:value-of select="$MEDIA_URL"/>',
            'root' : '<xsl:value-of select="$MAIN_SITE"/>',
            'lang' : '<xsl:value-of select="$DOC_PROPS[@name='lang']/@real_abbr"/>',
            'singleMode':<xsl:value-of select="boolean($DOC_PROPS[@name='single'])"/>
            });

            if (typeof Energine.loadCSS !== 'function') {
                Energine.loadCSS = function (file) {
                    if (!file) {
                        return;
                    }

                    var isAbsolute = /^(?:[a-z]+:)?\/\//i.test(file) || file.charAt(0) === '/';
                    var base = (typeof Energine.static === 'string') ? Energine.static : '';
                    var normalizedBase = base && base.charAt(base.length - 1) !== '/' && file && file.charAt(0) !== '/' ? base + '/' : base;
                    var href = isAbsolute ? file : normalizedBase + file;

                    if (!document.querySelector('link[data-energine-css="' + href + '"]')) {
                        var link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = href;
                        link.setAttribute('data-energine-css', href);
                        document.head.appendChild(link);
                    }
                };
            }
        </script>
    </xsl:template>

    <xsl:template name="START_ENERGINE_JS">
        <xsl:param name="includeGlobals" select="true()"/>
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

        <xsl:if test="$includeGlobals">
            <xsl:call-template name="INIT_ENERGINE_GLOBALS"/>
        </xsl:if>
        <xsl:apply-templates select="/document//javascript/variable" mode="head"/>
        <xsl:apply-templates select="." mode="scripts"/>
        <xsl:apply-templates select="document/translations"/>
        <script type="text/javascript">
            var Energine = window.Energine || {};
            window.Energine = Energine;
            var componentToolbars = window.componentToolbars || [];
            window.componentToolbars = componentToolbars;
            <xsl:if test="count($COMPONENTS[recordset]/javascript/behavior[@name!='PageEditor']) &gt; 0">
                var <xsl:for-each select="$COMPONENTS[recordset]/javascript[behavior[@name!='PageEditor']]"><xsl:value-of select="generate-id(../recordset)"/><xsl:if test="position() != last()">,</xsl:if></xsl:for-each>;
            </xsl:if>

            function startEnergineComponents() {
            <xsl:if test="$COMPONENTS[@componentAction='showPageToolbar']">
             <xsl:variable name="PAGE_TOOLBAR" select="$COMPONENTS[@componentAction='showPageToolbar']"></xsl:variable>
            var pageToolbar = new <xsl:value-of select="$PAGE_TOOLBAR/javascript/behavior/@name" />('<xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="$PAGE_TOOLBAR/@single_template" />', <xsl:value-of select="$ID" />, '<xsl:value-of select="$PAGE_TOOLBAR/toolbar/@name"/>', [
            <xsl:for-each select="$PAGE_TOOLBAR/toolbar/control">
                { <xsl:for-each select="@*[name()!='mode']">'<xsl:value-of select="name()"/>':'<xsl:value-of select="."/>'<xsl:if test="position()!=last()">,</xsl:if></xsl:for-each>}<xsl:if test="position()!=last()">,</xsl:if></xsl:for-each>
            ]<xsl:if
                test="$PAGE_TOOLBAR/toolbar/properties/property">, <xsl:for-each select="$PAGE_TOOLBAR/toolbar/properties/property">{'<xsl:value-of select="@name"/>':'<xsl:value-of
                select="."/>'<xsl:if test="position()!=last()">,</xsl:if>}</xsl:for-each></xsl:if>);

            </xsl:if>
            <xsl:for-each select="$COMPONENTS[@componentAction!='showPageToolbar']/javascript/behavior[@name!='PageEditor']">
                <xsl:variable name="objectID" select="generate-id(../../recordset[not(@name)])"/>
                if(document.getElementById('<xsl:value-of select="$objectID"/>')){
                    try {
                         <xsl:value-of select="$objectID"/> = new <xsl:value-of select="@name"/>(document.getElementById('<xsl:value-of select="$objectID"/>'));
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
                    <xsl:value-of select="$objectID"/> = new PageEditor();
                    }
                    catch (e) {
                    safeConsoleError(e);
                    }
                </xsl:if>
            </xsl:if>
            }

            Energine.addTask(startEnergineComponents);

            document.addEventListener('DOMContentLoaded', function () {
                if (window.jQuery && !window.$) {
                    window.$ = window.jQuery;
                }
                if (window.$ && !window.jQuery) {
                    window.jQuery = window.$;
                }

                if (window.Energine &amp;&amp; (typeof window.Energine.run === 'function')) {
                    window.Energine.run();
                }
            });



        </script>

        <xsl:if test="not(//property[@name='single'])">
            <xsl:if test="$DOC_PROPS[@name='google_analytics'] and ($DOC_PROPS[@name='google_analytics'] != '')">
                <xsl:value-of select="$DOC_PROPS[@name='google_analytics']" disable-output-escaping="yes"/>
            </xsl:if>
        </xsl:if>

    </xsl:template>

    <!-- Single mode document -->
    <xsl:template match="document[properties/property[@name='single']]">
        <xsl:apply-templates select="container | component"/>
    </xsl:template>

    <xsl:template match="layout | content | container">
        <xsl:apply-templates/>
    </xsl:template>
    
    <xsl:template match="/document/translations"/>

    <xsl:template match="component/javascript"/>
    
    <!-- Выводим переводы для WYSIWYG -->
    <xsl:template match="/document/translations[translation[@component=//component[@editable]/@name]]">
            <script type="text/javascript">
                document.addEventListener('DOMContentLoaded', function() {Energine.translations.extend(<xsl:value-of select="/document/translations/@json" />);});
            </script>
    </xsl:template>

    <xsl:template match="/document/javascript"/>

    <xsl:template match="/document/javascript/library"/>

    <xsl:template match="/document//javascript/variable"/>

    <xsl:template match="/document/javascript/library" mode="head">
        <script type="text/javascript" src="{$STATIC_URL}scripts/{@path}.js"/>
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
