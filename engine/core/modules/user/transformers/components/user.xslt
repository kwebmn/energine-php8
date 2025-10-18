<?xml version='1.0' encoding="UTF-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <!-- компонент LoginForm  -->
    <!-- режим гостя -->
    <xsl:template match="component[@sample='LoginForm']">
        <form method="post" action="{@action}" class="base_form login_form">
            <input type="hidden" name="componentAction" value="{@componentAction}" />
            <xsl:apply-templates/>
        </form>
    </xsl:template>

    <xsl:template match="recordset[parent::component[@sample='LoginForm']]">
        <div id="{generate-id(.)}" single_template="{$BASE}{$LANG_ABBR}{../@single_template}" template="{$BASE}{$LANG_ABBR}{../@template}">
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <xsl:template match="control[(@id='restore') and (@mode!=0)][ancestor::component[@sample='LoginForm']]">
            <div class="restore_link">
                <a href="{$BASE}{$LANG_ABBR}{@click}"><xsl:value-of select="@title" /></a>
            </div>
    </xsl:template>

    <xsl:template match="control[(@id='auth.facebook') and not(@disabled)][ancestor::component[@sample='LoginForm']]">
        <a href="#" id="fbAuth" onclick="return false;"><xsl:value-of select="@title"/></a>
        <script type="text/javascript">
            FBL.set('<xsl:value-of select="@appID"/>');
        </script>
        <div id="fb-root"></div>
    </xsl:template>

    <xsl:template match="control[(@id='auth.vk') and not(@disabled)][ancestor::component[@sample='LoginForm']]">
        <script type="text/javascript" src="//vk.com/js/api/openapi.js?95"></script>
        <a href="#" id="vkAuth" onclick="return false;"><xsl:value-of select="@title"/></a>
        <script type="text/javascript">
            VKI.set('<xsl:value-of select="@appID"/>');
        </script>
    </xsl:template>

    <xsl:template match="field[@name='message'][ancestor::component[@sample='LoginForm']]">
        <div class="error_message">
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <!-- режим пользователя за логином -->
    <xsl:template match="recordset[parent::component[@sample='LoginForm'][@componentAction='showLogoutForm']]">
        <div>
           <xsl:apply-templates/>
        </div>
    </xsl:template>

    <xsl:template match="record[ancestor::component[@sample='LoginForm'][@componentAction='showLogoutForm']]">
        <span class="user_greeting"><xsl:value-of select="$TRANSLATION[@const='TXT_USER_GREETING']"/></span><xsl:value-of select="$NBSP" disable-output-escaping="yes" />
        <span class="user_name"><xsl:value-of select="$TRANSLATION[@const='TXT_USER_NAME']"/>:<xsl:value-of select="$NBSP" disable-output-escaping="yes" /><strong><xsl:value-of select="field[@name='u_name']"/></strong></span><br/>
        <span class="user_role"><xsl:value-of select="$TRANSLATION[@const='TXT_ROLE_TEXT']"/>:<xsl:value-of select="$NBSP" disable-output-escaping="yes" /><strong><xsl:value-of select="field[@name='role_name']"/></strong></span>
    </xsl:template>
    <!-- /компонент LoginForm  -->

    <!-- компонент Register -->
    <xsl:template match="component[@class='Register'][@componentAction='success']">
        <div class="result_message">
            <xsl:value-of select="recordset/record/field" disable-output-escaping="yes"/>
        </div>
    </xsl:template>

    <xsl:template match="recordset[parent::component[@class='Register']]">
        <div><xsl:value-of select="$TRANSLATION[@const='TXT_REGISTRATION_TEXT']" disable-output-escaping="yes"/></div>
        <div id="{generate-id(.)}" single_template="{$BASE}{$LANG_ABBR}{../@single_template}">
            <xsl:apply-templates/>
        </div>
        <xsl:if test="$TRANSLATION[@const='TXT_REQUIRED_FIELDS']">
            <div class="note">
                <xsl:value-of select="$TRANSLATION[@const='TXT_REQUIRED_FIELDS']" disable-output-escaping="yes"/>
            </div>
        </xsl:if>
    </xsl:template>
    <!-- /компонент Register -->

    <!-- компонент UserProfile -->
    <xsl:template match="component[@class='UserProfile'][@componentAction='success']">
        <div class="result_message">
            <xsl:value-of select="recordset/record/field" disable-output-escaping="yes"/>
        </div>
    </xsl:template>
    <!-- /компонент UserProfile -->

    <!-- компонент RoleEditor -->
    <xsl:template match="field[@name='group_div_rights']">
        <div class="table-responsive">
            <table class="table table-bordered table-striped align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th scope="col" class="text-nowrap"><xsl:text disable-output-escaping="yes">&amp;nbsp;</xsl:text></th>
                        <xsl:for-each select="recordset/record[1]/field[@name='RightsId']/options/option">
                            <th scope="col" class="text-center text-nowrap"><xsl:value-of select="."/></th>
                        </xsl:for-each>
                    </tr>
                </thead>
                <tbody>
                    <xsl:call-template name="BUILD_DIV_TREE">
                        <xsl:with-param name="DATA" select="recordset"/>
                        <xsl:with-param name="LEVEL" select="0"/>
                    </xsl:call-template>
                </tbody>
            </table>
        </div>
    </xsl:template>

    <xsl:template name="BUILD_DIV_TREE">
        <xsl:param name="DATA"/>
        <xsl:param name="LEVEL"/>
        <xsl:for-each select="$DATA/record">
            <xsl:if test="$LEVEL=0">
                <tr class="table-secondary">
                    <th scope="row" class="fw-semibold align-middle"><xsl:value-of select="field[@name='Site']"/></th>
                    <xsl:for-each select="field[@name='RightsId']/options/option">
                        <td class="text-center"><input type="radio" class="form-check-input" name=""></input></td>
                    </xsl:for-each>
                </tr>
            </xsl:if>
            <tr>
                <xsl:variable name="padding-class">
                    <xsl:choose>
                        <xsl:when test="$LEVEL = 0">ps-2</xsl:when>
                        <xsl:when test="$LEVEL = 1">ps-4</xsl:when>
                        <xsl:otherwise>ps-5</xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <td>
                    <xsl:attribute name="class">
                        <xsl:text>align-middle </xsl:text>
                        <xsl:value-of select="$padding-class"/>
                    </xsl:attribute>
                    <xsl:value-of select="field[@name='Name']"/>
                </td>
                <xsl:for-each select="field[@name='RightsId']/options/option">
                    <td class="text-center">
                        <input type="radio" class="form-check-input" name="div_right[{../../../field[@name='Id']}]" value="{@id}">
                            <xsl:if test="@selected">
                                <xsl:attribute name="checked">checked</xsl:attribute>
                            </xsl:if>
                            <xsl:if test="../../@mode=1">
                                <xsl:attribute name="disabled">disabled</xsl:attribute>
                            </xsl:if>
                        </input>
                    </td>
                </xsl:for-each>
            </tr>

            <xsl:if test="recordset">
                <xsl:call-template name="BUILD_DIV_TREE">
                    <xsl:with-param name="DATA" select="recordset"/>
                    <xsl:with-param name="LEVEL" select="$LEVEL+1"/>
                </xsl:call-template>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>
    <!-- /компонент RoleEditor -->

    <xsl:template match="field[@name='u_avatar_img'][@mode='1'][ancestor::component[@type='form']]" mode="field_input_readonly">
        <div><img src="{.}" alt=""/></div>
        <a href="{.}" target="_blank"><xsl:value-of select="."/></a>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
        </input>
    </xsl:template>

</xsl:stylesheet>