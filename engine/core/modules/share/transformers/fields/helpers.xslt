<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <!--
        Form field helper library.

        Summary
        -------
        * Provides the public modes `field_name`, `field_input` and `field_messages`.
        * Ships attribute atoms for stable id/name/for/required handling.
        * Keeps all string-building logic in one place to avoid ad-hoc attributes.

        Usage
        -----
        * Always call `field-attribute-id`, `field-attribute-name` and
          `field-attribute-required` instead of hard-coding form attributes.
        * Use the public modes from container templates instead of hand-crafted
          labels or inputs – this guarantees consistent markup and accessibility.

        Rules of the road
        ------------------
        * Do not introduce `disable-output-escaping`. Rich text must be rendered
          via `xsl:copy-of` where necessary.
        * Keep `generate-id()` usage untouched to preserve compatibility with the
          existing JavaScript.
    -->

    <xsl:template name="field-id-value">
        <xsl:param name="node" select="."/>
        <xsl:param name="suffix" select="''"/>
        <xsl:value-of select="$node/@name"/>
        <xsl:if test="$node/@language">
            <xsl:text>_</xsl:text>
            <xsl:value-of select="$node/@language"/>
        </xsl:if>
        <xsl:value-of select="$suffix"/>
    </xsl:template>

    <xsl:template name="field-attribute-id">
        <xsl:param name="node" select="."/>
        <xsl:param name="suffix" select="''"/>
        <xsl:attribute name="id">
            <xsl:call-template name="field-id-value">
                <xsl:with-param name="node" select="$node"/>
                <xsl:with-param name="suffix" select="$suffix"/>
            </xsl:call-template>
        </xsl:attribute>
    </xsl:template>

    <xsl:template name="field-name-value">
        <xsl:param name="node" select="."/>
        <xsl:param name="multiple" select="false()"/>
        <xsl:param name="suffix" select="''"/>
        <xsl:variable name="LANG_SUFFIX" select="substring(concat('[', $node/@language, ']'), 1, (string-length($node/@language) + 2) * boolean($node/@language))"/>
        <xsl:choose>
            <xsl:when test="$node/@tableName">
                <xsl:value-of select="concat($node/@tableName, $LANG_SUFFIX, '[', $node/@name, ']')"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="concat($node/@name, $LANG_SUFFIX)"/>
            </xsl:otherwise>
        </xsl:choose>
        <xsl:if test="$multiple">
            <xsl:text>[]</xsl:text>
        </xsl:if>
        <xsl:value-of select="$suffix"/>
    </xsl:template>

    <xsl:template name="field-attribute-name">
        <xsl:param name="node" select="."/>
        <xsl:param name="multiple" select="false()"/>
        <xsl:param name="suffix" select="''"/>
        <xsl:attribute name="name">
            <xsl:call-template name="field-name-value">
                <xsl:with-param name="node" select="$node"/>
                <xsl:with-param name="multiple" select="$multiple"/>
                <xsl:with-param name="suffix" select="$suffix"/>
            </xsl:call-template>
        </xsl:attribute>
    </xsl:template>

    <xsl:template name="field-attribute-for">
        <xsl:param name="node" select="."/>
        <xsl:param name="suffix" select="''"/>
        <xsl:attribute name="for">
            <xsl:call-template name="field-id-value">
                <xsl:with-param name="node" select="$node"/>
                <xsl:with-param name="suffix" select="$suffix"/>
            </xsl:call-template>
        </xsl:attribute>
    </xsl:template>

    <xsl:template name="field-attribute-required">
        <xsl:param name="node" select="."/>
        <xsl:param name="required" select="$node/@nullable!='1'"/>
        <xsl:if test="$required">
            <xsl:attribute name="required">required</xsl:attribute>
        </xsl:if>
    </xsl:template>

    <xsl:template match="field" mode="field_messages">
        <xsl:for-each select="error[normalize-space(.)!='']">
            <div class="invalid-feedback">
                <xsl:choose>
                    <xsl:when test="node()">
                        <xsl:copy-of select="node()"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="."/>
                    </xsl:otherwise>
                </xsl:choose>
            </div>
        </xsl:for-each>
        <xsl:if test="hint[normalize-space(string(.))!='' or node()]">
            <div class="form-text">
                <xsl:choose>
                    <xsl:when test="hint/node()">
                        <xsl:copy-of select="hint/node()"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="hint"/>
                    </xsl:otherwise>
                </xsl:choose>
            </div>
        </xsl:if>
    </xsl:template>

    <xsl:template name="render-field-messages">
        <xsl:apply-templates select="." mode="field_messages"/>
    </xsl:template>

</xsl:stylesheet>
