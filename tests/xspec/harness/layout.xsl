<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:import href="../../../engine/core/modules/share/transformers/include.xslt"/>

    <xsl:template name="render-node">
        <xsl:param name="node"/>
        <xsl:apply-templates select="$node"/>
    </xsl:template>

    <xsl:template name="render-node-mode-head">
        <xsl:param name="node"/>
        <xsl:apply-templates select="$node" mode="head"/>
    </xsl:template>

</xsl:stylesheet>
