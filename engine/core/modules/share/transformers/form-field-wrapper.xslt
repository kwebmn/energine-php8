<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <!--
        Обёртка для полей формы на базе стандартной сетки Bootstrap.
        Вынесена в отдельный файл для переиспользования и упрощения fields.xslt.
    -->
    <xsl:template match="field[not(@mode='1') and not(@mode=0)][ancestor::component[@type='form']]" priority="-1">
        <xsl:variable name="IS_REQUIRED" select="not(@nullable) or @nullable='0'"/>
        <xsl:variable name="SHOW_REQUIRED_MARK" select="$IS_REQUIRED and not(ancestor::component/@exttype='grid')"/>
        <div data-role="form-field">
            <xsl:attribute name="class">
                <xsl:text>mb-3</xsl:text>
                <xsl:if test="$SHOW_REQUIRED_MARK">
                    <xsl:text> ps-3 border-start border-success-subtle bg-success-subtle rounded</xsl:text>
                </xsl:if>
            </xsl:attribute>
            <xsl:attribute name="id">control_{@language}_{@name}</xsl:attribute>
            <xsl:attribute name="data-type">
                <xsl:choose>
                    <xsl:when test="@type"><xsl:value-of select="@type"/></xsl:when>
                    <xsl:otherwise>string</xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
            <xsl:if test="$IS_REQUIRED">
                <xsl:attribute name="data-required">true</xsl:attribute>
            </xsl:if>
            <xsl:apply-templates select="." mode="field_content"/>
        </div>
    </xsl:template>

    <xsl:template match="field[ancestor::component[@type='form']]" mode="field_name">
        <xsl:if test="@title and @type!='boolean'">
            <xsl:variable name="IS_REQUIRED_LABEL" select="(not(@nullable) or @nullable='0') and not(ancestor::component/@exttype='grid')"/>
            <label>
                <xsl:attribute name="class">
                    <xsl:text>form-label</xsl:text>
                    <xsl:if test="$IS_REQUIRED_LABEL">
                        <xsl:text> d-inline-flex align-items-center</xsl:text>
                    </xsl:if>
                </xsl:attribute>
                <xsl:attribute name="for">
                    <xsl:value-of select="@name"/>
                    <xsl:if test="@language">_<xsl:value-of select="@language"/></xsl:if>
                </xsl:attribute>
                <xsl:if test="$IS_REQUIRED_LABEL and /document/translations/translation[@const='TXT_REQUIRED_FIELDS']">
                    <xsl:attribute name="title"><xsl:value-of select="normalize-space(/document/translations/translation[@const='TXT_REQUIRED_FIELDS'])"/></xsl:attribute>
                </xsl:if>
                <xsl:value-of select="@title" disable-output-escaping="yes"/>
                <xsl:if test="$IS_REQUIRED_LABEL">
                    <span aria-hidden="true">*
                        <xsl:attribute name="class">badge text-bg-success-subtle text-success-emphasis border border-success-subtle fw-semibold ms-2</xsl:attribute>
                    </span>
                    <xsl:if test="/document/translations/translation[@const='TXT_REQUIRED_FIELDS']">
                        <span class="visually-hidden">
                            <xsl:value-of select="normalize-space(/document/translations/translation[@const='TXT_REQUIRED_FIELDS'])"/>
                        </span>
                    </xsl:if>
                </xsl:if>
            </label>
        </xsl:if>
    </xsl:template>

    <xsl:template match="field[@type='file'][ancestor::component[@type='form']]" mode="field_name">
        <xsl:if test="@title">
            <xsl:variable name="IS_REQUIRED_LABEL" select="(not(@nullable) or @nullable='0') and not(ancestor::component/@exttype='grid')"/>
            <label>
                <xsl:attribute name="class">
                    <xsl:text>form-label</xsl:text>
                    <xsl:if test="$IS_REQUIRED_LABEL">
                        <xsl:text> d-inline-flex align-items-center</xsl:text>
                    </xsl:if>
                </xsl:attribute>
                <xsl:attribute name="for"><xsl:value-of select="concat(generate-id(.), '_path')"/></xsl:attribute>
                <xsl:if test="$IS_REQUIRED_LABEL and /document/translations/translation[@const='TXT_REQUIRED_FIELDS']">
                    <xsl:attribute name="title"><xsl:value-of select="normalize-space(/document/translations/translation[@const='TXT_REQUIRED_FIELDS'])"/></xsl:attribute>
                </xsl:if>
                <xsl:value-of select="@title" disable-output-escaping="yes"/>
                <xsl:if test="$IS_REQUIRED_LABEL">
                    <span aria-hidden="true">*
                        <xsl:attribute name="class">badge text-bg-success-subtle text-success-emphasis border border-success-subtle fw-semibold ms-2</xsl:attribute>
                    </span>
                    <xsl:if test="/document/translations/translation[@const='TXT_REQUIRED_FIELDS']">
                        <span class="visually-hidden">
                            <xsl:value-of select="normalize-space(/document/translations/translation[@const='TXT_REQUIRED_FIELDS'])"/>
                        </span>
                    </xsl:if>
                </xsl:if>
            </label>
        </xsl:if>
    </xsl:template>

    <xsl:template match="field[ancestor::component[@type='form']]" mode="field_content">
        <xsl:apply-templates select="." mode="field_name"/>
        <xsl:apply-templates select="." mode="field_input"/>
        <xsl:call-template name="render-field-messages"/>
    </xsl:template>

    <xsl:template name="render-field-messages">
        <xsl:for-each select="error[normalize-space(.)!='']">
            <div class="invalid-feedback">
                <xsl:value-of select="." disable-output-escaping="yes"/>
            </div>
        </xsl:for-each>
        <xsl:if test="hint">
            <div class="form-text">
                <xsl:value-of select="hint" disable-output-escaping="yes"/>
            </div>
        </xsl:if>
    </xsl:template>

</xsl:stylesheet>
