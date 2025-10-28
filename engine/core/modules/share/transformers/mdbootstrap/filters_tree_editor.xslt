<?xml version='1.0' encoding="UTF-8" ?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:template match="recordset[parent::component[@class='FiltersTreeEditor'][@type='list']]">

<!--        <script type="text/javascript" src="scripts/jstree/jstree.min.js"></script>-->
<!--        <link rel="stylesheet" type="text/css" href="scripts/jstree/themes/default/style.css" />-->


        <xsl:variable name="COMPONENT" select=".."/>
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
        <div>
            <xsl:if test="string-length(normalize-space($BEHAVIOR)) &gt; 0">
                <xsl:attribute name="data-e-js"><xsl:value-of select="$BEHAVIOR"/></xsl:attribute>
            </xsl:if>
            <xsl:attribute name="data-e-single-template"><xsl:value-of select="../@single_template"/></xsl:attribute>
            <xsl:attribute name="data-e-txt-add"><xsl:value-of select="//translation[@const='BTN_ADD']"/></xsl:attribute>
            <xsl:attribute name="data-e-txt-edit"><xsl:value-of select="//translation[@const='BTN_EDIT']"/></xsl:attribute>
            <xsl:attribute name="data-e-txt-delete"><xsl:value-of select="//translation[@const='BTN_DELETE']"/></xsl:attribute>
            <xsl:attribute name="data-e-txt-confirm"><xsl:value-of select="//translation[@const='MSG_CONFIRM_DELETE']"/></xsl:attribute>
            <xsl:attribute name="data-e-txt-refresh"><xsl:value-of select="//translation[@const='BTN_REFRESH']"/></xsl:attribute>
            <xsl:attribute name="data-e-txt-up"><xsl:value-of select="//translation[@const='BTN_UP']"/></xsl:attribute>
            <xsl:attribute name="data-e-txt-down"><xsl:value-of select="//translation[@const='BTN_DOWN']"/></xsl:attribute>
            <div data-role="filter-tree" style="font-size: 1em;padding:1em;">

            </div>
        </div>

    </xsl:template>

</xsl:stylesheet>
