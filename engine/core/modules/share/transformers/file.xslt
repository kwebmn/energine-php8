<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet 
    version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
    >
    
    <!-- компонент ImageManager (редактор изображения при вставке в текстовый блок, выводится в модальное окно) -->
    <!--
    or descendant::field[@type='pfile']
     or descendant::field[@type='prfile']
     -->
    <xsl:template match="component[@class='ImageManager']">
        <form method="post" action="{@action}" class="e-grid-form">
            <xsl:call-template name="energine-component-attributes"/>
            <xsl:if test="descendant::field[@type='image'] or descendant::field[@type='file']">
                <xsl:attribute name="enctype">multipart/form-data</xsl:attribute>
            </xsl:if>
            <input type="hidden" name="componentAction" value="{@componentAction}" id="componentAction"/>
            <xsl:apply-templates/>
        </form>
    </xsl:template>
    
    <xsl:template match="recordset[parent::component[@class='ImageManager']]">
        <xsl:variable name="IDD"><xsl:value-of select="generate-id(record)"/></xsl:variable>
        <div data-role="pane" class="card">
            <xsl:attribute name="data-energine-param-template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../@template"/></xsl:attribute>
            <xsl:attribute name="template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../@template"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-single_template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../@single_template"/></xsl:attribute>
            <xsl:attribute name="single_template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../@single_template"/></xsl:attribute>
            <xsl:call-template name="energine-component-attributes">
                <xsl:with-param name="component" select=".."/>
            </xsl:call-template>
            <div class="card-header" data-pane-part="header" data-pane-toolbar="top">
                <ul class="nav nav-tabs card-header-tabs" data-role="tabs">
                    <li class="nav-item" data-role="tab">
                        <a href="#{$IDD}" data-role="tab-link">
                            <xsl:attribute name="class">nav-link active</xsl:attribute>
                            <xsl:attribute name="data-bs-toggle">tab</xsl:attribute>
                            <xsl:attribute name="data-bs-target">#<xsl:value-of select="$IDD"/></xsl:attribute>
                            <xsl:value-of select="$TRANSLATION[@const='TXT_IMG_MANAGER']"/>
                        </a>
                    </li>
                </ul>
            </div>
            <div class="card-body" data-pane-part="body">
                <div class="tab-content" data-role="tab-content">
                    <div id="{$IDD}" class="tab-pane fade show active" data-role="pane-item">
                        <div style="max-height:300px; max-width:650px; overflow:auto;border: thin inset; width: auto;">
                            <img id="thumbnail" alt=""  style="display: block;"/>
                        </div>
                        <!--
                        <div style="padding-top:20px;">
                            <input type="checkbox" id="insThumbnail" name="insThumbnail" value="1" style="width: auto;" disabled="disabled"/><label for="insThumbnail">вставить&#160;превью</label>
                        </div>
                        -->
                        <xsl:apply-templates/>
                    </div>
                </div>
            </div>
            <xsl:for-each select="../toolbar">
                <div class="card-footer" data-pane-part="footer" data-pane-toolbar="bottom">
                    <xsl:call-template name="energine-toolbar-attributes"/>
                    <xsl:apply-templates select="control"/>
                </div>
            </xsl:for-each>
        </div>
    </xsl:template>
    
    <xsl:template match="toolbar[parent::component[@class='ImageManager']]">
        <div class="card-toolbar d-flex flex-wrap align-items-center gap-2">
            <xsl:call-template name="energine-toolbar-attributes"/>
            <xsl:apply-templates select="control"/>
        </div>
    </xsl:template>
    

    <!-- /компонент ImageManager -->

</xsl:stylesheet>
