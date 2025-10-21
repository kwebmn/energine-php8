<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
        xmlns:og="http://ogp.me/ns#"
        xmlns:video="http://ogp.me/ns/video#">

    <xsl:import href="base.xslt"/>

    <xsl:output method="xml"
                version="1.0"
                encoding="utf-8"
                omit-xml-declaration="yes"
//                doctype-public="-//W3C//DTD XHTML 1.0 Strict//EN"
//                doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"
                indent="no"/>

    <xsl:variable name="ROUTER_URL"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/>programs/p/</xsl:variable>
    <xsl:variable name="MAIN_SITE" select="$DOC_PROPS[@name='base']/@default"/>

    <xsl:template match="/">
        <xsl:apply-templates select="document/container"/>
        <xsl:apply-templates select="document/component"/>
    </xsl:template>

</xsl:stylesheet>
