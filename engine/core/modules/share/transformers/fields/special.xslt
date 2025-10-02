<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <!--
        Field subset: readonly and specialised widgets.

        Summary
        -------
        * Houses readonly renderers, hidden field helpers and module-specific
          widgets that do not fit standard control categories.
        * Keeps display-only fallbacks aligned with editable markup.

        Usage
        -----
        * Extend these templates when adding new readonly layouts to guarantee
          consistent metadata wrappers.
        * Leverage the helper templates for duplicated structures such as
          dictionary previews or static text blocks.

        Rules of the road
        ------------------
        * Always emit `data-role="form-field"` wrappers to stay compatible with
          admin tooling.
        * Reuse attribute atoms even for readonly controls to keep ids/names
          predictable for scripts that rely on hidden mirrors.
    -->

    <xsl:template match="field[@mode=0][ancestor::component[@type='form']]"/>

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
                <xsl:apply-templates select="." mode="field_messages"/>
            </div>
        </xsl:if>
    </xsl:template>

    <xsl:template match="field[@mode='1'][ancestor::component[@type='form']]" mode="field_name_readonly">
        <xsl:if test="@title and @type!='boolean'">
            <label class="form-label">
                <xsl:call-template name="field-attribute-for"/>
                <xsl:value-of select="@title" disable-output-escaping="yes"/>
            </label>
        </xsl:if>
    </xsl:template>

    <xsl:template match="field[@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <span class="form-control-plaintext d-block"><xsl:value-of select="." disable-output-escaping="yes"/></span>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
        </input>
    </xsl:template>

    <xsl:template match="field[@type='boolean'][@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <xsl:variable name="FIELD_ID">
            <xsl:call-template name="field-id-value"/>
        </xsl:variable>
        <input type="hidden" value="{.}">
            <xsl:call-template name="field-attribute-name"/>
        </input>
        <div class="form-check">
            <input type="checkbox" value="1" disabled="disabled">
                <xsl:call-template name="class.form-check-input"/>
                <xsl:attribute name="id"><xsl:value-of select="$FIELD_ID"/></xsl:attribute>
                <xsl:call-template name="field-attribute-name"/>
                <xsl:if test=".=1">
                    <xsl:attribute name="checked">checked</xsl:attribute>
                </xsl:if>
            </input>
            <xsl:if test="@title">
                <label>
                    <xsl:call-template name="class.form-check-label"/>
                    <xsl:call-template name="field-attribute-for"/>
                    <xsl:value-of select="@title" disable-output-escaping="yes"/>
                </label>
            </xsl:if>
        </div>
    </xsl:template>

    <xsl:template match="field[@type='htmlblock' or @type='text'][@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <div class="form-control-plaintext d-block"><xsl:value-of select="." disable-output-escaping="yes"/></div>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
        </input>
    </xsl:template>

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

    <xsl:template match="field[@type='select'][@mode='1'][ancestor::component[@type='form']]">
        <div class="mb-3" data-role="form-field">
            <xsl:attribute name="data-type"><xsl:value-of select="@type"/></xsl:attribute>
            <xsl:attribute name="data-required"><xsl:value-of select="@nullable!='1'"/></xsl:attribute>
            <xsl:apply-templates select="." mode="field_name_readonly"/>
            <div id="control_{@language}_{@name}">
                <xsl:apply-templates select="." mode="field_input_readonly"/>
            </div>
            <xsl:apply-templates select="." mode="field_messages"/>
        </div>
    </xsl:template>

    <xsl:template match="field[@type='select'][@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <xsl:variable name="SELECTED" select="key('field-selected-options-by-field', generate-id(.))"/>
        <span class="form-control-plaintext d-block"><xsl:value-of select="$SELECTED"/></span>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
            <xsl:if test="$SELECTED">
                <xsl:attribute name="value"><xsl:value-of select="$SELECTED[1]/@id"/></xsl:attribute>
            </xsl:if>
        </input>
    </xsl:template>

    <xsl:template match="field[@type='multi'][@mode='1'][ancestor::component[@type='form']]">
        <div class="mb-3" data-role="form-field">
            <xsl:attribute name="data-type"><xsl:value-of select="@type"/></xsl:attribute>
            <xsl:attribute name="data-required"><xsl:value-of select="@nullable!='1'"/></xsl:attribute>
            <xsl:apply-templates select="." mode="field_name_readonly"/>
            <div id="control_{@language}_{@name}">
                <xsl:apply-templates select="." mode="field_input_readonly"/>
            </div>
            <xsl:apply-templates select="." mode="field_messages"/>
        </div>
    </xsl:template>

    <xsl:template match="field[@type='multi'][@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <div class="form-control-plaintext d-block">
            <xsl:variable name="FIELD_NODE" select="."/>
            <xsl:variable name="SELECTED" select="key('field-selected-options-by-field', generate-id($FIELD_NODE))"/>
            <xsl:for-each select="$SELECTED">
                <div><xsl:value-of select="."/></div>
                <input type="hidden" value="{@id}">
                    <xsl:call-template name="field-attribute-name">
                        <xsl:with-param name="node" select="$FIELD_NODE"/>
                        <xsl:with-param name="multiple" select="true()"/>
                    </xsl:call-template>
                </input>
            </xsl:for-each>
        </div>
    </xsl:template>

    <xsl:template match="field[@type='image'][@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <div class="image">
            <img src="{.}"/>
            <input>
                <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
            </input>
        </div>
    </xsl:template>

    <xsl:template match="field[@type='date' or @type='datetime'][@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <div class="form-control-plaintext d-block"><xsl:value-of select="." disable-output-escaping="yes"/></div>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
        </input>
    </xsl:template>

    <xsl:template match="field[@type='hidden'][ancestor::component[@type='form']]">
        <input type="hidden" value="{.}">
            <xsl:call-template name="field-attribute-id"/>
            <xsl:call-template name="field-attribute-name"/>
        </input>
    </xsl:template>

    <xsl:template match="field[@key='1' and @type='hidden'][ancestor::component[@type='form']]">
        <input type="hidden" value="{.}" primary="primary">
            <xsl:call-template name="field-attribute-id"/>
            <xsl:call-template name="field-attribute-name"/>
        </input>
    </xsl:template>

    <xsl:template match="field[@type='captcha'][ancestor::component[@type='list']]"/>

    <xsl:template match="field[@type='captcha'][ancestor::component[@type='form']]">
        <div class="mb-3" data-role="form-field" data-type="captcha">
            <xsl:attribute name="data-required"><xsl:value-of select="@nullable!='1'"/></xsl:attribute>
            <div id="control_{@language}_{@name}">
                <xsl:value-of select="." disable-output-escaping="yes"/>
            </div>
            <xsl:apply-templates select="." mode="field_messages"/>
        </div>
    </xsl:template>

    <xsl:template match="field[@name='error_message'][ancestor::component[@type='form']]">
        <div class="invalid-feedback d-block" role="alert">
            <xsl:value-of select="." disable-output-escaping="yes"/>
        </div>
    </xsl:template>

    <xsl:template match="field[@type='smap' and ancestor::component[@type='form' and (@exttype='feed' or @exttype='grid')]]" mode="field_input">
        <xsl:variable name="BASE_ID" select="generate-id(.)"/>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">hidden</xsl:attribute>
            <xsl:attribute name="id"><xsl:value-of select="$BASE_ID"/>_id</xsl:attribute>
        </input>
        <div class="input-group">
            <input type="text" id="{$BASE_ID}_name" value="{@smap_name}" readonly="readonly">
                <xsl:call-template name="class.form-control"/>
            </input>
            <button type="button">
                <xsl:call-template name="class.button-outline-secondary"/>
                <xsl:attribute name="data-action">open-smap</xsl:attribute>
                <xsl:attribute name="data-name"><xsl:value-of select="$BASE_ID"/>_name</xsl:attribute>
                <xsl:attribute name="data-id"><xsl:value-of select="$BASE_ID"/>_id</xsl:attribute>
                <xsl:text>Выбрать…</xsl:text>
            </button>
        </div>
    </xsl:template>

    <xsl:template match="field[@type='thumb'][ancestor::component[@type='form']]" mode="field_input">
        <xsl:variable name="BASE_ID" select="@name"/>
        <div class="preview">
            <img border="0" id="preview_{@name}" data="data_{@name}" width="{@width}" height="{@height}">
                <xsl:choose>
                    <xsl:when test="../field[@name='upl_path']=''">
                        <xsl:attribute name="class">d-none<xsl:if test="@name!='preview'"> thumb</xsl:if></xsl:attribute>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:if test="@name!='preview'"><xsl:attribute name="class">thumb</xsl:attribute></xsl:if>
                        <xsl:attribute name="src"><xsl:value-of select="$RESIZER_URL"/>w<xsl:value-of select="@width"/>-h<xsl:value-of select="@height"/>/<xsl:value-of select="../field[@name='upl_path']"/>?<xsl:value-of select="generate-id()"/></xsl:attribute>
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

    <xsl:template match="field[@name='copy_site_structure']" mode="field_input">
        <xsl:variable name="FIELD_ID">
            <xsl:call-template name="field-id-value"/>
        </xsl:variable>
        <div class="form-check">
            <input type="checkbox" class="form-check-input" onchange="document.getElementById('{$FIELD_ID}').disabled = !this.checked;" id="{$FIELD_ID}_toggle"/>
        </div>
        <select id="{$FIELD_ID}" disabled="disabled">
            <xsl:call-template name="class.form-select"/>
            <xsl:call-template name="field-attribute-name"/>
            <xsl:call-template name="field-attribute-required"/>
            <xsl:apply-templates mode="field_input"/>
        </select>
    </xsl:template>

</xsl:stylesheet>
