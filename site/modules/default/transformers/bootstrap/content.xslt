<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform">


    <xsl:template match="content">

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
        <!-- Heading -->

        <div class="container">
            <div class="row">
                <div class="col-sm-12">
                    <xsl:apply-templates />
                </div>
            </div>
        </div>

    </xsl:template>

    <xsl:template match="component[@name='breadCrumbs']">
        <xsl:if test="count(recordset/record) &gt; 1">
            <xsl:apply-templates/>
        </xsl:if>
    </xsl:template>

    <xsl:template match="recordset[parent::component[@name='breadCrumbs']]">
        <h6 class="mb-0">
            <xsl:apply-templates/>
        </h6>
    </xsl:template>

    <xsl:template match="record[ancestor::component[@name='breadCrumbs']]">
        <xsl:choose>
            <xsl:when test="position() = 1">
                <a href="{$BASE}{$LANG_ABBR}" class="text-reset"><xsl:value-of select="field[@name='Name']"/></a>
                <span class="mx-1">/</span>
            </xsl:when>
            <xsl:when test="position() = last()">
                <span class="mx-1 fw-light"><xsl:value-of select="field[@name='Name']"/></span>
            </xsl:when>
            <xsl:otherwise>
                <xsl:if test="field[@name='Id'] != ''">
                    <a class="text-reset mx-1" href="{$BASE}{$LANG_ABBR}{field[@name='Segment']}"><xsl:value-of select="field[@name='Name']"/></a>
                </xsl:if>
                <span>/</span>
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
        <xsl:apply-templates />
    </xsl:template>

    <xsl:template match="component[@name='childDivisions']/recordset">
        <xsl:apply-templates />
    </xsl:template>

    <xsl:template match="component[@name='childDivisions']/recordset/record">
        <div class="madia">
            <div class="media-body">
                <h3 class="media-heading">
                    <a href="{$LANG_ABBR}{field[@name='Segment']}">
                        <xsl:value-of select="field[@name='Name']"/>
                    </a>
                </h3>
                <xsl:value-of select="field[@name='DescriptionRtf']" disable-output-escaping="yes"/>
            </div>
        </div>

    </xsl:template>


</xsl:stylesheet>
