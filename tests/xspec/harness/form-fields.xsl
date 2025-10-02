<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:import href="../../../engine/core/modules/share/transformers/include.xslt"/>

    <xsl:template name="test-form-element-attributes">
        <xsl:param name="field"/>
        <xsl:element name="input">
            <xsl:for-each select="$field">
                <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            </xsl:for-each>
        </xsl:element>
    </xsl:template>

    <xsl:template name="test-form-element-attributes-readonly">
        <xsl:param name="field"/>
        <xsl:element name="input">
            <xsl:for-each select="$field">
                <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
            </xsl:for-each>
        </xsl:element>
    </xsl:template>

    <xsl:template name="test-class-form-control">
        <xsl:param name="field"/>
        <xsl:element name="input">
            <xsl:for-each select="$field">
                <xsl:call-template name="class.form-control"/>
            </xsl:for-each>
        </xsl:element>
    </xsl:template>

    <xsl:template name="test-field-messages">
        <xsl:param name="field"/>
        <div>
            <xsl:for-each select="$field">
                <xsl:apply-templates select="." mode="field_messages"/>
            </xsl:for-each>
        </div>
    </xsl:template>

</xsl:stylesheet>
