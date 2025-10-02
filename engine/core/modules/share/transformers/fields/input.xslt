<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <!--
        Field subset: input controls.

        Summary
        -------
        * Covers single-line inputs, textarea-based widgets and boolean toggles.
        * Delegates attribute handling to helpers so overrides stay declarative.

        Usage
        -----
        * Extend the matching predicates instead of copying templates when you
          need minor adjustments.
        * When introducing a new input-like control, add a documented template
          here so integrators know where to hook into.

        Rules of the road
        ------------------
        * Keep `FORM_ELEMENT_ATTRIBUTES` and class helpers at the top of each
          element definition to preserve attribute ordering.
        * Do not hardcode ids, names or required flags – always rely on atoms.
    -->

    <xsl:template match="field[@type='email'][ancestor::component[@type='form']]" mode="field_input">
        <input>
            <xsl:call-template name="class.form-control"/>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">email</xsl:attribute>
        </input>
    </xsl:template>

    <xsl:template match="field[@type='phone'][ancestor::component[@type='form']]" mode="field_input">
        <input>
            <xsl:call-template name="class.form-control"/>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">tel</xsl:attribute>
        </input>
    </xsl:template>

    <xsl:template match="field[@type='textbox'][ancestor::component[@type='form']]" mode="field_input">
        <xsl:variable name="SEPARATOR" select="@separator"/>
        <input data-role="acpl">
            <xsl:call-template name="class.form-control"/>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="nrgn:url" xmlns:nrgn="http://energine.org">
                <xsl:value-of select="$BASE"/>
                <xsl:value-of select="ancestor::component/@single_template"/>
                <xsl:value-of select="@url"/>
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

    <xsl:template match="field[@type='integer'][ancestor::component[@type='form']]" mode="field_input">
        <input>
            <xsl:call-template name="class.form-control"/>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">number</xsl:attribute>
            <xsl:attribute name="step">1</xsl:attribute>
        </input>
    </xsl:template>

    <xsl:template match="field[@type='float'][ancestor::component[@type='form']]" mode="field_input">
        <input>
            <xsl:call-template name="class.form-control"/>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">number</xsl:attribute>
            <xsl:attribute name="step">any</xsl:attribute>
        </input>
    </xsl:template>

    <xsl:template match="field[@type='password'][ancestor::component[@type='form']]" mode="field_input">
        <input>
            <xsl:call-template name="class.form-control"/>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:attribute name="type">password</xsl:attribute>
            <xsl:call-template name="field-attribute-name"/>
        </input>
    </xsl:template>

    <xsl:template match="field[@type='text'][ancestor::component[@type='form']]" mode="field_input">
        <textarea>
            <xsl:call-template name="class.form-control"/>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:value-of select="."/>
        </textarea>
    </xsl:template>

    <xsl:template match="field[@type='code'][ancestor::component[@type='form']]" mode="field_input">
        <textarea data-role="code-editor">
            <xsl:call-template name="class.form-control"/>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:value-of select="."/>
        </textarea>
    </xsl:template>

    <xsl:template match="field[@type='htmlblock'][ancestor::component[@type='form']]" mode="field_input">
        <textarea data-role="rich-editor">
            <xsl:call-template name="class.form-control"/>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
            <xsl:value-of select="."/>
        </textarea>
    </xsl:template>

    <xsl:template match="field[@type='boolean'][ancestor::component[@type='form']]" mode="field_input">
        <xsl:variable name="HAS_ERROR" select="boolean(error)"/>
        <div class="form-check">
            <input type="hidden" value="0">
                <xsl:call-template name="field-attribute-name"/>
            </input>
            <input type="checkbox" value="1">
                <xsl:call-template name="class.form-check-input">
                    <xsl:with-param name="invalid" select="$HAS_ERROR"/>
                </xsl:call-template>
                <xsl:call-template name="field-attribute-id"/>
                <xsl:call-template name="field-attribute-name"/>
                <xsl:call-template name="field-attribute-required"/>
                <xsl:if test=". = 1">
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

    <xsl:template match="field[@type='string'][ancestor::component[@type='form']]" mode="field_input" priority="-1"/>

    <xsl:template match="field[ancestor::component[@type='form']]" mode="field_input" priority="-2">
        <input>
            <xsl:call-template name="class.form-control"/>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES"/>
        </input>
    </xsl:template>

</xsl:stylesheet>
