<?xml version="1.0" encoding="utf-8" ?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

    <xsl:template match="content[//layout[@file='account.layout.xml']]">
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
                    <div class="col-sm-4 col-xl-3 col-xxl-2">
                        <div class="card h-100 shadow-sm">
                            <div class="card-header bg-white border-0">
                                <span class="fw-semibold small">
                                    <xsl:value-of select="//translation[@const='TXT_PROFILE']"/>
                                </span>
                            </div>
                            <div class="card-body p-0">
                                <xsl:apply-templates select="$COMPONENTS[@name='userMenu']"/>
                            </div>
                        </div>
                    </div>

                    <div class="col-sm-8 col-xl-9 col-xxl-10">
                        <div class="card shadow-sm">
                            <div class="card-body p-4">
                                <xsl:apply-templates />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='userMenu']">
        <xsl:if test="not(recordset/@empty)">
            <ul class="list-group list-group-flush">
                <xsl:apply-templates select="recordset/record" />
            </ul>
        </xsl:if>
    </xsl:template>

    <xsl:template match="component[@name='userMenu']/recordset/record">
        <xsl:variable name="IS_ACTIVE" select="field[@name='Id' and text() = $ID]"/>
        <xsl:variable name="ICON_CLASS" select="normalize-space(field[@name='Icon'])"/>
        <li>
            <xsl:attribute name="class">
                <xsl:text>list-group-item list-group-item-action px-3 py-3</xsl:text>
                <xsl:if test="$IS_ACTIVE">
                    <xsl:text> active</xsl:text>
                </xsl:if>
            </xsl:attribute>
            <xsl:if test="$IS_ACTIVE">
                <xsl:attribute name="aria-current">page</xsl:attribute>
            </xsl:if>
            <a class="d-flex align-items-center gap-2 text-decoration-none text-reset" href="{$LANG_ABBR}{field[@name='Segment']}">
                <span class="flex-shrink-0 text-muted">
                    <xsl:choose>
                        <xsl:when test="string-length($ICON_CLASS) &gt; 0">
                            <i aria-hidden="true">
                                <xsl:attribute name="class"><xsl:value-of select="$ICON_CLASS"/></xsl:attribute>
                            </i>
                        </xsl:when>
                        <xsl:otherwise>
                            <i class="fa fa-user-circle" aria-hidden="true"></i>
                        </xsl:otherwise>
                    </xsl:choose>
                </span>
                <span class="flex-grow-1">
                    <xsl:value-of select="field[@name='Name']"/>
                </span>
            </a>
        </li>
        <xsl:if test="recordset">
            <xsl:apply-templates select="recordset" />
        </xsl:if>
    </xsl:template>

    <xsl:template match="component[@name='userMenu']/recordset">
        <xsl:apply-templates select="record" />
    </xsl:template>

    <xsl:template match="component[@name='userMenu']/recordset/record//recordset/record">
        <xsl:variable name="IS_ACTIVE" select="field[@name='Id' and text() = $ID]"/>
        <li>
            <xsl:attribute name="class">
                <xsl:text>list-group-item list-group-item-action ps-4 py-3</xsl:text>
                <xsl:if test="$IS_ACTIVE">
                    <xsl:text> active</xsl:text>
                </xsl:if>
            </xsl:attribute>
            <xsl:if test="$IS_ACTIVE">
                <xsl:attribute name="aria-current">page</xsl:attribute>
            </xsl:if>
            <a class="d-flex align-items-center gap-2 text-decoration-none text-reset" href="{$LANG_ABBR}{field[@name='Segment']}">
                <span class="flex-grow-1">
                    <xsl:value-of select="field[@name='Name']"/>
                </span>
            </a>
        </li>
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

        <xsl:choose>
            <xsl:when test="position() = 1">
                <li class="breadcrumb-item">
                    <a class="link-dark text-decoration-none" href="{$BASE}{$LANG_ABBR}">
                        <xsl:value-of select="field[@name='Name']"/>
                    </a>
                </li>
            </xsl:when>
            <xsl:when test="$IS_LAST">
                <li class="breadcrumb-item active" aria-current="page">
                    <xsl:value-of select="field[@name='Name']"/>
                </li>
            </xsl:when>
            <xsl:otherwise>
                <li class="breadcrumb-item">
                    <xsl:choose>
                        <xsl:when test="string-length($SEGMENT) &gt; 0">
                            <a class="link-dark text-decoration-none" href="{$BASE}{$LANG_ABBR}{$SEGMENT}">
                                <xsl:value-of select="field[@name='Name']"/>
                            </a>
                        </xsl:when>
                        <xsl:otherwise>
                            <span><xsl:value-of select="field[@name='Name']"/></span>
                        </xsl:otherwise>
                    </xsl:choose>
                </li>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

</xsl:stylesheet>
