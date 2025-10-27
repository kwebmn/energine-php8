<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <!--
        Секция 1. Инпуты.
        В этой секции собраны правила вывода полей формы, которые создают сам html-элемент (input, select, etc.).
    -->
    <!-- строковое поле (string), или поле, к которому не нашлось шаблона -->
    <xsl:template match="field[ancestor::component[@type='form']]" mode="field_input">
        <input>
            <xsl:attribute name="class">
                <xsl:text>form-control</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
        </input>
    </xsl:template>

    <!-- поле для почтового адреса (email) -->
    <xsl:template match="field[@type='email'][ancestor::component[@type='form']]" mode="field_input">
        <input>
            <xsl:attribute name="class">
                <xsl:text>form-control</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">email</xsl:attribute>
        </input>
    </xsl:template>

    <!-- поле для телефона (phone)-->
    <xsl:template match="field[@type='phone'][ancestor::component[@type='form']]" mode="field_input">
        <input>
            <xsl:attribute name="class">
                <xsl:text>form-control</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">tel</xsl:attribute>
        </input>
    </xsl:template>

    <!-- поле с автодополнением (textbox) -->
    <xsl:template match="field[@type='textbox'][ancestor::component[@type='form']]" mode="field_input">
        <xsl:variable name="SEPARATOR" select="@separator"/>
<!--        <script type="text/javascript" src="scripts/AcplField.js"></script>-->
        <input data-role="acpl">
            <xsl:attribute name="class">
                <xsl:text>form-control</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="nrgn:url" xmlns:nrgn="http://energine.org">
                <xsl:value-of select="$BASE"/><xsl:value-of
                    select="ancestor::component/@single_template"/><xsl:value-of select="@url"/>
            </xsl:attribute>
            <xsl:attribute name="nrgn:separator" xmlns:nrgn="http://energine.org">
                <xsl:value-of select="$SEPARATOR"/>
            </xsl:attribute>
            <xsl:attribute name="value">
                <xsl:for-each select="items/item">
                    <xsl:value-of select="."/>
                    <xsl:if test="position()!=last()">
                        <xsl:value-of select="$SEPARATOR"/>
                    </xsl:if>
                </xsl:for-each>
            </xsl:attribute>
            <xsl:if test="@name = 'tags'">
                <xsl:attribute name="component_id">
                    <xsl:value-of select="generate-id(../..)"/>
                </xsl:attribute>
            </xsl:if>
        </input>
    </xsl:template>

    <!-- числовое поле (integer) -->
    <xsl:template match="field[@type='integer'][ancestor::component[@type='form']]" mode="field_input">
        <input>
            <xsl:attribute name="class">
                <xsl:text>form-control</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">number</xsl:attribute>
            <xsl:attribute name="step">1</xsl:attribute>
        </input>
    </xsl:template>

    <!-- числовое поле (float) -->
    <xsl:template match="field[@type='float'][ancestor::component[@type='form']]" mode="field_input">
        <input>
            <xsl:attribute name="class">
                <xsl:text>form-control</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">number</xsl:attribute>
            <xsl:attribute name="step">any</xsl:attribute>
        </input>
    </xsl:template>

    <!-- поле пароля (password) -->
    <xsl:template match="field[@type='password' and ancestor::component[@type='form']]" mode="field_input">
        <input>
            <xsl:attribute name="class">
                <xsl:text>form-control</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">password</xsl:attribute>
            <xsl:attribute name="name"><xsl:choose>
                <xsl:when test="@tableName"><xsl:value-of select="concat(@tableName, substring(concat('[', @language, ']'), 1, (string-length(@language) + 2) * boolean(@language)), '[', @name, ']')"/></xsl:when>
                <xsl:otherwise><xsl:value-of select="concat(@name, substring(concat('[', @language, ']'), 1, (string-length(@language) + 2) * boolean(@language)))"/></xsl:otherwise>
            </xsl:choose></xsl:attribute>
        </input>
    </xsl:template>

    <!-- поле логического типа (boolean) -->
    <xsl:template match="field[@type='boolean'][ancestor::component[@type='form']]" mode="field_input">
        <xsl:variable name="LANG_SUFFIX" select="substring(concat('[', @language, ']'), 1, (string-length(@language) + 2) * boolean(@language))"/>
        <xsl:variable name="FIELD_NAME"><xsl:choose><xsl:when test="@tableName"><xsl:value-of select="concat(@tableName, $LANG_SUFFIX, '[', @name, ']')"/></xsl:when><xsl:otherwise><xsl:value-of select="concat(@name, $LANG_SUFFIX)"/></xsl:otherwise></xsl:choose></xsl:variable>
        <xsl:variable name="IS_REQUIRED" select="@nullable!='1'"/>
        <xsl:variable name="FIELD_ID">
            <xsl:value-of select="@name"/>
            <xsl:if test="@language">_<xsl:value-of select="@language"/></xsl:if>
        </xsl:variable>
        <div class="form-check">
            <input type="hidden" name="{$FIELD_NAME}" value="0"/>
            <input type="checkbox" id="{$FIELD_ID}" name="{$FIELD_NAME}" value="1">
                <xsl:attribute name="class">
                    <xsl:text>form-check-input</xsl:text>
                    <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
                </xsl:attribute>
                <xsl:if test="$IS_REQUIRED">
                    <xsl:attribute name="required">required</xsl:attribute>
                </xsl:if>
                <xsl:if test=". = 1">
                    <xsl:attribute name="checked">checked</xsl:attribute>
                </xsl:if>
            </input>
            <xsl:if test="@title">
                <label class="form-check-label" for="{$FIELD_ID}">
                    <xsl:value-of select="@title" disable-output-escaping="yes"/>
                </label>
            </xsl:if>
        </div>
    </xsl:template>

    <!-- поле загрузки файла (file) -->
    <xsl:template match="field[@type='file'][ancestor::component[@type='form']]" mode="field_input">
        <xsl:variable name="BASE_ID" select="generate-id(.)"/>
        <xsl:variable name="PATH_ID" select="concat($BASE_ID, '_path')"/>
        <xsl:variable name="FILE_INPUT_ID" select="concat($BASE_ID, '_file')"/>
        <xsl:variable name="PREVIEW_ID" select="concat($BASE_ID, '_preview')"/>
        <xsl:variable name="HAS_VALUE" select="string-length(.) &gt; 0"/>
        <div>
            <xsl:attribute name="class">
                <xsl:text>mb-2 preview</xsl:text>
                <xsl:if test="not($HAS_VALUE)"><xsl:text> d-none</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:attribute name="id"><xsl:value-of select="$PREVIEW_ID"/></xsl:attribute>
            <xsl:choose>
                <xsl:when test="$HAS_VALUE">
                    <a target="_blank">
                        <xsl:attribute name="href"><xsl:value-of select="$MEDIA_URL"/><xsl:value-of select="."/></xsl:attribute>
                        <img alt="">
                            <xsl:attribute name="src"><xsl:value-of select="$MEDIA_URL"/><xsl:choose>
                                <xsl:when test="@media_type='image'">resizer/w400-h0/<xsl:value-of select="."/></xsl:when>
                                <xsl:when test="@media_type='video'">resizer/w0-h0/<xsl:value-of select="."/></xsl:when>
                                <xsl:otherwise>images/icons/icon_undefined.gif</xsl:otherwise>
                            </xsl:choose></xsl:attribute>
                        </img>
                    </a>
                </xsl:when>
                <xsl:otherwise>
                    <img alt=""/>
                </xsl:otherwise>
            </xsl:choose>
        </div>
        <div class="input-group" data-role="file-uploader">
            <xsl:attribute name="data-target"><xsl:value-of select="$PATH_ID"/></xsl:attribute>
            <xsl:attribute name="data-preview"><xsl:value-of select="$PREVIEW_ID"/></xsl:attribute>
            <xsl:if test="@quickUploadPid">
                <xsl:attribute name="data-quick-upload-pid"><xsl:value-of select="@quickUploadPid"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="@quickUploadPath">
                <xsl:attribute name="data-quick-upload-path"><xsl:value-of select="@quickUploadPath"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="@quickUploadEnabled">
                <xsl:attribute name="data-quick-upload-enabled"><xsl:value-of select="@quickUploadEnabled"/></xsl:attribute>
            </xsl:if>
            <input id="{$PATH_ID}" readonly="readonly">
                <xsl:attribute name="class">
                    <xsl:text>form-control</xsl:text>
                    <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
                </xsl:attribute>
                <xsl:variable name="LANG_SUFFIX" select="substring(concat('[', @language, ']'), 1, (string-length(@language) + 2) * boolean(@language))"/>
                <xsl:attribute name="name"><xsl:choose>
                    <xsl:when test="@tableName"><xsl:value-of select="concat(@tableName, $LANG_SUFFIX, '[', @name, ']')"/></xsl:when>
                    <xsl:otherwise><xsl:value-of select="concat(@name, $LANG_SUFFIX)"/></xsl:otherwise>
                </xsl:choose></xsl:attribute>
                <xsl:attribute name="value"><xsl:value-of select="."/></xsl:attribute>
                <xsl:if test="@nullable!='1'">
                    <xsl:attribute name="required">required</xsl:attribute>
                </xsl:if>
            </input>
            <button class="btn btn-outline-secondary" type="button" data-action="open-filelib">
                <xsl:attribute name="data-link"><xsl:value-of select="$PATH_ID"/></xsl:attribute>
                <xsl:attribute name="data-preview"><xsl:value-of select="$PREVIEW_ID"/></xsl:attribute>
                <xsl:text>Файл…</xsl:text>
            </button>
            <xsl:if test="@quickUploadPid">
                <button class="btn btn-outline-secondary" type="button" data-action="quick-upload">
                    <xsl:attribute name="data-link"><xsl:value-of select="$PATH_ID"/></xsl:attribute>
                    <xsl:attribute name="data-preview"><xsl:value-of select="$PREVIEW_ID"/></xsl:attribute>
                    <xsl:attribute name="data-quick-upload-pid"><xsl:value-of select="@quickUploadPid"/></xsl:attribute>
                    <xsl:if test="@quickUploadPath">
                        <xsl:attribute name="data-quick-upload-path"><xsl:value-of select="@quickUploadPath"/></xsl:attribute>
                    </xsl:if>
                    <xsl:attribute name="data-quick-upload-enabled"><xsl:value-of select="@quickUploadEnabled"/></xsl:attribute>
                    <xsl:if test="@quickUploadEnabled!='1'">
                        <xsl:attribute name="disabled">disabled</xsl:attribute>
                    </xsl:if>
                    <xsl:value-of select="$TRANSLATION[@const='BTN_QUICK_UPLOAD']"/>
                </button>
                <input type="file" class="d-none" data-action="upload-file">
                    <xsl:attribute name="id"><xsl:value-of select="$FILE_INPUT_ID"/></xsl:attribute>
                    <xsl:attribute name="data-target"><xsl:value-of select="$PATH_ID"/></xsl:attribute>
                    <xsl:attribute name="data-preview"><xsl:value-of select="$PREVIEW_ID"/></xsl:attribute>
                    <xsl:attribute name="data-quick-upload-pid"><xsl:value-of select="@quickUploadPid"/></xsl:attribute>
                    <xsl:if test="@quickUploadPath">
                        <xsl:attribute name="data-quick-upload-path"><xsl:value-of select="@quickUploadPath"/></xsl:attribute>
                    </xsl:if>
                    <xsl:attribute name="data-quick-upload-enabled"><xsl:value-of select="@quickUploadEnabled"/></xsl:attribute>
                    <xsl:if test="@quickUploadEnabled!='1'">
                        <xsl:attribute name="disabled">disabled</xsl:attribute>
                    </xsl:if>
                </input>
            </xsl:if>
            <xsl:if test="@nullable='1'">
                <button type="button" data-action="clear-file">
                    <xsl:attribute name="class">
                        <xsl:text>btn btn-link</xsl:text>
                        <xsl:if test="not($HAS_VALUE)"><xsl:text> d-none</xsl:text></xsl:if>
                    </xsl:attribute>
                    <xsl:attribute name="data-target"><xsl:value-of select="$PATH_ID"/></xsl:attribute>
                    <xsl:attribute name="data-preview"><xsl:value-of select="$PREVIEW_ID"/></xsl:attribute>
                    <xsl:value-of select="$TRANSLATION[@const='TXT_CLEAR']"/>
                </button>
            </xsl:if>
        </div>
        <div class="progress mt-2 d-none" data-role="upload-progress">
            <xsl:attribute name="data-target"><xsl:value-of select="$PATH_ID"/></xsl:attribute>
            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuemin="0" aria-valuemax="100" style="width: 0%;">0%</div>
        </div>
        <div class="form-text text-danger d-none" data-role="upload-error">
            <xsl:attribute name="data-target"><xsl:value-of select="$PATH_ID"/></xsl:attribute>
        </div>
    </xsl:template>

    <!-- поле выбора из списка (select) -->
    <xsl:template match="field[@type='select'][ancestor::component[@type='form']]" mode="field_input">
        <xsl:variable name="FIELD_ID">
            <xsl:value-of select="@name"/>
            <xsl:if test="@language">_<xsl:value-of select="@language"/></xsl:if>
        </xsl:variable>
        <select id="{$FIELD_ID}">
            <xsl:attribute name="class">
                <xsl:text>form-select</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:variable name="LANG_SUFFIX" select="substring(concat('[', @language, ']'), 1, (string-length(@language) + 2) * boolean(@language))"/>
            <xsl:attribute name="name"><xsl:choose>
                <xsl:when test="@tableName"><xsl:value-of select="concat(@tableName, $LANG_SUFFIX, '[', @name, ']')"/></xsl:when>
                <xsl:otherwise><xsl:value-of select="concat(@name, $LANG_SUFFIX)"/></xsl:otherwise>
            </xsl:choose></xsl:attribute>
            <xsl:if test="@nullable!='1'">
                <xsl:attribute name="required">required</xsl:attribute>
            </xsl:if>
            <xsl:if test="@nullable='1'">
                <option></option>
            </xsl:if>
            <xsl:apply-templates mode="field_input"/>
        </select>
        
        
    </xsl:template>

    <xsl:template match="field[@type='select' and @editor][ancestor::component[@exttype='grid' or @exttype='feed']]" mode="field_input">
        <div class="input-group">
            <xsl:variable name="FIELD_ID">
                <xsl:value-of select="@name"/>
                <xsl:if test="@language">_<xsl:value-of select="@language"/></xsl:if>
            </xsl:variable>
            <select id="{$FIELD_ID}">
                <xsl:attribute name="class">
                    <xsl:text>form-select</xsl:text>
                    <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
                </xsl:attribute>
                <xsl:variable name="LANG_SUFFIX" select="substring(concat('[', @language, ']'), 1, (string-length(@language) + 2) * boolean(@language))"/>
                <xsl:attribute name="name"><xsl:choose>
                    <xsl:when test="@tableName"><xsl:value-of select="concat(@tableName, $LANG_SUFFIX, '[', @name, ']')"/></xsl:when>
                    <xsl:otherwise><xsl:value-of select="concat(@name, $LANG_SUFFIX)"/></xsl:otherwise>
                </xsl:choose></xsl:attribute>
                <xsl:if test="@nullable!='1'">
                    <xsl:attribute name="required">required</xsl:attribute>
                </xsl:if>
                <xsl:if test="@nullable='1'">
                    <option></option>
                </xsl:if>
                <xsl:apply-templates mode="field_input"/>
            </select>
            <button class="btn btn-outline-secondary" type="button" data-action="crud" data-field="{@name}" data-editor="{@editor}">
                <xsl:text>...</xsl:text>            
            </button>
        </div>
    </xsl:template>
    <xsl:template match="option[ancestor::field[@type='select'][ancestor::component[@type='form']]]" mode="field_input">
        <option value="{@id}">
            <xsl:copy-of select="attribute::*[name(.)!='id']"/>
            <xsl:value-of select="."/>
        </option>
    </xsl:template>

    <!-- поле множественного выбора (multi) -->
    <xsl:template match="field[@type='multi'][@editor][ancestor::component[@exttype='grid' or @exttype='feed']]" mode="field_input">
        <xsl:variable name="FIELD_ID">
            <xsl:value-of select="@name"/>
            <xsl:if test="@language">_<xsl:value-of select="@language"/></xsl:if>
        </xsl:variable>
        <xsl:variable name="LANG_SUFFIX" select="substring(concat('[', @language, ']'), 1, (string-length(@language) + 2) * boolean(@language))"/>
        <xsl:variable name="NAME_BASE">
            <xsl:choose>
                <xsl:when test="@tableName"><xsl:value-of select="concat(@tableName, $LANG_SUFFIX, '[', @name, ']')"/></xsl:when>
                <xsl:otherwise><xsl:value-of select="concat(@name, $LANG_SUFFIX)"/></xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="IS_REQUIRED" select="@nullable!='1'"/>
        <xsl:variable name="HAS_ERROR" select="boolean(error)"/>
        <div class="input-group">
            <select id="{$FIELD_ID}" multiple="multiple">
                <xsl:attribute name="class">
                    <xsl:text>form-select</xsl:text>
                    <xsl:if test="$HAS_ERROR"><xsl:text> is-invalid</xsl:text></xsl:if>
                </xsl:attribute>
                <xsl:attribute name="name"><xsl:value-of select="concat($NAME_BASE, '[]')"/></xsl:attribute>
                <xsl:if test="$IS_REQUIRED">
                    <xsl:attribute name="required">required</xsl:attribute>
                </xsl:if>
                <xsl:for-each select="options/option">
                    <option value="{@id}">
                        <xsl:copy-of select="attribute::*[name(.)!='id' and name(.)!='selected']"/>
                        <xsl:if test="@selected">
                            <xsl:attribute name="selected">selected</xsl:attribute>
                        </xsl:if>
                        <xsl:value-of select="."/>
                    </option>
                </xsl:for-each>
            </select>
            <button class="btn btn-outline-secondary" type="button" data-action="crud" data-field="{@name}" data-editor="{@editor}">
                <xsl:text>...</xsl:text>
            </button>
        </div>
    </xsl:template>

    <xsl:template match="field[@type='multi'][ancestor::component[@type='form']]" mode="field_input">
        <xsl:variable name="FIELD_ID">
            <xsl:value-of select="@name"/>
            <xsl:if test="@language">_<xsl:value-of select="@language"/></xsl:if>
        </xsl:variable>
        <xsl:variable name="LANG_SUFFIX" select="substring(concat('[', @language, ']'), 1, (string-length(@language) + 2) * boolean(@language))"/>
        <xsl:variable name="NAME_BASE">
            <xsl:choose>
                <xsl:when test="@tableName"><xsl:value-of select="concat(@tableName, $LANG_SUFFIX, '[', @name, ']')"/></xsl:when>
                <xsl:otherwise><xsl:value-of select="concat(@name, $LANG_SUFFIX)"/></xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="IS_REQUIRED" select="@nullable!='1'"/>
        <xsl:variable name="HAS_ERROR" select="boolean(error)"/>
        <xsl:variable name="MULTI_SELECT">
            <select id="{$FIELD_ID}" multiple="multiple">
                <xsl:attribute name="class">
                    <xsl:text>form-select</xsl:text>
                    <xsl:if test="$HAS_ERROR"><xsl:text> is-invalid</xsl:text></xsl:if>
                </xsl:attribute>
                <xsl:attribute name="name"><xsl:value-of select="concat($NAME_BASE, '[]')"/></xsl:attribute>
                <xsl:if test="$IS_REQUIRED">
                    <xsl:attribute name="required">required</xsl:attribute>
                </xsl:if>
                <xsl:for-each select="options/option">
                    <option value="{@id}">
                        <xsl:copy-of select="attribute::*[name(.)!='id' and name(.)!='selected']"/>
                        <xsl:if test="@selected">
                            <xsl:attribute name="selected">selected</xsl:attribute>
                        </xsl:if>
                        <xsl:value-of select="."/>
                    </option>
                </xsl:for-each>
            </select>
        </xsl:variable>
        <xsl:choose>
            <xsl:when test="@editor">
                <div class="input-group">
                    <xsl:copy-of select="$MULTI_SELECT"/>
                    <button class="btn btn-outline-secondary" type="button" data-action="crud" data-field="{@name}" data-editor="{@editor}">
                        <xsl:text>...</xsl:text>
                    </button>
                </div>
            </xsl:when>
            <xsl:otherwise>
                <xsl:copy-of select="$MULTI_SELECT"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- текстовое поле (text) -->
    <xsl:template match="field[@type='text'][ancestor::component[@type='form']]" mode="field_input">
        <textarea>
            <xsl:attribute name="class">
                <xsl:text>form-control</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:value-of select="."/>
        </textarea>
    </xsl:template>

    <!-- текстовое поле (text) -->
    <xsl:template match="field[@type='code'][ancestor::component[@type='form']]" mode="field_input">
        <textarea data-role="code-editor">
            <xsl:attribute name="class">
                <xsl:text>form-control</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:value-of select="."/>
        </textarea>
    </xsl:template>

    <!-- поле типа rtf текст (htmlblock) -->
    <xsl:template match="field[@type='htmlblock'][ancestor::component[@type='form']]" mode="field_input">
        <textarea data-role="rich-editor">
            <xsl:attribute name="class">
                <xsl:text>form-control</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:value-of select="."/>
        </textarea>
    </xsl:template>

    <!-- поле для даты (datetime) -->
    <xsl:template match="field[@type='datetime'][ancestor::component[@type='form']]" mode="field_input">
        <input data-role="datetime">
            <xsl:attribute name="class">
                <xsl:text>form-control</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
        </input>
<!--        <script type="text/javascript">-->
<!--            window.addEvent('domready', function(){-->
<!--            Energine.createDateTimePicker($mt('<xsl:value-of select="@name"/>'), <xsl:value-of-->
<!--                select="boolean(@nullable)"/>);-->
<!--            });-->
<!--        </script>-->
    </xsl:template>

    <!-- поле для даты (date) -->
    <xsl:template match="field[@type='date'][ancestor::component[@type='form']]" mode="field_input">
        <input data-role="date">
            <xsl:attribute name="class">
                <xsl:text>form-control</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
        </input>
<!--        <script type="text/javascript">-->
<!--            window.addEvent('domready', function(){-->
<!--            Energine.createDatePicker(-->
<!--            $mt('<xsl:value-of select="@name"/>'),-->
<!--            <xsl:value-of select="boolean(@nullable)"/>-->
<!--            );-->
<!--            });-->
<!--        </script>-->
    </xsl:template>

    <!-- Для полей даты как части стандартной формы навешиваение DatePicker реализуется в js -->

    <!-- поле для даты в гридах (datetime)  -->
    <xsl:template match="field[@type='datetime'][ancestor::component[@type='form' and @exttype='grid']]" mode="field_input">
        <input data-role="datetime">
            <xsl:attribute name="class">
                <xsl:text>form-control</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
        </input>
    </xsl:template>

    <!-- поле для даты в гридах (date) -->
    <xsl:template match="field[@type='date'][ancestor::component[@type='form' and @exttype='grid']]" mode="field_input">
        <input data-role="date">
            <xsl:attribute name="class">
                <xsl:text>form-control</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
        </input>
    </xsl:template>

    <!-- поле для выбора родительского раздела в гридах (smap) -->
    <xsl:template match="field[@type='smap' and ancestor::component[@type='form' and (@exttype='feed' or @exttype='grid')]]" mode="field_input">
        <xsl:variable name="BASE_ID" select="generate-id(.)"/>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">hidden</xsl:attribute>
            <xsl:attribute name="id"><xsl:value-of select="$BASE_ID"/>_id</xsl:attribute>
        </input>
        <div class="input-group">
            <input type="text" id="{$BASE_ID}_name" value="{@smap_name}" readonly="readonly">
                <xsl:attribute name="class">
                    <xsl:text>form-control</xsl:text>
                    <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
                </xsl:attribute>
            </input>
            <button class="btn btn-outline-secondary" type="button" data-action="open-smap">
                <xsl:attribute name="data-name"><xsl:value-of select="$BASE_ID"/>_name</xsl:attribute>
                <xsl:attribute name="data-id"><xsl:value-of select="$BASE_ID"/>_id</xsl:attribute>
                <xsl:text>Выбрать…</xsl:text>
            </button>
        </div>
    </xsl:template>

    <!-- поле типа thumb используется только в FileRepository -->
    <xsl:template match="field[@type='thumb'][ancestor::component[@type='form']]" mode="field_input">
        <div class="preview">
            <img border="0" id="preview_{@name}" data="data_{@name}"  width="{@width}" height="{@height}">
                <xsl:choose>
                    <xsl:when test="../field[@name='upl_path']=''">
                        <xsl:attribute name="class">d-none<xsl:if test="@name!='preview'"> thumb</xsl:if></xsl:attribute>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:if test="@name!='preview'"><xsl:attribute name="class">thumb</xsl:attribute></xsl:if>
                        <xsl:attribute name="src"><xsl:value-of select="$RESIZER_URL"/>w<xsl:value-of select="@width"/>-h<xsl:value-of select="@height"/>/<xsl:value-of  select="../field[@name='upl_path']"/>?<xsl:value-of select="generate-id()"/></xsl:attribute>
                    </xsl:otherwise>
                </xsl:choose>
            </img>
        </div>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">hidden</xsl:attribute>
            <xsl:attribute name="id">data_<xsl:value-of select="@name"/></xsl:attribute>
        </input>
        <input type="file" id="uploader_{@name}" preview="preview_{@name}" data="data_{@name}">
            <xsl:choose>
                <xsl:when test="@name='preview'"><xsl:attribute name="class">preview</xsl:attribute></xsl:when>
                <xsl:otherwise><xsl:attribute name="class">thumb</xsl:attribute></xsl:otherwise>
            </xsl:choose>
        </input>
        <xsl:if test="@name='preview'">
            <hr/>
        </xsl:if>
    </xsl:template>


    <!-- Секция 3. Поля с правами "только на чтение". -->
    <!-- для любого поля, на которое нет прав на просмотр -->
    <xsl:template match="field[@mode=0][ancestor::component[@type='form']]"/>

    <!-- шаблон-обвязка для любого поля, на которое права только чтение -->
    <xsl:template match="field[@mode='1'][ancestor::component[@type='form']]">
        <xsl:if test=".!=''">
            <xsl:variable name="IS_REQUIRED" select="@nullable!='1'"/>
            <div class="mb-3" data-role="form-field">
                <xsl:attribute name="data-type">
                    <xsl:choose>
                        <xsl:when test="@type"><xsl:value-of select="@type"/></xsl:when>
                        <xsl:otherwise>string</xsl:otherwise>
                    </xsl:choose>
                </xsl:attribute>
                <xsl:attribute name="data-required"><xsl:value-of select="$IS_REQUIRED"/></xsl:attribute>
                <xsl:apply-templates select="." mode="field_name_readonly"/>
                <div id="control_{@language}_{@name}">
                    <xsl:apply-templates select="." mode="field_input_readonly"/>
                </div>
                <xsl:call-template name="render-field-messages"/>
            </div>
        </xsl:if>
    </xsl:template>

    <xsl:template match="field[@mode='1'][ancestor::component[@type='form']]" mode="field_name_readonly">
        <xsl:if test="@title and @type!='boolean'">
            <label for="{@name}" class="form-label">
                <xsl:value-of select="@title" disable-output-escaping="yes"/>
            </label>
        </xsl:if>
    </xsl:template>

    <!-- для любого поля, на которое права только чтение -->
    <xsl:template match="field[@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <span class="form-control-plaintext d-block"><xsl:value-of select="." disable-output-escaping="yes"/></span>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
        </input>
    </xsl:template>

    <xsl:template match="field[@type='boolean'][@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <xsl:variable name="LANG_SUFFIX" select="substring(concat('[', @language, ']'), 1, (string-length(@language) + 2) * boolean(@language))"/>
        <xsl:variable name="FIELD_NAME"><xsl:choose><xsl:when test="@tableName"><xsl:value-of select="concat(@tableName, $LANG_SUFFIX, '[', @name, ']')"/></xsl:when><xsl:otherwise><xsl:value-of select="concat(@name, $LANG_SUFFIX)"/></xsl:otherwise></xsl:choose></xsl:variable>
        <xsl:variable name="FIELD_ID">
            <xsl:value-of select="@name"/>
            <xsl:if test="@language">_<xsl:value-of select="@language"/></xsl:if>
        </xsl:variable>
        <input type="hidden" name="{$FIELD_NAME}" value="{.}"/>
        <div class="form-check">
            <input class="form-check-input" type="checkbox" id="{$FIELD_ID}" name="{$FIELD_NAME}" disabled="disabled" value="1">
                <xsl:if test=".=1">
                    <xsl:attribute name="checked">checked</xsl:attribute>
                </xsl:if>
            </input>
            <xsl:if test="@title">
                <label class="form-check-label" for="{$FIELD_ID}">
                    <xsl:value-of select="@title" disable-output-escaping="yes"/>
                </label>
            </xsl:if>
        </div>
    </xsl:template>

    <!-- для полей HTMLBLOCK и TEXT на которые права только чтение -->
    <xsl:template match="field[@type='htmlblock' or @type='text'][@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <div class="form-control-plaintext d-block"><xsl:value-of select="." disable-output-escaping="yes"/></div>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
        </input>
    </xsl:template>

    <!-- для поля EMAIL на которое права только чтение -->
    <xsl:template match="field[@type='email'][@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <a href="mailto:{.}" class="form-control-plaintext d-block"><xsl:value-of select="."/></a>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
        </input>
    </xsl:template>

    <xsl:template match="field[@type='file'][@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <div>
            <xsl:choose>
                <xsl:when test="(@media_type='video' or @media_type='image') and .!=''">
                    <div class="mb-2 preview" id="{generate-id(.)}_preview">
                        <a target="_blank">
                            <xsl:attribute name="href"><xsl:value-of select="$MEDIA_URL"/><xsl:value-of select="."/></xsl:attribute>
                            <img alt="">
                                <xsl:attribute name="src"><xsl:value-of select="$MEDIA_URL"/><xsl:choose>
                                    <xsl:when test="@media_type='image'"><xsl:value-of select="."/></xsl:when>
                                    <xsl:when test="@media_type='video'">resizer/w0-h0/<xsl:value-of select="."/></xsl:when>
                                    <xsl:otherwise>images/icons/icon_undefined.gif</xsl:otherwise>
                                </xsl:choose></xsl:attribute>
                            </img>
                        </a>
                    </div>
                </xsl:when>
                <xsl:otherwise>
                    <a href="{$MEDIA_URL}{.}" target="_blank" class="form-control-plaintext d-block"><xsl:value-of select="."/></a>
                </xsl:otherwise>
            </xsl:choose>
            <input>
                <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
            </input>
        </div>
    </xsl:template>

    <!-- read-only поле типа select -->
    <xsl:template match="field[@type='select'][@mode='1'][ancestor::component[@type='form']]">
        <div class="mb-3" data-role="form-field">
            <xsl:attribute name="data-type"><xsl:value-of select="@type"/></xsl:attribute>
            <xsl:attribute name="data-required"><xsl:value-of select="@nullable!='1'"/></xsl:attribute>
            <xsl:apply-templates select="." mode="field_name_readonly"/>
            <div id="control_{@language}_{@name}">
                <xsl:apply-templates select="." mode="field_input_readonly"/>
            </div>
            <xsl:call-template name="render-field-messages"/>
        </div>
    </xsl:template>

    <xsl:template match="field[@type='select'][@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <span class="form-control-plaintext d-block"><xsl:value-of select="options/option[@selected='selected']"/></span>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
            <xsl:attribute name="value"><xsl:value-of select="options/option[@selected='selected']/@id"/></xsl:attribute>
        </input>
    </xsl:template>

    <!-- read-only поле типа multiselect -->
    <xsl:template match="field[@type='multi'][@mode='1'][ancestor::component[@type='form']]">
        <div class="mb-3" data-role="form-field">
            <xsl:attribute name="data-type"><xsl:value-of select="@type"/></xsl:attribute>
            <xsl:attribute name="data-required"><xsl:value-of select="@nullable!='1'"/></xsl:attribute>
            <xsl:apply-templates select="." mode="field_name_readonly"/>
            <div id="control_{@language}_{@name}">
                <xsl:apply-templates select="." mode="field_input_readonly"/>
            </div>
            <xsl:call-template name="render-field-messages"/>
        </div>
    </xsl:template>

    <xsl:template match="field[@type='multi'][@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <div class="form-control-plaintext d-block">
            <xsl:for-each select="options/option[@selected='selected']">
                <div><xsl:value-of select="."/></div>
                <input type="hidden" value="{@id}">
                    <xsl:attribute name="name"><xsl:choose>
                        <xsl:when test="../../@tableName"><xsl:value-of select="concat(../../@tableName, substring(concat('[', ../../@language, ']'), 1, (string-length(../../@language) + 2) * boolean(../../@language)), '[', ../../@name, ']')"/></xsl:when>
                        <xsl:otherwise><xsl:value-of select="concat(../../@name, substring(concat('[', ../../@language, ']'), 1, (string-length(../../@language) + 2) * boolean(../../@language)))"/></xsl:otherwise>
                    </xsl:choose>[]</xsl:attribute>
                </input>
            </xsl:for-each>
        </div>
    </xsl:template>

    <!-- read-only поле типа image -->
    <xsl:template match="field[@type='image'][@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <div class="image">
            <img src="{.}"/>
            <input>
                <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
            </input>
        </div>
    </xsl:template>

    <!-- read-only поле типа date и datetime -->
    <xsl:template match="field[@type='date' or @type='datetime'][@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <div class="form-control-plaintext d-block"><xsl:value-of select="." disable-output-escaping="yes"/></div>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
        </input>
    </xsl:template>


    <!--
        Секция 4. Остальные поля формы.
        В этой секции собраны остальные поля, которым не нужна обычная обвязка.
     -->
    <!-- поле типа hidden -->
    <xsl:template match="field[@type='hidden'][ancestor::component[@type='form']]">
        <input type="hidden" id="{@name}" value="{.}">
            <xsl:variable name="LANG_SUFFIX" select="substring(concat('[', @language, ']'), 1, (string-length(@language) + 2) * boolean(@language))"/>
            <xsl:attribute name="name"><xsl:choose>
                <xsl:when test="@tableName"><xsl:value-of select="concat(@tableName, $LANG_SUFFIX, '[', @name, ']')"/></xsl:when>
                <xsl:otherwise><xsl:value-of select="concat(@name, $LANG_SUFFIX)"/></xsl:otherwise>
            </xsl:choose></xsl:attribute>
        </input>
    </xsl:template>

    <!-- для PK  -->
    <xsl:template match="field[@key='1' and @type='hidden'][ancestor::component[@type='form']]">
        <input type="hidden" id="{@name}" value="{.}" primary="primary">
            <xsl:variable name="LANG_SUFFIX" select="substring(concat('[', @language, ']'), 1, (string-length(@language) + 2) * boolean(@language))"/>
            <xsl:attribute name="name"><xsl:choose>
                <xsl:when test="@tableName"><xsl:value-of select="concat(@tableName, $LANG_SUFFIX, '[', @name, ']')"/></xsl:when>
                <xsl:otherwise><xsl:value-of select="concat(@name, $LANG_SUFFIX)"/></xsl:otherwise>
            </xsl:choose></xsl:attribute>
        </input>
    </xsl:template>

    <!-- поле типа captcha -->
    <xsl:template match="field[@type='captcha'][ancestor::component[@type='list']]"/>

    <xsl:template match="field[@type='captcha'][ancestor::component[@type='form']]">
        <div class="mb-3" data-role="form-field" data-type="captcha">
            <xsl:attribute name="data-required"><xsl:value-of select="@nullable!='1'"/></xsl:attribute>
            <div id="control_{@language}_{@name}">
                <xsl:value-of select="." disable-output-escaping="yes"/>
            </div>
            <xsl:call-template name="render-field-messages"/>
        </div>
    </xsl:template>

    <!-- поле error -->
    <xsl:template match="field[@name='error_message'][ancestor::component[@type='form']]">
        <div class="invalid-feedback d-block" role="alert">
            <xsl:value-of select="." disable-output-escaping="yes"/>
        </div>
    </xsl:template>


    <!-- Секция 5. Поля, которые не относятся к стандартному выводу. -->
    <!-- поле для загрузки файла в файловом репозитории -->
    <xsl:template match="field[@name='upl_path'][ancestor::component[@sample='FileRepository' and @type='form']]" mode="field_input">
        <div class="preview">
            <img border="0" id="preview" class="d-none"/>
        </div>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">hidden</xsl:attribute>
            <xsl:attribute name="id">data</xsl:attribute>
        </input>
        <input type="file" id="uploader"/>
    </xsl:template>

    <!-- заполненное поле для загрузки файла в файловом репозитории -->
    <xsl:template match="field[@name='upl_path'][.!=''][ancestor::component[@sample='FileRepository' and @type='form']]" mode="field_input">
        <div class="preview">
            <img border="0" id="preview" src="{$RESIZER_URL}w298-h224/{.}?anticache={generate-id()}" alt=""/>
        </div>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">hidden</xsl:attribute>
            <xsl:attribute name="id">data</xsl:attribute>
        </input>
        <input type="file" id="uploader"/>
    </xsl:template>

    <xsl:template match="field[@name='upl_path'][@mode='1'][ancestor::component[@sample='FileRepository' and @type='form']]">
        <div class="mb-3" data-role="form-field" data-type="file">
            <xsl:attribute name="data-required"><xsl:value-of select="@nullable!='1'"/></xsl:attribute>
            <label for="{@name}" class="form-label">
                <xsl:value-of select="@title" disable-output-escaping="yes"/>
            </label>
            <div id="control_{@language}_{@name}">
                <div class="mb-2 preview" id="preview">
                    <img border="0" src="{$RESIZER_URL}w298-h224/{.}" alt=""/>
                </div>
                <input>
                    <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
                    <xsl:attribute name="type">hidden</xsl:attribute>
                    <xsl:attribute name="id">data</xsl:attribute>
                </input>
            </div>
            <xsl:call-template name="render-field-messages"/>
        </div>
    </xsl:template>

    <!-- поле копирования структуры в редакторе сайтов -->
    <xsl:template match="field[@name='copy_site_structure']" mode="field_input">
        <xsl:variable name="FIELD_ID">
            <xsl:value-of select="@name"/>
            <xsl:if test="@language">_<xsl:value-of select="@language"/></xsl:if>
        </xsl:variable>
        <div class="form-check">
            <input type="checkbox" class="form-check-input" onchange="document.getElementById('{$FIELD_ID}').disabled = !this.checked;" id="{$FIELD_ID}_toggle"/>
        </div>
        <select id="{$FIELD_ID}" disabled="disabled">
            <xsl:attribute name="class">
                <xsl:text>form-select</xsl:text>
                <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
            </xsl:attribute>
            <xsl:attribute name="name"><xsl:value-of select="@name"/></xsl:attribute>
            <xsl:if test="@nullable!='1'">
                <xsl:attribute name="required">required</xsl:attribute>
            </xsl:if>
            <xsl:apply-templates mode="field_input"/>
        </select>
    </xsl:template>


    <!-- Секция 6. Обработка attachments. -->
    <!-- в виде превью -->
    <xsl:template match="field[@name='attachments']" mode="preview">
        <xsl:param name="PREVIEW_WIDTH"/>
        <xsl:param name="PREVIEW_HEIGHT"/>
        <xsl:variable name="URL"><xsl:value-of select="$RESIZER_URL"/>w<xsl:value-of select="$PREVIEW_WIDTH"/>-h<xsl:value-of select="$PREVIEW_HEIGHT"/>/<xsl:value-of select="recordset/record[1]/field[@name='file']"/></xsl:variable>
        <img width="{$PREVIEW_WIDTH}" height="{$PREVIEW_HEIGHT}">
            <xsl:choose>
                <xsl:when test="recordset">
                    <xsl:attribute name="src"><xsl:value-of select="$URL"/></xsl:attribute>
                    <xsl:attribute name="alt"><xsl:value-of select="recordset/record[1]/field[@name='name']"/></xsl:attribute>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:attribute name="src"><xsl:value-of select="$STATIC_URL"/>images/default_<xsl:value-of select="$PREVIEW_WIDTH"/>x<xsl:value-of select="$PREVIEW_HEIGHT"/>.png</xsl:attribute>
                    <xsl:attribute name="alt"><xsl:value-of select="$TRANSLATION[@const='TXT_NO_IMAGE']"/></xsl:attribute>
                </xsl:otherwise>
            </xsl:choose>
        </img>
        <xsl:if test="recordset/record[1]/field[@name='file']/video">
            <i class="play_button"></i>
            <span class="image_info">00:00</span>
        </xsl:if>
    </xsl:template>

    <!-- поле для выбора upl_id гридах -->
    <xsl:template match="field[@name='upl_id' and ancestor::component[@type='form' and (@exttype='feed' or @exttype='grid')]]" mode="field_input">
        <xsl:variable name="BASE_ID" select="generate-id(.)"/>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">hidden</xsl:attribute>
            <xsl:attribute name="id"><xsl:value-of select="$BASE_ID"/>_id</xsl:attribute>
        </input>
        <div class="input-group">
            <input type="text" id="{$BASE_ID}_name" value="{@upl_path}" readonly="readonly">
                <xsl:attribute name="class">
                    <xsl:text>form-control</xsl:text>
                    <xsl:if test="error"><xsl:text> is-invalid</xsl:text></xsl:if>
                </xsl:attribute>
            </input>
            <button type="button" class="btn btn-outline-secondary" data-action="open-attachment">
                <xsl:attribute name="data-name"><xsl:value-of select="$BASE_ID"/>_name</xsl:attribute>
                <xsl:attribute name="data-id"><xsl:value-of select="$BASE_ID"/>_id</xsl:attribute>
                <xsl:text>...</xsl:text>
            </button>
        </div>
    </xsl:template>

    <xsl:template match="field[@type='tab'][ancestor::component[@type='form']]"/>

    <xsl:template match="field[@type='tab'][ancestor::component[@type='form']]" mode="field_name">
        <xsl:variable name="TAB_ID" select="generate-id(.)"/>
        <li class="nav-item" data-role="tab" data-src="{ancestor::component/@single_template}{.}" role="presentation">
            <a href="#{$TAB_ID}" id="{$TAB_ID}-tab" class="nav-link" data-role="tab-link" data-bs-toggle="tab" data-bs-target="#{$TAB_ID}" role="tab" aria-controls="{$TAB_ID}" aria-selected="false">
                <xsl:if test="position()=1">
                    <xsl:attribute name="class">nav-link active</xsl:attribute>
                    <xsl:attribute name="aria-selected">true</xsl:attribute>
                </xsl:if>
                <xsl:value-of select="@title" />
            </a>
        </li>
    </xsl:template>

    <xsl:template match="field[@type='tab'][ancestor::component[@type='form']]" mode="field_content">
        <xsl:variable name="TAB_ID" select="generate-id(.)"/>
        <div data-role="pane-item">
            <xsl:attribute name="id"><xsl:value-of select="$TAB_ID"/></xsl:attribute>
            <xsl:attribute name="class">
                <xsl:text>tab-pane fade</xsl:text>
                <xsl:if test="position()=1">
                    <xsl:text> show active</xsl:text>
                </xsl:if>
            </xsl:attribute>
            <xsl:attribute name="role">tabpanel</xsl:attribute>
            <xsl:attribute name="aria-labelledby"><xsl:value-of select="$TAB_ID"/>-tab</xsl:attribute>
        </div>
    </xsl:template>

</xsl:stylesheet>
