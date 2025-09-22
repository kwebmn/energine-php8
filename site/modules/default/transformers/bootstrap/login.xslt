<?xml version="1.0" encoding="utf-8" ?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

    <xsl:template match="component[@name='signIn']">
        <xsl:variable name="COMPONENT_ID" select="concat('signIn-', generate-id(.))"/>
        <xsl:variable name="TABS_ID" select="concat('auth-tabs-', generate-id(.))"/>
        <xsl:variable name="LOGIN_TAB_ID" select="concat('auth-login-tab-', generate-id(.))"/>
        <xsl:variable name="LOGIN_PANE_ID" select="concat('auth-login-pane-', generate-id(.))"/>
        <xsl:variable name="REGISTER_TAB_ID" select="concat('auth-register-tab-', generate-id(.))"/>
        <xsl:variable name="REGISTER_PANE_ID" select="concat('auth-register-pane-', generate-id(.))"/>
        <xsl:variable name="LOGIN_EMAIL_ID" select="concat('login-email-', generate-id(.))"/>
        <xsl:variable name="LOGIN_PASSWORD_ID" select="concat('login-password-', generate-id(.))"/>
        <xsl:variable name="REGISTER_NAME_ID" select="concat('register-name-', generate-id(.))"/>
        <xsl:variable name="REGISTER_EMAIL_ID" select="concat('register-email-', generate-id(.))"/>
        <xsl:variable name="REGISTER_PASSWORD_ID" select="concat('register-password-', generate-id(.))"/>
        <xsl:variable name="IS_USER" select="//property[@name='is_user'] &gt; 0"/>
        <xsl:variable name="TEMPLATE_PATH" select="concat($LANG_ABBR, @single_template)"/>

        <div class="container py-5" id="{$COMPONENT_ID}">
            <xsl:attribute name="template"><xsl:value-of select="$TEMPLATE_PATH"/></xsl:attribute>
            <div class="row justify-content-center">
                <div class="col-xl-5 col-md-8">
                    <div class="card shadow-lg border-0">
                        <div class="card-header bg-white border-0 pb-0">
                            <ul class="nav nav-pills nav-justified" id="{$TABS_ID}" role="tablist">
                                <xsl:choose>
                                    <xsl:when test="$IS_USER">
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link active" id="{$LOGIN_TAB_ID}" type="button" role="tab">
                                                <xsl:attribute name="data-bs-target">#<xsl:value-of select="$LOGIN_PANE_ID"/></xsl:attribute>
                                                <xsl:attribute name="aria-controls"><xsl:value-of select="$LOGIN_PANE_ID"/></xsl:attribute>
                                                <xsl:attribute name="aria-selected">true</xsl:attribute>
                                                <xsl:value-of select="//translation[@const='TXT_LOGOUT']"/>
                                            </button>
                                        </li>
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link active" id="{$LOGIN_TAB_ID}" type="button" role="tab">
                                                <xsl:attribute name="data-bs-target">#<xsl:value-of select="$LOGIN_PANE_ID"/></xsl:attribute>
                                                <xsl:attribute name="aria-controls"><xsl:value-of select="$LOGIN_PANE_ID"/></xsl:attribute>
                                                <xsl:attribute name="aria-selected">true</xsl:attribute>
                                                <xsl:value-of select="//translation[@const='TXT_SIGN_IN_ONLY']"/>
                                            </button>
                                        </li>
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link" id="{$REGISTER_TAB_ID}" type="button" role="tab">
                                                <xsl:attribute name="data-bs-target">#<xsl:value-of select="$REGISTER_PANE_ID"/></xsl:attribute>
                                                <xsl:attribute name="aria-controls"><xsl:value-of select="$REGISTER_PANE_ID"/></xsl:attribute>
                                                <xsl:attribute name="aria-selected">false</xsl:attribute>
                                                <xsl:value-of select="//translation[@const='TXT_SIGN_UP']"/>
                                            </button>
                                        </li>
                                    </xsl:otherwise>
                                </xsl:choose>
                            </ul>
                        </div>
                        <div class="card-body p-4">
                            <div class="tab-content" id="{$COMPONENT_ID}-content">
                                <xsl:attribute name="template"><xsl:value-of select="$TEMPLATE_PATH"/></xsl:attribute>
                                <div class="tab-pane fade show active" id="{$LOGIN_PANE_ID}" role="tabpanel" aria-labelledby="{$LOGIN_TAB_ID}">
                                    <xsl:choose>
                                        <xsl:when test="$IS_USER">
                                            <div class="text-center">
                                                <p class="mb-4">
                                                    <xsl:value-of select="//translation[@const='TXT_LOGOUT_TEXT']"/>
                                                </p>
                                                <button class="btn btn-primary w-100 mb-3 btn-logout" id="btn-logout" type="button">
                                                    <xsl:value-of select="//translation[@const='TXT_LOGOUT']"/>
                                                </button>
                                                <a class="btn btn-outline-secondary w-100" href="{$BASE}{$LANG_ABBR}">
                                                    <xsl:value-of select="//translation[@const='TXT_HOME']"/>
                                                </a>
                                            </div>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <form id="sign_in" method="POST" novalidate="novalidate" class="needs-validation">
                                                <div class="text-center mb-4">
                                                    <p class="mb-2"><xsl:value-of select="//translation[@const='TXT_SIGN_WITH']"/></p>
                                                    <a href="{$LANG_ABBR}/login/google/" class="btn btn-outline-danger btn-sm px-3">
                                                        <i class="fab fa-google me-1" aria-hidden="true"></i>
                                                        <span>Google</span>
                                                    </a>
                                                </div>
                                                <div class="alert alert-danger d-none" data-role="form-error" role="alert"></div>
                                                <div class="mb-3">
                                                    <label class="form-label" for="{$LOGIN_EMAIL_ID}">
                                                        <xsl:value-of select="//translation[@const='TXT_EMAIL']"/>
                                                    </label>
                                                    <input class="form-control" type="email" id="{$LOGIN_EMAIL_ID}" name="signin[email]" required="required" autocomplete="email"/>
                                                    <div class="invalid-feedback d-none" data-field="email">
                                                        <xsl:value-of select="messages/message[@field='email']"/>
                                                    </div>
                                                </div>
                                                <div class="mb-3">
                                                    <label class="form-label" for="{$LOGIN_PASSWORD_ID}">
                                                        <xsl:value-of select="//translation[@const='TXT_PASSWORD']"/>
                                                    </label>
                                                    <input class="form-control" type="password" id="{$LOGIN_PASSWORD_ID}" name="signin[password]" required="required" autocomplete="current-password"/>
                                                    <div class="invalid-feedback d-none" data-field="password">
                                                        <xsl:value-of select="messages/message[@field='password']"/>
                                                    </div>
                                                </div>
                                                <div class="d-flex justify-content-between align-items-center mb-4">
                                                    <a href="{$BASE}{$LANG_ABBR}restore-password/">
                                                        <xsl:value-of select="//translation[@const='TXT_FORGOT_PASSWORD']"/>
                                                    </a>
                                                </div>
                                                <button type="submit" class="btn btn-primary w-100 mb-2">
                                                    <xsl:value-of select="//translation[@const='TXT_SIGN_IN_ONLY']"/>
                                                </button>
                                            </form>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </div>
                                <xsl:if test="not($IS_USER)">
                                    <div class="tab-pane fade" id="{$REGISTER_PANE_ID}" role="tabpanel" aria-labelledby="{$REGISTER_TAB_ID}">
                                        <form id="sign_up" method="POST" novalidate="novalidate" class="needs-validation">
                                            <div class="alert alert-danger d-none" data-role="form-error" role="alert"></div>
                                            <div class="mb-3">
                                                <label class="form-label" for="{$REGISTER_NAME_ID}">
                                                    <xsl:value-of select="//translation[@const='TXT_YOUR_NAME']"/>
                                                </label>
                                                <input class="form-control" type="text" id="{$REGISTER_NAME_ID}" name="signup[name]" required="required" autocomplete="name"/>
                                                <div class="invalid-feedback d-none" data-field="name">
                                                    <xsl:value-of select="messages/message[@field='name']"/>
                                                </div>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label" for="{$REGISTER_EMAIL_ID}">
                                                    <xsl:value-of select="//translation[@const='TXT_EMAIL']"/>
                                                </label>
                                                <input class="form-control" type="email" id="{$REGISTER_EMAIL_ID}" name="signup[email]" required="required" autocomplete="email"/>
                                                <div class="invalid-feedback d-none" data-field="email">
                                                    <xsl:value-of select="messages/message[@field='email']"/>
                                                </div>
                                            </div>
                                            <div class="mb-4">
                                                <label class="form-label" for="{$REGISTER_PASSWORD_ID}">
                                                    <xsl:value-of select="//translation[@const='TXT_PASSWORD']"/>
                                                </label>
                                                <input class="form-control" type="password" id="{$REGISTER_PASSWORD_ID}" name="signup[password]" required="required" autocomplete="new-password" minlength="6"/>
                                                <div class="invalid-feedback d-none" data-field="password">
                                                    <xsl:value-of select="messages/message[@field='password']"/>
                                                </div>
                                            </div>
                                            <button type="submit" class="btn btn-primary w-100">
                                                <xsl:value-of select="//translation[@const='TXT_SIGN_UP']"/>
                                            </button>
                                        </form>
                                    </div>
                                </xsl:if>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='recoverPassword' and @componentAction='main']">
        <div class="container py-5" id="{generate-id(recordset)}" template="{@template}" single_template="{@single_template}">
            <div class="row justify-content-center">
                <div class="col-xl-5 col-md-8">
                    <div class="card shadow-lg border-0">
                        <div class="card-body p-4">
                            <form id="recover_form" action="{@template}send" method="post" novalidate="novalidate" class="needs-validation">
                                <div class="mb-3">
                                    <label class="form-label" for="email">
                                        <xsl:value-of select="//translation[@const='TXT_EMAIL']" />
                                    </label>
                                    <input type="email" id="email" class="form-control" name="email" required="required" autocomplete="email"/>
                                    <div class="invalid-feedback d-none" data-field="email"></div>
                                </div>
                                <button type="submit" name="recover_submit" id="recover_submit" class="btn btn-primary w-100">
                                    <xsl:value-of select="//translation[@const='TXT_RECOVER_PASSWORD']"/>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='recoverPassword' and @componentAction='send']">
        <div class="container py-5" id="{generate-id(recordset)}" template="{@template}" single_template="{@single_template}">
            <div class="row justify-content-center">
                <div class="col-lg-6 text-center">
                    <div class="alert alert-success" role="alert">
                        <xsl:value-of select="//translation[@const='TXT_RECOVER_PASSWORD_MESSAGE']" disable-output-escaping="yes"/>
                    </div>
                </div>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='recoverPassword' and @componentAction='recover']">
        <div class="container py-5" id="{generate-id(recordset)}" template="{@template}" single_template="{@single_template}">
            <div class="row justify-content-center">
                <div class="col-xl-5 col-md-8">
                    <div class="card shadow-lg border-0">
                        <div class="card-body p-4">
                            <form id="recover_form2" action="{@template}" method="post" novalidate="novalidate" class="needs-validation">
                                <input type="hidden" name="code" id="code" value="{@code}"/>
                                <div class="mb-3">
                                    <label class="form-label" for="password1">
                                        <xsl:value-of select="//translation[@const='FIELD_CHANGE_U_PASSWORD']" />
                                    </label>
                                    <input type="password" id="password1"  class="form-control" name="password1" required="required" autocomplete="new-password"/>
                                    <div class="invalid-feedback d-none" data-field="password1"></div>
                                </div>
                                <div class="mb-4">
                                    <label class="form-label" for="password2">
                                        <xsl:value-of select="//translation[@const='FIELD_CHANGE_U_PASSWORD2']" />
                                    </label>
                                    <input type="password" id="password2"  class="form-control" name="password2" required="required" autocomplete="new-password"/>
                                    <div class="invalid-feedback d-none" data-field="password2"></div>
                                </div>
                                <button type="submit" name="change-password-submit" id="change-password-submit" class="btn btn-primary w-100">
                                    <xsl:value-of select="//translation[@const='TXT_PROFILE_CHANGE_PASSWORD']"/>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </xsl:template>

</xsl:stylesheet>
