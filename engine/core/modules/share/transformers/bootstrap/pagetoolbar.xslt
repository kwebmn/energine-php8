<?xml version='1.0' encoding="UTF-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:variable name="PT_DOC_PROPS" select="/document/properties/property"/>
    <xsl:variable name="PT_TRANSLATIONS" select="/document/translations/translation"/>

    <xsl:template match="component[@componentAction='showPageToolbar']">
        <xsl:variable name="TOOLBAR" select="toolbar"/>
        <xsl:variable name="TOOLBAR_NAME">
            <xsl:choose>
                <xsl:when test="$TOOLBAR/@name">
                    <xsl:value-of select="$TOOLBAR/@name"/>
                </xsl:when>
                <xsl:otherwise>main_toolbar</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="BASE" select="$PT_DOC_PROPS[@name='base']"/>
        <xsl:variable name="BASE_VALUE" select="string($BASE)"/>
        <xsl:variable name="BASE_NORMALIZED">
            <xsl:choose>
                <xsl:when test="string-length($BASE_VALUE) = 0">/</xsl:when>
                <xsl:when test="substring($BASE_VALUE, string-length($BASE_VALUE)) = '/'">
                    <xsl:value-of select="$BASE_VALUE"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="concat($BASE_VALUE, '/')"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="STATIC" select="$BASE/@static"/>
        <xsl:variable name="LANG_ABBR" select="$PT_DOC_PROPS[@name='lang']/@abbr"/>
        <xsl:variable name="LANG_SEGMENT">
            <xsl:choose>
                <xsl:when test="string-length($LANG_ABBR) = 0"/>
                <xsl:when test="substring($LANG_ABBR, string-length($LANG_ABBR)) = '/'">
                    <xsl:value-of select="$LANG_ABBR"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="concat($LANG_ABBR, '/')"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="DOCUMENT_ID" select="$PT_DOC_PROPS[@name='ID']"/>
        <xsl:variable name="COMPONENT_PATH" select="concat($BASE_NORMALIZED, $LANG_SEGMENT, @single_template)"/>
        <xsl:variable name="SIDEBAR_ID" select="concat($TOOLBAR_NAME, '-sidebar')"/>
        <xsl:variable name="SIDEBAR_URL" select="concat($COMPONENT_PATH, 'show/')"/>
        <xsl:variable name="SIDEBAR_LABEL">
            <xsl:choose>
                <xsl:when test="string-length(normalize-space($PT_TRANSLATIONS[@name='TXT_SIDEBAR_TOGGLE'])) &gt; 0">
                    <xsl:value-of select="$PT_TRANSLATIONS[@name='TXT_SIDEBAR_TOGGLE']"/>
                </xsl:when>
                <xsl:when test="string-length(normalize-space($PT_TRANSLATIONS[@name='TXT_SIDEBAR'])) &gt; 0">
                    <xsl:value-of select="$PT_TRANSLATIONS[@name='TXT_SIDEBAR']"/>
                </xsl:when>
                <xsl:when test="string-length(normalize-space($PT_TRANSLATIONS[@name='TXT_SETTINGS'])) &gt; 0">
                    <xsl:value-of select="$PT_TRANSLATIONS[@name='TXT_SETTINGS']"/>
                </xsl:when>
                <xsl:otherwise>Toggle sidebar</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="CLOSE_LABEL">
            <xsl:choose>
                <xsl:when test="string-length(normalize-space($PT_TRANSLATIONS[@name='TXT_CLOSE'])) &gt; 0">
                    <xsl:value-of select="$PT_TRANSLATIONS[@name='TXT_CLOSE']"/>
                </xsl:when>
                <xsl:when test="string-length(normalize-space($PT_TRANSLATIONS[@name='BTN_CLOSE'])) &gt; 0">
                    <xsl:value-of select="$PT_TRANSLATIONS[@name='BTN_CLOSE']"/>
                </xsl:when>
                <xsl:when test="string-length(normalize-space($PT_TRANSLATIONS[@name='TXT_CANCEL'])) &gt; 0">
                    <xsl:value-of select="$PT_TRANSLATIONS[@name='TXT_CANCEL']"/>
                </xsl:when>
                <xsl:when test="string-length(normalize-space($PT_TRANSLATIONS[@name='BTN_CANCEL'])) &gt; 0">
                    <xsl:value-of select="$PT_TRANSLATIONS[@name='BTN_CANCEL']"/>
                </xsl:when>
                <xsl:otherwise>Close</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="DOCK_POSITION" select="javascript/param[@name='dock']"/>

        <section class="e-page-toolbar sticky-top position-sticky top-0 start-0 end-0" data-role="page-toolbar-root">
            <xsl:attribute name="data-e-js">PageToolbar</xsl:attribute>
            <xsl:attribute name="data-e-toolbar-scope">page</xsl:attribute>
            <xsl:attribute name="data-e-page-toolbar"><xsl:value-of select="$TOOLBAR_NAME"/></xsl:attribute>
            <xsl:attribute name="data-e-toolbar-name"><xsl:value-of select="$TOOLBAR_NAME"/></xsl:attribute>
            <xsl:attribute name="data-e-component-path"><xsl:value-of select="$COMPONENT_PATH"/></xsl:attribute>
            <xsl:attribute name="data-e-document-id"><xsl:value-of select="$DOCUMENT_ID"/></xsl:attribute>
            <xsl:attribute name="data-e-sidebar-id"><xsl:value-of select="$SIDEBAR_ID"/></xsl:attribute>
            <xsl:attribute name="data-e-offcanvas-id"><xsl:value-of select="$SIDEBAR_ID"/></xsl:attribute>
            <xsl:attribute name="data-e-sidebar-url"><xsl:value-of select="$SIDEBAR_URL"/></xsl:attribute>
            <xsl:attribute name="data-e-offcanvas-target">#<xsl:value-of select="$SIDEBAR_ID"/></xsl:attribute>
            <xsl:attribute name="data-e-sidebar-expanded">0</xsl:attribute>
            <xsl:attribute name="data-e-sidebar-state">closed</xsl:attribute>
            <xsl:attribute name="data-e-toolbar-dock">
                <xsl:choose>
                    <xsl:when test="string-length(normalize-space($DOCK_POSITION)) &gt; 0">
                        <xsl:value-of select="$DOCK_POSITION"/>
                    </xsl:when>
                    <xsl:otherwise>sticky</xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>

            <nav class="e-topframe py-1 px-0 bg-body-tertiary border-bottom" data-role="page-toolbar-topframe">
                <div class="container-fluid d-flex align-items-start justify-content-start gap-3 flex-wrap py-0">
                    <div class="d-flex align-items-center flex-shrink-0" data-role="toolbar-brand">
                        <button type="button" class="btn py-2 btn-sm btn-light d-inline-flex align-items-center gap-2 rounded-1 px-3 flex-shrink-0" data-role="sidebar-toggle" data-bs-toggle="offcanvas" data-mdb-toggle="sidenav" data-mdb-ripple-init="">
                            <xsl:attribute name="data-bs-target">#<xsl:value-of select="$SIDEBAR_ID"/></xsl:attribute>
                            <xsl:attribute name="data-mdb-target">#<xsl:value-of select="$SIDEBAR_ID"/></xsl:attribute>
                            <xsl:attribute name="aria-controls"><xsl:value-of select="$SIDEBAR_ID"/></xsl:attribute>
                            <xsl:if test="string-length(normalize-space($SIDEBAR_LABEL)) &gt; 0">
                                <xsl:attribute name="aria-label"><xsl:value-of select="$SIDEBAR_LABEL"/></xsl:attribute>
                                <xsl:attribute name="data-mdb-sidenav-label"><xsl:value-of select="$SIDEBAR_LABEL"/></xsl:attribute>
                            </xsl:if>
                            <span class="toolbar-icon d-inline-flex align-items-center justify-content-center" aria-hidden="true">
                                <i class="fa fa-bars" aria-hidden="true"></i>
                            </span>
                        </button>
                    </div>
                    <div class="d-flex flex-column gap-2 flex-grow-1 min-w-0" data-role="toolbar-actions">
                        <div class="d-flex align-items-center gap-2 flex-wrap justify-content-start w-100 min-w-0 py-2 py-lg-0" data-role="toolbar-primary">
                            <xsl:apply-templates select="toolbar"/>
                        </div>
                    </div>
                </div>
            </nav>

            <div class="offcanvas offcanvas-start shadow border-0 bg-light e-sideframe sidenav sidenav-light" data-role="page-toolbar-sidebar" data-mdb-sidenav-init="" data-mdb-hidden="true">
                <xsl:attribute name="id"><xsl:value-of select="$SIDEBAR_ID"/></xsl:attribute>
                <xsl:attribute name="tabindex">-1</xsl:attribute>
                <xsl:attribute name="data-mdb-target">#<xsl:value-of select="$SIDEBAR_ID"/></xsl:attribute>
                <xsl:if test="string-length(normalize-space($SIDEBAR_LABEL)) &gt; 0">
                    <xsl:attribute name="aria-label"><xsl:value-of select="$SIDEBAR_LABEL"/></xsl:attribute>
                    <xsl:attribute name="data-mdb-sidenav-label"><xsl:value-of select="$SIDEBAR_LABEL"/></xsl:attribute>
                </xsl:if>
                <div class="offcanvas-body d-flex flex-column gap-3 p-0 bg-body-tertiary e-sideframe-content" data-role="sidebar-content">
                    <header class="d-flex align-items-center justify-content-end gap-2 px-3 py-2 border-bottom bg-white" data-role="sidebar-header">
                        <div class="d-flex align-items-center gap-2" data-role="sidebar-actions">
                            <button type="button" class="btn btn-sm btn-light d-inline-flex align-items-center justify-content-center" data-role="sidebar-close" data-bs-dismiss="offcanvas" data-mdb-dismiss="sidenav" data-mdb-ripple-init="">
                                <xsl:if test="string-length(normalize-space($CLOSE_LABEL)) &gt; 0">
                                    <xsl:attribute name="aria-label"><xsl:value-of select="$CLOSE_LABEL"/></xsl:attribute>
                                </xsl:if>
                                <span class="toolbar-icon d-inline-flex align-items-center justify-content-center" aria-hidden="true">
                                    <i class="fa fa-chevron-left" aria-hidden="true"></i>
                                </span>
                            </button>
                        </div>
                    </header>
                    <div class="d-flex flex-column gap-3 flex-grow-1 e-sideframe-body" data-role="sidebar-body">
                        <div class="d-flex flex-column flex-grow-1 rounded-3 border bg-white shadow-sm overflow-hidden" data-role="sidebar-frame-wrapper">
                            <iframe class="flex-grow-1 w-100 border-0" frameborder="0" data-role="sidebar-frame">
                                <xsl:attribute name="src"><xsl:value-of select="$SIDEBAR_URL"/></xsl:attribute>
                            </iframe>
                        </div>
                    </div>
                </div>
                <div class="d-none d-lg-block border-start e-sideframe-border" aria-hidden="true"></div>
            </div>
        </section>
    </xsl:template>

</xsl:stylesheet>
