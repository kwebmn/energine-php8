<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <!--
        Field subset: date and time controls.

        Summary
        -------
        * Provides shared template `render-date-input` used by all date/time
          flavours and wires Bootstrap classes automatically.
        * Adds optional `data-role` hooks for legacy calendars.

        Usage
        -----
        * Call `render-date-input` for new temporal widgets to retain the
          consistent attribute order and styling.
        * Pass an explicit role when JavaScript expects a hook.

        Rules of the road
        ------------------
        * Keep input types delegated to `FORM_ELEMENT_ATTRIBUTES` so overrides
          in base.xslt continue to work.
        * Avoid adding inline scripts – expose data attributes only.
    -->

    <xsl:template name="render-date-input">
        <xsl:param name="role" select="''"/>
        <input>
            <xsl:if test="string($role)">
                <xsl:attribute name="data-role"><xsl:value-of select="$role"/></xsl:attribute>
            </xsl:if>
            <xsl:call-template name="class.form-control"/>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
        </input>
    </xsl:template>

    <xsl:template match="field[@type='datetime'][ancestor::component[@type='form']]" mode="field_input">
        <xsl:call-template name="render-date-input">
            <xsl:with-param name="role" select="'datetime'"/>
        </xsl:call-template>
    </xsl:template>

    <xsl:template match="field[@type='date'][ancestor::component[@type='form']]" mode="field_input">
        <xsl:call-template name="render-date-input">
            <xsl:with-param name="role" select="'date'"/>
        </xsl:call-template>
    </xsl:template>

    <xsl:template match="field[@type='datetime'][ancestor::component[@type='form' and @exttype='grid']]" mode="field_input">
        <xsl:call-template name="render-date-input">
            <xsl:with-param name="role" select="'datetime'"/>
        </xsl:call-template>
    </xsl:template>

    <xsl:template match="field[@type='date'][ancestor::component[@type='form' and @exttype='grid']]" mode="field_input">
        <xsl:call-template name="render-date-input">
            <xsl:with-param name="role" select="'date'"/>
        </xsl:call-template>
    </xsl:template>

</xsl:stylesheet>
