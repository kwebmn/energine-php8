<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
    >

    <xsl:output method="html"
                version="1.0"
                encoding="utf-8"
                omit-xml-declaration="yes"
                doctype-public="-//W3C//DTD XHTML 1.0 Strict//EN"
                doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"
                indent="yes" />

    <xsl:variable name="BASE" select="/document/properties/property[@name='base']"/>
    <xsl:variable name="STATIC_URL" select="$BASE"/>
    <xsl:variable name="FOLDER">default</xsl:variable>
    <xsl:variable name="LANG_ABBR" select="/document/properties/property[@name='lang']/@abbr"/>
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
    <xsl:variable name="IN_DEBUG_MODE"><xsl:value-of select="/document/@debug"/></xsl:variable>

    <xsl:template match="/document">
        <html>
        	<head>
                <title>Errors</title>
        		<base href="{$BASE}"/>
                <link href="{$STATIC_URL}favicon.ico" rel="shortcut icon" type="image/x-icon"/>
                <!-- Font Awesome -->
                <link
                        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
                        rel="stylesheet"
                />
                <!-- Google Fonts -->
                <link
                        href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&amp;display=swap"
                        rel="stylesheet"
                />
                <link
                        href="{concat($ASSETS_BASE, 'energine.vendor.css')}"
                        rel="stylesheet"
                />
        	</head>
        	<body>

                <div class="container px-4">

                    <!-- Grid row -->
                    <div class="row">
                        <!-- Grid column -->
                        <div class="col-12">
                            <!--Section: Block Content-->
                            <section class="my-5 text-center">
                                <h1 class="display-1">404</h1>

                                <xsl:apply-templates select="errors"/>
                                <div><a  class="btn btn-primary  m-t-20" href="{$BASE}{$LANG_ABBR}">Go back to the homepage</a></div>
                            </section>
                            <!--Section: Block Content-->
                        </div>
                        <!-- Grid column -->
                    </div>
                    <!-- Grid row -->

                </div>

                <div class="container-fluid">
                    <div class="row">
                        <div class="col-sm-12 text-center m-t-20">


                        </div>

                    </div>
                </div>

                <script
                        type="text/javascript"
                        src="{concat($ASSETS_BASE, 'energine.vendor.js')}"
                        defer="defer"
                ></script>
        	</body>
        </html>
    </xsl:template>

    <xsl:template match="errors">
        <div class="error_list  m-t-20">
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <xsl:template match="error">
        <div class="error_item ">
            <h1 class="error_name c-blue">
                <xsl:value-of select="message" disable-output-escaping="yes"/>
            </h1>
            <xsl:if test="$IN_DEBUG_MODE = 1">
                <div class="error_text m-t-20">
                    <div class="alert alert-info alert-notice" role="alert">
                        <div><strong>File: </strong><xsl:value-of select="@file"/></div>
                        <div><strong>Line: </strong><xsl:value-of select="@line"/></div>
                    </div>
                    <xsl:apply-templates select="customMessage"/>
                </div>

            </xsl:if>
        </div>
    </xsl:template>

    <xsl:template match="customMessages">
        <pre>
            <xsl:apply-templates />
        </pre>
    </xsl:template>

    <xsl:template match="customMessage">
        <pre class="text-left">
            <xsl:value-of select="."/>
        </pre>
    </xsl:template>

</xsl:stylesheet>
        
