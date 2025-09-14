<?xml version="1.0" encoding="utf-8" ?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

    <xsl:template match="container[@name='profile']">
        <div class="card">
            <div class="card-body">
                <ul class="nav nav-tabs mb-3" role="tablist">
                    <li class="nav-item">
                        <a data-mdb-tab-init="1"
                           class="nav-link active"
                           id="ex1-tab-1"
                           href="#tab-1"
                           role="tab"
                           aria-controls="ex1-tabs-1"
                           aria-selected="true" >
                            <xsl:value-of select="//translation[@const='TXT_PROFILE_CHANGE_MY_DATA']"/>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a data-mdb-tab-init="1"
                           class="nav-link"
                           id="ex1-tab-2"
                           href="#tab-2"
                           role="tab"
                           aria-controls="ex1-tabs-2"
                           aria-selected="true" >
                            <xsl:value-of select="//translation[@const='TXT_PROFILE_CHANGE_PASSWORD']"/>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a data-mdb-tab-init="1"
                           class="nav-link"
                           id="ex1-tab-3"
                           href="#tab-3"
                           role="tab"
                           aria-controls="ex1-tabs-3"
                           aria-selected="true" >
                            <xsl:value-of select="//translation[@const='TXT_PROFILE_CHANGE_EMAIL']"/>
                        </a>
                    </li>

                </ul>

                <div class="tab-content mt-4">
                    <div role="tabpanel" class="tab-pane active" id="tab-1">
                        <xsl:apply-templates select="component[@name='userProfileMain']" />
                    </div>
                    <div role="tabpanel" class="tab-pane" id="tab-2">
                        <xsl:apply-templates select="component[@name='userProfilePassword']" />
                    </div>
                    <div role="tabpanel" class="tab-pane" id="tab-3">
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
        <div class="row my-3">
            <div class="col-xl-6">
                <div class="form-outline" data-mdb-input-init="1"  >
                    <input type="text" class="form-control" name="{@tableName}[{@name}]" id="{@name}" value="{.}">
                        <xsl:if test="not(@nullable = 1)">
                            <xsl:attribute name="required">required</xsl:attribute>
                        </xsl:if>
                        <xsl:if test="@type = 'password'">
                            <xsl:attribute name="type">password</xsl:attribute>
                        </xsl:if>
                    </input>
                    <label for="{@name}" class="form-label"><xsl:value-of select="@title" /></label>
                    <!--<label class="fg-label"><xsl:value-of select="@title"></xsl:value-of></label>-->
                    <!--<small class="help-block"><xsl:value-of select="@message"/></small>-->
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
        <button type="{@type}"  class="btn btn-primary py-2" data-mdb-ripple-init="1" >
            <xsl:value-of select="@title" />
        </button>
    </xsl:template>

</xsl:stylesheet>
