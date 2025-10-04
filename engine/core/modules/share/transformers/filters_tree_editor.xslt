<?xml version='1.0' encoding="UTF-8" ?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:template match="recordset[parent::component[@class='FiltersTreeEditor'][@type='list']]">

<!--        <script type="text/javascript" src="scripts/jstree/jstree.min.js"></script>-->
<!--        <link rel="stylesheet" type="text/css" href="scripts/jstree/themes/default/style.css" />-->


        <xsl:variable name="RECORDSET_UID" select="generate-id(.)"/>
        <div>
            <xsl:attribute name="data-energine-param-recordset"><xsl:value-of select="$RECORDSET_UID"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-single_template"><xsl:value-of select="../@single_template"/></xsl:attribute>
            <xsl:attribute name="single-template"><xsl:value-of select="../@single_template"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-txt_add"><xsl:value-of select="//translation[@const='BTN_ADD']"/></xsl:attribute>
            <xsl:attribute name="txt_add"><xsl:value-of select="//translation[@const='BTN_ADD']"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-txt_edit"><xsl:value-of select="//translation[@const='BTN_EDIT']"/></xsl:attribute>
            <xsl:attribute name="txt_edit"><xsl:value-of select="//translation[@const='BTN_EDIT']"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-txt_delete"><xsl:value-of select="//translation[@const='BTN_DELETE']"/></xsl:attribute>
            <xsl:attribute name="txt_delete"><xsl:value-of select="//translation[@const='BTN_DELETE']"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-txt_confirm"><xsl:value-of select="//translation[@const='MSG_CONFIRM_DELETE']"/></xsl:attribute>
            <xsl:attribute name="txt_confirm"><xsl:value-of select="//translation[@const='MSG_CONFIRM_DELETE']"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-txt_refresh"><xsl:value-of select="//translation[@const='BTN_REFRESH']"/></xsl:attribute>
            <xsl:attribute name="txt_refresh"><xsl:value-of select="//translation[@const='BTN_REFRESH']"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-txt_up"><xsl:value-of select="//translation[@const='BTN_UP']"/></xsl:attribute>
            <xsl:attribute name="txt_up"><xsl:value-of select="//translation[@const='BTN_UP']"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-txt_down"><xsl:value-of select="//translation[@const='BTN_DOWN']"/></xsl:attribute>
            <xsl:attribute name="txt_down"><xsl:value-of select="//translation[@const='BTN_DOWN']"/></xsl:attribute>
            <div id="filter-tree" style="font-size: 1em;padding:1em;"></div>
        </div>

    </xsl:template>

</xsl:stylesheet>
