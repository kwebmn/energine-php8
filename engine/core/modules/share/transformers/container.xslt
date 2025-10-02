<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform"

        version="1.0">
    <!--
        Container renderer.

        Summary
        -------
        * Splits container rendering into match-specific templates instead of a
          monolithic `xsl:choose`.
        * Supports admin metadata (`widget`, `column`) and public layout hooks
          (`block`, `html_class`).

        Usage
        -----
        * Container attributes:
          - `name` (required) — stable identifier used by widgets and columns.
          - `html_class` — extra CSS classes for the wrapper `<div>`.
          - `column` — marks layout columns; admin mode adds `column="..."`.
          - `widget` — indicates draggable widgets; accepts `widget` or
            `static` (non-draggable) values.
          - `block` — semantic block wrapper, accepts `alfa` or `beta`.
        * Use the `@contains` attribute to embed containers/components by name.

        Rules of the road
        ------------------
        * Keep admin-specific attributes behind `$COMPONENTS[@name='adminPanel']`
          checks to avoid leaking them publicly.
        * Do not remove `generate-id()` usage; layout scripts depend on them.
    -->

    <xsl:template match="container[@column][not(@html_class)]" priority="1">
        <xsl:choose>
            <xsl:when test="$HAS_ADMIN_PANEL">
                <div column="{@name}">
                    <xsl:apply-templates/>
                </div>
            </xsl:when>
            <xsl:otherwise>
                <xsl:apply-templates/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="container[@widget][not(@html_class)]" priority="0.75">
        <xsl:choose>
            <xsl:when test="$HAS_ADMIN_PANEL">
                <div class="e-widget" widget="{@name}">
                    <xsl:if test="@widget='static'">
                        <xsl:attribute name="static">static</xsl:attribute>
                    </xsl:if>
                    <xsl:apply-templates/>
                </div>
            </xsl:when>
            <xsl:otherwise>
                <xsl:apply-templates/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- Контейнеры с атрибутом html_class выводятся в виде div с соответствующим классом -->
    <xsl:template match="content[@html_class] | container[@html_class]">
        <div>
            <xsl:variable name="IS_ADMIN" select="$HAS_ADMIN_PANEL"/>
            <xsl:attribute name="class">
                <xsl:if test="$IS_ADMIN and @widget and not(@column)">
                    <xsl:text>e-widget </xsl:text>
                </xsl:if>
                <xsl:value-of select="@html_class"/>
            </xsl:attribute>
            <xsl:if test="$IS_ADMIN and @column">
                <xsl:attribute name="column"><xsl:value-of select="@name"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="$IS_ADMIN and not(@column) and @widget">
                <xsl:attribute name="widget"><xsl:value-of select="@name"/></xsl:attribute>
                <xsl:if test="@widget='static'">
                    <xsl:attribute name="static">static</xsl:attribute>
                </xsl:if>
            </xsl:if>
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <!-- Блок - контейнер для визуального отделения одного или группы компонентов -->
    <xsl:template match="container[@block]">
        <xsl:param name="HOLDER_NAME"/>
        <xsl:if test="($COMPONENTS[@name='adminPanel']) or (@block='alfa') or (component[not(@sample='TextBlock') and not(recordset[@empty])]) or (component[@sample='TextBlock' and (@editable or recordset/record/field != '')])">
            <div>
                <xsl:attribute name="class">block<xsl:if test="@block='alfa'"> alfa_block</xsl:if><xsl:if test="@html_class"><xsl:text> </xsl:text><xsl:value-of select="@html_class"/></xsl:if><xsl:if test="@widget and $COMPONENTS[@name='adminPanel']"> e-widget</xsl:if></xsl:attribute>
                <xsl:if test="@widget and $COMPONENTS[@name='adminPanel']">
                    <xsl:variable name="HOLDER" select="normalize-space($HOLDER_NAME)"/>
                    <xsl:attribute name="widget">
                        <xsl:value-of select="concat($HOLDER, substring(@name, 1, (1 - boolean($HOLDER)) * string-length(@name)))"/>
                    </xsl:attribute>
                    <xsl:if test="@widget='static'">
                        <xsl:attribute name="static">static</xsl:attribute>
                    </xsl:if>
                </xsl:if>
                <xsl:apply-templates select="." mode="block_header"/>
                <xsl:apply-templates select="." mode="block_content"/>
            </div>
        </xsl:if>
    </xsl:template>

    <!--
        Контейнер с атрибутом contains - это холдер, куда вставляется другой контейнер или компонент. 
        Например, можно в любое место в контентном файле вызвать нужный компонент/контейнер из лейаута.
    -->
    <xsl:template match="container[@contains]">
        <xsl:variable name="CONTAINS" select="@contains"/>
        <xsl:variable name="CONTAINERS" select="key('containers-by-name', $CONTAINS)"/>
        <xsl:variable name="COMPONENT_MATCHES" select="key('components-by-name', $CONTAINS)"/>
        <xsl:apply-templates select="$CONTAINERS | $COMPONENT_MATCHES">
            <xsl:with-param name="HOLDER_NAME"><xsl:if test="@widget='widget'"><xsl:value-of select="@name"/></xsl:if></xsl:with-param>
        </xsl:apply-templates>
    </xsl:template>

    <!-- Заголовок блока по-умолчанию -->
    <xsl:template match="container[@block]" mode="block_header">
        <xsl:variable name="MAIN_COMPONENT" select="component[1]"/>
        <xsl:if test="$MAIN_COMPONENT/@title">
            <div class="block_header clearfix">
                <h2 class="block_title"><xsl:value-of select="$MAIN_COMPONENT/@title"/></h2>
            </div>
        </xsl:if>
    </xsl:template>

    <!-- Контент блока по-умолчанию -->
    <xsl:template match="container[@block]" mode="block_content">
        <div class="block_content clearfix">
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <!-- Заголовок alfa-блока -->
    <xsl:template match="container[@block='alfa']" mode="block_header">
        <xsl:if test="$DOC_PROPS[@name='default'] != 1">
            <div class="block_header clearfix">
                <h1 class="block_title"><xsl:value-of select="$DOC_PROPS[@name='title']"/></h1>
            </div>
        </xsl:if>
    </xsl:template>
</xsl:stylesheet>
