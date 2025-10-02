<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet 
    version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
    >

    <!--
        Core transformer bundle entry point.

        Summary
        -------
        * Imports the low-precedence base rules and includes the public
          share-module templates.
        * Serves as the single import target for site overrides so precedence is
          predictable.

        Usage
        -----
        * Import this stylesheet with `xsl:import` before custom site templates.
        * Keep include order stable unless there is a precedence reason to
          change it.

        Rules of the road
        ------------------
        * Avoid referencing site-specific paths here; this file belongs to the
          core module and must stay generic.
        * Document new includes in the comment above so integrators know where
          to extend.
    -->

    <xsl:import href="base.xslt"/>
    <xsl:include href="document.xslt"/>
    <xsl:include href="container.xslt"/>
    <xsl:include href="list.xslt"/>
    <xsl:include href="list.print.xslt"/>
    <xsl:include href="form-field-wrapper.xslt"/>
    <xsl:include href="classes.xslt"/>
    <xsl:include href="fields.xslt"/>
    <xsl:include href="form.xslt"/>
    <xsl:include href="toolbar.xslt"/>
    <xsl:include href="file.xslt"/>
    <xsl:include href="divisionEditor.xslt"/>
    <xsl:include href="tagEditor.xslt"/>
    <xsl:include href="text.xslt"/>
    <xsl:include href="media.xslt"/>
    <xsl:include href="filters_tree_editor.xslt"/>
    <!--<xsl:include href="error_page.xslt"/>-->
    
</xsl:stylesheet>