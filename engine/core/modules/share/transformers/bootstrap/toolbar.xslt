<?xml version='1.0' encoding="UTF-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <!-- Шаблоны панели управления -->
    
    <!-- Собственно панель управления -->
    <xsl:template match="toolbar">
        <xsl:variable name="IS_PAGE_TOOLBAR" select="boolean(ancestor::component[@componentAction='showPageToolbar'])"/>
        <div role="toolbar">
            <xsl:attribute name="class">
                <xsl:text>btn-toolbar flex-wrap align-items-center</xsl:text>
                <xsl:choose>
                    <xsl:when test="$IS_PAGE_TOOLBAR">
                        <xsl:text> d-flex gap-2</xsl:text>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text> gap-2</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
            <xsl:if test="@name">
                <xsl:attribute name="data-toolbar"><xsl:value-of select="@name"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="ancestor::component[1]/recordset">
                <xsl:attribute name="data-toolbar-component"><xsl:value-of select="generate-id(ancestor::component[1]/recordset)"/></xsl:attribute>
            </xsl:if>
            <xsl:for-each select="properties/property">
                <xsl:attribute name="data-prop-{translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')}"><xsl:value-of select="."/></xsl:attribute>
            </xsl:for-each>
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <xsl:template match="toolbar/control[@type='switcher']">
        <xsl:variable name="IS_PAGE_TOOLBAR" select="boolean(ancestor::component[@componentAction='showPageToolbar'])"/>
        <xsl:variable name="ICON_RAW" select="@icon"/>
        <xsl:variable name="ICON_NORMALIZED" select="normalize-space($ICON_RAW)"/>
        <xsl:variable name="ALT_ICON" select="normalize-space(@aicon)"/>
        <xsl:variable name="TITLE" select="normalize-space(@title)"/>
        <xsl:variable name="TOOLTIP" select="normalize-space(@tooltip)"/>
        <xsl:variable name="HAS_ICON" select="string-length($ICON_NORMALIZED) &gt; 0"/>
        <xsl:variable name="HAS_TITLE" select="string-length($TITLE) &gt; 0"/>
        <xsl:variable name="ICON_ONLY_FLAG" select="translate(normalize-space(@icon-only), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
        <xsl:variable name="ICON_ONLY" select="$HAS_ICON and (($ICON_ONLY_FLAG='true') or ($ICON_ONLY_FLAG='1') or ($ICON_ONLY_FLAG='yes') or ($ICON_ONLY_FLAG='on') or not($HAS_TITLE))"/>
        <xsl:variable name="ICON_IS_CLASS" select="$HAS_ICON and string-length(translate($ICON_NORMALIZED, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_- ', '')) = 0"/>
        <xsl:variable name="ARIA_LABEL">
            <xsl:choose>
                <xsl:when test="$HAS_TITLE"><xsl:value-of select="$TITLE"/></xsl:when>
                <xsl:when test="string-length($TOOLTIP) &gt; 0"><xsl:value-of select="$TOOLTIP"/></xsl:when>
                <xsl:otherwise/>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="STATE" select="normalize-space(@state)"/>
        <button type="button" data-type="switcher">
            <xsl:attribute name="name"><xsl:value-of select="@id"/></xsl:attribute>
            <xsl:if test="ancestor::toolbar[1]/@name and @id">
                <xsl:attribute name="id"><xsl:value-of select="concat(ancestor::toolbar[1]/@name, @id)"/></xsl:attribute>
            </xsl:if>
            <xsl:attribute name="data-control-id"><xsl:value-of select="@id"/></xsl:attribute>
            <xsl:attribute name="data-title"><xsl:value-of select="@title"/></xsl:attribute>
            <xsl:if test="string-length(normalize-space(@onclick)) &gt; 0">
                <xsl:attribute name="data-action"><xsl:value-of select="@onclick"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="$HAS_ICON">
                <xsl:attribute name="data-icon"><xsl:value-of select="$ICON_NORMALIZED"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="string-length($ALT_ICON) &gt; 0">
                <xsl:attribute name="data-alt-icon"><xsl:value-of select="$ALT_ICON"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="string-length($STATE) &gt; 0">
                <xsl:attribute name="data-state"><xsl:value-of select="$STATE"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="@mode=1">
                <xsl:attribute name="disabled">disabled</xsl:attribute>
            </xsl:if>
            <xsl:if test="@tooltip != ''">
                <xsl:attribute name="title"><xsl:value-of select="@tooltip"/></xsl:attribute>
                <xsl:attribute name="data-bs-toggle">tooltip</xsl:attribute>
            </xsl:if>
            <xsl:if test="string-length(normalize-space(@icon-only)) &gt; 0">
                <xsl:attribute name="data-icon-only"><xsl:value-of select="@icon-only"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="$ICON_ONLY and string-length(normalize-space($ARIA_LABEL)) &gt; 0">
                <xsl:attribute name="aria-label"><xsl:value-of select="normalize-space($ARIA_LABEL)"/></xsl:attribute>
            </xsl:if>
            <xsl:attribute name="class">
                <xsl:text>btn btn-sm </xsl:text>
                <xsl:choose>
                    <xsl:when test="$IS_PAGE_TOOLBAR">
                        <xsl:text>btn-light d-flex align-items-center </xsl:text>
                        <xsl:choose>
                            <xsl:when test="$ICON_ONLY">
                                <xsl:text>justify-content-center px-2 </xsl:text>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:text>gap-2 justify-content-start text-start </xsl:text>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:when>
                    <xsl:otherwise>
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
                        <xsl:text>btn-outline-secondary</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
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
    
    <!-- Элемент панели управления -->
    <xsl:template match="toolbar/control" mode="button-control">
        <xsl:param name="control-type" select="'button'"/>
        <xsl:variable name="ICON_RAW" select="@icon"/>
        <xsl:variable name="ICON_NORMALIZED" select="normalize-space($ICON_RAW)"/>
        <xsl:variable name="TITLE" select="normalize-space(@title)"/>
        <xsl:variable name="TOOLTIP" select="normalize-space(@tooltip)"/>
        <xsl:variable name="HAS_ICON" select="string-length($ICON_NORMALIZED) &gt; 0"/>
        <xsl:variable name="HAS_TITLE" select="string-length($TITLE) &gt; 0"/>
        <xsl:variable name="ICON_ONLY_FLAG" select="translate(normalize-space(@icon-only), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
        <xsl:variable name="ICON_ONLY" select="$HAS_ICON and (($ICON_ONLY_FLAG='true') or ($ICON_ONLY_FLAG='1') or ($ICON_ONLY_FLAG='yes') or ($ICON_ONLY_FLAG='on') or not($HAS_TITLE))"/>
        <xsl:variable name="ICON_IS_CLASS" select="$HAS_ICON and string-length(translate($ICON_NORMALIZED, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_- ', '')) = 0"/>
        <xsl:variable name="ARIA_LABEL">
            <xsl:choose>
                <xsl:when test="$HAS_TITLE"><xsl:value-of select="$TITLE"/></xsl:when>
                <xsl:when test="string-length($TOOLTIP) &gt; 0"><xsl:value-of select="$TOOLTIP"/></xsl:when>
                <xsl:otherwise/>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="IS_PAGE_TOOLBAR" select="boolean(ancestor::component[@componentAction='showPageToolbar'])"/>
        <xsl:variable name="CONTROL">
                <xsl:choose>
                        <xsl:when test="@type = 'button'">button</xsl:when>
                        <xsl:when test="@type = 'submit'">button</xsl:when>
                        <xsl:otherwise>button</xsl:otherwise>
                </xsl:choose>
        </xsl:variable>
        <xsl:variable name="CONTROL_TYPE">
                <xsl:choose>
                        <xsl:when test="@type = 'button'">button</xsl:when>
                        <xsl:when test="@type = 'submit'">submit</xsl:when>
                        <xsl:otherwise>button</xsl:otherwise>
                </xsl:choose>
        </xsl:variable>
        <xsl:variable name="ACTION_ATTR">
            <xsl:choose>
                <xsl:when test="@onclick"><xsl:value-of select="@onclick"/></xsl:when>
                <xsl:otherwise><xsl:value-of select="@click"/></xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="CONTROL_KEY" select="translate(concat(@id, '|', $ACTION_ATTR, '|', @title), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
        <xsl:variable name="BUTTON_VARIANT">
            <xsl:choose>
                <xsl:when test="contains($CONTROL_KEY, 'save') or contains($CONTROL_KEY, 'submit') or contains($CONTROL_KEY, 'apply') or contains($CONTROL_KEY, 'update') or contains($CONTROL_KEY, 'add') or contains($CONTROL_KEY, 'create') or contains($CONTROL_KEY, 'change') or contains($CONTROL_KEY, 'select') or contains($CONTROL_KEY, 'activate') or contains($CONTROL_KEY, 'confirm') or contains($CONTROL_KEY, 'ok') or contains($CONTROL_KEY, 'upload') or contains($CONTROL_KEY, 'send') or contains($CONTROL_KEY, 'build')">btn-primary</xsl:when>
                <xsl:when test="contains($CONTROL_KEY, 'delete') or contains($CONTROL_KEY, 'remove') or contains($CONTROL_KEY, 'cancel') or contains($CONTROL_KEY, 'close') or contains($CONTROL_KEY, 'list') or contains($CONTROL_KEY, 'back') or contains($CONTROL_KEY, 'move') or contains($CONTROL_KEY, 'down') or contains($CONTROL_KEY, 'up') or contains($CONTROL_KEY, 'exit')">btn-outline-secondary</xsl:when>
                <xsl:otherwise>btn-light</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>

        <xsl:element name="{$CONTROL}">
            <xsl:if test="@mode=1">
                <xsl:attribute name="disabled">disabled</xsl:attribute>
            </xsl:if>
                <xsl:attribute name="name"><xsl:value-of select="@id"/></xsl:attribute>
                <xsl:if test="ancestor::toolbar[1]/@name and @id">
                    <xsl:attribute name="id"><xsl:value-of select="concat(ancestor::toolbar[1]/@name, @id)"/></xsl:attribute>
                </xsl:if>
                <xsl:attribute name="title"><xsl:value-of select="@tooltip"/></xsl:attribute>
                <xsl:if test="@tooltip != ''">
                    <xsl:attribute name="data-bs-toggle">tooltip</xsl:attribute>
                </xsl:if>
                <xsl:attribute name="type"><xsl:value-of select="$CONTROL_TYPE"/></xsl:attribute>
                <xsl:attribute name="data-control-id"><xsl:value-of select="@id"/></xsl:attribute>
                <xsl:attribute name="data-title"><xsl:value-of select="@title"/></xsl:attribute>
                <xsl:if test="string-length(normalize-space($ACTION_ATTR)) &gt; 0">
                    <xsl:attribute name="data-action"><xsl:value-of select="$ACTION_ATTR"/></xsl:attribute>
                </xsl:if>
                <xsl:if test="$HAS_ICON">
                    <xsl:attribute name="data-icon"><xsl:value-of select="$ICON_NORMALIZED"/></xsl:attribute>
                </xsl:if>
                <xsl:if test="string-length(normalize-space(@icon-only)) &gt; 0">
                    <xsl:attribute name="data-icon-only"><xsl:value-of select="@icon-only"/></xsl:attribute>
                </xsl:if>
                <xsl:attribute name="data-type"><xsl:value-of select="$control-type"/></xsl:attribute>
            <xsl:attribute name="class">
                <xsl:text>btn btn-sm </xsl:text>
                <xsl:choose>
                    <xsl:when test="$IS_PAGE_TOOLBAR">
                        <xsl:text>btn-light d-flex align-items-center </xsl:text>
                        <xsl:choose>
                            <xsl:when test="$ICON_ONLY">
                                <xsl:text>justify-content-center px-2 </xsl:text>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:text>gap-2 justify-content-start text-start </xsl:text>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:when>
                    <xsl:otherwise>
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
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
            <xsl:if test="string-length(normalize-space(@icon-only)) &gt; 0">
                <xsl:attribute name="data-icon-only"><xsl:value-of select="@icon-only"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="$ICON_ONLY and string-length(normalize-space($ARIA_LABEL)) &gt; 0">
                <xsl:attribute name="aria-label"><xsl:value-of select="normalize-space($ARIA_LABEL)"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="$HAS_ICON">
                <xsl:attribute name="data-icon"><xsl:value-of select="$ICON_NORMALIZED"/></xsl:attribute>
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
            <xsl:if test="$control-type = 'file'">
                <input type="file" class="d-none" data-role="toolbar-file-input"/>
            </xsl:if>
        </xsl:element>
    </xsl:template>
    <xsl:template match="toolbar/control[not(@type) or @type='button' or @type='submit']">
        <xsl:apply-templates select="." mode="button-control"/>
    </xsl:template>
    <xsl:template match="toolbar/control[(@type='link') and (@mode != 0) and not(@disabled)]">
        <xsl:variable name="ICON_RAW" select="@icon"/>
        <xsl:variable name="ICON_NORMALIZED" select="normalize-space($ICON_RAW)"/>
        <xsl:variable name="TITLE" select="normalize-space(@title)"/>
        <xsl:variable name="TOOLTIP" select="normalize-space(@tooltip)"/>
        <xsl:variable name="HAS_ICON" select="string-length($ICON_NORMALIZED) &gt; 0"/>
        <xsl:variable name="HAS_TITLE" select="string-length($TITLE) &gt; 0"/>
        <xsl:variable name="ICON_ONLY_FLAG" select="translate(normalize-space(@icon-only), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
        <xsl:variable name="ICON_ONLY" select="$HAS_ICON and (($ICON_ONLY_FLAG='true') or ($ICON_ONLY_FLAG='1') or ($ICON_ONLY_FLAG='yes') or ($ICON_ONLY_FLAG='on') or not($HAS_TITLE))"/>
        <xsl:variable name="ICON_IS_CLASS" select="$HAS_ICON and string-length(translate($ICON_NORMALIZED, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_- ', '')) = 0"/>
        <xsl:variable name="ARIA_LABEL">
            <xsl:choose>
                <xsl:when test="$HAS_TITLE"><xsl:value-of select="$TITLE"/></xsl:when>
                <xsl:when test="string-length($TOOLTIP) &gt; 0"><xsl:value-of select="$TOOLTIP"/></xsl:when>
                <xsl:otherwise/>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="IS_PAGE_TOOLBAR" select="boolean(ancestor::component[@componentAction='showPageToolbar'])"/>
        <xsl:variable name="LINK_KEY" select="translate(concat(@id, '|', @click, '|', @title), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
        <xsl:variable name="LINK_VARIANT">
            <xsl:choose>
                <xsl:when test="contains($LINK_KEY, 'save') or contains($LINK_KEY, 'submit') or contains($LINK_KEY, 'apply') or contains($LINK_KEY, 'update') or contains($LINK_KEY, 'add') or contains($LINK_KEY, 'create') or contains($LINK_KEY, 'change') or contains($LINK_KEY, 'select') or contains($LINK_KEY, 'activate') or contains($LINK_KEY, 'confirm') or contains($LINK_KEY, 'ok') or contains($LINK_KEY, 'upload') or contains($LINK_KEY, 'send') or contains($LINK_KEY, 'build')">btn-primary</xsl:when>
                <xsl:when test="contains($LINK_KEY, 'delete') or contains($LINK_KEY, 'remove') or contains($LINK_KEY, 'cancel') or contains($LINK_KEY, 'close') or contains($LINK_KEY, 'list') or contains($LINK_KEY, 'back') or contains($LINK_KEY, 'move') or contains($LINK_KEY, 'down') or contains($LINK_KEY, 'up') or contains($LINK_KEY, 'exit')">btn-outline-secondary</xsl:when>
                <xsl:otherwise>btn-light</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <a href="{$BASE}{$LANG_ABBR}{@click}">
            <xsl:if test="ancestor::toolbar[1]/@name and @id">
                <xsl:attribute name="id"><xsl:value-of select="concat(ancestor::toolbar[1]/@name, @id)"/></xsl:attribute>
            </xsl:if>
            <xsl:attribute name="data-control-id"><xsl:value-of select="@id"/></xsl:attribute>
            <xsl:attribute name="data-type">link</xsl:attribute>
            <xsl:attribute name="data-title"><xsl:value-of select="@title"/></xsl:attribute>
            <xsl:if test="string-length(normalize-space(@click)) &gt; 0">
                <xsl:attribute name="data-action"><xsl:value-of select="@click"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="@tooltip != ''">
                <xsl:attribute name="title"><xsl:value-of select="@tooltip"/></xsl:attribute>
                <xsl:attribute name="data-bs-toggle">tooltip</xsl:attribute>
            </xsl:if>
            <xsl:attribute name="class">
                <xsl:text>btn btn-sm </xsl:text>
                <xsl:choose>
                    <xsl:when test="$IS_PAGE_TOOLBAR">
                        <xsl:text>btn-light d-flex align-items-center </xsl:text>
                        <xsl:choose>
                            <xsl:when test="$ICON_ONLY">
                                <xsl:text>justify-content-center px-2 </xsl:text>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:text>gap-2 justify-content-start text-start </xsl:text>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:when>
                    <xsl:otherwise>
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
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
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

    <!--Равно как и те действия права на которые есть, но по каким то причинам их делать нельзя-->
    <xsl:template match="toolbar/control[@disabled]"></xsl:template>

    <xsl:template match="toolbar/control[@type='separator']">
        <span class="vr mx-2 opacity-25" role="separator" aria-hidden="true">
            <xsl:attribute name="data-type">separator</xsl:attribute>
            <xsl:if test="@id">
                <xsl:attribute name="data-control-id"><xsl:value-of select="@id"/></xsl:attribute>
            </xsl:if>
        </span>
    </xsl:template>

    <xsl:template match="toolbar/control[@type='file']">
        <xsl:apply-templates select="." mode="button-control">
            <xsl:with-param name="control-type" select="'file'"/>
        </xsl:apply-templates>
    </xsl:template>

    <xsl:template match="toolbar/control[@type='select']">
        <div class="toolbar-select d-flex align-items-center gap-2">
            <xsl:attribute name="data-type">select</xsl:attribute>
            <xsl:attribute name="data-control-id"><xsl:value-of select="@id"/></xsl:attribute>
            <xsl:attribute name="data-title"><xsl:value-of select="@title"/></xsl:attribute>
            <xsl:if test="string-length(normalize-space(@action)) &gt; 0">
                <xsl:attribute name="data-action"><xsl:value-of select="@action"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="ancestor::toolbar[1]/@name and @id">
                <xsl:attribute name="id"><xsl:value-of select="concat(ancestor::toolbar[1]/@name, @id)"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="@mode=1">
                <xsl:attribute name="data-disabled">true</xsl:attribute>
            </xsl:if>
            <xsl:if test="string-length(normalize-space(@title)) &gt; 0">
                <span class="fw-semibold text-body-secondary"><xsl:value-of select="@title"/></span>
            </xsl:if>
            <select class="form-select form-select-sm">
                <xsl:attribute name="name"><xsl:value-of select="@id"/></xsl:attribute>
                <xsl:if test="@mode=1">
                    <xsl:attribute name="disabled">disabled</xsl:attribute>
                </xsl:if>
                <xsl:for-each select="options/option">
                    <option>
                        <xsl:attribute name="value"><xsl:value-of select="@id"/></xsl:attribute>
                        <xsl:value-of select="."/>
                    </option>
                </xsl:for-each>
            </select>
        </div>
    </xsl:template>
    <!-- Панель управления для формы -->
    <xsl:template match="toolbar[parent::component[@exttype='grid']]">
        <div class="btn-toolbar flex-wrap gap-2 align-items-center" role="toolbar">
            <xsl:if test="@name">
                <xsl:attribute name="data-toolbar"><xsl:value-of select="@name"/></xsl:attribute>
            </xsl:if>
            <xsl:attribute name="data-toolbar-scope">grid</xsl:attribute>
            <xsl:attribute name="data-toolbar-component"><xsl:value-of select="generate-id(../recordset)"/></xsl:attribute>
            <xsl:for-each select="properties/property">
                <xsl:attribute name="data-prop-{translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')}"><xsl:value-of select="."/></xsl:attribute>
            </xsl:for-each>
            <xsl:apply-templates/>
        </div>
    </xsl:template>
    
    <!-- листалка по страницам -->
    <xsl:template match="toolbar[@name='pager']">
        <xsl:if test="count(control) &gt; 1">
            <xsl:variable name="PAGER_TITLE" select="properties/property[@name='title']"/>
            <nav class="grid-pager-nav w-100 mt-2 mb-0" aria-label="Pagination">
                <div class="d-flex flex-wrap align-items-center gap-2">
                    <xsl:if test="$PAGER_TITLE">
                        <span class="text-muted small fw-semibold">
                            <xsl:value-of select="$PAGER_TITLE"/>
                        </span>
                    </xsl:if>
                    <ul class="pagination pagination-sm mb-0" data-role="page-list">
                        <xsl:apply-templates select="control"/>
                    </ul>
                </div>
            </nav>
        </xsl:if>
    </xsl:template>

    <xsl:template match="control[@disabled][parent::toolbar[@name='pager']]">
        <xsl:if test="preceding-sibling::control">
            <li class="page-item">
                <a class="page-link" aria-label="Previous" rel="prev">
                    <xsl:attribute name="href"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../../@template"/><xsl:value-of select="../properties/property[@name='additional_url']"/>page-<xsl:value-of select="@action - 1"/>/<xsl:if test="../properties/property[@name='get_string']!=''">?<xsl:value-of select="../properties/property[@name='get_string']"/></xsl:if></xsl:attribute>
                    <span aria-hidden="true">&#8249;</span>
                    <span class="visually-hidden">Previous</span>
                </a>
            </li>
        </xsl:if>
        <li class="page-item active" aria-current="page">
            <span class="page-link"><xsl:value-of select="@title"/></span>
        </li>
        <xsl:if test="following-sibling::control">
            <li class="page-item">
                <a class="page-link" aria-label="Next" rel="next">
                    <xsl:attribute name="href"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../../@template"/><xsl:value-of select="../properties/property[@name='additional_url']"/>page-<xsl:value-of select="@action + 1"/>/<xsl:if test="../properties/property[@name='get_string']!=''">?<xsl:value-of select="../properties/property[@name='get_string']"/></xsl:if></xsl:attribute>
                    <span aria-hidden="true">&#8250;</span>
                    <span class="visually-hidden">Next</span>
                </a>
            </li>
        </xsl:if>
    </xsl:template>

    <xsl:template match="control[parent::toolbar[@name='pager']][not(@disabled)][not(@type='separator')]"><!-- другие страницы -->
        <li class="page-item">
            <a class="page-link">
                <xsl:attribute name="href"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../../@template"/><xsl:value-of select="../properties/property[@name='additional_url']"/>page-<xsl:value-of select="@action"/>/<xsl:if test="../properties/property[@name='get_string']!=''">?<xsl:value-of select="../properties/property[@name='get_string']"/></xsl:if></xsl:attribute>
                <xsl:value-of select="@title"/>
            </a>
        </li>
    </xsl:template>

    <!-- разделитель между группами цифр -->
    <xsl:template match="control[@type='separator'][parent::toolbar[@name='pager']]">
        <li class="page-item disabled" aria-hidden="true">
            <span class="page-link">…</span>
        </li>
    </xsl:template>

    <xsl:template match="properties[parent::toolbar[@name='pager']]"/>

    <xsl:template match="property[@name='title'][ancestor::toolbar[@name='pager']]"/>
    <!-- /листалка по страницам -->
    
    <!-- Панель управления страницей обрабатывается в document.xslt  -->
    <xsl:template match="toolbar[parent::component[@class='PageToolBar']]"/>
    <!-- Те действия на которые нет прав  - прячем -->
    <xsl:template match="toolbar/control[@mode=0]"></xsl:template>


</xsl:stylesheet>
