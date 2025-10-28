<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:template match="content">
        <section class="bg-body-tertiary border-bottom">
            <div class="container-fluid px-4 py-5">
                <div class="row">
                    <div class="col">
                        <h1 class="display-5 fw-semibold mb-3">
                            <xsl:value-of select="//property[@name='title']"/>
                        </h1>
                        <xsl:if test="$COMPONENTS[@name='breadCrumbs']/recordset/record">
                            <nav aria-label="breadcrumb">
                                <xsl:apply-templates select="$COMPONENTS[@name='breadCrumbs']"/>
                            </nav>
                        </xsl:if>
                    </div>
                </div>
            </div>
        </section>

        <div class="container-fluid py-4">
            <div class="container">
                <div class="row g-4">
                    <div class="col-12">
                        <xsl:apply-templates />
                    </div>
                </div>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='breadCrumbs']">
        <xsl:if test="count(recordset/record) &gt; 1">
            <ol class="breadcrumb mb-0">
                <xsl:apply-templates select="recordset/record"/>
            </ol>
        </xsl:if>
    </xsl:template>

    <xsl:template match="component[@name='breadCrumbs']/recordset/record">
        <xsl:variable name="IS_LAST" select="position() = last()"/>
        <xsl:variable name="SEGMENT" select="normalize-space(field[@name='Segment'])"/>
        <xsl:variable name="ITEM_NAME" select="normalize-space(field[@name='Name'])"/>

        <xsl:choose>
            <xsl:when test="position() = 1">
                <li class="breadcrumb-item">
                    <a class="link-dark text-decoration-none" href="{$BASE}{$LANG_ABBR}">
                        <xsl:value-of select="$ITEM_NAME"/>
                    </a>
                </li>
            </xsl:when>
            <xsl:when test="$IS_LAST">
                <li class="breadcrumb-item active" aria-current="page">
                    <xsl:value-of select="$ITEM_NAME"/>
                </li>
            </xsl:when>
            <xsl:otherwise>
                <li class="breadcrumb-item">
                    <xsl:choose>
                        <xsl:when test="string-length($SEGMENT) &gt; 0">
                            <a class="link-dark text-decoration-none" href="{$BASE}{$LANG_ABBR}{$SEGMENT}">
                                <xsl:value-of select="$ITEM_NAME"/>
                            </a>
                        </xsl:when>
                        <xsl:otherwise>
                            <span><xsl:value-of select="$ITEM_NAME"/></span>
                        </xsl:otherwise>
                    </xsl:choose>
                </li>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="toolbar[@name='pager']">
        <nav aria-label="Page navigation">
            <ul class="pagination pagination-sm mb-0">
                <xsl:for-each select="control">
                    <xsl:choose>
                        <xsl:when test="@type = 'link'">
                            <xsl:variable name="isNumeric" select="not(string(number(@action)) = 'NaN')"/>
                            <li>
                                <xsl:attribute name="class">
                                    <xsl:text>page-item</xsl:text>
                                    <xsl:if test="@disabled = 'disabled' and $isNumeric">
                                        <xsl:text> active</xsl:text>
                                    </xsl:if>
                                    <xsl:if test="@disabled = 'disabled' and not($isNumeric)">
                                        <xsl:text> disabled</xsl:text>
                                    </xsl:if>
                                </xsl:attribute>
                                <xsl:choose>
                                    <xsl:when test="@disabled = 'disabled' and $isNumeric">
                                        <span class="page-link" aria-current="page">
                                            <xsl:if test="@title">
                                                <xsl:attribute name="title"><xsl:value-of select="@title"/></xsl:attribute>
                                            </xsl:if>
                                            <xsl:value-of select="@action"/>
                                        </span>
                                    </xsl:when>
                                    <xsl:when test="@disabled = 'disabled'">
                                        <span class="page-link" aria-disabled="true">
                                            <xsl:if test="@title">
                                                <xsl:attribute name="title"><xsl:value-of select="@title"/></xsl:attribute>
                                            </xsl:if>
                                            <xsl:value-of select="@action"/>
                                        </span>
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <a class="page-link" href="{$LANG_ABBR}{../../@template}page-{@action}?{../properties/property[@name='get_string']}">
                                            <xsl:if test="@title">
                                                <xsl:attribute name="title"><xsl:value-of select="@title"/></xsl:attribute>
                                            </xsl:if>
                                            <xsl:value-of select="@action"/>
                                        </a>
                                    </xsl:otherwise>
                                </xsl:choose>
                            </li>
                        </xsl:when>
                        <xsl:otherwise>
                            <li class="page-item disabled">
                                <span class="page-link">...</span>
                            </li>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:for-each>
            </ul>
        </nav>
    </xsl:template>

    <xsl:template match="component[@name='childDivisions']">
        <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
            <xsl:apply-templates select="recordset/record" mode="child-card" />
        </div>
    </xsl:template>

    <xsl:template match="component[@name='childDivisions']/recordset/record" mode="child-card">
        <xsl:variable name="SEGMENT" select="normalize-space(field[@name='Segment'])"/>
        <xsl:variable name="NAME" select="normalize-space(field[@name='Name'])"/>
        <div class="col">
            <div class="card h-100 shadow-sm">
                <div class="card-body">
                    <h3 class="h5 mb-2">
                        <xsl:choose>
                            <xsl:when test="string-length($SEGMENT) &gt; 0">
                                <a class="stretched-link text-decoration-none" href="{$LANG_ABBR}{$SEGMENT}">
                                    <xsl:value-of select="$NAME"/>
                                </a>
                            </xsl:when>
                            <xsl:otherwise>
                                <span><xsl:value-of select="$NAME"/></span>
                            </xsl:otherwise>
                        </xsl:choose>
                    </h3>
                    <div class="text-muted">
                        <xsl:value-of select="field[@name='DescriptionRtf']" disable-output-escaping="yes"/>
                    </div>
                </div>
            </div>
        </div>
    </xsl:template>

</xsl:stylesheet>
