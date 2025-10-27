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
            <xsl:if test="descendant::field[@type='image'] or descendant::field[@type='file']">
                <xsl:attribute name="enctype">multipart/form-data</xsl:attribute>
            </xsl:if>
            <input type="hidden" name="componentAction" value="{@componentAction}" id="componentAction"/>
            <xsl:apply-templates/>
        </form>
    </xsl:template>
    
    <xsl:template match="recordset[parent::component[@class='ImageManager']]">
        <xsl:variable name="COMPONENT" select=".."/>
        <xsl:variable name="IDD"><xsl:value-of select="generate-id(record)"/></xsl:variable>
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
            <div class="card-header" data-pane-part="header">
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
            <xsl:if test="../toolbar">
                <div class="card-footer" data-pane-part="footer"></div>
            </xsl:if>
        </div>
    </xsl:template>
    
    <xsl:template match="toolbar[parent::component[@class='ImageManager']]">
        <div class="btn-toolbar flex-wrap gap-2 align-items-center" role="toolbar">
            <xsl:if test="@name">
                <xsl:attribute name="data-e-toolbar"><xsl:value-of select="@name"/></xsl:attribute>
            </xsl:if>
            <xsl:attribute name="data-e-toolbar-scope">image-manager</xsl:attribute>
            <xsl:if test="ancestor::component[1]/recordset">
                <xsl:attribute name="data-e-toolbar-component"><xsl:value-of select="generate-id(ancestor::component[1]/recordset)"/></xsl:attribute>
            </xsl:if>
            <xsl:apply-templates/>
        </div>
    </xsl:template>
    <!-- /компонент ImageManager -->

</xsl:stylesheet>
