<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <!--
        Form class helpers.

        Summary
        -------
        * Provides named templates that emit Bootstrap-friendly class lists.
        * Keeps conditional styling consistent across field overrides.

        Usage
        -----
        * Call the relevant `class.*` helper before attribute atoms so the
          generated `class` attribute is the first on the element.
        * Pass a boolean `invalid` flag when you already know that the control
          has validation errors to append `is-invalid`.

        Rules of the road
        ------------------
        * Do not duplicate hard-coded class strings in field templates – wire
          new combinations back into this file instead.
        * Preserve the helper names when overriding: project code calls these
          templates directly.
    -->

    <xsl:template name="class.form-control">
        <xsl:param name="invalid" select="boolean(error)"/>
        <xsl:attribute name="class">
            <xsl:text>form-control</xsl:text>
            <xsl:if test="$invalid">
                <xsl:text> is-invalid</xsl:text>
            </xsl:if>
        </xsl:attribute>
    </xsl:template>

    <xsl:template name="class.form-select">
        <xsl:param name="invalid" select="boolean(error)"/>
        <xsl:attribute name="class">
            <xsl:text>form-select</xsl:text>
            <xsl:if test="$invalid">
                <xsl:text> is-invalid</xsl:text>
            </xsl:if>
        </xsl:attribute>
    </xsl:template>

    <xsl:template name="class.form-check-input">
        <xsl:param name="invalid" select="boolean(error)"/>
        <xsl:attribute name="class">
            <xsl:text>form-check-input</xsl:text>
            <xsl:if test="$invalid">
                <xsl:text> is-invalid</xsl:text>
            </xsl:if>
        </xsl:attribute>
    </xsl:template>

    <xsl:template name="class.form-check-label">
        <xsl:attribute name="class">form-check-label</xsl:attribute>
    </xsl:template>

    <xsl:template name="class.button-outline-secondary">
        <xsl:param name="disabled" select="false()"/>
        <xsl:attribute name="class">
            <xsl:text>btn btn-outline-secondary</xsl:text>
            <xsl:if test="$disabled">
                <xsl:text> disabled</xsl:text>
            </xsl:if>
        </xsl:attribute>
    </xsl:template>

    <xsl:template name="class.button-link">
        <xsl:param name="hidden" select="false()"/>
        <xsl:attribute name="class">
            <xsl:text>btn btn-link</xsl:text>
            <xsl:if test="$hidden">
                <xsl:text> d-none</xsl:text>
            </xsl:if>
        </xsl:attribute>
    </xsl:template>

</xsl:stylesheet>
