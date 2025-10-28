<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    <!--
        Test component layout.
        Renders content from test.content.xml with Bootstrap containers and toolbar support.
        Expects breadcrumbs in $COMPONENTS and component recordsets with optional toolbar.
    -->

    <xsl:template match="content[@file = 'test.content.xml']">
        <xsl:variable name="TITLE" select="normalize-space(properties/property[@name='title'])"/>

        <div class="container-fluid">
            <div class="p-5 bg-body-tertiary mb-4">
                <h1>
                    <xsl:value-of select="$TITLE"/>
                </h1>
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
        <xsl:param name="IS_DEFAULT" select="boolean(ancestor::content[1]/properties/property[@name='default'] = 1)"/>

        <xsl:apply-templates select="recordset"/>

        <xsl:if test="not($IS_DEFAULT)">
            <xsl:apply-templates select="toolbar"/>
        </xsl:if>
    </xsl:template>

    <xsl:template match="component[@name='test']/recordset">
        <xsl:variable name="EMPTY_MESSAGE" select="@empty"/>

        <div class="row">
            <div class="col-sm-12" id="{generate-id(.)}">
                <xsl:choose>
                    <xsl:when test="$EMPTY_MESSAGE">
                        <p>
                            <xsl:value-of select="$EMPTY_MESSAGE"/>
                        </p>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:apply-templates/>
                    </xsl:otherwise>
                </xsl:choose>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='test']/recordset/record">
        <xsl:variable name="TEST_ID" select="field[@name='test_id']"/>
        <xsl:variable name="DETAIL_URL" select="concat($LANG_ABBR, field[@name='smap_id']/@url, field[@name='news_id'])"/>

        <div class="col-sm-12" record="{$TEST_ID}">
            <div class="row">
                <xsl:apply-templates select="field"/>
            </div>
            <a href="{$DETAIL_URL}" class="stretched-link"/>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='test' and @componentAction = 'view']/recordset/record">
        <xsl:variable name="TEST_ID" select="field[@name='test_id']"/>

        <div class="row" record="{$TEST_ID}">
            <div class="col-sm-12">
                <div class="row">
                    <xsl:apply-templates select="field"/>
                </div>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='test']/recordset/record/field">
        <div class="col">
            <xsl:value-of select="."/>
        </div>
    </xsl:template>
</xsl:stylesheet>
