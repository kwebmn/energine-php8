<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <!--
        Field subset: selects and multi-choice widgets.

        Summary
        -------
        * Provides dropdowns, multi-selects and helper templates for tab-driven
          navigation controls.
        * Uses the shared option keys declared in fields.xslt for fast lookups.

        Usage
        -----
        * Refine match expressions rather than duplicating templates when
          customising behaviour.
        * Combine with helpers from fields/special.xslt for readonly variants.

        Rules of the road
        ------------------
        * Always rely on field attribute atoms for id/name generation.
        * Keep option value lookups aligned with `key('field-options-by-field', …)`.
    -->

    <xsl:template name="render-select-control">
        <xsl:param name="nullable" select="@nullable='1'"/>
        <xsl:variable name="FIELD_NODE" select="."/>
        <xsl:variable name="FIELD_ID" select="generate-id($FIELD_NODE)"/>
        <select>
            <xsl:call-template name="class.form-select"/>
            <xsl:call-template name="field-attribute-id"/>
            <xsl:call-template name="field-attribute-name"/>
            <xsl:call-template name="field-attribute-required"/>
            <xsl:if test="$nullable">
                <option></option>
            </xsl:if>
            <xsl:apply-templates select="key('field-options-by-field', $FIELD_ID)" mode="field_input"/>
        </select>
    </xsl:template>

    <xsl:template match="field[@type='select'][ancestor::component[@type='form']]" mode="field_input">
        <xsl:call-template name="render-select-control"/>
    </xsl:template>

    <xsl:template match="field[@type='select' and @editor][ancestor::component[@exttype='grid' or @exttype='feed']]" mode="field_input">
        <xsl:call-template name="render-select-control"/>
    </xsl:template>

    <xsl:template match="option[ancestor::field[@type='select'][ancestor::component[@type='form']]]" mode="field_input">
        <option value="{@id}">
            <xsl:copy-of select="attribute::*[name(.)!='id']"/>
            <xsl:value-of select="."/>
        </option>
    </xsl:template>

    <xsl:template match="field[@type='multi'][ancestor::component[@type='form']]" mode="field_input">
        <xsl:variable name="HAS_ERROR" select="boolean(error)"/>
        <xsl:variable name="FIELD_NODE" select="."/>
        <xsl:variable name="OPTIONS" select="key('field-options-by-field', generate-id($FIELD_NODE))"/>
        <div>
            <xsl:for-each select="$OPTIONS">
                <xsl:variable name="OPTION_ID" select="generate-id(.)"/>
                <div class="form-check">
                    <input type="checkbox" value="{@id}">
                        <xsl:call-template name="class.form-check-input">
                            <xsl:with-param name="invalid" select="$HAS_ERROR"/>
                        </xsl:call-template>
                        <xsl:attribute name="id"><xsl:value-of select="$OPTION_ID"/></xsl:attribute>
                        <xsl:call-template name="field-attribute-name">
                            <xsl:with-param name="node" select="$FIELD_NODE"/>
                            <xsl:with-param name="multiple" select="true()"/>
                        </xsl:call-template>
                        <xsl:if test="position()=1">
                            <xsl:call-template name="field-attribute-required">
                                <xsl:with-param name="node" select="$FIELD_NODE"/>
                            </xsl:call-template>
                        </xsl:if>
                        <xsl:if test="@selected">
                            <xsl:attribute name="checked">checked</xsl:attribute>
                        </xsl:if>
                    </input>
                    <label>
                        <xsl:call-template name="class.form-check-label"/>
                        <xsl:attribute name="for"><xsl:value-of select="$OPTION_ID"/></xsl:attribute>
                        <xsl:value-of select="."/>
                    </label>
                </div>
            </xsl:for-each>
        </div>
    </xsl:template>

    <xsl:template match="field[@type='tab'][ancestor::component[@type='form']]"/>

    <xsl:template match="field[@type='tab'][ancestor::component[@type='form']]" mode="field_name">
        <xsl:variable name="TAB_ID" select="generate-id(.)"/>
        <li class="nav-item" data-role="tab" data-src="{ancestor::component/@single_template}{.}" role="presentation">
            <a class="nav-link" data-role="tab-link" data-bs-toggle="tab" data-bs-target="#{$TAB_ID}" role="tab" aria-controls="{$TAB_ID}" aria-selected="false" href="#{$TAB_ID}" id="{$TAB_ID}-tab">
                <xsl:if test="position()=1">
                    <xsl:attribute name="class">nav-link active</xsl:attribute>
                    <xsl:attribute name="aria-selected">true</xsl:attribute>
                </xsl:if>
                <xsl:value-of select="@title"/>
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
