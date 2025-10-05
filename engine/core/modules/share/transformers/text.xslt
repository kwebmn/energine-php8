<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <xsl:import href="base.xslt"/>

    <!-- Компонент TextBlock -->
    <xsl:template match="component[@sample='TextBlock']">
        <xsl:if test="@editable or recordset/record/field != ''">
            <div class="textblock">
                <xsl:call-template name="energine-component-attributes"/>
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
        <xsl:variable name="RECORD_UID" select="generate-id(.)"/>
        <div class="nrgnEditor">
            <xsl:attribute name="data-energine-param-record"><xsl:value-of select="$RECORD_UID"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-single_template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../../@single_template"/></xsl:attribute>
            <xsl:attribute name="single_template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../../@single_template"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-num"><xsl:value-of select="../../@num"/></xsl:attribute>
            <xsl:attribute name="num"><xsl:value-of select="../../@num"/></xsl:attribute>
            <xsl:if test="not(../../@global)">
                <xsl:attribute name="data-energine-param-eID"><xsl:value-of select="$ID"/></xsl:attribute>
                <xsl:attribute name="eID"><xsl:value-of select="$ID"/></xsl:attribute>
            </xsl:if>
            <xsl:if test=". = ''">
                <p>--<xsl:text disable-output-escaping="yes">&amp;nbsp;</xsl:text></p>
            </xsl:if>
            <xsl:value-of select="." disable-output-escaping="yes"/>
        </div>
    </xsl:template>
    
</xsl:stylesheet>