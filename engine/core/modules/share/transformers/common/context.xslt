<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <!--
        Общий контекст документа для трансформеров модуля share.
        Здесь собираем переиспользуемые XPath-переменные, чтобы все
        шаблоны опирались на один и тот же набор вычисленных свойств
        документа и не обращались к `//` в произвольных местах.
    -->

    <xsl:variable name="DOCUMENT" select="/document"/>
    <xsl:variable name="DOC_PROPS" select="$DOCUMENT/properties/property"/>
    <xsl:variable name="COMPONENTS" select="$DOCUMENT//component[@name][@module]"/>
    <xsl:variable name="TRANSLATION" select="$DOCUMENT/translations/translation"/>

    <xsl:variable name="BASE_NODE" select="$DOC_PROPS[@name='base']"/>
    <xsl:variable name="BASE" select="$BASE_NODE"/>
    <xsl:variable name="FOLDER" select="$BASE_NODE/@folder"/>
    <xsl:variable name="LANG_ID" select="$DOC_PROPS[@name='lang']"/>
    <xsl:variable name="LANG_ABBR" select="$LANG_ID/@abbr"/>

    <xsl:variable name="STATIC_URL" select="$BASE_NODE/@static"/>
    <xsl:variable name="STATIC_HAS_TRAILING_SLASH" select="substring($STATIC_URL, string-length($STATIC_URL)) = '/'"/>
    <xsl:variable name="STATIC_SEPARATOR" select="substring('/', 1, (1 - number($STATIC_HAS_TRAILING_SLASH)) * number($STATIC_URL != ''))"/>
    <xsl:variable name="ASSETS_BASE" select="concat($STATIC_URL, $STATIC_SEPARATOR, 'assets/')"/>

    <xsl:variable name="MEDIA_URL" select="$BASE_NODE/@media"/>
    <xsl:variable name="RESIZER_URL" select="$BASE_NODE/@resizer"/>
    <xsl:variable name="MAIN_SITE" select="concat($BASE_NODE/@default, $LANG_ABBR)"/>

    <xsl:variable name="SCRIPTS_BASE" select="concat($DOC_PROPS[@name='scripts_base'], substring('scripts/', 1, string-length('scripts/') * number(string-length($DOC_PROPS[@name='scripts_base']) = 0)))"/>

    <xsl:variable name="DEBUG_MODE" select="$DOCUMENT/@debug != '0'"/>
    <xsl:variable name="ENERGINE_SCRIPT_PROP" select="$DOC_PROPS[@name='energine_script']"/>
    <xsl:variable name="ENERGINE_SRC_VALUE" select="
        concat(
            substring(concat($ASSETS_BASE, 'energine.js'), 1, string-length(concat($ASSETS_BASE, 'energine.js')) * (1 - number($DEBUG_MODE))),
            substring($ENERGINE_SCRIPT_PROP, 1, string-length($ENERGINE_SCRIPT_PROP) * number($DEBUG_MODE)),
            substring('scripts/Energine.js', 1, string-length('scripts/Energine.js') * number($DEBUG_MODE) * number(not(string-length($ENERGINE_SCRIPT_PROP))))
        )
    "/>
    <xsl:variable name="ENERGINE_SRC_IS_REMOTE" select="contains($ENERGINE_SRC_VALUE, '://') or starts-with($ENERGINE_SRC_VALUE, '//')"/>

    <xsl:variable name="ENERGINE_URL" select="
        concat(
            substring($ENERGINE_SRC_VALUE, 1, string-length($ENERGINE_SRC_VALUE) * number($ENERGINE_SRC_IS_REMOTE)),
            substring(concat($STATIC_URL, $ENERGINE_SRC_VALUE), 1, string-length(concat($STATIC_URL, $ENERGINE_SRC_VALUE)) * (1 - number($ENERGINE_SRC_IS_REMOTE)))
        )
    "/>
</xsl:stylesheet>
