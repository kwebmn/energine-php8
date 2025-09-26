<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet 
    version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 

    xmlns:set="http://exslt.org/sets"
    extension-element-prefixes="set">

    <xsl:template match="component[@type='list']">
        <form method="post" action="{@action}">
            <xsl:if test="@exttype='grid'">
                <xsl:attribute name="data-role">grid-form</xsl:attribute>
            </xsl:if>
            <input type="hidden" name="componentAction" value="{@componentAction}"/>
            <xsl:apply-templates/>
        </form>
    </xsl:template>

    <xsl:template match="component[@type='list']/recordset">
        <xsl:choose>
            <xsl:when test="not(@empty)">
                <ol><xsl:apply-templates/></ol>
            </xsl:when>
            <xsl:otherwise><b><xsl:value-of select="@empty"/></b></xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="component[@type='list']/recordset/record">
        <li><xsl:apply-templates/></li>
    </xsl:template>

    <xsl:template match="component[@type='list' and @exttype='grid']/recordset">
        <xsl:variable name="NAME" select="../@name"/>
        <div id="{generate-id(.)}" data-role="pane" class="card border-0 rounded-3 overflow-hidden" template="{$BASE}{$LANG_ABBR}{../@template}" single_template="{$BASE}{$LANG_ABBR}{../@single_template}">
            <xsl:if test="../@quickUploadPath">
                <xsl:attribute name="quick_upload_path">
                    <xsl:value-of select="../@quickUploadPath"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:if test="../@quickUploadPid">
                <xsl:attribute name="quick_upload_pid">
                    <xsl:value-of select="../@quickUploadPid"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:if test="../@quickUploadEnabled">
                <xsl:attribute name="quick_upload_enabled">
                    <xsl:value-of select="../@quickUploadEnabled"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:if test="../@moveFromId">
                <xsl:attribute name="move_from_id">
                    <xsl:value-of select="../@moveFromId"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:call-template name="BUILD_GRID"/>
            <div class="card-footer" data-pane-part="footer" data-pane-toolbar="bottom"></div>
            <xsl:if test="count($TRANSLATION[@component=$NAME])&gt;0">
                <script type="text/javascript">
                    <!--<xsl:for-each select="$TRANSLATION[@component=$NAME]">
                        Energine.translations.set('<xsl:value-of select="@const"/>', '<xsl:value-of select="."/>');
                    </xsl:for-each>-->
<!--		            Energine.translations.extend(<xsl:value-of select="/document/translations/@json" />);-->
                    document.addEventListener('DOMContentLoaded', function() {Energine.translations.extend(<xsl:value-of select="/document/translations/@json" />);});
                </script>
            </xsl:if>
        </div>
    </xsl:template>
    
    <!-- Выводим переводы для WYSIWYG -->
    <xsl:template match="document/translations[translation[@component=//component[@type='form' and @exttype='grid'][descendant::field[@type='htmlblock']]/@name]]">
            <script type="text/javascript">
<!--                Energine.translations.extend(<xsl:value-of select="/document/translations/@json" />);-->
                document.addEventListener('DOMContentLoaded', function() {Energine.translations.extend(<xsl:value-of select="/document/translations/@json" />);});
            </script>

    </xsl:template>

    <!--Фильтр обрабатывается в BUILD_GRID-->
    <xsl:template match="component[@type='list' and @exttype='grid']/filter"/>

    <xsl:template name="BUILD_GRID">
        <xsl:variable name="FIELDS" select="record/field"/>
        <xsl:variable name="TAB_ID" select="generate-id(record)"/>

        <div class="card-header bg-body-tertiary border-bottom" data-pane-part="header" data-pane-toolbar="top">
            <ul class="nav nav-tabs card-header-tabs mb-0" data-role="tabs" role="tablist">
                <xsl:choose>
                    <xsl:when test="$FIELDS[@language]">
                        <xsl:for-each select="$FIELDS[@language and string-length(@tabName) &gt; 0 and not(@tabName = preceding-sibling::field[@language]/@tabName)]">
                            <xsl:sort select="@languageOrder" data-type="number"/>
                            <xsl:variable name="TAB_NAME" select="@tabName"/>
                            <li class="nav-item" data-role="tab" role="presentation">
                                <xsl:variable name="TAB_LINK_ID" select="concat($TAB_ID, '-tab-', position())"/>
                                <a href="#{$TAB_ID}" id="{$TAB_LINK_ID}" data-role="tab-link">
                                    <xsl:attribute name="class">
                                        <xsl:text>nav-link</xsl:text>
                                        <xsl:if test="position()=1">
                                            <xsl:text> active</xsl:text>
                                        </xsl:if>
                                    </xsl:attribute>
                                    <xsl:attribute name="data-bs-toggle">tab</xsl:attribute>
                                    <xsl:attribute name="data-bs-target">#<xsl:value-of select="$TAB_ID"/></xsl:attribute>
                                    <xsl:attribute name="role">tab</xsl:attribute>
                                    <xsl:attribute name="aria-controls"><xsl:value-of select="$TAB_ID"/></xsl:attribute>
                                    <xsl:attribute name="aria-selected">
                                        <xsl:choose>
                                            <xsl:when test="position()=1">true</xsl:when>
                                            <xsl:otherwise>false</xsl:otherwise>
                                        </xsl:choose>
                                    </xsl:attribute>
                                    <xsl:value-of select="$TAB_NAME"/>
                                </a>
                                <span class="visually-hidden" data-role="tab-meta">{ lang: <xsl:value-of select="@language"/> }</span>
                            </li>
                        </xsl:for-each>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:for-each select="$FIELDS[string-length(@tabName) &gt; 0 and not(@tabName = preceding-sibling::field/@tabName)]">
                            <xsl:variable name="TAB_NAME" select="@tabName"/>
                            <li class="nav-item" data-role="tab" role="presentation">
                                <xsl:variable name="TAB_LINK_ID" select="concat($TAB_ID, '-tab-', position())"/>
                                <a href="#{$TAB_ID}" id="{$TAB_LINK_ID}" data-role="tab-link">
                                    <xsl:attribute name="class">
                                        <xsl:text>nav-link</xsl:text>
                                        <xsl:if test="position()=1">
                                            <xsl:text> active</xsl:text>
                                        </xsl:if>
                                    </xsl:attribute>
                                    <xsl:attribute name="data-bs-toggle">tab</xsl:attribute>
                                    <xsl:attribute name="data-bs-target">#<xsl:value-of select="$TAB_ID"/></xsl:attribute>
                                    <xsl:attribute name="role">tab</xsl:attribute>
                                    <xsl:attribute name="aria-controls"><xsl:value-of select="$TAB_ID"/></xsl:attribute>
                                    <xsl:attribute name="aria-selected">
                                        <xsl:choose>
                                            <xsl:when test="position()=1">true</xsl:when>
                                            <xsl:otherwise>false</xsl:otherwise>
                                        </xsl:choose>
                                    </xsl:attribute>
                                    <xsl:value-of select="$TAB_NAME"/>
                                </a>
                            </li>
                        </xsl:for-each>
                    </xsl:otherwise>
                </xsl:choose>
            </ul>
        </div>
        <div class="card-body p-0" data-pane-part="body">
            <div class="tab-content" data-role="tab-content">
                <div id="{$TAB_ID}" class="tab-pane fade show active" data-role="pane-item" role="tabpanel" aria-labelledby="{$TAB_ID}-tab-1">
                    <div class="grid p-0" data-role="grid">
                        <xsl:if test="ancestor::component/filter">
                            <div class="grid-toolbar bg-body-tertiary p-0 d-flex flex-column flex-lg-row align-items-lg-center gap-3 mb-0" data-role="grid-toolbar">
                                <div class="grid-filter row row-cols-lg-auto g-3 align-items-center w-100 border border-light-subtle bg-body px-3 py-3 mb-0" data-role="grid-filter">
                                    <div class="col-auto d-flex align-items-center gap-2">
                                        <span class="fw-semibold small text-secondary">
                                            <xsl:value-of select="ancestor::component/filter/@title"/>
                                            <xsl:text>:&#160;</xsl:text>
                                        </span>
                                    </div>
                                    <div class="col">
                                        <select name="fieldName" class="form-select form-select-sm" data-role="filter-field">
                                            <xsl:for-each select="ancestor::component/filter/field">
                                                <option value="[{@tableName}][{@name}]" type="{@type}"><xsl:value-of select="@title"/></option>
                                            </xsl:for-each>
                                        </select>
                                    </div>
                                    <div class="col">
                                        <select name="condition" class="form-select form-select-sm" data-role="filter-condition">
                                            <xsl:for-each select="ancestor::component/filter/operators/operator">
                                                <option value="{@name}">
                                                    <xsl:attribute name="data-types">
                                                        <xsl:for-each select="types/type">
                                                            <xsl:value-of select="."/>
                                                            <xsl:if test="position()!=last()">|</xsl:if>
                                                        </xsl:for-each>
                                                    </xsl:attribute>
                                                    <xsl:value-of select="@title"/>
                                                </option>
                                            </xsl:for-each>
                                        </select>
                                    </div>
                                    <div class="col flex-grow-1">
                                        <div class="filter-query d-flex flex-nowrap align-items-center gap-2" data-role="filter-query">
                                            <input type="text" class="form-control form-control-sm" data-role="filter-query-input"/>
                                        </div>
                                    </div>
                                    <div class="col flex-grow-1">
                                        <div class="filter-query d-flex flex-nowrap align-items-center gap-2" data-role="filter-query">
                                            <input type="text" class="form-control form-control-sm" data-role="filter-query-input"/>
                                        </div>
                                    </div>
                                    <div class="col-auto ms-lg-auto d-flex gap-2">
                                        <button type="button" class="btn btn-primary btn-sm d-inline-flex align-items-center gap-2" data-action="apply-filter">
                                            <xsl:value-of select="ancestor::component/filter/@apply"/>
                                        </button>
                                        <button type="button" class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2" data-action="reset-filter">
                                            <xsl:value-of select="ancestor::component/filter/@reset"/>
                                        </button>
                                    </div>
                                </div>
                                <xsl:if test="ancestor::component[@sample='FileRepository']">
                                    <div class="grid-breadcrumbs flex-grow-1 alert alert-secondary mb-0 py-2 px-3" id="breadcrumbs"/>
                                </xsl:if>
                            </div>
                        </xsl:if>
                        <div class="grid-head grid-body grid-table-wrapper  overflow-hidden" data-grid-section="head">
                            <div class="table-responsive" data-grid-section="body-inner">
                                <table class="table table-bordered table-hover table-sm mb-0 align-middle" data-role="grid-table" data-grid-part="table">
                                    <xsl:if test="ancestor::component[@sample='FileRepository']">
                                        <xsl:attribute name="data-fixed-columns">true</xsl:attribute>
                                    </xsl:if>
                                    <colgroup>
                                        <xsl:choose>
                                            <xsl:when test="ancestor::component[@sample='FileRepository']">
                                                <col id="col_11" style="width:12%"/>
                                                <col id="col_12" style="width:30%"/>
                                                <col id="col_13" style="width:28%"/>
                                                <col id="col_14" style="width:30%"/>
                                            </xsl:when>
                                            <xsl:otherwise>
                                                <xsl:for-each select="$FIELDS[@type!='hidden'][not(@language) or @language = $LANG_ID]">
                                                    <col id="col_{position()}"/>
                                                </xsl:for-each>
                                            </xsl:otherwise>
                                        </xsl:choose>
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <xsl:for-each select="$FIELDS[@type!='hidden'][not(@language) or @language = $LANG_ID]">
                                                <th id="col_{position()}">
                                                    <xsl:attribute name="name"><xsl:value-of select="@name"/></xsl:attribute>
                                                    <xsl:for-each select="@*[name()!='name' and name()!='title' and name()!='class' and name()!='style']">
                                                        <xsl:attribute name="{name()}"><xsl:value-of select="."/></xsl:attribute>
                                                    </xsl:for-each>
                                                    <xsl:attribute name="class">
                                                        <xsl:value-of select="normalize-space(concat(@class, ' text-center align-middle fw-semibold'))"/>
                                                    </xsl:attribute>
                                                    <xsl:attribute name="style">
                                                        <xsl:value-of select="normalize-space(concat(@style, '; cursor: pointer; min-height: 48px; height: 48px;'))"/>
                                                    </xsl:attribute>
                                                    <xsl:value-of select="@title"/>
                                                </th>
                                            </xsl:for-each>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <xsl:choose>
                                            <xsl:when test="recordset/record">
                                                <xsl:for-each select="recordset/record">
                                                    <xsl:variable name="CURRENT_RECORD" select="."/>
                                                    <tr>
                                                        <xsl:for-each select="$FIELDS[@type!='hidden'][not(@language) or @language = $LANG_ID]">
                                                            <xsl:variable name="FIELD_NAME" select="@name"/>
                                                            <xsl:variable name="FIELD_VALUE" select="$CURRENT_RECORD/field[@name=$FIELD_NAME]"/>
                                                            <td class="align-middle text-break">
                                                                <xsl:attribute name="style">min-height: 48px; height: 48px;</xsl:attribute>
                                                                <xsl:choose>
                                                                    <xsl:when test="$FIELD_VALUE">
                                                                        <xsl:apply-templates select="$FIELD_VALUE"/>
                                                                    </xsl:when>
                                                                    <xsl:otherwise>
                                                                        <xsl:text disable-output-escaping="yes">&amp;nbsp;</xsl:text>
                                                                    </xsl:otherwise>
                                                                </xsl:choose>
                                                            </td>
                                                        </xsl:for-each>
                                                    </tr>
                                                </xsl:for-each>
                                            </xsl:when>
                                            <xsl:otherwise>
                                                <tr>
                                                    <td class="text-center py-4" colspan="{count($FIELDS[@type!='hidden'][not(@language) or @language = $LANG_ID])}">
                                                        <span class="text-muted">No data</span>
                                                    </td>
                                                </tr>
                                            </xsl:otherwise>
                                        </xsl:choose>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="component[@type='list']/recordset/record/field">
        <span>
            <xsl:if test=". = ''">
                <xsl:text disable-output-escaping="yes">&amp;nbsp;</xsl:text>
            </xsl:if>
            <xsl:value-of select="." disable-output-escaping="yes"/>
        </span>
    </xsl:template>

<!--    <xsl:template match="component[@type='list']/recordset/record/field[@type='image']">
        <div style="width: 100px; height: 100px; overflow: auto;">
            <img src="{$BASE}/{.}" alt=""/>
        </div>
    </xsl:template>
-->
    <xsl:template match="component[@type='list']/recordset/record/field[@type='select']">
        <span>
            <xsl:if test=". = ''">
                <xsl:text disable-output-escaping="yes">&amp;nbsp;</xsl:text>
            </xsl:if>
            <xsl:value-of select="options/option[@selected='selected']"/>
        </span>
    </xsl:template>

    <xsl:template match="component[@type='list']/recordset/record/field[@type='boolean']">
        <input type="checkbox" disabled="disabled">
            <xsl:if test=". = 1">
                <xsl:attribute name="checked">checked</xsl:attribute>
            </xsl:if>
        </input>
    </xsl:template>

    <xsl:template match="component[@type='list']/recordset/record/field[@key='1']">
        <span><b><xsl:value-of select="."/></b> </span>
    </xsl:template>

    <xsl:template match="component[@type='list'][@exttype='print']">
        <style type="text/css">
            THEAD { display: table-header-group; }
        </style>
        <table border="1">
            <caption><xsl:value-of select="@title"/></caption>
            <thead>
                <tr>
                    <th>...</th>
                    <xsl:for-each select="recordset/record[1]/field[@type!='hidden'][@index != 'PRI' or not(@index)]">
                            <th><xsl:value-of select="@title"/></th>
                    </xsl:for-each>
                </tr>
            </thead>
            <tbody>
                <xsl:for-each select="recordset/record">
                        <tr>
                            <td><xsl:number value="position()" format="1. "/></td>
                            <xsl:for-each select="field[@type!='hidden'][@index != 'PRI' or not(@index)]">
                                <td><xsl:choose>
                                    <xsl:when test="@type='select'">
                                        <xsl:value-of select="options/option[@selected]"/>
                                    </xsl:when>
                                    <xsl:when test="@type='image'">
                                        <img src="{.}" border="0"/>
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <xsl:value-of select="."/>
                                    </xsl:otherwise>
                                </xsl:choose></td>
                            </xsl:for-each>
                        </tr>
                </xsl:for-each>
            </tbody>
        </table>
    </xsl:template>
</xsl:stylesheet>
