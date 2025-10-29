<?xml version="1.0" encoding="utf-8" ?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

    <xsl:template match="container[@name='profile']">
        <div class="card" data-e-js="UserProfileTabs">
            <div class="card-body">
                <ul class="nav nav-tabs mb-3" id="user-profile-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <a class="nav-link active"
                           id="user-profile-tab-1"
                           href="#tab-1"
                           role="tab"
                           aria-controls="tab-1"
                           aria-selected="true">
                            <xsl:attribute name="data-mdb-tab-init">true</xsl:attribute>
                            <xsl:value-of select="//translation[@const='TXT_PROFILE_CHANGE_MY_DATA']"/>
                        </a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link"
                           id="user-profile-tab-2"
                           href="#tab-2"
                           role="tab"
                           aria-controls="tab-2"
                           aria-selected="false">
                            <xsl:attribute name="data-mdb-tab-init">true</xsl:attribute>
                            <xsl:value-of select="//translation[@const='TXT_PROFILE_CHANGE_PASSWORD']"/>
                        </a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link"
                           id="user-profile-tab-3"
                           href="#tab-3"
                           role="tab"
                           aria-controls="tab-3"
                           aria-selected="false">
                            <xsl:attribute name="data-mdb-tab-init">true</xsl:attribute>
                            <xsl:value-of select="//translation[@const='TXT_PROFILE_CHANGE_EMAIL']"/>
                        </a>
                    </li>

                </ul>

                <div class="tab-content mt-4">
                    <div role="tabpanel" class="tab-pane fade show active" id="tab-1" aria-labelledby="user-profile-tab-1">
                        <xsl:apply-templates select="component[@name='userProfileMain']" />
                    </div>
                    <div role="tabpanel" class="tab-pane fade" id="tab-2" aria-labelledby="user-profile-tab-2">
                        <xsl:apply-templates select="component[@name='userProfilePassword']" />
                    </div>
                    <div role="tabpanel" class="tab-pane fade" id="tab-3" aria-labelledby="user-profile-tab-3">
                        <xsl:apply-templates select="component[@name='userProfileEmail']" />
                    </div>

                </div>


            </div>
        </div>


    </xsl:template>

    <xsl:template match="component[@class='UserProfile']">
        <xsl:variable name="BEHAVIOR" select="normalize-space(javascript/behavior/@name)"/>
        <form method="post" action="{$BASE}{$LANG_ABBR}{@action}" class="justify-content-center">
            <xsl:if test="string-length($BEHAVIOR) &gt; 0">
                <xsl:attribute name="data-e-js"><xsl:value-of select="$BEHAVIOR"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="string-length(normalize-space(@template)) &gt; 0">
                <xsl:attribute name="data-e-template"><xsl:value-of select="@template"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="string-length(normalize-space(@single_template)) &gt; 0">
                <xsl:attribute name="data-e-single-template"><xsl:value-of select="@single_template"/></xsl:attribute>
                <xsl:attribute name="single_template"><xsl:value-of select="@single_template"/></xsl:attribute>
            </xsl:if>

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
                        <xsl:if test="@nullable!='1'">
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
