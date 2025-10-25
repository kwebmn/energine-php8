<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet 
    version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
    >

    <!-- Компонент TextBlock -->
    <xsl:template match="component[@sample='TextBlock']">
        <xsl:if test="@editable or recordset/record/field != ''">
            <div class="textblock">
                <xsl:apply-templates/>
            </div>
        </xsl:if>
    </xsl:template>

    <!-- Набор данных компонента -->
    <xsl:template match="component[@sample='TextBlock']/recordset">
	    <xsl:apply-templates/>
    </xsl:template>

    <xsl:template match="component[@sample='TextBlock']/recordset/record">
        <xsl:value-of select="." disable-output-escaping="yes"/>
    </xsl:template>

    <xsl:template match="component[@sample='TextBlock' and @editable]/recordset/record">
        <xsl:variable name="COMPONENT_UID" select="generate-id(.)"/>
        <div class="nrgnEditor">
            <xsl:attribute name="data-e-id"><xsl:value-of select="$COMPONENT_UID"/></xsl:attribute>
            <xsl:if test="../../javascript/behavior/@name">
                <xsl:attribute name="data-e-js"><xsl:value-of select="../../javascript/behavior/@name"/></xsl:attribute>
            </xsl:if>
            <xsl:attribute name="data-e-single-template">
                <xsl:value-of select="concat($BASE, $LANG_ABBR, ../../@single_template)"/>
            </xsl:attribute>
            <xsl:attribute name="data-e-num"><xsl:value-of select="../../@num"/></xsl:attribute>
            <xsl:if test="not(../../@global)">
                <xsl:attribute name="data-e-eid"><xsl:value-of select="$ID"/></xsl:attribute>
            </xsl:if>
            <xsl:if test=". = ''">
                <p>--<xsl:text disable-output-escaping="yes">&amp;nbsp;</xsl:text></p>
            </xsl:if>
            <xsl:value-of select="." disable-output-escaping="yes"/>
        </div>
    </xsl:template>
    
</xsl:stylesheet>