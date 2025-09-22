<?xml version="1.0" encoding="utf-8" ?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

    <xsl:template match="container[@name='profile']">
        <div class="card">
            <div class="card-body">
                <ul class="nav nav-tabs mb-3" role="tablist">
                    <li class="nav-item">
                        <a data-bs-toggle="tab"
                           data-bs-target="#tab-1"
                           class="nav-link active"
                           id="ex1-tab-1"
                           href="#tab-1"
                           role="tab"
                           aria-controls="tab-1"
                           aria-selected="true">
                            <xsl:value-of select="//translation[@const='TXT_PROFILE_CHANGE_MY_DATA']"/>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a data-bs-toggle="tab"
                           data-bs-target="#tab-2"
                           class="nav-link"
                           id="ex1-tab-2"
                           href="#tab-2"
                           role="tab"
                           aria-controls="tab-2"
                           aria-selected="false">
                            <xsl:value-of select="//translation[@const='TXT_PROFILE_CHANGE_PASSWORD']"/>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a data-bs-toggle="tab"
                           data-bs-target="#tab-3"
                           class="nav-link"
                           id="ex1-tab-3"
                           href="#tab-3"
                           role="tab"
                           aria-controls="tab-3"
                           aria-selected="false">
                            <xsl:value-of select="//translation[@const='TXT_PROFILE_CHANGE_EMAIL']"/>
                        </a>
                    </li>

                </ul>

                <div class="tab-content mt-4">
                    <div role="tabpanel" class="tab-pane fade show active" id="tab-1" aria-labelledby="ex1-tab-1">
                        <xsl:apply-templates select="component[@name='userProfileMain']" />
                    </div>
                    <div role="tabpanel" class="tab-pane fade" id="tab-2" aria-labelledby="ex1-tab-2">
                        <xsl:apply-templates select="component[@name='userProfilePassword']" />
                    </div>
                    <div role="tabpanel" class="tab-pane fade" id="tab-3" aria-labelledby="ex1-tab-3">
                        <xsl:apply-templates select="component[@name='userProfileEmail']" />
                    </div>

                </div>


            </div>
        </div>


    </xsl:template>

    <xsl:template match="component[@class='UserProfile']">
        <form method="POST" action="{$BASE}{$LANG_ABBR}{@action}" id ="{generate-id(recordset)}" single_template="{@single_template}" class="justify-content-center">

            <xsl:apply-templates />

        </form>
    </xsl:template>

    <xsl:template match="component[@class='UserProfile']/recordset">
        <xsl:apply-templates />
    </xsl:template>

    <xsl:template match="component[@class='UserProfile']/recordset/record">
        <xsl:apply-templates />
    </xsl:template>


    <xsl:template match="component[@class='UserProfile']/recordset/record/field">
        <div class="row mb-3">
            <div class="col-xl-6">
                <div class="mb-3">
                    <label for="{@name}" class="form-label"><xsl:value-of select="@title" /></label>
                    <input type="text" class="form-control" name="{@tableName}[{@name}]" id="{@name}" value="{.}">
                        <xsl:if test="not(@nullable = 1)">
                            <xsl:attribute name="required">required</xsl:attribute>
                        </xsl:if>
                        <xsl:if test="@type = 'password'">
                            <xsl:attribute name="type">password</xsl:attribute>
                        </xsl:if>
                    </input>
                </div>
            </div>
        </div>

    </xsl:template>

    <xsl:template match="component[@class='UserProfile']/recordset/record/field[@type='hidden']">
            <input type="hidden" name="{@tableName}[{@name}]" />
    </xsl:template>

    <xsl:template match="component[@class='UserProfile']/toolbar">
        <xsl:apply-templates />
    </xsl:template>

    <xsl:template match="component[@class='UserProfile']/toolbar/control">
        <button type="{@type}"  class="btn btn-primary py-2" >
            <xsl:value-of select="@title" />
        </button>
    </xsl:template>

</xsl:stylesheet>
