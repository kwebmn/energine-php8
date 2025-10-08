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
        <xsl:variable name="IDD"><xsl:value-of select="generate-id(record)"/></xsl:variable>
        <div id="{generate-id(.)}" data-role="pane" class="card" template="{$BASE}{$LANG_ABBR}{../@template}"  single_template="{$BASE}{$LANG_ABBR}{../@single_template}">
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
            <xsl:if test="../toolbar">
                <div class="card-footer" data-pane-part="footer" data-pane-toolbar="bottom"></div>
            </xsl:if>
        </div>
    </xsl:template>
    
    <xsl:template match="toolbar[parent::component[@class='ImageManager']]">
        <script type="module">
            import { queueTask } from "<xsl:value-of select="/document/properties/property[@name='base']/@static"/>scripts/Energine.js";
            import { Toolbar } from "<xsl:value-of select="/document/properties/property[@name='base']/@static"/>scripts/Toolbar.js";
            queueTask(() => {
                const componentToolbars = window.componentToolbars || (window.componentToolbars = []);
                const componentId = '<xsl:value-of select="generate-id(../recordset)"/>';
                componentToolbars[componentId] = new Toolbar(
                    '<xsl:value-of select="@name"/>'
                );
                    <xsl:apply-templates/>
                    const componentInstance = globalThis[componentId];
                    if (componentInstance &amp;&amp; typeof componentInstance.attachToolbar === 'function') {
                        componentInstance.attachToolbar(componentToolbars[componentId]);
                    }
            });
        </script>
        <!--
        <script language="JavaScript">
            var toolbar_<xsl:value-of select="generate-id(../recordset)"/>;
            toolbar_<xsl:value-of select="generate-id(../recordset)"/> = new Toolbar;
            <xsl:apply-templates/>
        </script> 
        -->
    </xsl:template>
    
    <xsl:template match="control[ancestor::component[@class='ImageManager']]">
        button = new Toolbar.Button({ id: '<xsl:value-of select="@id"/>', title: '<xsl:value-of select="@title"/>', action: '<xsl:value-of select="@onclick"/>' });
        componentToolbars['<xsl:value-of select="generate-id(../../recordset)"/>'].appendControl(button);
    </xsl:template>
    <!-- /компонент ImageManager -->

</xsl:stylesheet>
