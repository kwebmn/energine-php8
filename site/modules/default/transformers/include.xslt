<?xml version="1.0" encoding="utf-8" ?>
<xsl:stylesheet
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    omit-xml-declaration="yes"
    indent="yes"
    version="1.0">

    <xsl:output method="html"
                version="1.0"
                encoding="utf-8"
                omit-xml-declaration="yes"                
                indent="yes"/>

    <xsl:include href="bootstrap/header.xslt"/>
    <xsl:include href="bootstrap/footer.xslt"/>
    <xsl:include href="bootstrap/login.xslt"/>
    <xsl:include href="bootstrap/content.xslt"/>
    <xsl:include href="bootstrap/account.xslt"/>

    <xsl:include href="energine.xslt"/>

</xsl:stylesheet>
