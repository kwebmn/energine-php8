<?xml version='1.0' encoding="UTF-8" ?>
<xsl:stylesheet 
    version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
    xmlns:set="http://exslt.org/sets"
    extension-element-prefixes="set">

    <xsl:template match="document/translations[translation[@component=//component[@sample='DivisionEditor' or @class='SiteEditor']/@name]]">
            <script type="text/javascript">
                document.addEventListener('DOMContentLoaded', function() {Energine.translations.extend(<xsl:value-of select="/document/translations/@json" />);});
<!--		        Energine.translations.extend(<xsl:value-of select="/document/translations/@json" />);-->
            </script>
    </xsl:template>
    
    <!-- вывод дерева разделов -->
    <xsl:template match="recordset[parent::component[javascript/behavior/@name='DivManager' or javascript/behavior/@name='DivSelector'or javascript/behavior/@name='DivTree'][@sample='DivisionEditor'][@type='list']]">
        <xsl:variable name="TAB_ID" select="generate-id(record[1])"/>
        <div id="{generate-id(.)}" data-role="pane" class="card" template="{$BASE}{$LANG_ABBR}{../@template}" lang_id="{$LANG_ID}" single_template="{$BASE}{$LANG_ABBR}{../@single_template}" site="{../@site}">
            <div class="card-header" data-pane-part="header" data-pane-toolbar="top">
                <ul class="nav nav-tabs card-header-tabs" data-role="tabs">
                    <li class="nav-item" data-role="tab">
                        <a href="#{$TAB_ID}" class="nav-link" data-mdb-tab-init="1" data-role="tab-link"><xsl:value-of select="record[1]/field[1]/@tabName" /></a>
                    </li>
                </ul>
            </div>
            <div class="card-body" data-pane-part="body">
                <div class="tab-content" data-role="tab-content">
                    <div id="{$TAB_ID}" class="tab-pane" data-role="pane-item">
                        <div id="treeContainer" data-role="tree-panel">
                            <xsl:apply-templates select="$COMPONENTS[@class='SiteList']" mode="insideEditor"/>
                        </div>
                    </div>
                </div>
            </div>
            <xsl:if test="../toolbar">
                <div class="card-footer" data-pane-part="footer" data-pane-toolbar="bottom"></div>
            </xsl:if>
        </div>
    </xsl:template>
        
    <!-- вывод дерева разделов в боковом тулбаре -->
    <xsl:template match="recordset[parent::component[javascript/behavior/@name='DivSidebar'][@sample='DivisionEditor'][@componentAction='main'][@type='list']]">
        <div id="{generate-id(.)}" class="division-editor d-flex flex-column flex-xl-row gap-3" template="{$BASE}{$LANG_ABBR}{../@template}"  lang_id="{$LANG_ID}" single_template="{$BASE}{$LANG_ABBR}{../@single_template}" site="{../@site}">
            <aside id="treeContainer" data-role="tree-panel" class="division-editor__tree flex-shrink-0"></aside>
            <main data-role="editor-content" class="division-editor__content flex-grow-1"></main>
        </div>
    </xsl:template>
    
    <xsl:template match="field[@name='page_rights'][@type='custom']">
        <xsl:variable name="RECORDS" select="recordset/record"/>
        <div class="table_data">
            <table width="100%" border="0">
                <thead>
                    <tr>
                        <td><xsl:text disable-output-escaping="yes">&amp;nbsp;</xsl:text></td>
                        <xsl:for-each select="$RECORDS[position()=1]/field[@name='right_id']/options/option">
                            <td><xsl:value-of select="."/></td>
                        </xsl:for-each>
                    </tr>
                </thead>
                <tbody>
                    <xsl:for-each select="$RECORDS">
                        <tr>
    						<xsl:if test="floor(position() div 2) = position() div 2">
                                <xsl:attribute name="class">even</xsl:attribute>
                            </xsl:if>
                            <td class="group_name"><xsl:value-of select="field[@name='group_id']"/></td>
                            <xsl:for-each select="field[@name='right_id']/options/option">
                                <td>
                                    <div class="form-check mb-0">
                                        <input class="form-check-input" type="radio" value="{@id}">
                                            <xsl:attribute name="name">right_id[<xsl:value-of select="../../../field[@name='group_id']/@group_id"/>]</xsl:attribute>
                                            <xsl:if test="@selected">
                                                <xsl:attribute name="checked">checked</xsl:attribute>
                                            </xsl:if>
                                        </input>
                                    </div>
                                </td>
                            </xsl:for-each>
                        </tr>
                    </xsl:for-each>
                </tbody>
            </table>
        </div>
    </xsl:template>    
    
    <!-- поле выбора родительского раздела -->
    <xsl:template match="field[@name='smap_pid'][@mode='2'][ancestor::component[@sample='DivisionEditor'][@type='form']]">
        <xsl:variable name="IS_REQUIRED" select="not(@nullable) or @nullable='0'"/>
        <xsl:variable name="FIELD_UID" select="generate-id(.)"/>
        <xsl:variable name="DISPLAY_ID" select="concat($FIELD_UID, '_display')"/>
        <xsl:variable name="HIDDEN_ID" select="concat($FIELD_UID, '_value')"/>
        <div class="mb-3" data-role="form-field">
            <xsl:attribute name="id">control_{@language}_{@name}</xsl:attribute>
            <xsl:attribute name="data-type">
                <xsl:choose>
                    <xsl:when test="@type"><xsl:value-of select="@type"/></xsl:when>
                    <xsl:otherwise>string</xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
            <xsl:attribute name="data-required"><xsl:value-of select="$IS_REQUIRED"/></xsl:attribute>
            <div class="input-group">
                <div class="form-outline flex-grow-1" data-mdb-input-init="1">
                    <input type="text" id="{$DISPLAY_ID}" readonly="readonly">
                        <xsl:attribute name="class">
                            <xsl:text>form-control</xsl:text>
                            <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
                        </xsl:attribute>
                        <xsl:attribute name="value"><xsl:value-of select="@data_name"/></xsl:attribute>
                    </input>
                    <xsl:if test="@title">
                        <label class="form-label" for="{$DISPLAY_ID}">
                            <xsl:value-of select="@title" disable-output-escaping="yes"/>
                            <xsl:if test="$IS_REQUIRED and not(ancestor::component/@exttype='grid')">
                                <span class="text-danger">*</span>
                            </xsl:if>
                        </label>
                    </xsl:if>
                </div>
                <input type="hidden" id="{$HIDDEN_ID}" value="{.}">
                    <xsl:attribute name="name"><xsl:choose>
                        <xsl:when test="@tableName"><xsl:value-of select="@tableName"/><xsl:if test="@language">[<xsl:value-of select="@language"/>]</xsl:if>[<xsl:value-of select="@name" />]</xsl:when>
                            <xsl:otherwise><xsl:value-of select="@name"/></xsl:otherwise>
                        </xsl:choose></xsl:attribute>
                </input>
                <button type="button" class="btn btn-outline-secondary" id="sitemap_selector" hidden_field="{$HIDDEN_ID}" span_field="{$DISPLAY_ID}">
                    <xsl:text>Выбрать…</xsl:text>
                </button>
            </div>
            <xsl:call-template name="render-field-messages"/>
        </div>
    </xsl:template>
   
    <xsl:template match="field[@name='smap_pid'][@mode='1'][@type!='hidden'][ancestor::component[@sample='DivisionEditor'][@type='form']]">
        <xsl:variable name="IS_REQUIRED" select="not(@nullable) or @nullable='0'"/>
        <div class="mb-3" data-role="form-field">
            <xsl:attribute name="id">control_{@language}_{@name}</xsl:attribute>
            <xsl:attribute name="data-type">
                <xsl:choose>
                    <xsl:when test="@type"><xsl:value-of select="@type"/></xsl:when>
                    <xsl:otherwise>string</xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
            <xsl:attribute name="data-required"><xsl:value-of select="$IS_REQUIRED"/></xsl:attribute>
            <xsl:if test="@title">
                <label class="form-label" for="{@name}">
                    <xsl:value-of select="@title" disable-output-escaping="yes"/>
                </label>
            </xsl:if>
            <span class="form-control-plaintext d-block"><xsl:value-of select="@data_name" disable-output-escaping="yes"/></span>
            <input type="hidden" value="{.}">
                <xsl:attribute name="name">
                    <xsl:choose>
                        <xsl:when test="@tableName"><xsl:value-of select="@tableName"/>[<xsl:value-of select="@name" />]</xsl:when>
                        <xsl:otherwise><xsl:value-of select="@name"/></xsl:otherwise>
                    </xsl:choose>
                </xsl:attribute>
            </input>
            <xsl:call-template name="render-field-messages"/>
        </div>
    </xsl:template>
    
    <!-- поле для ввода сегмента раздела -->
    <xsl:template match="field[@name='smap_segment'][ancestor::component[@sample='DivisionEditor' and @type='form']]">
        <xsl:variable name="IS_REQUIRED" select="not(@nullable) or @nullable='0'"/>
        <xsl:variable name="FIELD_ID">
            <xsl:value-of select="@name"/>
            <xsl:if test="@language">_<xsl:value-of select="@language"/></xsl:if>
        </xsl:variable>
        <xsl:variable name="DATA_TYPE">
            <xsl:choose>
                <xsl:when test="@type"><xsl:value-of select="@type"/></xsl:when>
                <xsl:otherwise>string</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <div class="mb-3" data-role="form-field">
            <xsl:attribute name="id">control_{@language}_{@name}</xsl:attribute>
            <xsl:attribute name="data-type"><xsl:value-of select="$DATA_TYPE"/></xsl:attribute>
            <xsl:attribute name="data-required"><xsl:value-of select="$IS_REQUIRED"/></xsl:attribute>
            <xsl:if test="@mode='1' and @title">
                <label class="form-label" for="{@name}">
                    <xsl:value-of select="@title" disable-output-escaping="yes"/>
                </label>
            </xsl:if>
            <div class="input-group smap-segment">
                <span class="input-group-text">
                    <span><xsl:value-of select="../field[@name='smap_pid']/@base"/><xsl:value-of select="$LANG_ABBR"/></span>
                    <span id="smap_pid_segment"><xsl:value-of select="../field[@name='smap_pid']/@segment"/></span>
                    <xsl:text>/</xsl:text>
                </span>
                <xsl:choose>
                    <xsl:when test="@mode='1'">
                        <span class="form-control-plaintext flex-grow-1"><xsl:value-of select="." disable-output-escaping="yes"/></span>
                    </xsl:when>
                    <xsl:otherwise>
                        <div class="form-outline flex-grow-1" data-mdb-input-init="1">
                            <input>
                                <xsl:attribute name="class">
                                    <xsl:text>form-control</xsl:text>
                                    <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
                                </xsl:attribute>
                                <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
                            </input>
                            <xsl:if test="@title">
                                <label class="form-label" for="{$FIELD_ID}">
                                    <xsl:value-of select="@title" disable-output-escaping="yes"/>
                                    <xsl:if test="$IS_REQUIRED and not(ancestor::component/@exttype='grid')">
                                        <span class="text-danger">*</span>
                                    </xsl:if>
                                </label>
                            </xsl:if>
                        </div>
                    </xsl:otherwise>
                </xsl:choose>
                <span class="input-group-text">/</span>
            </div>
            <xsl:if test="@mode='1'">
                <input>
                    <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
                </input>
            </xsl:if>
            <xsl:call-template name="render-field-messages"/>
        </div>
    </xsl:template>

    <!-- поле выбора контентного шаблона раздела -->
    <xsl:template match="field[@name='smap_content'][ancestor::component[@sample='DivisionEditor' and @type='form']]" mode="field_input">
        <xsl:variable name="FIELD_ID">
            <xsl:value-of select="@name"/>
            <xsl:if test="@language">_<xsl:value-of select="@language"/></xsl:if>
        </xsl:variable>
        <div class="d-flex flex-wrap align-items-start gap-2">
            <select id="{$FIELD_ID}">
                <xsl:attribute name="class">
                    <xsl:text>form-select</xsl:text>
                    <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
                </xsl:attribute>
                <xsl:attribute name="name"><xsl:choose>
                    <xsl:when test="@tableName"><xsl:value-of select="@tableName"/>[<xsl:value-of select="@name"/>]</xsl:when>
                    <xsl:otherwise><xsl:value-of select="@name"/></xsl:otherwise>
                </xsl:choose></xsl:attribute>
                <xsl:if test="not(@nullable) or @nullable='0'">
                    <xsl:attribute name="required">required</xsl:attribute>
                </xsl:if>
                <xsl:if test="@nullable='1'">
                    <option></option>
                </xsl:if>
                <xsl:apply-templates mode="field_input"/>
            </select>
            <xsl:if test="@reset">
                <button type="button" class="btn btn-outline-secondary" onclick="{generate-id(../..)}.resetPageContentTemplate();">
                    <xsl:value-of select="@reset"/>
                </button>
            </xsl:if>
        </div>
    </xsl:template>


    <!--<xsl:template match="field[@name='smap_content_xml'][ancestor::component[@type='form' and @exttype='grid']]">
        <link rel="stylesheet" href="scripts/codemirror/lib/codemirror.css" />
        <script type="text/javascript" src="scripts/codemirror/lib/codemirror.js"></script>
        <script type="text/javascript" src="scripts/codemirror/mode/xml/xml.js"></script>
        <link rel="stylesheet" href="scripts/codemirror/theme/default.css" />

        <div>
            <xsl:attribute name="class">field clearfix<xsl:choose>
                <xsl:when test=".=''"> min</xsl:when>
                <xsl:otherwise> max</xsl:otherwise>
            </xsl:choose></xsl:attribute>
            <xsl:apply-templates select="." mode="field_name"/>
            <xsl:apply-templates select="." mode="field_content"/>
        </div>
    </xsl:template>-->

    <xsl:template match="record[parent::recordset[parent::component[@sample='DivisionEditor'][@type='list']]]"/>
    <!-- /компонент DivisionEditor -->

    <!--Обычный список сайтов-->
    <xsl:template match="component[@class='SiteList']">
        <xsl:if test="not(recordset[@empty])">
            <div class="site_list_box">
                <xsl:apply-templates/>
            </div>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="recordset[parent::component[@class='SiteList']]">
        <ul class="site_list">
            <xsl:apply-templates/>
        </ul>
    </xsl:template>
    
    <xsl:template match="record[ancestor::component[@class='SiteList']]">
        <li>
            <xsl:if test="field[@name='site_id'] = $COMPONENTS[@sample='DivisionEditor']/@site">
                <xsl:attribute name="class">active</xsl:attribute>
            </xsl:if>
            <a href="{$BASE}{$LANG_ABBR}{../../@template}show/{field[@name='site_id']}/"><xsl:value-of select="field[@name='site_name']"/></a>
        </li>
    </xsl:template>

    <xsl:template match="component[@class='SiteList' and (following::component[@sample='DivisionEditor'] or preceding::component[@sample='DivisionEditor'])]" />

    <xsl:template match="component[@class='SiteList' and (following::component[@sample='DivisionEditor'] or preceding::component[@sample='DivisionEditor'])]"  mode="insideEditor">
        <select class="form-select" onchange="document.location = '{$BASE}{$LANG_ABBR}{@template}show/' + this.options[this.selectedIndex].value + '/';" id="site_selector">
            <xsl:for-each select="recordset/record">
                <option value="{field[@name='site_id']}">
                    <xsl:if test="field[@name='site_id'] = $COMPONENTS[@sample='DivisionEditor']/@site">
                        <xsl:attribute name="selected">selected</xsl:attribute>
                    </xsl:if>
                    <xsl:value-of select="field[@name='site_name']"/></option>
            </xsl:for-each>
        </select>
    </xsl:template>
</xsl:stylesheet>