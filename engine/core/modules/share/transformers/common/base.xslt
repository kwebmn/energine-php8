<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <!--
        Базовые шаблоны с минимальным приоритетом для модуля share.
        Сайт-специфичные стили подключают этот файл через include.xslt и
        переопределяют только необходимые именованные шаблоны.
    -->

    <!--
        Единый набор атрибутов для редактируемых полей форм.
        Не переопределяйте шаблон напрямую, расширяйте его в именованных
        шаблонах, если требуется альтернативное поведение.
    -->
    <xsl:template name="FORM_ELEMENT_ATTRIBUTES">
        <xsl:if test="not(@type='text') and not(@type='htmlblock')">
            <xsl:attribute name="type">text</xsl:attribute>
            <xsl:attribute name="value">
                <xsl:value-of select="."/>
            </xsl:attribute>
        </xsl:if>
        <xsl:if test="@type='datetime'">
            <xsl:attribute name="type">datetime-local</xsl:attribute>
        </xsl:if>
        <xsl:if test="@type='date'">
            <xsl:attribute name="type">date</xsl:attribute>
        </xsl:if>
        <xsl:attribute name="id">
            <xsl:value-of select="@name"/>
            <xsl:if test="@language">
                <xsl:text>_</xsl:text>
                <xsl:value-of select="@language"/>
            </xsl:if>
        </xsl:attribute>
        <xsl:variable name="LANG_SUFFIX" select="substring(concat('[', @language, ']'), 1, (string-length(@language) + 2) * boolean(@language))"/>
        <xsl:attribute name="name">
            <xsl:choose>
                <xsl:when test="@tableName">
                    <xsl:value-of select="concat(@tableName, $LANG_SUFFIX, '[', @name, ']')"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="concat(@name, $LANG_SUFFIX)"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:attribute>
        <xsl:if test="@length and not(@type='htmlblock')">
            <xsl:attribute name="maxlength">
                <xsl:value-of select="@length"/>
            </xsl:attribute>
        </xsl:if>
        <xsl:if test="@pattern">
            <xsl:attribute name="nrgn:pattern" xmlns:nrgn="http://energine.org">
                <xsl:value-of select="@pattern"/>
            </xsl:attribute>
        </xsl:if>
        <xsl:if test="@message">
            <xsl:attribute name="nrgn:message" xmlns:nrgn="http://energine.org">
                <xsl:value-of select="@message"/>
            </xsl:attribute>
        </xsl:if>
        <xsl:if test="@message2">
            <xsl:attribute name="nrgn:message2" xmlns:nrgn="http://energine.org">
                <xsl:value-of select="@message2"/>
            </xsl:attribute>
        </xsl:if>
        <xsl:if test="@nullable!='1'">
            <xsl:attribute name="required">required</xsl:attribute>
        </xsl:if>
    </xsl:template>

    <!-- Вариант для скрытых, но отправляемых полей -->
    <xsl:template name="FORM_ELEMENT_ATTRIBUTES_READONLY">
        <xsl:attribute name="type">hidden</xsl:attribute>
        <xsl:attribute name="value">
            <xsl:value-of select="."/>
        </xsl:attribute>
        <xsl:attribute name="id">
            <xsl:value-of select="@name"/>
        </xsl:attribute>
        <xsl:variable name="LANG_SUFFIX" select="substring(concat('[', @language, ']'), 1, (string-length(@language) + 2) * boolean(@language))"/>
        <xsl:attribute name="name">
            <xsl:choose>
                <xsl:when test="@tableName">
                    <xsl:value-of select="concat(@tableName, $LANG_SUFFIX, '[', @name, ']')"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="concat(@name, $LANG_SUFFIX)"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:attribute>
    </xsl:template>

    <!--
        Наследуемые вспомогательные шаблоны: поддерживаем ради обратной
        совместимости. Для современных тем лучше переопределять их в
        собственных файлах, а не править базовый набор.
    -->
    <xsl:template name="build_title">
        <xsl:choose>
            <xsl:when test="string-length($DOC_PROPS[@name='title_alt']) &gt; 0">
                <xsl:value-of select="$DOC_PROPS[@name='title_alt']" />
            </xsl:when>
            <xsl:otherwise>
                <xsl:variable name="CRUMBS" select="$COMPONENTS[@name='breadCrumbs']/recordset/record"/>
                <xsl:variable name="CURRENT_ID" select="$DOC_PROPS[@name='ID']"/>
                <xsl:for-each select="$CRUMBS">
                    <xsl:sort data-type="text" order="descending" select="position()"/>
                    <xsl:choose>
                        <xsl:when test="position() = last()">
                            <xsl:if test="$CURRENT_ID = field[@name='Id'] and (field[@name='Name'] != '' or field[@name='Title'] != '')">
                                <xsl:choose>
                                    <xsl:when test="field[@name='Title'] != ''">
                                        <xsl:value-of select="field[@name='Title']"/>
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <xsl:value-of select="field[@name='Name']"/>
                                    </xsl:otherwise>
                                </xsl:choose>
                                <xsl:text> | </xsl:text>
                            </xsl:if>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:if test="field[@name='Name'] != '' or field[@name='Title'] != ''">
                                <xsl:choose>
                                    <xsl:when test="field[@name='Title'] != ''">
                                        <xsl:value-of select="field[@name='Title']"/>
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <xsl:value-of select="field[@name='Name']"/>
                                    </xsl:otherwise>
                                </xsl:choose>
                                <xsl:text> | </xsl:text>
                            </xsl:if>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:for-each>
                <xsl:value-of select="$COMPONENTS[@name='breadCrumbs']/@site"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template name="favicon">
        <link rel="shortcut icon" href="{$STATIC_URL}favicon.ico" type="image/x-icon"/>
    </xsl:template>

    <xsl:template name="scripts">
        <xsl:if test="not($DOC_PROPS[@name='single'])">
            <!-- Здесь можно подключить пользовательские скрипты -->
        </xsl:if>
    </xsl:template>

    <xsl:template name="stylesheets"/>
</xsl:stylesheet>
