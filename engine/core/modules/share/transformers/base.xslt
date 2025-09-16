<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
        >

    <!--
        В этом файле собраны базовые правила обработки с низким приоритетом. Файл импортируется в include.xslt,
        что позволяет использовать правило apply-imports в шаблонах более высокого уровня.
        Для переопределения этих правил нужно создать такой же файл и подключить его (импортировать) аналогично 
        в нужный модуль. Также здесь собраны некоторые именованные шаблоны - импортирование позволяет переопределять
        их позже в site/transformers.
    -->

    <!-- именованный шаблон с дефолтным набором атрибутов для элемента формы - НЕ ПЕРЕПИСЫВАТЬ В ДРУГОМ МЕСТЕ! -->
    <xsl:template name="FORM_ELEMENT_ATTRIBUTES">
        <xsl:if test="not(@type='text') and not(@type='htmlblock')">
            <xsl:attribute name="type">text</xsl:attribute>
            <xsl:attribute name="value"><xsl:value-of select="."/></xsl:attribute>
        </xsl:if>
        <xsl:if test="@type='datetime'">
            <xsl:attribute name="type">datetime-local</xsl:attribute>
        </xsl:if>
        <xsl:if test="@type='date'">
            <xsl:attribute name="type">date</xsl:attribute>
        </xsl:if>
        <xsl:attribute name="id">
            <xsl:value-of select="@name"/>
            <xsl:if test="@language">_<xsl:value-of select="@language"/></xsl:if>
        </xsl:attribute>
        <xsl:attribute name="name"><xsl:choose>
            <xsl:when test="@tableName"><xsl:value-of select="@tableName"/><xsl:if test="@language">[<xsl:value-of select="@language"/>]</xsl:if>[<xsl:value-of select="@name"/>]</xsl:when>
            <xsl:otherwise><xsl:value-of select="@name"/></xsl:otherwise>
        </xsl:choose></xsl:attribute>
        <xsl:if test="@length and not(@type='htmlblock')">
            <xsl:attribute name="maxlength"><xsl:value-of select="@length"/></xsl:attribute>
        </xsl:if>
        <xsl:if test="@pattern">
            <xsl:attribute name="nrgn:pattern" xmlns:nrgn="http://energine.org"><xsl:value-of select="@pattern"/></xsl:attribute>
        </xsl:if>
        <xsl:if test="@message">
            <xsl:attribute name="nrgn:message" xmlns:nrgn="http://energine.org"><xsl:value-of select="@message"/></xsl:attribute>
        </xsl:if>
        <xsl:if test="@message2">
            <xsl:attribute name="nrgn:message2" xmlns:nrgn="http://energine.org"><xsl:value-of select="@message2"/></xsl:attribute>
        </xsl:if>
        <xsl:if test="not(@nullable) or @nullable='0'">
            <xsl:attribute name="required">required</xsl:attribute>
        </xsl:if>
    </xsl:template>

    <!-- именованный шаблон с дефолтным набором атрибутов для элемента формы, на который права только на чтение - НЕ ПЕРЕПИСЫВАТЬ В ДРУГОМ МЕСТЕ! -->
    <xsl:template name="FORM_ELEMENT_ATTRIBUTES_READONLY">
        <xsl:attribute name="type">hidden</xsl:attribute>
        <xsl:attribute name="value"><xsl:value-of select="."/></xsl:attribute>
        <xsl:attribute name="id"><xsl:value-of select="@name"/></xsl:attribute>
        <xsl:attribute name="name"><xsl:choose>
            <xsl:when test="@tableName"><xsl:value-of select="@tableName"/>[<xsl:value-of select="@name"/>]</xsl:when>
            <xsl:otherwise><xsl:value-of select="@name"/></xsl:otherwise>
        </xsl:choose></xsl:attribute>
    </xsl:template>

    <!-- именованный шаблон для построения заголовка окна -->
    <!--@deprecated-->
    <xsl:template name="build_title">
        <xsl:choose>
            <xsl:when test="string-length(//property[@name='title_alt']) > 0">
                <xsl:value-of select="//property[@name='title_alt']" />
            </xsl:when>

            <xsl:otherwise>
                <xsl:for-each select="$COMPONENTS[@name='breadCrumbs']/recordset/record">
                    <xsl:sort data-type="text" order="descending" select="position()"/>
                    <xsl:choose>
                        <xsl:when test="position() = last()">
                            <xsl:if test="$ID = field[@name='Id'] and (field[@name='Name'] != '' or field[@name='Title'] != '')">
                                <xsl:choose>
                                    <xsl:when test="field[@name='Title'] != ''"><xsl:value-of select="field[@name='Title']"/></xsl:when>
                                    <xsl:otherwise><xsl:value-of select="field[@name='Name']"/></xsl:otherwise>
                                </xsl:choose>
                                <xsl:text> | </xsl:text>
                            </xsl:if>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:if test="field[@name='Name'] != '' or field[@name='Title'] != ''">
                                <xsl:choose>
                                    <xsl:when test="field[@name='Title'] != ''"><xsl:value-of select="field[@name='Title']"/></xsl:when>
                                    <xsl:otherwise><xsl:value-of select="field[@name='Name']"/></xsl:otherwise>
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

    <!-- именованный шаблон для подключения значка сайта -->
    <!--@deprecated-->
    <xsl:template name="favicon">
        <link rel="shortcut icon" href="{$STATIC_URL}/favicon.ico" type="image/x-icon"/>
    </xsl:template>

    <!-- именованный шаблон для подключения интерфейсных скриптов  -->
    <!--@deprecated-->
    <xsl:template name="scripts">
        <xsl:if test="not($DOC_PROPS[@name='single'])"><!-- User JS is here--></xsl:if>
    </xsl:template>

    <!-- именованный шаблон для подключения файлов стилей -->
    <!--@deprecated-->
    <xsl:template name="stylesheets">
    </xsl:template>
</xsl:stylesheet>
