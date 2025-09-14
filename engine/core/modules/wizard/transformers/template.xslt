<?xml version="1.0" encoding="utf-8" ?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">


    <xsl:template match="content[@file = 'template_name']">

        <!-- Heading -->
        <div class="container-fluid">
            <div class="p-5 bg-body-tertiary mb-4">
                <h1 class=""><xsl:value-of select="//property[@name='title']"/></h1>
                <!-- Breadcrumb -->
                <nav class="d-flex">
                    <xsl:apply-templates select="$COMPONENTS[@name='breadCrumbs']"/>
                </nav>
                <!-- Breadcrumb -->
            </div>

        </div>

        <div class="container">
            <div class="row">
                <div class="col-sm-12">
                    <xsl:apply-templates />
                </div>
            </div>
        </div>

    </xsl:template>

    <xsl:template match="component[@name='templateName']">
        <xsl:apply-templates select="recordset"/>
        <xsl:if test="not(//property[@name='default'] = 1)">
            <xsl:apply-templates select="toolbar"/>
        </xsl:if>
    </xsl:template>

    <xsl:template match="component[@name='templateName']/recordset">
        <div class="row">
            <div class="col-sm-12" id="{generate-id(.)}">
                <xsl:choose>
                    <xsl:when test="@empty">
                        <p><xsl:value-of select="@empty"/></p>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:apply-templates />
                    </xsl:otherwise>
                </xsl:choose>

            </div>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='templateName']/recordset/record">

            <div class="col-sm-12" record="{field[@name='templatePrimaryKey']}">
                <div class="row">
                    <xsl:apply-templates select="field"/>
                </div>
                <a href="{$LANG_ABBR}{field[@name='smap_id']/@url}{field[@name='news_id']}" >

                </a>
            </div>
    </xsl:template>

    <xsl:template match="component[@name='templateName' and @componentAction = 'view']/recordset/record">
        <div class="row" record="{field[@name='templatePrimaryKey']}">
            <div class="col-sm-12">
                <div class="row">
                    <xsl:apply-templates select="field"/>
                </div>

            </div>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='templateName']/recordset/record/field">
        <div class="col">
            <xsl:value-of select="." />
        </div>
    </xsl:template>


</xsl:stylesheet>
