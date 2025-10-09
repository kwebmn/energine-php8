<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
>

    <xsl:variable name="DEBUG_FLAG" select="normalize-space(/document/@debug)"/>
    <xsl:variable name="IS_USER" select="number(//property[@name='is_user'])"/>

    <!--Собственно отсюда и пляшем-->
    <!--Здесь можно сколько угодно дописывать, главное вызвать обработчки рута в моде head?в котором сосредоточены все команды необходимые для корректного формирования страницы-->
    <xsl:template match="/">
        <html lang="en">
            <head>

                <xsl:apply-templates select="." mode="head"/>
                
                <meta name="viewport" content="width=device-width, initial-scale=1" /> 
                
                <!--Href lang-->
                <xsl:for-each select="//component[@name='langSwitcher']/recordset/record">
            	    <xsl:choose>
                        <xsl:when test="field[@name='lang_real_abbr'] = 'ua'">
                            <link rel="alternate" hreflang="{field[@name='lang_real_abbr']}" href="{$BASE}{field[@name='lang_url']}" />
                        </xsl:when>

                        <xsl:otherwise>
                            <link rel="alternate" hreflang="{field[@name='lang_real_abbr']}" href="{$BASE}{field[@name='lang_url']}" />
                        </xsl:otherwise>
            	    </xsl:choose>
                </xsl:for-each>

                <xsl:if test="$DEBUG_FLAG = '0'">
                    <!-- CSS -->
                    <link rel="stylesheet" href="/assets/energine.vendor.css"/>
                    <link rel="stylesheet" href="/assets/energine.css"/>
                    <xsl:if test="$IS_USER &gt; 0">
                        <link rel="stylesheet" href="/assets/energine.extended.css"/>
                    </xsl:if>
                </xsl:if>

                <xsl:if test="$DEBUG_FLAG != '0' and not(//property[@name='single'])">
                    <link href="stylesheets/default/bootstrap.min.css" rel="stylesheet"/>
                </xsl:if>


                <xsl:if test="string-length(//property[@name='canonical']) > 0">
                    <link rel="canonical" href="{//property[@name='canonical']}"/>
                </xsl:if>
                <xsl:choose>
                    <xsl:when test="string-length(//property[@name='robots']) > 0">
                        <meta name="robots" content="{//property[@name='robots']}" />
                    </xsl:when>
                    <xsl:otherwise>
                        <meta name="robots" content="index, follow" />
                    </xsl:otherwise>
                </xsl:choose>

            </head>
            <body>
                <xsl:apply-templates select="document"/>

                <xsl:if test="$DEBUG_FLAG != '0'">
                    <link href="stylesheets/default/awesome.min.css"  rel="stylesheet" />
                </xsl:if>

                <xsl:if test="not(//property[@name='single'])">
                    <!-- Font Awesome -->
                    <!--                    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"  rel="stylesheet" />-->

                    <!-- Google Fonts -->
                    <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&amp;display=swap" rel="stylesheet"
                    />

                    <xsl:if test="$DEBUG_FLAG != '0'">
                        <link href="stylesheets/default/default.css" rel="stylesheet" type="text/css" media="all"/>
                    </xsl:if>
                </xsl:if>

                <xsl:if test="$DEBUG_FLAG = '0'">
                    <!-- JS -->
                    <script type="module" src="/assets/energine.vendor.js"></script>
                    <script type="module" src="/assets/energine.js"></script>
                    <xsl:if test="$IS_USER &gt; 0">
                        <script type="module" src="/assets/energine.extended.js"></script>
                    </xsl:if>
                </xsl:if>

                <xsl:if test="$DEBUG_FLAG != '0' and not(//property[@name='single'])">
                    <script defer="defer" type="text/javascript" src="scripts/default/bootstrap.bundle.min.js"></script>
                </xsl:if>

<!--                <xsl:if test="not($DOC_PROPS[@name='single']) and $DOC_PROPS[@name='is_user'] = '0'">-->
<!--                    <xsl:call-template name="START_ENERGINE_JS" />-->
<!--                </xsl:if>-->
                <xsl:call-template name="START_ENERGINE_JS" />
                <!-- Subsequent project scripts must import Energine helpers from the module entrypoint. -->


                <!-- <xsl:if test="//property[@name='single']">
                    <script type="text/javascript" src="scripts/jquery.min.js"></script>
                    <script type="text/javascript" src="scripts/jstree/jstree.min.js"></script>
                </xsl:if> -->
<!--                <script type="text/javascript" src="scripts/default/jquery.min.js"></script>-->
                <!--<script type="text/javascript" src="scripts/jstree/jstree.min.js"></script>-->
<!--                <script type="text/javascript">-->
<!--                    jQuery.noConflict();-->
<!--                </script>-->
                <xsl:if test="$DEBUG_FLAG != '0'">
                    <script type="module" src="scripts/default/default.js"></script>
                </xsl:if>
            </body>
        </html>
    </xsl:template>

    <!-- page body -->
    <xsl:template match="document">

            <xsl:call-template name="HEADER" />
            <xsl:apply-templates select="content"/>
            <xsl:call-template name="FOOTER" />

    </xsl:template>



</xsl:stylesheet>
