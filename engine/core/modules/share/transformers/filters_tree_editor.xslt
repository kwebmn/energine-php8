<?xml version='1.0' encoding="UTF-8" ?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:template match="recordset[parent::component[@class='FiltersTreeEditor'][@type='list']]">

<!--        <script type="text/javascript" src="scripts/jstree/jstree.min.js"></script>-->
<!--        <link rel="stylesheet" type="text/css" href="scripts/jstree/themes/default/style.css" />-->


        <div
                id="{generate-id(.)}"
                single-template="{../@single_template}"
                txt_add="{//translation[@const='BTN_ADD']}"
                txt_edit="{//translation[@const='BTN_EDIT']}"
                txt_delete="{//translation[@const='BTN_DELETE']}"
                txt_confirm="{//translation[@const='MSG_CONFIRM_DELETE']}"
                txt_refresh="{//translation[@const='BTN_REFRESH']}"
                txt_up="{//translation[@const='BTN_UP']}"
                txt_down="{//translation[@const='BTN_DOWN']}"
        >
            <div id="filter-tree" style="font-size: 1em;padding:1em;">

            </div>
        </div>

    </xsl:template>

</xsl:stylesheet>
