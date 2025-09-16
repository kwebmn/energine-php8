<?xml version='1.0' encoding="UTF-8" ?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
        >

    <xsl:template match="recordset[parent::component[@class='TagEditor'][@type='list']]">
        <xsl:variable name="NAME" select="../@name"/>
        <div id="{generate-id(.)}" data-role="pane" class="card" template="{$BASE}{$LANG_ABBR}{../@template}" single_template="{$BASE}{$LANG_ABBR}{../@single_template}" tag_id="{../@tag_id}">
            <xsl:call-template name="BUILD_GRID"/>
            <div class="card-footer" data-pane-part="footer" data-pane-toolbar="bottom"></div>
            <xsl:if test="count($TRANSLATION[@component=$NAME])&gt;0">
                <script type="text/javascript">
                            Energine.translations.extend(<xsl:value-of select="/document/translations/@json" />);
                </script>
            </xsl:if>
        </div>
    </xsl:template>

</xsl:stylesheet>
