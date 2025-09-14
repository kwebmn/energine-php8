<?xml version="1.0" encoding="utf-8" ?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

    <xsl:template name="HEADER">

        <nav class="navbar navbar-expand-lg navbar-light bg-body-tertiary">
            <!-- Container wrapper -->
            <div class="container">
                <!-- Navbar brand -->
<!--                <a class="navbar-brand me-2" href="{$BASE}">-->
<!--                    <img-->
<!--                            src="{$BASE}images/default/logo.png"-->
<!--                            height="20"-->
<!--                            alt="Logo"-->
<!--                            loading="lazy"-->
<!--                            style="margin-top: -1px;"-->
<!--                    />-->
<!--                </a>-->

                <!-- Toggle button -->
                <button
                        data-mdb-collapse-init="1"
                        class="navbar-toggler"
                        type="button"
                        data-mdb-target="#navbarButtonsExample"
                        aria-controls="navbarSupportedContent"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                >
                    <i class="fas fa-bars"></i>
                </button>

                <!-- Collapsible wrapper -->
                <div class="collapse navbar-collapse" id="navbarButtonsExample">
                    <!-- Left links -->
                    <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                        <li class="nav-item">
                            <a class="nav-link" href="{$BASE}{$LANG_ABBR}">
                                <xsl:if test="//property[@name='default'] = 1">
                                    <xsl:attribute name="class">nav-link active</xsl:attribute>
                                </xsl:if>
                                <xsl:value-of select="//translation[@const='TXT_HOME']" />
                            </a>
                        </li>
                        <xsl:for-each select="//component[@name = 'mainMenu']/recordset/record">
                            <li class="nav-item">
                                <a class="nav-link" href="{field[@name = 'Segment']}">
                                    <xsl:if test=".//field[@name='Id'] = $ID">
                                        <xsl:attribute name="class">nav-link active</xsl:attribute>
                                    </xsl:if>
                                    <xsl:value-of select="field[@name = 'Name']" />
                                </a>
                            </li>
                        </xsl:for-each>
                    </ul>
                    <!-- Left links -->

                    <div class="d-flex align-items-center">
                        <xsl:choose>
                            <xsl:when test="//property[@name='is_user'] > 0">
                                <a data-mdb-ripple-init="1"  class="btn btn-link  px-3 me-2" href="{$BASE}{$LANG_ABBR}my">
                                    <i class="fas fa-user-large"></i>
                                </a>
                            </xsl:when>

                            <xsl:otherwise>
                                <a data-mdb-ripple-init="1"  class="btn btn-link  px-3 me-2" href="{$BASE}{$LANG_ABBR}login">
                                    <i class="fas fa-user-large"></i>
                                </a>
                            </xsl:otherwise>
                        </xsl:choose>


                        <xsl:apply-templates select="$COMPONENTS[@name='langSwitcher']" />


                    </div>
                </div>
                <!-- Collapsible wrapper -->
            </div>
            <!-- Container wrapper -->
        </nav>
        <!-- Navbar -->

    </xsl:template>


    <xsl:template match="component[@name='langSwitcher']">
        <xsl:variable name="LANG_ID" select="//property[@name='lang']" />

        <ul class="navbar-nav">
            <!-- Icon dropdown -->
            <li class="nav-item dropdown">
                <a
                        data-mdb-dropdown-init="1"
                        class="nav-link dropdown-toggle btn btn-link btn-sm text-capitalize"
                        href="#"
                        id="navbarDropdown"
                        role="button"
                        aria-expanded="false"
                >
                    <xsl:value-of select="//field[@name='lang_id' and text() = $LANG_ID]/../field[@name='lang_name']" />
                </a>
                <ul class="dropdown-menu" aria-labelledby="navbarDropdown">
                    <li>
                        <a class="dropdown-item" href="#">
                            <xsl:value-of select="//field[@name='lang_id' and text() = $LANG_ID]/../field[@name='lang_name']" />
                            <i class="fa fa-check text-success ms-2"></i>
                        </a>
                    </li>
                    <li><hr class="dropdown-divider" /></li>

                    <xsl:for-each select="recordset/record">
                        <xsl:if test="not(field[@name='lang_id'] = $LANG_ID)">
                            <li>
                                <a class="dropdown-item" href="{field[@name='lang_url']}"><xsl:value-of select="field[@name='lang_name']" /></a>
                            </li>
                        </xsl:if>
                    </xsl:for-each>


                </ul>
            </li>
        </ul>
    </xsl:template>



</xsl:stylesheet>
