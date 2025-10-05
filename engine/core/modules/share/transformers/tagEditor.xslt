<?xml version='1.0' encoding="UTF-8" ?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
        >

    <xsl:template match="recordset[parent::component[@class='TagEditor'][@type='list']]">
        <xsl:variable name="NAME" select="../@name"/>
        <div data-role="pane" class="card">
            <xsl:attribute name="data-energine-param-template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../@template"/></xsl:attribute>
            <xsl:attribute name="template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../@template"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-single_template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../@single_template"/></xsl:attribute>
            <xsl:attribute name="single_template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../@single_template"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-tag_id"><xsl:value-of select="../@tag_id"/></xsl:attribute>
            <xsl:attribute name="tag_id"><xsl:value-of select="../@tag_id"/></xsl:attribute>
            <xsl:call-template name="energine-component-attributes">
                <xsl:with-param name="component" select=".."/>
            </xsl:call-template>
            <xsl:call-template name="BUILD_GRID"/>
            <xsl:for-each select="../toolbar">
                <div class="card-footer" data-pane-part="footer" data-pane-toolbar="bottom">
                    <xsl:call-template name="energine-toolbar-attributes"/>
                    <xsl:apply-templates select="control"/>
                </div>
            </xsl:for-each>
            <xsl:if test="count($TRANSLATION[@component=$NAME])&gt;0">
                <div class="d-none" aria-hidden="true">
                    <xsl:attribute name="data-energine-translations-component"><xsl:value-of select="$NAME"/></xsl:attribute>
                    <xsl:attribute name="data-energine-translations"><xsl:value-of select="/document/translations/@json"/></xsl:attribute>
                </div>
            </xsl:if>
        </div>
    </xsl:template>

</xsl:stylesheet>
