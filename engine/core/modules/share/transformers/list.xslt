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
        <div id="{generate-id(.)}" data-role="pane" class="card" template="{$BASE}{$LANG_ABBR}{../@template}" single_template="{$BASE}{$LANG_ABBR}{../@single_template}">
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

        <div class="card-header" data-pane-part="header" data-pane-toolbar="top">
            <ul class="nav nav-tabs card-header-tabs" data-role="tabs">
                <xsl:choose>
                    <xsl:when test="$FIELDS[@language]">
                        <xsl:for-each select="set:distinct($FIELDS[@language]/@tabName)">
                            <xsl:variable name="TAB_NAME" select="."/>
                            <li class="nav-item" data-role="tab">
                                <a href="#{$TAB_ID}" class="nav-link" data-role="tab-link">
                                    <xsl:value-of select="."/>
                                </a>
                                <span class="visually-hidden" data-role="tab-meta">{ lang: <xsl:value-of select="$FIELDS[@tabName=$TAB_NAME]/@language"/> }</span>
                            </li>
                        </xsl:for-each>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:for-each select="set:distinct($FIELDS/@tabName)">
                            <li class="nav-item" data-role="tab">
                                <a href="#{$TAB_ID}" class="nav-link" data-role="tab-link">
                                    <xsl:value-of select="."/>
                                </a>
                            </li>
                        </xsl:for-each>
                    </xsl:otherwise>
                </xsl:choose>
            </ul>
        </div>
        <div class="card-body p-0" data-pane-part="body">
            <div class="tab-content" data-role="tab-content">
                <div id="{$TAB_ID}" class="tab-pane" data-role="pane-item">
                    <div class="grid" data-role="grid">
                        <xsl:if test="ancestor::component/filter">
                            <div class="grid-toolbar d-flex flex-wrap align-items-center gap-3 mb-3" data-role="grid-toolbar">
                                <div class="grid-filter d-flex flex-wrap align-items-center gap-2 w-100" data-role="grid-filter">
                                    <span class="fw-semibold">
                                        <xsl:value-of select="ancestor::component/filter/@title"/>
                                        <xsl:text>:&#160;</xsl:text>
                                    </span>
                                    <select name="fieldName" class="form-select form-select-sm" data-role="filter-field">
                                        <xsl:for-each select="ancestor::component/filter/field">
                                            <option value="[{@tableName}][{@name}]" type="{@type}"><xsl:value-of select="@title"/></option>
                                        </xsl:for-each>
                                    </select>
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
                                    <div class="filter-query flex-grow-1" data-role="filter-query">
                                        <input type="text" class="form-control form-control-sm" data-role="filter-query-input"/>
                                    </div>
                                    <div class="filter-query flex-grow-1 hidden" data-role="filter-query">
                                        <input type="text" class="form-control form-control-sm" data-role="filter-query-input"/>
                                    </div>
                                    <div class="d-flex align-items-center gap-2 ms-auto">
                                        <button type="button" class="btn btn-primary btn-sm" data-action="apply-filter">
                                            <xsl:value-of select="ancestor::component/filter/@apply"/>
                                        </button>
                                        <button type="button" class="btn btn-link btn-sm" data-action="reset-filter">
                                            <xsl:value-of select="ancestor::component/filter/@reset"/>
                                        </button>
                                    </div>
                                </div>
                                <xsl:if test="ancestor::component[@sample='FileRepository']">
                                    <div class="grid-breadcrumbs flex-grow-1" id="breadcrumbs"/>
                                </xsl:if>
                            </div>
                        </xsl:if>
                        <div class="grid-head" data-grid-section="head">
                            <div class="table-responsive">
                                <table class="table table-striped table-hover table-sm mb-0" data-role="grid-table" data-grid-part="head">
                                    <xsl:if test="ancestor::component[@sample='FileRepository']">
                                        <xsl:attribute name="data-fixed-columns">true</xsl:attribute>
                                    </xsl:if>
                                    <xsl:choose>
                                        <xsl:when test="ancestor::component[@sample='FileRepository']">
                                            <col id="col_11" style="width:12%"/>
                                            <col id="col_12" style="width:30%"/>
                                            <col id="col_13" style="width:28%"/>
                                            <col id="col_14" style="width:30%"/>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <xsl:for-each select="$FIELDS[@type!='hidden']">
                                                <xsl:choose>
                                                    <xsl:when test="@language">
                                                        <xsl:if test="@language = $LANG_ID">
                                                            <col id="col_1{position()}"/>
                                                        </xsl:if>
                                                    </xsl:when>
                                                    <xsl:otherwise>
                                                        <col id="col_1{position()}"/>
                                                    </xsl:otherwise>
                                                </xsl:choose>
                                            </xsl:for-each>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                    <thead>
                                        <tr>
                                            <xsl:for-each select="$FIELDS[@type!='hidden']">
                                                <xsl:choose>
                                                    <xsl:when test="@language">
                                                        <xsl:if test="@language = $LANG_ID">
                                                            <th name="{@name}"><xsl:value-of select="@title"/></th>
                                                        </xsl:if>
                                                    </xsl:when>
                                                    <xsl:otherwise>
                                                        <th name="{@name}"><xsl:value-of select="@title"/></th>
                                                    </xsl:otherwise>
                                                </xsl:choose>
                                            </xsl:for-each>
                                        </tr>
                                    </thead>
                                </table>
                            </div>
                        </div>
                        <div class="grid-body" data-grid-section="body">
                            <div class="table-responsive" data-grid-section="body-inner">
                                <table class="table table-striped table-hover table-sm mb-0" data-role="grid-table" data-grid-part="body">
                                    <xsl:if test="ancestor::component[@sample='FileRepository']">
                                        <xsl:attribute name="data-fixed-columns">true</xsl:attribute>
                                    </xsl:if>
                                    <xsl:choose>
                                        <xsl:when test="ancestor::component[@sample='FileRepository']">
                                            <col id="col_11a" style="width:12%"/>
                                            <col id="col_12a" style="width:30%"/>
                                            <col id="col_13a" style="width:28%"/>
                                            <col id="col_14a" style="width:30%"/>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <xsl:for-each select="$FIELDS[@type!='hidden']">
                                                <xsl:choose>
                                                    <xsl:when test="@language">
                                                        <xsl:if test="@language = $LANG_ID">
                                                            <col id="col_{position()}a"/>
                                                        </xsl:if>
                                                    </xsl:when>
                                                    <xsl:otherwise>
                                                        <col id="col_{position()}a"/>
                                                    </xsl:otherwise>
                                                </xsl:choose>
                                            </xsl:for-each>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                    <thead style="visibility: hidden;">
                                        <tr>
                                            <xsl:for-each select="$FIELDS[@type!='hidden']">
                                                <xsl:choose>
                                                    <xsl:when test="@language">
                                                        <xsl:if test="@language = $LANG_ID">
                                                            <th id="col_{position()}"><xsl:value-of select="@title"/></th>
                                                        </xsl:if>
                                                    </xsl:when>
                                                    <xsl:otherwise>
                                                        <th id="col_{position()}"><xsl:value-of select="@title"/></th>
                                                    </xsl:otherwise>
                                                </xsl:choose>
                                            </xsl:for-each>
                                        </tr>
                                    </thead>
                                    <tbody/>
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