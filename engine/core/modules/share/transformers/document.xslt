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
    <xsl:variable name="ASSETS_BASE">
        <xsl:choose>
            <xsl:when test="substring($STATIC_URL, string-length($STATIC_URL)) = '/' or $STATIC_URL = ''">
                <xsl:value-of select="concat($STATIC_URL, 'assets/')"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="concat($STATIC_URL, '/assets/')"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:variable>
    <xsl:variable name="CKEDITOR_BASE">
        <xsl:choose>
            <xsl:when test="substring($STATIC_URL, string-length($STATIC_URL)) = '/' or $STATIC_URL = ''">
                <xsl:value-of select="concat($STATIC_URL, 'assets/ckeditor/')"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="concat($STATIC_URL, '/assets/ckeditor/')"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:variable>
    <xsl:variable name="MEDIA_URL"><xsl:value-of select="$BASE/@media"/></xsl:variable>
    <xsl:variable name="RESIZER_URL"><xsl:value-of select="$BASE/@resizer"/></xsl:variable>
    <xsl:variable name="MAIN_SITE"><xsl:value-of select="$DOC_PROPS[@name='base']/@default"/><xsl:value-of select="$LANG_ABBR"/></xsl:variable>
    <xsl:variable name="SCRIPTS_BASE">
        <xsl:choose>
            <xsl:when test="$DOC_PROPS[@name='scripts_base'] != ''">
                <xsl:value-of select="$DOC_PROPS[@name='scripts_base']"/>
            </xsl:when>
            <xsl:otherwise>scripts/</xsl:otherwise>
        </xsl:choose>
    </xsl:variable>
    <xsl:variable name="ENERGINE_SRC_VALUE">
        <xsl:choose>
            <xsl:when test="/document/@debug = '0'">
                <xsl:value-of select="concat($ASSETS_BASE, 'energine.js')"/>
            </xsl:when>
            <xsl:when test="$DOC_PROPS[@name='energine_script'] != ''">
                <xsl:value-of select="$DOC_PROPS[@name='energine_script']"/>
            </xsl:when>
            <xsl:otherwise>scripts/Energine.js</xsl:otherwise>
        </xsl:choose>
    </xsl:variable>
    <xsl:variable name="ENERGINE_URL">
        <xsl:choose>
            <xsl:when test="contains($ENERGINE_SRC_VALUE, '://') or starts-with($ENERGINE_SRC_VALUE, '//')">
                <xsl:value-of select="$ENERGINE_SRC_VALUE"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="concat($STATIC_URL, $ENERGINE_SRC_VALUE)"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:variable>
    <xsl:key name="js-library" match="javascript/library" use="concat(@loader,'|',@src,'|',@path)"/>

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
        <link rel="stylesheet" href="{concat($ASSETS_BASE, 'energine.css')}"/>
        <link rel="stylesheet" href="{concat($ASSETS_BASE, 'energine.vendor.css')}"/>
        <xsl:if test="/document/@debug = '0'">
            <!-- CSS -->
            
            
            

            <!-- JS -->
            
            
            <!-- <xsl:if test="//property[@name='is_user'] = '1'">
                <script>
                    <xsl:text>window.CKEDITOR_BASEPATH = '</xsl:text>
                    <xsl:value-of select="$CKEDITOR_BASE"/>
                    <xsl:text>';</xsl:text>
                </script>
                <script defer="defer" src="{concat($ASSETS_BASE, 'energine.extended.vendor.js')}"></script>
            </xsl:if> -->
        </xsl:if>
        
        <xsl:if test="$DOC_PROPS[@name='robots']!=''">
            <meta name="robots" content="{$DOC_PROPS[@name='robots']}"/>
        </xsl:if>        
       <!-- <xsl:apply-templates select="." mode="og"/> -->


    </xsl:template>

    <xsl:template name="START_ENERGINE_JS">
        <xsl:if test="//property[@name='is_user'] = '1'">
                <script>
                    <xsl:text>window.CKEDITOR_BASEPATH = '</xsl:text>
                    <xsl:value-of select="$CKEDITOR_BASE"/>
                    <xsl:text>';</xsl:text>
                </script>
                <script defer="defer" src="{concat($ASSETS_BASE, 'energine.extended.vendor.js')}"></script>
            </xsl:if>
        <script defer="defer" src="{concat($ASSETS_BASE, 'energine.vendor.js')}"></script>
        <xsl:if test="//property[@name='is_user'] = '1'">
            <link rel="stylesheet" href="{concat($ASSETS_BASE, 'energine.extended.vendor.css')}"/>
            <link rel="stylesheet" href="{concat($ASSETS_BASE, 'energine.extended.css')}"/>
        </xsl:if>
        <xsl:apply-templates select="/document//javascript/variable" mode="head"/>
        <xsl:if test="/document/@debug != '0'">
            <xsl:for-each select="//javascript/library[@loader='classic'][generate-id() = generate-id(key('js-library', concat(@loader,'|',@src,'|',@path))[1])]">
                <xsl:apply-templates select="." mode="head"/>
            </xsl:for-each>
        </xsl:if>
        <script type="module">
            <xsl:attribute name="src"><xsl:value-of select="$ENERGINE_URL"/></xsl:attribute>
            <xsl:if test="document/@debug=1">
                <xsl:attribute name="data-debug">true</xsl:attribute>
            </xsl:if>
            <xsl:attribute name="data-base"><xsl:value-of select="$BASE"/></xsl:attribute>
            <xsl:attribute name="data-static"><xsl:value-of select="$STATIC_URL"/></xsl:attribute>
            <xsl:attribute name="data-resizer"><xsl:value-of select="$RESIZER_URL"/></xsl:attribute>
            <xsl:attribute name="data-media"><xsl:value-of select="$MEDIA_URL"/></xsl:attribute>
            <xsl:attribute name="data-root"><xsl:value-of select="$MAIN_SITE"/></xsl:attribute>
            <xsl:attribute name="data-lang"><xsl:value-of select="$DOC_PROPS[@name='lang']/@real_abbr"/></xsl:attribute>
            <xsl:attribute name="data-single-mode">
                <xsl:choose>
                    <xsl:when test="boolean($DOC_PROPS[@name='single'])">true</xsl:when>
                    <xsl:otherwise>false</xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
        </script>
        <xsl:if test="/document/@debug != '0'">
            <xsl:for-each select="//javascript/library[not(@loader='classic')][generate-id() = generate-id(key('js-library', concat(@loader,'|',@src,'|',@path))[1])]">
                <xsl:apply-templates select="." mode="head"/>
            </xsl:for-each>
        </xsl:if>
        <xsl:if test="/document/@debug = '0' and //property[@name='is_user'] = '1'">
            <script type="module" src="{concat($ASSETS_BASE, 'energine.extended.js')}"></script>
        </xsl:if>
        <xsl:apply-templates select="." mode="scripts"/>
        <xsl:apply-templates select="document/translations"/>
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
            import { stageTranslations } from "<xsl:value-of select="$ENERGINE_URL"/>";
            stageTranslations(<xsl:value-of select="/document/translations/@json" />);
        </script>
    </xsl:template>

    <xsl:template match="/document/javascript"/>

    <xsl:template match="/document/javascript/library"/>

    <xsl:template match="/document//javascript/variable"/>

    <xsl:template match="/document/javascript/library" mode="head">
        <xsl:variable name="rawSrc">
            <xsl:choose>
                <xsl:when test="string-length(@src) &gt; 0">
                    <xsl:value-of select="@src"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="concat('scripts/', @path, '.js')"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="fullSrc">
            <xsl:choose>
                <xsl:when test="contains($rawSrc, '://') or starts-with($rawSrc, '//')">
                    <xsl:value-of select="$rawSrc"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="concat($STATIC_URL, $rawSrc)"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:choose>
            <xsl:when test="@loader='classic'">
                <script defer="defer" type="text/javascript">                
                    <xsl:attribute name="src"><xsl:value-of select="$fullSrc"/></xsl:attribute>
                </script>
            </xsl:when>
            <xsl:otherwise>
                <script type="module">
                    <xsl:attribute name="src"><xsl:value-of select="$fullSrc"/></xsl:attribute>
                </script>
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
