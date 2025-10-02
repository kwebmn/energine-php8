<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <!--
        Field subset: file and media controls.

        Summary
        -------
        * Handles upload widgets, preview blocks and legacy media buttons.
        * Normalises ids and data attributes so JavaScript bindings remain
          compatible with existing admin tooling.

        Usage
        -----
        * Keep structural wrappers intact when overriding: the JS expects
          preview, picker and remove controls to remain present.
        * Use the helper templates at the bottom of the file to share logic
          across file variants.

        Rules of the road
        ------------------
        * Avoid inline scripts – wire behaviour through data attributes only.
        * Preserve `generate-id()` output that existing uploaders rely upon.
    -->

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
                <xsl:call-template name="class.form-control"/>
                <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            </input>
            <button type="button">
                <xsl:call-template name="class.button-outline-secondary"/>
                <xsl:attribute name="data-action">open-filelib</xsl:attribute>
                <xsl:attribute name="data-link"><xsl:value-of select="$PATH_ID"/></xsl:attribute>
                <xsl:attribute name="data-preview"><xsl:value-of select="$PREVIEW_ID"/></xsl:attribute>
                <xsl:text>Файл…</xsl:text>
            </button>
            <xsl:if test="@quickUploadPid">
                <button type="button">
                    <xsl:call-template name="class.button-outline-secondary">
                        <xsl:with-param name="disabled" select="@quickUploadEnabled!='1'"/>
                    </xsl:call-template>
                    <xsl:attribute name="data-action">quick-upload</xsl:attribute>
                    <xsl:attribute name="data-link"><xsl:value-of select="$PATH_ID"/></xsl:attribute>
                    <xsl:attribute name="data-preview"><xsl:value-of select="$PREVIEW_ID"/></xsl:attribute>
                    <xsl:attribute name="data-input"><xsl:value-of select="$FILE_INPUT_ID"/></xsl:attribute>
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
                    <xsl:call-template name="class.button-link">
                        <xsl:with-param name="hidden" select="not($HAS_VALUE)"/>
                    </xsl:call-template>
                    <xsl:attribute name="data-target"><xsl:value-of select="$PATH_ID"/></xsl:attribute>
                    <xsl:attribute name="data-preview"><xsl:value-of select="$PREVIEW_ID"/></xsl:attribute>
                    <xsl:if test="@quickUploadPid">
                        <xsl:attribute name="data-input"><xsl:value-of select="$FILE_INPUT_ID"/></xsl:attribute>
                    </xsl:if>
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
            <label class="form-label" for="{@name}">
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

    <xsl:template match="field[@name='upl_id' and ancestor::component[@type='form' and (@exttype='feed' or @exttype='grid')]]" mode="field_input">
        <xsl:variable name="BASE_ID" select="generate-id(.)"/>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">hidden</xsl:attribute>
            <xsl:attribute name="id"><xsl:value-of select="$BASE_ID"/>_id</xsl:attribute>
        </input>
        <div class="input-group">
            <input type="text" id="{$BASE_ID}_name" value="{@upl_path}" readonly="readonly">
                <xsl:call-template name="class.form-control">
                    <xsl:with-param name="invalid" select="boolean(error)"/>
                </xsl:call-template>
            </input>
            <button type="button" class="btn btn-outline-secondary" data-action="open-attachment">
                <xsl:attribute name="data-name"><xsl:value-of select="$BASE_ID"/>_name</xsl:attribute>
                <xsl:attribute name="data-id"><xsl:value-of select="$BASE_ID"/>_id</xsl:attribute>
                <xsl:text>...</xsl:text>
            </button>
        </div>
    </xsl:template>

</xsl:stylesheet>
