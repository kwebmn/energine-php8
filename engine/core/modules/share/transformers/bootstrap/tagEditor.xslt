<?xml version='1.0' encoding="UTF-8" ?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
        >

    <xsl:template match="recordset[parent::component[@class='TagEditor'][@type='list']]">
        <xsl:variable name="COMPONENT" select=".."/>
        <xsl:variable name="NAME" select="$COMPONENT/@name"/>
        <xsl:variable name="BEHAVIOR">
            <xsl:choose>
                <xsl:when test="string-length(normalize-space($COMPONENT/javascript/behavior/@name)) &gt; 0">
                    <xsl:value-of select="$COMPONENT/javascript/behavior/@name"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="$COMPONENT/@sample"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <div data-role="pane" class="card">
            <xsl:if test="string-length(normalize-space($BEHAVIOR)) &gt; 0">
                <xsl:attribute name="data-e-js"><xsl:value-of select="$BEHAVIOR"/></xsl:attribute>
            </xsl:if>
            <xsl:attribute name="data-e-template"><xsl:value-of select="concat($BASE, $LANG_ABBR, ../@template)"/></xsl:attribute>
            <xsl:attribute name="data-e-single-template"><xsl:value-of select="concat($BASE, $LANG_ABBR, ../@single_template)"/></xsl:attribute>
            <xsl:attribute name="data-e-toolbar-component"><xsl:value-of select="generate-id(.)"/></xsl:attribute>
            <xsl:call-template name="BUILD_GRID"/>
            <div class="card-footer" data-pane-part="footer"></div>
            <xsl:if test="count($TRANSLATION[@component=$NAME])&gt;0">
                <script type="application/json" data-energine-translations="1">
                    <xsl:value-of select="/document/translations/@json" disable-output-escaping="yes" />
                </script>
            </xsl:if>
        </div>
    </xsl:template>

</xsl:stylesheet>
