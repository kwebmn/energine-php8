<?xml version="1.0" encoding="utf-8" ?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

    <xsl:template match="content[//layout[@file='account.layout.xml']]">

        <!-- Heading -->
        <div class="container-fluid">
            <div class="p-5 bg-body-tertiary mb-4">
                <h1 class=""><xsl:value-of select="//property[@name='title']"/></h1>
                <!-- Breadcrumb -->
                <nav class="d-flex">
                    <xsl:apply-templates select="$COMPONENTS[@name='breadCrumbs']"/>
                </nav>
                <!-- Breadcrumb -->
            </div>

        </div>
        <!-- Heading -->

        <div class="container-fluid">
            <div class="row">
                <div class="col-sm-4 col-xl-2">
                    <xsl:apply-templates select="$COMPONENTS[@name='userMenu']"/>
                </div>

                <div class="col-sm-8 col-xl-10">
                    <xsl:apply-templates />
                </div>
            </div>
        </div>

<!--        <div class="container-fluid m-t-20" >-->
<!--            <div class="row">-->
<!--                <div class="col-sm-12">-->
<!--                    <xsl:apply-templates select="$COMPONENTS[@name='breadCrumbs']"/>-->

<!--                    <div class="row">-->
<!--                        <div class="col-sm-3">-->
<!--                            <xsl:apply-templates select="$COMPONENTS[@name='userMenu']"/>-->
<!--                        </div>-->

<!--                        <div class="col-sm-9">-->
<!--                            <div class="card">-->
<!--                                <div class="card-header ch-alt">-->
<!--                                    <xsl:value-of select="//property[@name='title']"/>-->
<!--                                </div>-->

<!--                                <div class="card-body card-padding">-->
<!--                                    <xsl:apply-templates/>-->
<!--                                </div>-->

<!--                            </div>-->

<!--                        </div>-->
<!--                    </div>-->



<!--                </div>-->
<!--            </div>-->
<!--        </div>-->
    </xsl:template>


    <xsl:template match="component[@name='userMenu']">
        <xsl:apply-templates />
    </xsl:template>

    <xsl:template match="component[@name='userMenu']/recordset">
        <xsl:if test="not(@empty)">
            <ul class="list-group list-group-light">
<!--                -->
<!--                <li class="list-group-item">A second item</li>-->
<!--                <li class="list-group-item">A third item</li>-->
<!--                <li class="list-group-item">A fourth item</li>-->
<!--                <li class="list-group-item">And a fifth one</li>-->
                <xsl:apply-templates />
            </ul>
        </xsl:if>
    </xsl:template>

    <xsl:template match="component[@name='userMenu']/recordset/record">
        <li class="list-group-item px-3">
            <xsl:if test="field[@name='Id' and text() = $ID]">
                <xsl:attribute name="class">list-group-item px-3 active</xsl:attribute>
            </xsl:if>
            <a  href="{$LANG_ABBR}{field[@name='Segment']}">
                <xsl:value-of select="field[@name='Name']"/>
            </a>
        </li>
<!--        <xsl:if test="recordset">-->
<!--            <xsl:apply-templates select="recordset" />-->
<!--        </xsl:if>-->
    </xsl:template>

    <xsl:template match="component[@name='userMenu']/recordset/record//recordset">
        <xsl:apply-templates select="record" />
    </xsl:template>

    <xsl:template match="component[@name='userMenu']/recordset/record//recordset/record">
        <li>
            <xsl:if test="field[@name='Id' and text() = $ID]">
                <xsl:attribute name="class">active</xsl:attribute>
            </xsl:if>
            <a href="{$LANG_ABBR}{field[@name='Segment']}">
                <div class="row">
                    <div class="col-xs-11 col-sm-11 col-md-10 p-l-25 ">
                        <span class="zmdi zmdi-chevron-right m-r-15 m-l-5">
                            <xsl:if test="string-length(field[@name='Icon']) > 0">
                                <xsl:attribute name="class"><xsl:value-of select="field[@name='Icon']"/> m-r-15 m-l-5</xsl:attribute>
                            </xsl:if>
                        </span>
                        <xsl:value-of select="field[@name='Name']"/>
                    </div>

                </div>
            </a>
        </li>

    </xsl:template>

</xsl:stylesheet>
