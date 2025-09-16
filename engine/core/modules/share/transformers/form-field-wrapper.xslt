<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <!--
        Обёртка для полей формы с поддержкой классов form-outline/mb-3.
        Вынесена в отдельный файл для переиспользования и упрощения fields.xslt.
    -->
    <xsl:template match="field[not(@mode='1') and not(@mode=0)][ancestor::component[@type='form']]" priority="-1">
        <xsl:variable name="IS_REQUIRED" select="not(@nullable) or @nullable='0'"/>
        <xsl:variable name="IS_OUTLINE" select="not(@type='boolean' or @type='select' or @type='multi' or @type='file' or @type='smap' or @type='thumb') and not(@name='copy_site_structure') and not(@name='upl_id') and not(@name='upl_path')"/>
        <div data-role="form-field">
            <xsl:attribute name="class">
                <xsl:choose>
                    <xsl:when test="$IS_OUTLINE">form-outline mb-3</xsl:when>
                    <xsl:otherwise>mb-3</xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
            <xsl:if test="$IS_OUTLINE">
                <xsl:attribute name="data-mdb-input-init">1</xsl:attribute>
            </xsl:if>
            <xsl:attribute name="id">control_{@language}_{@name}</xsl:attribute>
            <xsl:attribute name="data-type">
                <xsl:choose>
                    <xsl:when test="@type"><xsl:value-of select="@type"/></xsl:when>
                    <xsl:otherwise>string</xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
            <xsl:attribute name="data-required"><xsl:value-of select="$IS_REQUIRED"/></xsl:attribute>
            <xsl:apply-templates select="." mode="field_content">
                <xsl:with-param name="is-outline" select="$IS_OUTLINE"/>
            </xsl:apply-templates>
        </div>
    </xsl:template>

    <xsl:template match="field[ancestor::component[@type='form']]" mode="field_name">
        <xsl:if test="@title and @type!='boolean'">
            <label class="form-label">
                <xsl:attribute name="for">
                    <xsl:value-of select="@name"/>
                    <xsl:if test="@language">_<xsl:value-of select="@language"/></xsl:if>
                </xsl:attribute>
                <xsl:value-of select="@title" disable-output-escaping="yes"/>
                <xsl:if test="(not(@nullable) or @nullable='0') and not(ancestor::component/@exttype='grid')">
                    <span class="text-danger">*</span>
                </xsl:if>
            </label>
        </xsl:if>
    </xsl:template>

    <xsl:template match="field[@type='file'][ancestor::component[@type='form']]" mode="field_name">
        <xsl:if test="@title">
            <label class="form-label">
                <xsl:attribute name="for"><xsl:value-of select="concat(generate-id(.), '_path')"/></xsl:attribute>
                <xsl:value-of select="@title" disable-output-escaping="yes"/>
                <xsl:if test="(not(@nullable) or @nullable='0') and not(ancestor::component/@exttype='grid')">
                    <span class="text-danger">*</span>
                </xsl:if>
            </label>
        </xsl:if>
    </xsl:template>

    <xsl:template match="field[ancestor::component[@type='form']]" mode="field_content">
        <xsl:param name="is-outline" select="false()"/>
        <xsl:choose>
            <xsl:when test="$is-outline">
                <xsl:apply-templates select="." mode="field_input"/>
                <xsl:apply-templates select="." mode="field_name"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:apply-templates select="." mode="field_name"/>
                <xsl:apply-templates select="." mode="field_input"/>
            </xsl:otherwise>
        </xsl:choose>
        <xsl:call-template name="render-field-messages"/>
    </xsl:template>

    <xsl:template name="render-field-messages">
        <xsl:if test="error">
            <div class="invalid-feedback">
                <xsl:value-of select="error" disable-output-escaping="yes"/>
            </div>
        </xsl:if>
        <xsl:if test="hint">
            <div class="form-text">
                <xsl:value-of select="hint" disable-output-escaping="yes"/>
            </div>
        </xsl:if>
    </xsl:template>

</xsl:stylesheet>
