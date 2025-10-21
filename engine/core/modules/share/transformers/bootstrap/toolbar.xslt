<?xml version='1.0' encoding="UTF-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
>
    <xsl:output method="xml" omit-xml-declaration="yes"/>

    <xsl:variable name="DOC_PROPS" select="/document/properties/property"/>
    <xsl:variable name="BASE" select="$DOC_PROPS[@name='base']"/>
    <xsl:variable name="LANG_ABBR" select="$DOC_PROPS[@name='lang']/@abbr"/>
    <xsl:variable name="UPPER" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"/>
    <xsl:variable name="LOWER" select="'abcdefghijklmnopqrstuvwxyz'"/>

    <xsl:template name="toolbar-attribute-name">
        <xsl:param name="name"/>
        <xsl:value-of select="concat('data-prop-', translate($name, $UPPER, $LOWER))"/>
    </xsl:template>

    <xsl:template match="toolbar">
        <div class="btn-toolbar flex-wrap gap-2 align-items-center" data-controller="toolbar" data-module="scripts/Toolbar.js">
            <xsl:if test="@name">
                <xsl:attribute name="data-toolbar"><xsl:value-of select="@name"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="@componentAction">
                <xsl:attribute name="data-toolbar-action"><xsl:value-of select="@componentAction"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="parent::component/@name">
                <xsl:attribute name="data-component"><xsl:value-of select="parent::component/@name"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="parent::component/@sample">
                <xsl:attribute name="data-component-sample"><xsl:value-of select="parent::component/@sample"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="parent::component/@type">
                <xsl:attribute name="data-component-type"><xsl:value-of select="parent::component/@type"/></xsl:attribute>
            </xsl:if>
            <xsl:for-each select="properties/property">
                <xsl:variable name="ATTR_NAME">
                    <xsl:call-template name="toolbar-attribute-name">
                        <xsl:with-param name="name" select="@name"/>
                    </xsl:call-template>
                </xsl:variable>
                <xsl:attribute name="{$ATTR_NAME}"><xsl:value-of select="."/></xsl:attribute>
            </xsl:for-each>
            <div class="btn-group flex-wrap gap-2" role="group">
                <xsl:apply-templates select="control"/>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="toolbar/control[@type='separator']">
        <div class="vr" role="separator" aria-hidden="true"/>
    </xsl:template>

    <xsl:template match="toolbar/control[@disabled]"/>

    <xsl:template match="toolbar/control[@type='link']">
        <xsl:variable name="ICON_RAW" select="@icon"/>
        <xsl:variable name="ICON_NORMALIZED" select="normalize-space($ICON_RAW)"/>
        <xsl:variable name="TITLE" select="normalize-space(@title)"/>
        <xsl:variable name="TOOLTIP" select="normalize-space(@tooltip)"/>
        <xsl:variable name="HAS_ICON" select="string-length($ICON_NORMALIZED) &gt; 0"/>
        <xsl:variable name="HAS_TITLE" select="string-length($TITLE) &gt; 0"/>
        <xsl:variable name="ICON_ONLY_FLAG" select="translate(normalize-space(@icon-only), $UPPER, $LOWER)"/>
        <xsl:variable name="ICON_ONLY" select="$HAS_ICON and (($ICON_ONLY_FLAG='true') or ($ICON_ONLY_FLAG='1') or ($ICON_ONLY_FLAG='yes') or ($ICON_ONLY_FLAG='on') or not($HAS_TITLE))"/>
        <xsl:variable name="ICON_IS_CLASS" select="$HAS_ICON and string-length(translate($ICON_NORMALIZED, concat($LOWER,$UPPER,'0123456789_- '), '')) = 0"/>
        <xsl:variable name="ARIA_LABEL">
            <xsl:choose>
                <xsl:when test="$HAS_TITLE"><xsl:value-of select="$TITLE"/></xsl:when>
                <xsl:when test="string-length($TOOLTIP) &gt; 0"><xsl:value-of select="$TOOLTIP"/></xsl:when>
                <xsl:otherwise/>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="LINK_KEY" select="translate(concat(@id, '|', @title), $UPPER, $LOWER)"/>
        <xsl:variable name="LINK_VARIANT">
            <xsl:choose>
                <xsl:when test="contains($LINK_KEY, 'save') or contains($LINK_KEY, 'submit') or contains($LINK_KEY, 'apply') or contains($LINK_KEY, 'update') or contains($LINK_KEY, 'add') or contains($LINK_KEY, 'create') or contains($LINK_KEY, 'change') or contains($LINK_KEY, 'select') or contains($LINK_KEY, 'activate') or contains($LINK_KEY, 'confirm') or contains($LINK_KEY, 'ok') or contains($LINK_KEY, 'upload') or contains($LINK_KEY, 'send') or contains($LINK_KEY, 'build')">btn-primary</xsl:when>
                <xsl:when test="contains($LINK_KEY, 'delete') or contains($LINK_KEY, 'remove') or contains($LINK_KEY, 'cancel') or contains($LINK_KEY, 'close') or contains($LINK_KEY, 'list') or contains($LINK_KEY, 'back') or contains($LINK_KEY, 'move') or contains($LINK_KEY, 'down') or contains($LINK_KEY, 'up') or contains($LINK_KEY, 'exit')">btn-outline-secondary</xsl:when>
                <xsl:otherwise>btn-secondary</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <a>
            <xsl:attribute name="class">
                <xsl:text>btn btn-sm </xsl:text>
                <xsl:if test="$HAS_ICON">
                    <xsl:text>d-inline-flex align-items-center </xsl:text>
                    <xsl:choose>
                        <xsl:when test="$ICON_ONLY">
                            <xsl:text>justify-content-center px-2 </xsl:text>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:text>gap-2 </xsl:text>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:if>
                <xsl:value-of select="$LINK_VARIANT"/>
            </xsl:attribute>
            <xsl:attribute name="href"><xsl:value-of select="concat($BASE, $LANG_ABBR, @click)"/></xsl:attribute>
            <xsl:attribute name="data-command"><xsl:value-of select="@id"/></xsl:attribute>
            <xsl:if test="@tooltip != ''">
                <xsl:attribute name="title"><xsl:value-of select="@tooltip"/></xsl:attribute>
                <xsl:attribute name="data-bs-toggle">tooltip</xsl:attribute>
            </xsl:if>
            <xsl:if test="$ICON_ONLY and string-length(normalize-space($ARIA_LABEL)) &gt; 0">
                <xsl:attribute name="aria-label"><xsl:value-of select="normalize-space($ARIA_LABEL)"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="$HAS_ICON">
                <span class="toolbar-icon d-inline-flex align-items-center justify-content-center" aria-hidden="true">
                    <xsl:choose>
                        <xsl:when test="$ICON_IS_CLASS">
                            <i class="{$ICON_NORMALIZED}" aria-hidden="true"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="$ICON_NORMALIZED"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </span>
            </xsl:if>
            <xsl:if test="not($ICON_ONLY)">
                <span class="toolbar-control-label"><xsl:value-of select="@title"/></span>
            </xsl:if>
        </a>
    </xsl:template>

    <xsl:template match="toolbar/control">
        <xsl:variable name="ICON_RAW" select="@icon"/>
        <xsl:variable name="ICON_NORMALIZED" select="normalize-space($ICON_RAW)"/>
        <xsl:variable name="TITLE" select="normalize-space(@title)"/>
        <xsl:variable name="TOOLTIP" select="normalize-space(@tooltip)"/>
        <xsl:variable name="HAS_ICON" select="string-length($ICON_NORMALIZED) &gt; 0"/>
        <xsl:variable name="HAS_TITLE" select="string-length($TITLE) &gt; 0"/>
        <xsl:variable name="ICON_ONLY_FLAG" select="translate(normalize-space(@icon-only), $UPPER, $LOWER)"/>
        <xsl:variable name="ICON_ONLY" select="$HAS_ICON and (($ICON_ONLY_FLAG='true') or ($ICON_ONLY_FLAG='1') or ($ICON_ONLY_FLAG='yes') or ($ICON_ONLY_FLAG='on') or not($HAS_TITLE))"/>
        <xsl:variable name="ICON_IS_CLASS" select="$HAS_ICON and string-length(translate($ICON_NORMALIZED, concat($LOWER,$UPPER,'0123456789_- '), '')) = 0"/>
        <xsl:variable name="ARIA_LABEL">
            <xsl:choose>
                <xsl:when test="$HAS_TITLE"><xsl:value-of select="$TITLE"/></xsl:when>
                <xsl:when test="string-length($TOOLTIP) &gt; 0"><xsl:value-of select="$TOOLTIP"/></xsl:when>
                <xsl:otherwise/>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="CONTROL_KEY" select="translate(concat(@id, '|', @title), $UPPER, $LOWER)"/>
        <xsl:variable name="BUTTON_VARIANT">
            <xsl:choose>
                <xsl:when test="contains($CONTROL_KEY, 'save') or contains($CONTROL_KEY, 'submit') or contains($CONTROL_KEY, 'apply') or contains($CONTROL_KEY, 'update') or contains($CONTROL_KEY, 'add') or contains($CONTROL_KEY, 'create') or contains($CONTROL_KEY, 'change') or contains($CONTROL_KEY, 'select') or contains($CONTROL_KEY, 'activate') or contains($CONTROL_KEY, 'confirm') or contains($CONTROL_KEY, 'ok') or contains($CONTROL_KEY, 'upload') or contains($CONTROL_KEY, 'send') or contains($CONTROL_KEY, 'build')">btn-primary</xsl:when>
                <xsl:when test="contains($CONTROL_KEY, 'delete') or contains($CONTROL_KEY, 'remove') or contains($CONTROL_KEY, 'cancel') or contains($CONTROL_KEY, 'close') or contains($CONTROL_KEY, 'list') or contains($CONTROL_KEY, 'back') or contains($CONTROL_KEY, 'move') or contains($CONTROL_KEY, 'down') or contains($CONTROL_KEY, 'up') or contains($CONTROL_KEY, 'exit')">btn-outline-secondary</xsl:when>
                <xsl:otherwise>btn-secondary</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <button type="button">
            <xsl:attribute name="class">
                <xsl:text>btn btn-sm </xsl:text>
                <xsl:if test="$HAS_ICON">
                    <xsl:text>d-inline-flex align-items-center </xsl:text>
                    <xsl:choose>
                        <xsl:when test="$ICON_ONLY">
                            <xsl:text>justify-content-center px-2 </xsl:text>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:text>gap-2 </xsl:text>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:if>
                <xsl:value-of select="$BUTTON_VARIANT"/>
            </xsl:attribute>
            <xsl:attribute name="name"><xsl:value-of select="@id"/></xsl:attribute>
            <xsl:attribute name="data-command"><xsl:value-of select="@id"/></xsl:attribute>
            <xsl:if test="@click!=''">
                <xsl:attribute name="data-handler"><xsl:value-of select="@click"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="@tooltip != ''">
                <xsl:attribute name="title"><xsl:value-of select="@tooltip"/></xsl:attribute>
                <xsl:attribute name="data-bs-toggle">tooltip</xsl:attribute>
            </xsl:if>
            <xsl:if test="@mode=1">
                <xsl:attribute name="disabled">disabled</xsl:attribute>
            </xsl:if>
            <xsl:if test="$ICON_ONLY and string-length(normalize-space($ARIA_LABEL)) &gt; 0">
                <xsl:attribute name="aria-label"><xsl:value-of select="normalize-space($ARIA_LABEL)"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="$HAS_ICON">
                <span class="toolbar-icon d-inline-flex align-items-center justify-content-center" aria-hidden="true">
                    <xsl:choose>
                        <xsl:when test="$ICON_IS_CLASS">
                            <i class="{$ICON_NORMALIZED}" aria-hidden="true"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="$ICON_NORMALIZED"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </span>
            </xsl:if>
            <xsl:if test="not($ICON_ONLY)">
                <span class="toolbar-control-label"><xsl:value-of select="@title"/></span>
            </xsl:if>
        </button>
    </xsl:template>
</xsl:stylesheet>
