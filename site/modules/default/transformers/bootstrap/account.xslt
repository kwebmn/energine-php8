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
            <ul class="list-group list-group-flush">
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
        <li>
            <xsl:attribute name="class">
                <xsl:text>list-group-item list-group-item-action px-3</xsl:text>
                <xsl:if test="field[@name='Id' and text() = $ID]">
                    <xsl:text> active</xsl:text>
                </xsl:if>
            </xsl:attribute>
            <xsl:if test="field[@name='Id' and text() = $ID]">
                <xsl:attribute name="aria-current">page</xsl:attribute>
            </xsl:if>
            <a class="d-block text-decoration-none text-reset stretched-link" href="{$LANG_ABBR}{field[@name='Segment']}">
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
            <xsl:attribute name="class">
                <xsl:text>list-group-item list-group-item-action ps-4</xsl:text>
                <xsl:if test="field[@name='Id' and text() = $ID]">
                    <xsl:text> active</xsl:text>
                </xsl:if>
            </xsl:attribute>
            <xsl:if test="field[@name='Id' and text() = $ID]">
                <xsl:attribute name="aria-current">page</xsl:attribute>
            </xsl:if>
            <a class="d-flex align-items-center gap-2 text-decoration-none text-reset" href="{$LANG_ABBR}{field[@name='Segment']}">
                <span class="zmdi zmdi-chevron-right me-3 ms-1">
                    <xsl:if test="string-length(field[@name='Icon']) &gt; 0">
                        <xsl:attribute name="class"><xsl:value-of select="field[@name='Icon']"/> me-3 ms-1</xsl:attribute>
                    </xsl:if>
                </span>
                <span class="flex-grow-1">
                    <xsl:value-of select="field[@name='Name']"/>
                </span>
            </a>
        </li>

    </xsl:template>

</xsl:stylesheet>
