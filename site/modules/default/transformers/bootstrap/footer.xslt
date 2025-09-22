<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform">


    <xsl:template name="FOOTER">
        <!-- Footer -->
        <footer class="bg-light text-center mt-5">
            <!-- Grid container -->
            <div class="container p-4">



                <!-- Section: Text -->
                <section class="mb-4">
                    <xsl:apply-templates select="$COMPONENTS[@name='footerTextBlock']" />
<!--                    <p>-->
<!--                        Lorem ipsum dolor sit amet consectetur adipisicing elit. Sunt-->
<!--                        distinctio earum repellat quaerat voluptatibus placeat nam,-->
<!--                        commodi optio pariatur est quia magnam eum harum corrupti dicta,-->
<!--                        aliquam sequi voluptate quas.-->
<!--                    </p>-->
                </section>
                <!-- Section: Text -->


                <!-- Section: Links -->
                <!-- Section: Links -->

            </div>
            <!-- Grid container -->

            <!-- Copyright -->
            <div class="text-center p-3" style="background-color: rgba(0, 0, 0, 0.2)">
                <xsl:value-of select="//translation[@const='TXT_COPYRIGHT']" disable-output-escaping="yes"/>
            </div>
            <!-- Copyright -->

        </footer>
        <!-- Footer -->
    </xsl:template>

</xsl:stylesheet>
