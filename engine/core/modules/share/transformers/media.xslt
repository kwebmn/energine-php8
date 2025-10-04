<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet 
    version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
    >

    <!-- Video player (JW Player) -->
    <xsl:template name="VIDEO_PLAYER">
        <xsl:param name="PLAYER_WIDTH"/>
        <xsl:param name="PLAYER_HEIGHT"/>
        <xsl:param name="FILE"/>
        <xsl:variable name="PLAYER_ID">player_<xsl:value-of select="generate-id()"/></xsl:variable>
        <script type="text/javascript" src="{$STATIC_URL}scripts/jwplayer/jwplayer.js"></script>
        <script type="text/javascript" src="{$STATIC_URL}scripts/Player.js"></script>
        <div id="{$PLAYER_ID}">
            <xsl:attribute name="data-energine-js">Player</xsl:attribute>
            <xsl:attribute name="data-energine-param-player_id"><xsl:value-of select="$PLAYER_ID"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-image"><xsl:value-of select="$RESIZER_URL"/>w<xsl:value-of select="$PLAYER_WIDTH"/>-h<xsl:value-of select="$PLAYER_HEIGHT"/>/<xsl:value-of select="$FILE"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-files"><xsl:value-of select="$MEDIA_URL"/><xsl:value-of select="$FILE"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-width"><xsl:value-of select="$PLAYER_WIDTH"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-height"><xsl:value-of select="$PLAYER_HEIGHT"/></xsl:attribute>
            <xsl:attribute name="data-energine-param-autostart">false</xsl:attribute>
        </div>
    </xsl:template>
    <!-- /Video player (JW Player) -->
    
</xsl:stylesheet>