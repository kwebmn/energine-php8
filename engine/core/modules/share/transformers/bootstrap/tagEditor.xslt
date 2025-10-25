<?xml version='1.0' encoding="UTF-8" ?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
        >

    <xsl:template match="recordset[parent::component[@class='TagEditor'][@type='list']]">
        <xsl:variable name="NAME" select="../@name"/>
        <xsl:variable name="COMPONENT_UID" select="generate-id(.)"/>
        <div data-role="pane" class="card">
            <xsl:attribute name="data-e-id"><xsl:value-of select="$COMPONENT_UID"/></xsl:attribute>
            <xsl:if test="../javascript/behavior/@name">
                <xsl:attribute name="data-e-js"><xsl:value-of select="../javascript/behavior/@name"/></xsl:attribute>
            </xsl:if>
            <xsl:attribute name="data-e-template">
                <xsl:value-of select="concat($BASE, $LANG_ABBR, ../@template)"/>
            </xsl:attribute>
            <xsl:attribute name="data-e-single-template">
                <xsl:value-of select="concat($BASE, $LANG_ABBR, ../@single_template)"/>
            </xsl:attribute>
            <xsl:attribute name="data-e-tag-id"><xsl:value-of select="../@tag_id"/></xsl:attribute>
            <xsl:call-template name="BUILD_GRID"/>
            <div class="card-footer" data-pane-part="footer" data-pane-toolbar="bottom"></div>
            <xsl:if test="count($TRANSLATION[@component=$NAME])&gt;0">
                <script type="application/json" data-energine-translations="1">
                    <xsl:value-of select="/document/translations/@json" disable-output-escaping="yes" />
                </script>
            </xsl:if>
        </div>
    </xsl:template>

</xsl:stylesheet>
