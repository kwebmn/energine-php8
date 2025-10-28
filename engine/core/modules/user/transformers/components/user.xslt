<?xml version='1.0' encoding="UTF-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    >

    <!-- компонент LoginForm  -->
    <!-- режим гостя -->
    <xsl:template match="component[@sample='LoginForm']">
        <xsl:variable name="HAS_TITLE" select="string-length(normalize-space(@title)) &gt; 0"/>
        <section class="card shadow-sm border-0 rounded-3" data-role="pane">
            <xsl:if test="$HAS_TITLE">
                <div class="card-header bg-body-tertiary border-bottom" data-pane-part="header">
                    <h2 class="h5 mb-0">
                        <xsl:value-of select="@title"/>
                    </h2>
                </div>
            </xsl:if>
            <div class="card-body p-4 d-flex flex-column gap-3" data-pane-part="body">
                <form method="post" action="{@action}" class="d-flex flex-column gap-3" data-role="login-form">
                    <input type="hidden" name="componentAction" value="{@componentAction}" />
                    <xsl:apply-templates/>
                </form>
            </div>
        </section>
    </xsl:template>

    <xsl:template match="recordset[parent::component[@sample='LoginForm']]">
        <xsl:variable name="COMPONENT" select=".."/>
        <xsl:variable name="TEMPLATE_PATH" select="concat($BASE, $LANG_ABBR, $COMPONENT/@template)"/>
        <xsl:variable name="SINGLE_TEMPLATE_PATH" select="concat($BASE, $LANG_ABBR, $COMPONENT/@single_template)"/>
        <div class="d-flex flex-column gap-3">
            <xsl:attribute name="id"><xsl:value-of select="generate-id(.)"/></xsl:attribute>
            <xsl:attribute name="template"><xsl:value-of select="$TEMPLATE_PATH"/></xsl:attribute>
            <xsl:attribute name="single_template"><xsl:value-of select="$SINGLE_TEMPLATE_PATH"/></xsl:attribute>
            <xsl:attribute name="data-e-template"><xsl:value-of select="$TEMPLATE_PATH"/></xsl:attribute>
            <xsl:attribute name="data-e-single-template"><xsl:value-of select="$SINGLE_TEMPLATE_PATH"/></xsl:attribute>
            <xsl:if test="string-length(normalize-space($COMPONENT/javascript/behavior/@name)) &gt; 0">
                <xsl:attribute name="data-e-js"><xsl:value-of select="$COMPONENT/javascript/behavior/@name"/></xsl:attribute>
            </xsl:if>
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <xsl:template match="control[(@id='restore') and (@mode!=0)][ancestor::component[@sample='LoginForm']]">
        <div class="d-flex justify-content-end">
            <a class="link-secondary" data-action="restore-password" href="{$BASE}{$LANG_ABBR}{@click}">
                <xsl:value-of select="@title" />
            </a>
        </div>
    </xsl:template>

    <xsl:template match="control[(@id='auth.facebook') and not(@disabled)][ancestor::component[@sample='LoginForm']]">
        <a href="#" id="fbAuth" class="btn btn-outline-primary w-100" data-action="auth-facebook" onclick="return false;">
            <xsl:value-of select="@title"/>
        </a>
        <script type="text/javascript">
            FBL.set('<xsl:value-of select="@appID"/>');
        </script>
        <div id="fb-root"></div>
    </xsl:template>

    <xsl:template match="control[(@id='auth.vk') and not(@disabled)][ancestor::component[@sample='LoginForm']]">
        <script type="text/javascript" src="//vk.com/js/api/openapi.js?95"></script>
        <a href="#" id="vkAuth" class="btn btn-outline-primary w-100" data-action="auth-vk" onclick="return false;">
            <xsl:value-of select="@title"/>
        </a>
        <script type="text/javascript">
            VKI.set('<xsl:value-of select="@appID"/>');
        </script>
    </xsl:template>

    <xsl:template match="field[@name='message'][ancestor::component[@sample='LoginForm']]">
        <div class="alert alert-danger" data-role="form-error" role="alert">
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <!-- режим пользователя за логином -->
    <xsl:template match="recordset[parent::component[@sample='LoginForm'][@componentAction='showLogoutForm']]">
        <xsl:variable name="COMPONENT" select=".."/>
        <xsl:variable name="TEMPLATE_PATH" select="concat($BASE, $LANG_ABBR, $COMPONENT/@template)"/>
        <xsl:variable name="SINGLE_TEMPLATE_PATH" select="concat($BASE, $LANG_ABBR, $COMPONENT/@single_template)"/>
        <div class="d-flex flex-column gap-3">
            <xsl:attribute name="id"><xsl:value-of select="generate-id(.)"/></xsl:attribute>
            <xsl:attribute name="template"><xsl:value-of select="$TEMPLATE_PATH"/></xsl:attribute>
            <xsl:attribute name="single_template"><xsl:value-of select="$SINGLE_TEMPLATE_PATH"/></xsl:attribute>
            <xsl:attribute name="data-e-template"><xsl:value-of select="$TEMPLATE_PATH"/></xsl:attribute>
            <xsl:attribute name="data-e-single-template"><xsl:value-of select="$SINGLE_TEMPLATE_PATH"/></xsl:attribute>
            <xsl:if test="string-length(normalize-space($COMPONENT/javascript/behavior/@name)) &gt; 0">
                <xsl:attribute name="data-e-js"><xsl:value-of select="$COMPONENT/javascript/behavior/@name"/></xsl:attribute>
            </xsl:if>
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <xsl:template match="record[ancestor::component[@sample='LoginForm'][@componentAction='showLogoutForm']]">
        <div class="d-flex flex-column gap-2">
            <p class="mb-0 text-muted">
                <xsl:value-of select="$TRANSLATION[@const='TXT_USER_GREETING']"/>
            </p>
            <p class="mb-0">
                <span class="text-muted me-2">
                    <xsl:value-of select="$TRANSLATION[@const='TXT_USER_NAME']"/>
                    <xsl:text>:</xsl:text>
                </span>
                <strong><xsl:value-of select="field[@name='u_name']"/></strong>
            </p>
            <p class="mb-0">
                <span class="text-muted me-2">
                    <xsl:value-of select="$TRANSLATION[@const='TXT_ROLE_TEXT']"/>
                    <xsl:text>:</xsl:text>
                </span>
                <strong><xsl:value-of select="field[@name='role_name']"/></strong>
            </p>
        </div>
    </xsl:template>
    <!-- /компонент LoginForm  -->

    <!-- компонент Register -->
    <xsl:template match="component[@class='Register'][@componentAction='success']">
        <div class="alert alert-success" role="alert">
            <xsl:value-of select="recordset/record/field" disable-output-escaping="yes"/>
        </div>
    </xsl:template>

    <xsl:template match="recordset[parent::component[@class='Register']]">
        <div class="text-muted mb-4">
            <xsl:value-of select="$TRANSLATION[@const='TXT_REGISTRATION_TEXT']" disable-output-escaping="yes"/>
        </div>
        <xsl:variable name="COMPONENT" select=".."/>
        <xsl:variable name="TEMPLATE_PATH" select="concat($BASE, $LANG_ABBR, $COMPONENT/@template)"/>
        <xsl:variable name="SINGLE_TEMPLATE_PATH" select="concat($BASE, $LANG_ABBR, $COMPONENT/@single_template)"/>
        <div class="d-flex flex-column gap-3">
            <xsl:attribute name="id"><xsl:value-of select="generate-id(.)"/></xsl:attribute>
            <xsl:attribute name="single_template"><xsl:value-of select="$SINGLE_TEMPLATE_PATH"/></xsl:attribute>
            <xsl:attribute name="template"><xsl:value-of select="$TEMPLATE_PATH"/></xsl:attribute>
            <xsl:attribute name="data-e-single-template"><xsl:value-of select="$SINGLE_TEMPLATE_PATH"/></xsl:attribute>
            <xsl:attribute name="data-e-template"><xsl:value-of select="$TEMPLATE_PATH"/></xsl:attribute>
            <xsl:if test="string-length(normalize-space($COMPONENT/javascript/behavior/@name)) &gt; 0">
                <xsl:attribute name="data-e-js"><xsl:value-of select="$COMPONENT/javascript/behavior/@name"/></xsl:attribute>
            </xsl:if>
            <xsl:apply-templates/>
        </div>
        <xsl:if test="$TRANSLATION[@const='TXT_REQUIRED_FIELDS']">
            <p class="text-muted small mb-0">
                <xsl:value-of select="$TRANSLATION[@const='TXT_REQUIRED_FIELDS']" disable-output-escaping="yes"/>
            </p>
        </xsl:if>
    </xsl:template>
    <!-- /компонент Register -->

    <!-- компонент UserProfile -->
    <xsl:template match="component[@class='UserProfile'][@componentAction='success']">
        <div class="alert alert-success" role="alert">
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
        <div class="d-flex flex-column gap-2">
            <img class="img-thumbnail" src="{.}" alt="" loading="lazy"/>
            <a class="link-secondary" href="{.}" target="_blank" rel="noopener">
                <xsl:value-of select="."/>
            </a>
        </div>
        <input>
            <xsl:call-template name="FORM_ELEMENT_ATTRIBUTES_READONLY"/>
        </input>
    </xsl:template>

</xsl:stylesheet>
