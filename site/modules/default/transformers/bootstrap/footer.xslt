<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:template name="FOOTER">
        <footer class="bg-body-tertiary border-top mt-5">
            <div class="container py-5">
                <div class="row g-4">
                    <xsl:apply-templates select="$COMPONENTS[@name='footerTextBlock']" />

                    <xsl:for-each select="$COMPONENTS[(@tag='footer' or starts-with(@name,'footer')) and @name!='footerTextBlock']">
                        <xsl:apply-templates select="." mode="footer-column" />
                    </xsl:for-each>
                </div>
            </div>

            <div class="bg-body-secondary py-3">
                <div class="container text-center small text-muted">
                    <xsl:value-of select="//translation[@const='TXT_COPYRIGHT']" disable-output-escaping="yes"/>
                </div>
            </div>
        </footer>
    </xsl:template>

    <xsl:template match="component" mode="footer-column">
        <xsl:param name="columnClass" select="'col-6 col-md-4 col-xl-3'"/>
        <div class="{$columnClass}">
            <xsl:variable name="TITLE_PROP" select="normalize-space(properties/property[@name='title'])"/>
            <xsl:variable name="TITLE_ATTR" select="normalize-space(@title)"/>

            <xsl:if test="string-length($TITLE_PROP) &gt; 0 or string-length($TITLE_ATTR) &gt; 0">
                <h6 class="text-uppercase fw-semibold mb-3">
                    <xsl:choose>
                        <xsl:when test="string-length($TITLE_PROP) &gt; 0">
                            <xsl:value-of select="properties/property[@name='title']"/>
                        </xsl:when>
                        <xsl:when test="string-length($TITLE_ATTR) &gt; 0">
                            <xsl:value-of select="@title"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="@name"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </h6>
            </xsl:if>

            <ul class="list-unstyled mb-0">
                <xsl:apply-templates select="recordset/record" mode="footer-link" />
            </ul>
        </div>
    </xsl:template>

    <xsl:template match="component/recordset/record" mode="footer-link">
        <xsl:variable name="NAME" select="normalize-space(field[@name='Name'])"/>
        <xsl:variable name="DESCRIPTION" select="field[@name='Description']"/>
        <xsl:variable name="RAW_URL" select="normalize-space(field[@name='Url'])"/>
        <xsl:variable name="SEGMENT" select="normalize-space(field[@name='Segment'])"/>
        <xsl:variable name="LINK_TARGET">
            <xsl:choose>
                <xsl:when test="string-length($RAW_URL) &gt; 0">
                    <xsl:value-of select="$RAW_URL"/>
                </xsl:when>
                <xsl:when test="string-length($SEGMENT) &gt; 0">
                    <xsl:value-of select="$SEGMENT"/>
                </xsl:when>
                <xsl:otherwise>#</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>

        <xsl:if test="string-length($NAME) &gt; 0">
            <li class="mb-2">
                <a class="link-secondary text-decoration-none" href="{$LINK_TARGET}">
                    <xsl:value-of select="$NAME"/>
                </a>
                <xsl:if test="string-length(normalize-space($DESCRIPTION)) &gt; 0">
                    <div class="small text-muted">
                        <xsl:value-of select="$DESCRIPTION" disable-output-escaping="yes"/>
                    </div>
                </xsl:if>
            </li>
        </xsl:if>
    </xsl:template>

</xsl:stylesheet>
