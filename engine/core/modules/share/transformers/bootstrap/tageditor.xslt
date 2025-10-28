<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >
    <!-- Renders the TagEditor list recordset as a Bootstrap card pane. -->
    <xsl:template match="recordset[parent::component[@class='TagEditor'][@type='list']]">
        <xsl:variable name="component" select=".."/>
        <xsl:variable name="componentName" select="$component/@name"/>
        <xsl:variable name="behavior" select="normalize-space($component/javascript/behavior/@name)"/>
        <xsl:variable name="fallbackBehavior" select="normalize-space($component/@sample)"/>
        <xsl:variable name="templatePath" select="concat($BASE, $LANG_ABBR, $component/@template)"/>
        <xsl:variable name="singleTemplatePath" select="concat($BASE, $LANG_ABBR, $component/@single_template)"/>
        <div
            class="card"
            data-role="pane"
            data-e-template="{$templatePath}"
            data-e-single-template="{$singleTemplatePath}"
            data-e-toolbar-component="{generate-id()}"
            >
            <xsl:if test="$behavior or $fallbackBehavior">
                <xsl:attribute name="data-e-js">
                    <xsl:choose>
                        <xsl:when test="$behavior">
                            <xsl:value-of select="$behavior"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="$fallbackBehavior"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:attribute>
            </xsl:if>
            <xsl:call-template name="BUILD_GRID"/>
            <div class="card-footer" data-pane-part="footer"></div>
            <xsl:if test="$TRANSLATION[@component = $componentName]">
                <script type="application/json" data-energine-translations="1">
                    <xsl:value-of select="/document/translations/@json" disable-output-escaping="yes"/>
                </script>
            </xsl:if>
        </div>
    </xsl:template>
</xsl:stylesheet>
