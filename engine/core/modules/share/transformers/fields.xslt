<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <!--
        Field renderer bundle.

        Summary
        -------
        * Aggregates the specialised field stylesheets so integrators can
          override a single entry point.
        * Declares `xsl:key` lookups shared across input/select helpers.

        Usage
        -----
        * Import this file instead of targeting the leaf stylesheets directly –
          it mirrors the structure expected by site overrides.
        * Keep key names stable; downstream templates rely on them for cache
          hits.

        Split per concern
        ------------------
        * fields/helpers.xslt — attribute atoms and public mode documentation.
        * fields/input.xslt — text inputs and textarea-based controls.
        * fields/select.xslt — select boxes, multi-choice controls and tabs.
        * fields/date.xslt — date and time pickers.
        * fields/file.xslt — file pickers, attachments and media helpers.
        * fields/special.xslt — readonly, hidden and module-specific widgets.
    -->

    <xsl:key name="field-options-by-field" match="field/options/option" use="generate-id(../..)"/>
    <xsl:key name="field-selected-options-by-field" match="field/options/option[@selected or @selected='selected']" use="generate-id(../..)"/>

    <xsl:include href="fields/helpers.xslt"/>
    <xsl:include href="fields/input.xslt"/>
    <xsl:include href="fields/select.xslt"/>
    <xsl:include href="fields/date.xslt"/>
    <xsl:include href="fields/file.xslt"/>
    <xsl:include href="fields/special.xslt"/>

</xsl:stylesheet>
