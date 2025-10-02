<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <!--
        List renderer (print mode).

        Summary
        -------
        * Handles only `@exttype='print'` components so the interactive
          templates remain lightweight.
        * Outputs a minimal table structure optimised for browsers' print view.

        Usage
        -----
        * Override this file in the site bundle to change printable markup while
          leaving interactive behaviour untouched.
        * Provide the same recordset structure that the default list renderer
          expects.

        Rules of the road
        ------------------
        * Do not introduce scripts or interactivity here – browsers ignore them
          in print mode and they bloat the payload.
        * Keep captions and headers accessible; rely on `<caption>` and `<thead>`.
    -->

    <xsl:template match="component[@type='list'][@exttype='print']">
        <style type="text/css">
            THEAD { display: table-header-group; }
        </style>
        <table border="1">
            <caption><xsl:value-of select="@title"/></caption>
            <thead>
                <tr>
                    <th>...</th>
                    <xsl:for-each select="recordset/record[1]/field[@type!='hidden'][@index != 'PRI' or not(@index)]">
                        <th><xsl:value-of select="@title"/></th>
                    </xsl:for-each>
                </tr>
            </thead>
            <tbody>
                <xsl:for-each select="recordset/record">
                    <tr>
                        <td><xsl:number value="position()" format="1. "/></td>
                        <xsl:for-each select="field[@type!='hidden'][@index != 'PRI' or not(@index)]">
                            <td>
                                <xsl:choose>
                                    <xsl:when test="@type='select'">
                                        <xsl:variable name="SELECTED" select="key('field-selected-options-by-field', generate-id(.))"/>
                                        <xsl:value-of select="$SELECTED"/>
                                    </xsl:when>
                                    <xsl:when test="@type='image'">
                                        <img src="{.}" border="0"/>
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <xsl:value-of select="."/>
                                    </xsl:otherwise>
                                </xsl:choose>
                            </td>
                        </xsl:for-each>
                    </tr>
                </xsl:for-each>
            </tbody>
        </table>
    </xsl:template>

</xsl:stylesheet>
