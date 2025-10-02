<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
        version="1.0">

    <xsl:output method="html" doctype-system="about:legacy-compat" indent="yes" />

    <xsl:param name="refactor-enabled" select="'0'"/>

    <xsl:include href="../../../../core/modules/share/transformers/legacy/include.xslt"/>
    <xsl:include href="../../../../core/modules/user/transformers/include.xslt"/>
    <xsl:include href="../../../../core/modules/apps/transformers/include.xslt"/>
    <xsl:include href="../../../../core/modules/auto/transformers/include.xslt"/>

    <xsl:include href="legacy/include.xslt"/>

</xsl:stylesheet>
