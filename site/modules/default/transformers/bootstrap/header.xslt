<?xml version="1.0" encoding="utf-8" ?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

    <xsl:template name="HEADER">
        <xsl:variable name="NAVBAR_ID" select="concat('mainNavbar-', generate-id(/*))"/>
        <xsl:variable name="SITE_NAME" select="normalize-space(//property[@name='site_name'])"/>
        <xsl:variable name="LOGO_SRC" select="string((//property[@name='site_logo'] | //property[@name='logo'])[1])"/>
        <xsl:variable name="IS_USER" select="//property[@name='is_user'] &gt; 0"/>

        <nav class="navbar navbar-expand-lg navbar-light bg-body-tertiary border-bottom shadow-sm">
            <div class="container">
                <a class="navbar-brand d-flex align-items-center gap-2" href="{$BASE}{$LANG_ABBR}">
                    <xsl:if test="string-length($LOGO_SRC) &gt; 0">
                        <img alt="">
                            <xsl:choose>
                                <xsl:when test="starts-with($LOGO_SRC, 'http://') or starts-with($LOGO_SRC, 'https://') or starts-with($LOGO_SRC, '/')">
                                    <xsl:attribute name="src"><xsl:value-of select="$LOGO_SRC"/></xsl:attribute>
                                </xsl:when>
                                <xsl:otherwise>
                                    <xsl:attribute name="src"><xsl:value-of select="concat($BASE, $LOGO_SRC)"/></xsl:attribute>
                                </xsl:otherwise>
                            </xsl:choose>
                            <xsl:attribute name="alt">
                                <xsl:choose>
                                    <xsl:when test="string-length($SITE_NAME) &gt; 0">
                                        <xsl:value-of select="$SITE_NAME"/>
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <xsl:value-of select="//translation[@const='TXT_HOME']"/>
                                    </xsl:otherwise>
                                </xsl:choose>
                            </xsl:attribute>
                            <xsl:attribute name="height">32</xsl:attribute>
                            <xsl:attribute name="loading">lazy</xsl:attribute>
                        </img>
                    </xsl:if>
                    <span class="fw-semibold text-uppercase">
                        <xsl:choose>
                            <xsl:when test="string-length($SITE_NAME) &gt; 0">
                                <xsl:value-of select="$SITE_NAME"/>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:value-of select="//translation[@const='TXT_HOME']"/>
                            </xsl:otherwise>
                        </xsl:choose>
                    </span>
                </a>

                <button
                        class="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse">
                    <xsl:attribute name="data-bs-target">#<xsl:value-of select="$NAVBAR_ID"/></xsl:attribute>
                    <xsl:attribute name="aria-controls"><xsl:value-of select="$NAVBAR_ID"/></xsl:attribute>
                    <xsl:attribute name="aria-expanded">false</xsl:attribute>
                    <xsl:attribute name="aria-label">Menu</xsl:attribute>
                    <span class="navbar-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse" id="{$NAVBAR_ID}">
                    <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                        <li class="nav-item">
                            <a class="nav-link" href="{$BASE}{$LANG_ABBR}">
                                <xsl:if test="//property[@name='default'] = 1">
                                    <xsl:attribute name="class">nav-link active</xsl:attribute>
                                    <xsl:attribute name="aria-current">page</xsl:attribute>
                                </xsl:if>
                                <xsl:value-of select="//translation[@const='TXT_HOME']" />
                            </a>
                        </li>
                        <xsl:apply-templates select="$COMPONENTS[@name='mainMenu']/recordset/record" mode="main-nav" />
                    </ul>

                    <div class="d-flex align-items-center gap-3">
                        <xsl:choose>
                            <xsl:when test="$IS_USER">
                                <a class="btn btn-outline-primary" href="{$BASE}{$LANG_ABBR}my">
                                    <i class="fas fa-user-large me-2" aria-hidden="true"></i>
                                    <span class="fw-semibold text-uppercase small"><xsl:value-of select="//translation[@const='TXT_PROFILE']"/></span>
                                </a>
                            </xsl:when>
                            <xsl:otherwise>
                                <a class="btn btn-primary" href="{$BASE}{$LANG_ABBR}login">
                                    <i class="fas fa-user-large me-2" aria-hidden="true"></i>
                                    <span class="fw-semibold text-uppercase small"><xsl:value-of select="//translation[@const='TXT_SIGN_IN_ONLY']"/></span>
                                </a>
                            </xsl:otherwise>
                        </xsl:choose>

                        <xsl:apply-templates select="$COMPONENTS[@name='langSwitcher']" />
                    </div>
                </div>
            </div>
        </nav>
    </xsl:template>

    <xsl:template match="component[@name='mainMenu']/recordset/record" mode="main-nav">
        <xsl:variable name="HAS_CHILDREN" select="count(recordset/record) &gt; 0"/>
        <xsl:variable name="IS_ACTIVE" select="field[@name='Id'] = $ID or recordset/record[field[@name='Id'] = $ID]"/>
        <xsl:variable name="DROPDOWN_ID" select="concat('mainNavDropdown-', generate-id(.))"/>

        <li>
            <xsl:attribute name="class">
                <xsl:text>nav-item</xsl:text>
                <xsl:if test="$HAS_CHILDREN">
                    <xsl:text> dropdown</xsl:text>
                </xsl:if>
            </xsl:attribute>
            <xsl:choose>
                <xsl:when test="$HAS_CHILDREN">
                    <a class="nav-link dropdown-toggle" id="{$DROPDOWN_ID}" role="button" data-bs-toggle="dropdown">
                        <xsl:attribute name="href">
                            <xsl:choose>
                                <xsl:when test="string-length(normalize-space(field[@name='Segment'])) &gt; 0">
                                    <xsl:value-of select="field[@name='Segment']"/>
                                </xsl:when>
                                <xsl:otherwise>#</xsl:otherwise>
                            </xsl:choose>
                        </xsl:attribute>
                        <xsl:attribute name="aria-expanded">
                            <xsl:choose>
                                <xsl:when test="$IS_ACTIVE">true</xsl:when>
                                <xsl:otherwise>false</xsl:otherwise>
                            </xsl:choose>
                        </xsl:attribute>
                        <xsl:if test="$IS_ACTIVE">
                            <xsl:attribute name="class">nav-link dropdown-toggle active</xsl:attribute>
                            <xsl:attribute name="aria-current">page</xsl:attribute>
                        </xsl:if>
                        <xsl:value-of select="field[@name='Name']" />
                    </a>
                    <ul class="dropdown-menu" aria-labelledby="{$DROPDOWN_ID}">
                        <xsl:apply-templates select="recordset/record" mode="main-nav-child" />
                    </ul>
                </xsl:when>
                <xsl:otherwise>
                    <a class="nav-link">
                        <xsl:attribute name="href">
                            <xsl:choose>
                                <xsl:when test="string-length(normalize-space(field[@name='Segment'])) &gt; 0">
                                    <xsl:value-of select="field[@name='Segment']"/>
                                </xsl:when>
                                <xsl:otherwise>#</xsl:otherwise>
                            </xsl:choose>
                        </xsl:attribute>
                        <xsl:if test="$IS_ACTIVE">
                            <xsl:attribute name="class">nav-link active</xsl:attribute>
                            <xsl:attribute name="aria-current">page</xsl:attribute>
                        </xsl:if>
                        <xsl:value-of select="field[@name='Name']" />
                    </a>
                </xsl:otherwise>
            </xsl:choose>
        </li>
    </xsl:template>

    <xsl:template match="component[@name='mainMenu']/recordset/record/recordset/record" mode="main-nav-child">
        <xsl:variable name="IS_ACTIVE" select="field[@name='Id'] = $ID"/>
        <li>
            <a class="dropdown-item">
                <xsl:attribute name="href">
                    <xsl:choose>
                        <xsl:when test="string-length(normalize-space(field[@name='Segment'])) &gt; 0">
                            <xsl:value-of select="field[@name='Segment']"/>
                        </xsl:when>
                        <xsl:otherwise>#</xsl:otherwise>
                    </xsl:choose>
                </xsl:attribute>
                <xsl:if test="$IS_ACTIVE">
                    <xsl:attribute name="class">dropdown-item active</xsl:attribute>
                    <xsl:attribute name="aria-current">page</xsl:attribute>
                </xsl:if>
                <xsl:value-of select="field[@name='Name']" />
            </a>
        </li>
    </xsl:template>

    <xsl:template match="component[@name='langSwitcher']">
        <xsl:variable name="LANG_ID" select="//property[@name='lang']" />
        <xsl:variable name="DROPDOWN_ID" select="concat('languageDropdown-', generate-id(.))" />

        <ul class="navbar-nav">
            <li class="nav-item dropdown">
                <a
                        class="nav-link dropdown-toggle text-capitalize"
                        href="#"
                        id="{$DROPDOWN_ID}"
                        role="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        aria-haspopup="true"
                >
                    <xsl:value-of select="//field[@name='lang_id' and text() = $LANG_ID]/../field[@name='lang_name']" />
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="{$DROPDOWN_ID}">
                    <xsl:for-each select="recordset/record">
                        <xsl:variable name="IS_CURRENT" select="field[@name='lang_id'] = $LANG_ID" />
                        <li>
                            <a href="{field[@name='lang_url']}">
                                <xsl:attribute name="class">
                                    <xsl:text>dropdown-item</xsl:text>
                                    <xsl:if test="$IS_CURRENT">
                                        <xsl:text> active</xsl:text>
                                    </xsl:if>
                                </xsl:attribute>
                                <xsl:if test="$IS_CURRENT">
                                    <xsl:attribute name="aria-current">true</xsl:attribute>
                                </xsl:if>
                                <xsl:value-of select="field[@name='lang_name']" />
                                <xsl:if test="$IS_CURRENT">
                                    <i class="fa fa-check text-success ms-2" aria-hidden="true"></i>
                                </xsl:if>
                            </a>
                        </li>
                    </xsl:for-each>
                </ul>
            </li>
        </ul>
    </xsl:template>

</xsl:stylesheet>
