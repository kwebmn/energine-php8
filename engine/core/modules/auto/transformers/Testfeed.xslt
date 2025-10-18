<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    <!-- Bootstrap presentation for the Testfeed component. -->
    <xsl:output method="html" indent="yes" />

    <xsl:template match="content[@file='Testfeed.content.xml']">
        <section class="container-fluid">
            <div class="p-5 bg-body-tertiary mb-4">
                <h1>
                    <xsl:value-of select="$DOC_PROPS[@name='title']"/>
                </h1>
                <nav class="d-flex">
                    <xsl:apply-templates select="$COMPONENTS[@name='breadCrumbs']"/>
                </nav>
            </div>
        </section>

        <div class="container">
            <div class="row">
                <div class="col-sm-12">
                    <xsl:apply-templates/>
                </div>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="content[@file='Testfeed.content.xml']/component">
        <xsl:apply-templates select="recordset"/>
        <xsl:if test="not($DOC_PROPS[@name='default'] = 1)">
            <xsl:apply-templates select="toolbar"/>
        </xsl:if>
    </xsl:template>

    <xsl:template match="component[@name='Testfeed']/recordset">
        <div class="row">
            <div class="col-sm-12" id="{generate-id()}">
                <xsl:choose>
                    <xsl:when test="@empty">
                        <p>
                            <xsl:value-of select="@empty"/>
                        </p>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:apply-templates select="record"/>
                    </xsl:otherwise>
                </xsl:choose>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='Testfeed']/recordset/record">
        <div class="col-sm-12" record="{field[@name='Testfeed_id']}">
            <div class="row">
                <xsl:apply-templates select="field"/>
            </div>
            <a href="{$LANG_ABBR}{field[@name='smap_id']/@url}{field[@name='news_id']}"></a>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='Testfeed' and @componentAction='view']/recordset/record">
        <div class="row" record="{field[@name='Testfeed_id']}">
            <div class="col-sm-12">
                <div class="row">
                    <xsl:apply-templates select="field"/>
                </div>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='Testfeed']/recordset/record/field">
        <div class="col">
            <xsl:value-of select="."/>
        </div>
    </xsl:template>
</xsl:stylesheet>
