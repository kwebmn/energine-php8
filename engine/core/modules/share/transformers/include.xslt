<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <!--
        Точка входа трансформеров модуля share.
        Сначала подключаем общий контекст и базовые правила с пониженным
        приоритетом, после чего импортируем шаблоны верхнего уровня и
        компонентные блоки.
    -->

    <xsl:import href="common/context.xslt"/>
    <xsl:import href="common/base.xslt"/>

    <xsl:include href="document.xslt"/>

    <!-- Компоненты -->
    <xsl:include href="components/list.xslt"/>
    <xsl:include href="components/file.xslt"/>
    <xsl:include href="components/text.xslt"/>
    <xsl:include href="components/media.xslt"/>
    <xsl:include href="components/division-editor.xslt"/>
    <xsl:include href="components/tag-editor.xslt"/>
    <xsl:include href="components/filters-tree-editor.xslt"/>

    <!-- Формы -->
    <xsl:include href="components/forms/form-field-wrapper.xslt"/>
    <xsl:include href="components/forms/fields.xslt"/>
    <xsl:include href="components/forms/form.xslt"/>

    <!-- Панели и навигация -->
    <xsl:include href="components/navigation/toolbar.xslt"/>
</xsl:stylesheet>
