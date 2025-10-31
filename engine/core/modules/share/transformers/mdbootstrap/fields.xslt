<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <xsl:variable name="outline-type-set">|string|text|email|phone|integer|float|password|textbox|url|date|datetime|time|textarea|code|rich|color|htmlblock|</xsl:variable>

    <xsl:template match="field[ancestor::component[@type='form']]" mode="field_content">
        <xsl:variable name="type-raw" select="normalize-space(@type)"/>
        <xsl:variable name="type-lower">
            <xsl:value-of select="translate($type-raw, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
        </xsl:variable>
        <xsl:variable name="type">
            <xsl:choose>
                <xsl:when test="string-length($type-lower) &gt; 0">
                    <xsl:value-of select="$type-lower"/>
                </xsl:when>
                <xsl:otherwise>string</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="needs-outline" select="contains($outline-type-set, concat('|', $type, '|'))"/>

        <xsl:choose>
            <xsl:when test="$needs-outline">
                <div class="form-outline">
                    <xsl:apply-templates select="." mode="field_input"/>
                    <xsl:apply-templates select="." mode="field_name"/>
                </div>
                <xsl:call-template name="render-field-messages"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:apply-imports/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="field[ancestor::component[@type='form']]" mode="field_name">
        <xsl:variable name="type-raw" select="normalize-space(@type)"/>
        <xsl:variable name="type-lower">
            <xsl:value-of select="translate($type-raw, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
        </xsl:variable>
        <xsl:variable name="type">
            <xsl:choose>
                <xsl:when test="string-length($type-lower) &gt; 0">
                    <xsl:value-of select="$type-lower"/>
                </xsl:when>
                <xsl:otherwise>string</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="needs-outline" select="contains($outline-type-set, concat('|', $type, '|'))"/>

        <xsl:choose>
            <xsl:when test="not($needs-outline)">
                <xsl:apply-imports/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:if test="@title">
                    <xsl:variable name="has-direct-value" select="string-length(normalize-space(.)) &gt; 0"/>
                    <xsl:variable name="has-attr-value" select="string-length(normalize-space(@value)) &gt; 0"/>
                    <xsl:variable name="has-items" select="count(items/item[normalize-space(.)!='']) &gt; 0"/>
                    <label>
                        <xsl:attribute name="for">
                            <xsl:value-of select="@name"/>
                            <xsl:if test="@language">_<xsl:value-of select="@language"/></xsl:if>
                        </xsl:attribute>
                        <xsl:attribute name="class">
                            <xsl:text>form-label</xsl:text>
                            <xsl:if test="$has-direct-value or $has-attr-value or $has-items">
                                <xsl:text> active</xsl:text>
                            </xsl:if>
                        </xsl:attribute>
                        <xsl:value-of select="@title" disable-output-escaping="yes"/>
                        <xsl:if test="(@nullable!='1') and not(ancestor::component/@exttype='grid')">
                            <span class="text-danger">*</span>
                        </xsl:if>
                    </label>
                </xsl:if>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

</xsl:stylesheet>
