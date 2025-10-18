<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <!--
        Правила верхнего уровня для документа модуля share.
        Формируем head, подключаем Energine и инициализируем общие
        вспомогательные шаблоны для скриптов, переводов и поведения UI.
    -->
    <xsl:output method="html" indent="yes"/>

    <xsl:template match="/" mode="title">
        <title>
            <xsl:choose>
                <xsl:when test="string-length($DOC_PROPS[@name='title_alt']) &gt; 0">
                    <xsl:value-of select="$DOC_PROPS[@name='title_alt']" />
                </xsl:when>
                <xsl:when test="$DOC_PROPS[@name='title']/@alt = ''">
                    <xsl:for-each select="$COMPONENTS[@name='breadCrumbs']/recordset/record">
                        <xsl:sort data-type="text" order="descending" select="position()"/>
                        <xsl:if test="position() &lt;= 3">
                            <xsl:choose>
                                <xsl:when test="position() = last()">
                                    <xsl:if test="$DOC_PROPS[@name='ID'] = field[@name='Id'] and (field[@name='Name'] != '' or field[@name='Title'] != '')">
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
            </xsl:choose>
        </title>
    </xsl:template>

    <xsl:template match="/" mode="favicon">
        <xsl:call-template name="favicon"/>
    </xsl:template>

    <xsl:template match="/" mode="stylesheets">
        <xsl:call-template name="stylesheets"/>
    </xsl:template>

    <xsl:template match="/" mode="scripts">
        <xsl:call-template name="scripts"/>
    </xsl:template>

    <xsl:template match="/" mode="og"/>

    <xsl:template match="/" mode="head">
        <xsl:apply-templates select="." mode="title"/>
        <base href="{$BASE}"/>
        <xsl:apply-templates select="." mode="favicon"/>

        <xsl:choose>
            <xsl:when test="not($DOC_PROPS[@name='single'])">
                <xsl:apply-templates select="." mode="stylesheets"/>
            </xsl:when>
            <xsl:otherwise/>
        </xsl:choose>

        <xsl:if test="$DOC_PROPS[@name='google_verify']">
            <meta name="google-site-verification" content="{$DOC_PROPS[@name='google_verify']}"/>
        </xsl:if>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"/>
        <meta name="keywords" content="{$DOC_PROPS[@name='keywords']}"/>
        <meta name="description" content="{$DOC_PROPS[@name='description']}"/>
        <link rel="stylesheet" href="{concat($ASSETS_BASE, 'energine.css')}"/>
        <link rel="stylesheet" href="{concat($ASSETS_BASE, 'energine.vendor.css')}"/>
        <xsl:if test="$DOC_PROPS[@name='robots']!=''">
            <meta name="robots" content="{$DOC_PROPS[@name='robots']}"/>
        </xsl:if>
    </xsl:template>

    <xsl:template name="START_ENERGINE_JS">
        <xsl:if test="$DOC_PROPS[@name='is_user'] = '1'">
            <script defer="defer" src="{concat($ASSETS_BASE, 'energine.extended.vendor.js')}"></script>
        </xsl:if>
        <script defer="defer" src="{concat($ASSETS_BASE, 'energine.vendor.js')}"></script>
        <xsl:if test="$DOC_PROPS[@name='is_user'] = '1'">
            <link rel="stylesheet" href="{concat($ASSETS_BASE, 'energine.extended.vendor.css')}"/>
            <link rel="stylesheet" href="{concat($ASSETS_BASE, 'energine.extended.css')}"/>
        </xsl:if>

        <xsl:apply-templates select="/document//javascript/variable" mode="head"/>

        <xsl:if test="$DOCUMENT/@debug != '0'">
            <xsl:apply-templates select="/document//javascript/library[@loader='classic'][not(preceding::javascript/library[@loader = current()/@loader and @src = current()/@src and @path = current()/@path])]" mode="head"/>
        </xsl:if>

        <script type="module">
            <xsl:attribute name="src">
                <xsl:value-of select="$ENERGINE_URL"/>
            </xsl:attribute>
            <xsl:if test="$DOCUMENT/@debug=1">
                <xsl:attribute name="data-debug">true</xsl:attribute>
            </xsl:if>
            <xsl:attribute name="data-base">
                <xsl:value-of select="$BASE"/>
            </xsl:attribute>
            <xsl:attribute name="data-static">
                <xsl:value-of select="$STATIC_URL"/>
            </xsl:attribute>
            <xsl:attribute name="data-resizer">
                <xsl:value-of select="$RESIZER_URL"/>
            </xsl:attribute>
            <xsl:attribute name="data-media">
                <xsl:value-of select="$MEDIA_URL"/>
            </xsl:attribute>
            <xsl:attribute name="data-root">
                <xsl:value-of select="$MAIN_SITE"/>
            </xsl:attribute>
            <xsl:attribute name="data-lang">
                <xsl:value-of select="$DOC_PROPS[@name='lang']/@real_abbr"/>
            </xsl:attribute>
            <xsl:attribute name="data-single-mode">
                <xsl:choose>
                    <xsl:when test="boolean($DOC_PROPS[@name='single'])">true</xsl:when>
                    <xsl:otherwise>false</xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
        </script>

        <xsl:if test="$DOCUMENT/@debug != '0'">
            <xsl:apply-templates select="/document//javascript/library[not(@loader='classic')][not(preceding::javascript/library[@loader = current()/@loader and @src = current()/@src and @path = current()/@path])]" mode="head"/>
        </xsl:if>

        <xsl:if test="$DOCUMENT/@debug = '0' and $DOC_PROPS[@name='is_user'] = '1'">
            <script type="module" src="{concat($ASSETS_BASE, 'energine.extended.js')}"></script>
        </xsl:if>

        <xsl:apply-templates select="." mode="scripts"/>
        <xsl:apply-templates select="/document/translations"/>

        <script type="module">
            import { bootEnergine, attachToWindow, createConfigFromScriptDataset, safeConsoleError } from "<xsl:value-of select="$ENERGINE_URL"/>";

            const config = createConfigFromScriptDataset();
            const runtime = bootEnergine(config);
            if (window.__energineBridge &amp;&amp; typeof window.__energineBridge.setRuntime === 'function') {
                window.__energineBridge.setRuntime(runtime);
            }
            const Energine = attachToWindow(window, runtime);
            const componentToolbars = window.componentToolbars = [];

            <xsl:if test="count($COMPONENTS[recordset]/javascript/behavior[@name!='PageEditor']) &gt; 0">
                <xsl:apply-templates select="$COMPONENTS[recordset]/javascript[behavior[@name!='PageEditor']]" mode="startup-init"/>
            </xsl:if>

            <xsl:apply-templates select="$COMPONENTS[@componentAction='showPageToolbar']" mode="startup"/>
            <xsl:apply-templates select="$COMPONENTS[@componentAction!='showPageToolbar']/javascript/behavior[@name!='PageEditor']" mode="startup"/>
            <xsl:apply-templates select="$COMPONENTS/javascript/behavior[@name='PageEditor'][1]" mode="startup-page-editor"/>

            document.addEventListener('DOMContentLoaded', () => Energine.run());
        </script>

        <xsl:if test="not($DOC_PROPS[@name='single'])">
            <xsl:if test="$DOC_PROPS[@name='google_analytics'] and ($DOC_PROPS[@name='google_analytics'] != '')">
                <xsl:value-of select="$DOC_PROPS[@name='google_analytics']" disable-output-escaping="yes"/>
            </xsl:if>
        </xsl:if>
    </xsl:template>

    <xsl:template match="document[properties/property[@name='single']]">
        <xsl:attribute name="class">e-singlemode-layout</xsl:attribute>
        <xsl:apply-templates select="container | component"/>
    </xsl:template>

    <xsl:template match="layout | content | container">
        <xsl:apply-templates/>
    </xsl:template>

    <xsl:template match="/document/translations"/>

    <xsl:template match="component/javascript"/>

    <xsl:template match="/document/translations[translation[@component=$COMPONENTS[@editable]/@name]]">
        <script type="module">
            import { stageTranslations } from "<xsl:value-of select="$ENERGINE_URL"/>";
            stageTranslations(<xsl:value-of select="@json" />);
        </script>
    </xsl:template>

    <xsl:template match="/document/javascript"/>

    <xsl:template match="/document/javascript/library"/>

    <xsl:template match="/document//javascript/variable"/>

    <xsl:template match="/document/javascript/library" mode="head">
        <xsl:variable name="HAS_SRC" select="string-length(@src) &gt; 0"/>
        <xsl:variable name="RAW_SRC" select="
            concat(
                substring(@src, 1, string-length(@src) * number($HAS_SRC)),
                substring(concat('scripts/', @path, '.js'), 1, string-length(concat('scripts/', @path, '.js')) * (1 - number($HAS_SRC)))
            )
        "/>
        <xsl:variable name="RAW_SRC_REMOTE" select="contains($RAW_SRC, '://') or starts-with($RAW_SRC, '//')"/>
        <xsl:variable name="FULL_SRC" select="
            concat(
                substring($RAW_SRC, 1, string-length($RAW_SRC) * number($RAW_SRC_REMOTE)),
                substring(concat($STATIC_URL, $RAW_SRC), 1, string-length(concat($STATIC_URL, $RAW_SRC)) * (1 - number($RAW_SRC_REMOTE)))
            )
        "/>
        <xsl:choose>
            <xsl:when test="@loader='classic'">
                <script defer="defer" type="text/javascript" src="{$FULL_SRC}"></script>
            </xsl:when>
            <xsl:otherwise>
                <script type="module" src="{$FULL_SRC}"></script>
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

    <xsl:template match="component/javascript" mode="startup-init">
        <xsl:variable name="OBJECT_ID" select="generate-id(../recordset)"/>
        globalThis['<xsl:value-of select="$OBJECT_ID"/>'] = globalThis['<xsl:value-of select="$OBJECT_ID"/>'] || null;
        <xsl:text>&#10;</xsl:text>
    </xsl:template>

    <xsl:template match="component[@componentAction='showPageToolbar']" mode="startup">
        Energine.addTask(function () {
            const pageToolbar = new <xsl:value-of select="javascript/behavior/@name"/>(
                '<xsl:value-of select="concat($BASE, $LANG_ABBR, @single_template)"/>'<xsl:text>,</xsl:text>
                <xsl:value-of select="$DOC_PROPS[@name='ID']"/><xsl:text>,</xsl:text>
                '<xsl:value-of select="toolbar/@name"/>'<xsl:text>,</xsl:text>
                [<xsl:apply-templates select="toolbar/control" mode="page-toolbar-control"/>]
                <xsl:apply-templates select="toolbar/properties" mode="page-toolbar-properties"/>
            );
        });
        <xsl:text>&#10;</xsl:text>
    </xsl:template>

    <xsl:template match="toolbar/properties" mode="page-toolbar-properties">
        , <xsl:apply-templates select="property" mode="page-toolbar-property"/>
    </xsl:template>

    <xsl:template match="toolbar/properties/property" mode="page-toolbar-property">
        {'<xsl:value-of select="@name"/>':'<xsl:value-of select="."/>'}<xsl:if test="position()!=last()">, </xsl:if>
    </xsl:template>

    <xsl:template match="toolbar/control" mode="page-toolbar-control">
        {<xsl:apply-templates select="@*[name()!='mode']" mode="page-toolbar-attribute"/>}<xsl:if test="position()!=last()">, </xsl:if>
    </xsl:template>

    <xsl:template match="toolbar/control/@*" mode="page-toolbar-attribute">
        '<xsl:value-of select="name()"/>':'<xsl:value-of select="."/>'<xsl:if test="position()!=last()">, </xsl:if>
    </xsl:template>

    <xsl:template match="component/javascript/behavior[@name!='PageEditor']" mode="startup">
        <xsl:variable name="OBJECT_ID" select="generate-id(../../recordset[not(@name)])"/>
        if (document.getElementById('<xsl:value-of select="$OBJECT_ID"/>')) {
            try {
                globalThis['<xsl:value-of select="$OBJECT_ID"/>'] = new <xsl:value-of select="@name"/>(document.getElementById('<xsl:value-of select="$OBJECT_ID"/>'));
            }
            catch (e) {
                safeConsoleError(e);
            }
        }
        <xsl:text>&#10;</xsl:text>
    </xsl:template>

    <xsl:template match="component/javascript/behavior" mode="startup-page-editor">
        <xsl:variable name="OBJECT_ID" select="generate-id(../../recordset)"/>
        try {
            globalThis['<xsl:value-of select="$OBJECT_ID"/>'] = new PageEditor();
        }
        catch (e) {
            safeConsoleError(e);
        }
        <xsl:text>&#10;</xsl:text>
    </xsl:template>
</xsl:stylesheet>
