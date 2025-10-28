<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <xsl:template match="field[not(@mode='1') and not(@mode=0)][ancestor::component[@type='form']]" priority="-1">
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
        <xsl:variable name="outline-type-set">|string|text|email|phone|integer|float|password|textbox|url|date|datetime|time|textarea|code|rich|color|htmlblock|</xsl:variable>
        <xsl:variable name="needs-outline" select="contains($outline-type-set, concat('|', $type, '|'))"/>
        <xsl:variable name="is-required" select="@nullable!='1'"/>

        <div data-role="form-field">
            <xsl:attribute name="class">
                <xsl:choose>
                    <xsl:when test="$needs-outline">
                        <xsl:text>mb-4</xsl:text>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>mb-3</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
            <xsl:attribute name="id">control_{@language}_{@name}</xsl:attribute>
            <xsl:attribute name="data-type">
                <xsl:choose>
                    <xsl:when test="@type"><xsl:value-of select="@type"/></xsl:when>
                    <xsl:otherwise>string</xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
            <xsl:attribute name="data-required"><xsl:value-of select="$is-required"/></xsl:attribute>
            <xsl:apply-templates select="." mode="field_content"/>
        </div>
    </xsl:template>

</xsl:stylesheet>
