<?xml version='1.0' encoding="UTF-8" ?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
        >

    <xsl:template match="recordset[parent::component[@class='TagEditor'][@type='list']]">
        <xsl:variable name="COMPONENT" select=".."/>
        <xsl:variable name="NAME" select="../@name"/>
        <xsl:variable name="BEHAVIOR" select="../javascript/behavior/@name"/>
        <div data-role="pane" class="card" template="{$BASE}{$LANG_ABBR}{../@template}" single_template="{$BASE}{$LANG_ABBR}{../@single_template}" tag_id="{../@tag_id}">
            <xsl:if test="$COMPONENT/@name">
                <xsl:attribute name="data-e-component"><xsl:value-of select="$COMPONENT/@name"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="$COMPONENT/@module">
                <xsl:attribute name="data-e-module"><xsl:value-of select="$COMPONENT/@module"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="$COMPONENT/@componentAction">
                <xsl:attribute name="data-e-action"><xsl:value-of select="$COMPONENT/@componentAction"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="$COMPONENT/@sample">
                <xsl:attribute name="data-e-sample"><xsl:value-of select="$COMPONENT/@sample"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="string-length($BEHAVIOR) &gt; 0">
                <xsl:attribute name="data-e-js"><xsl:value-of select="$BEHAVIOR"/></xsl:attribute>
            </xsl:if>
            <xsl:call-template name="BUILD_GRID"/>
            <div class="card-footer" data-pane-part="footer" data-pane-toolbar="bottom"></div>
            <xsl:if test="count($TRANSLATION[@component=$NAME])&gt;0">
                <script type="module">
                    import { stageTranslations } from "<xsl:value-of select="/document/properties/property[@name='base']/@static"/>scripts/Energine.js";
                    stageTranslations(<xsl:value-of select="/document/translations/@json" />);
                </script>
            </xsl:if>
        </div>
    </xsl:template>

</xsl:stylesheet>
