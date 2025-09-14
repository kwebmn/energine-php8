<?xml version="1.0" encoding="utf-8" ?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

    <!--    <xsl:template match="content[@file='default/sign_in.content.xml']">-->
    <!--    </xsl:template>-->

    <xsl:template match="component[@name='signIn']">

        <div class="container px-4">

            <div class="row d-flex justify-content-center">
                <div class="col-xl-5 col-md-8">
                    <div class="card shadow-4">
                        <div class="card-body p-4">
                            <!-- Pills navs -->
                            <ul class="nav nav-pills nav-justified mb-3" >
                                <li class="nav-item" >
                                    <div class="nav-link active">
                                        <xsl:value-of select="//translation[@const='TXT_SIGN_UP']" />
                                    </div>
                                </li>

                            </ul>
                            <div class="tab-content" id="{generate-id(recordset)}" template="{$LANG_ABBR}{@single_template}">
                                <div class="tab-pane fade show active" id="pills-login" role="tabpanel" aria-labelledby="tab-login" >

                                    <xsl:if test="//property[@name='is_user'] > 0">
                                        <div role="tabpanel" class="tab-pane active" id="logout">
                                            <button class="btn  btn-primary btn-block mb-4 btn-logout" id="btn-logout"><xsl:value-of select="//translation[@const='TXT_LOGOUT']" /></button>
                                        </div>
                                    </xsl:if>

                                    <xsl:if test="not(//property[@name='is_user'] > 0)">
                                        <form id="sign_in" method="POST">

                                            <div class="text-center mb-3">
                                                <p><xsl:value-of select="//translation[@const='TXT_SIGN_WITH']"/></p>
<!--                                                <button type="button" class="btn btn-link btn-lg btn-floating mx-1" data-mdb-ripple-init="1" data-ripple-color="primary">-->
<!--                                                    <i class="fab fa-facebook-f"></i>-->
<!--                                                </button>-->

                                                <a href="{$LANG_ABBR}/login/google/" class="btn btn-link btn-lg btn-floating mx-1" data-mdb-ripple-init="1" data-ripple-color="primary">
                                                    <i class="fab fa-google"></i>
                                                </a>

<!--                                                <button type="button" class="btn btn-link btn-lg btn-floating mx-1" data-mdb-ripple-init="1" data-ripple-color="primary">-->
<!--                                                    <i class="fab fa-twitter"></i>-->
<!--                                                </button>-->

<!--                                                <button type="button" class="btn btn-link btn-lg btn-floating mx-1" data-mdb-ripple-init="1" data-ripple-color="primary">-->
<!--                                                    <i class="fab fa-github"></i>-->
<!--                                                </button>-->
                                            </div>

                                            <!-- Email input -->
                                            <div class="form-outline mb-4" data-mdb-input-init="1">
                                                <input type="email" id="loginName" class="form-control" name="signin[email]" required="required"/>
                                                <label class="form-label" for="loginName"><xsl:value-of select="//translation[@const='TXT_EMAIL']" /></label>
                                            </div>

                                            <!-- Password input -->
                                            <div class="form-outline mb-4" data-mdb-input-init="1">
                                                <input type="password" id="loginPassword2" class="form-control" name="signin[password]" required="required"/>
                                                <label class="form-label" for="loginPassword2"><xsl:value-of select="//translation[@const='TXT_PASSWORD']" /></label>
                                            </div>

                                            <!-- 2 column grid layout -->
                                            <div class="row mb-4">


                                                <div class="col-md-12 d-flex justify-content-center">
                                                    <!-- Simple link -->
                                                    <a href="{$BASE}{$LANG_ABBR}restore-password/"><xsl:value-of select="//translation[@const='TXT_FORGOT_PASSWORD']" /></a>
                                                </div>
                                            </div>

                                            <!-- Submit button -->
                                            <button type="submit" class="btn btn-primary btn-block mb-4" data-mdb-ripple-init="1" id="btn-sign-up-fast">
                                                <xsl:value-of select="//translation[@const='TXT_SIGN_UP']" />
                                            </button>

                                            <!-- Register buttons -->
                                        </form>

                                    </xsl:if>
                                </div>
                            </div>
                            <!-- Pills content -->
                        </div>
                    </div>
                </div>
            </div>

        </div>

<!--        <div role="tabpanel" id="{generate-id(recordset)}" template="{$LANG_ABBR}{@single_template}">-->
<!--            <ul class="tab-nav" role="tablist">-->
<!--                <xsl:if test="//property[@name='is_user'] > 0">-->
<!--                    <li class="active">-->
<!--                        <a href="#logout" role="tab" data-toggle="tab" aria-expanded="true" class="mootools-noconflict">Выход</a>-->
<!--                    </li>-->
<!--                </xsl:if>-->

<!--                <xsl:if test="not(//property[@name='is_user'] > 0)">-->
<!--                    <li class="active">-->
<!--                        <a href="#login" role="tab" data-toggle="tab" aria-expanded="true" class="mootools-noconflict"><xsl:value-of select="//translation[@const='TXT_SIGN_IN_ONLY']"/></a>-->
<!--                    </li>-->
<!--                    <li class="">-->
<!--                        <a href="#register" aria-controls="profile11" role="tab" data-toggle="tab" aria-expanded="false" class="mootools-noconflict">-->
<!--                            <xsl:value-of select="//translation[@const='TXT_SIGN_UP']" />-->
<!--                        </a>-->
<!--                    </li>-->
<!--                </xsl:if>-->

<!--            </ul>-->

<!--            <div class="tab-content">-->

<!--                <xsl:if test="//property[@name='is_user'] > 0">-->
<!--                    <div role="tabpanel" class="tab-pane active" id="logout">-->
<!--                        <button class="btn btn-default btn-logout" id="btn-logout">Выйти</button>-->
<!--                    </div>-->
<!--                </xsl:if>-->
<!--                <xsl:if test="not(//property[@name='is_user'] > 0)">-->
<!--                    <div role="tabpanel" class="tab-pane active" id="login">-->
<!--                        <form id="sign_in" method="POST">-->
<!--                            <div class="form-group fg-float">-->
<!--                                <div class="fg-line">-->
<!--                                    <input type="text" class="input-lg form-control fg-input" name="signin[email]" required="required"/>-->
<!--                                    <label class="fg-label"><xsl:value-of select="//translation[@const='TXT_EMAIL']" /></label>-->
<!--                                </div>-->
<!--                            </div>-->
<!--                            <div class="form-group fg-float">-->
<!--                                <div class="fg-line">-->
<!--                                    <input type="password" class="input-lg form-control fg-input" name="signin[password]" required="required"/>-->
<!--                                    <label class="fg-label"><xsl:value-of select="//translation[@const='TXT_PASSWORD']" /></label>-->
<!--                                </div>-->
<!--                            </div>-->
<!--                            <button class="waves-effect btn btn-primary m-r-10 m-b-10" id="btn-sign-up-fast2"  >-->
<!--                                <xsl:value-of select="//translation[@const='TXT_SIGN_IN_ONLY']" />-->
<!--                            </button>-->
<!--                            <a class="waves-effect btn btn-default m-r-10 m-b-10" href="{$BASE}{$LANG_ABBR}restore-password/">-->
<!--                                <xsl:value-of select="//translation[@const='TXT_FORGOT_PASSWORD']" />-->
<!--                            </a>-->

<!--                            <div class="m-t-10">-->
<!--                            </div>-->
<!--                        </form>-->

<!--                    </div>-->

<!--                    <div role="tabpanel" class="tab-pane " id="register">-->
<!--                        <form id="sign_up" method="POST">-->
<!--                            <div class="form-group fg-float">-->
<!--                                <div class="fg-line">-->
<!--                                    <input type="text" class="input-lg form-control fg-input" name="signup[name]" required="required"/>-->
<!--                                    <label class="fg-label">-->
<!--                                        <xsl:value-of select="//translation[@const='TXT_YOUR_NAME']"/>-->
<!--                                    </label>-->
<!--                                </div>-->
<!--                            </div>-->

<!--                            <div class="form-group fg-float">-->
<!--                                <div class="fg-line">-->
<!--                                    <input type="email" class="input-lg form-control fg-input" name="signup[email]" required="required"/>-->
<!--                                    <label class="fg-label">-->
<!--                                        <xsl:value-of select="//translation[@const='TXT_EMAIL']"/>-->
<!--                                    </label>-->
<!--                                </div>-->
<!--                            </div>-->
<!--                            <div class="form-group fg-float">-->
<!--                                <div class="fg-line">-->
<!--                                    <input type="password" class="input-lg form-control fg-input" name="signup[password]" required="required"/>-->
<!--                                    <label class="fg-label">-->
<!--                                        <xsl:value-of select="//translation[@const='TXT_PASSWORD']"/>-->
<!--                                    </label>-->
<!--                                </div>-->
<!--                            </div>-->

<!--                            <button class="waves-effect btn btn-primary" id="btn-sign-up-fast">-->
<!--                                <xsl:value-of select="//translation[@const='TXT_SIGN_UP']" />-->
<!--                            </button>-->

<!--                        </form>-->

<!--                    </div>-->


<!--                </xsl:if>-->



<!--            </div>-->
<!--        </div>-->
    </xsl:template>


    <xsl:template match="component[@name='recoverPassword' and @componentAction='main']">
        <div class="row" id="{generate-id(recordset)}" single_template="{@single_template}" template="{@template}">
            <div class="col-xl-6">
                <form id="recover_form" action="{@template}send" method="post">
                    <!-- Email input -->
                    <div class="form-outline mb-4" data-mdb-input-init="1">
                        <input type="email" id="email" class="form-control fg-input" name="email" required="required"/>
                        <label class="form-label" for="email"><xsl:value-of select="//translation[@const='TXT_EMAIL']" /></label>
                    </div>

                    <div class="form-group">
                        <button type="submit" name="recover_submit" id="recover_submit" class="btn btn-primary mb-4 btn-login" data-mdb-ripple-init="1">
                            <xsl:value-of select="//translation[@const='TXT_RECOVER_PASSWORD']"/>
                        </button>
                    </div>
                </form>
            </div>

        </div>
    </xsl:template>

    <xsl:template match="component[@name='recoverPassword' and @componentAction='send']">
        <div class="row" id="{generate-id(recordset)}" single_template="{@single_template}" template="{@template}">
            <div class="col-sm-6 col-sm-offset-3 text-center">
                <xsl:value-of select="//translation[@const='TXT_RECOVER_PASSWORD_MESSAGE']" disable-output-escaping="yes"/>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='recoverPassword' and @componentAction='recover']">
        <div class="row" id="{generate-id(recordset)}" single_template="{@single_template}" template="{@template}">
            <div class="col-xl-6 ">
                <form id="recover_form2" action="{@template}" method="post">
                    <input type="hidden" name="code" id="code" value="{@code}"/>

                    <div class="form-outline mb-4" data-mdb-input-init="1">
                        <input type="password" id="password1"  class="form-control" name="password1" required="required"/>
                        <label class="form-label" for="password1"><xsl:value-of select="//translation[@const='FIELD_CHANGE_U_PASSWORD']" /></label>
                    </div>

                    <div class="form-outline mb-4" data-mdb-input-init="1">
                        <input type="password" id="password2"  class="form-control" name="password2" required="required"/>
                        <label class="form-label" for="password2"><xsl:value-of select="//translation[@const='FIELD_CHANGE_U_PASSWORD2']" /></label>
                    </div>

                    <div class="form-group">
                        <button type="submit" name="change-password-submit" id="change-password-submit" class="btn btn-primary mb-4" value="" data-mdb-ripple-init="1">
                            <xsl:value-of select="//translation[@const='TXT_PROFILE_CHANGE_PASSWORD']"/>
                        </button>
                    </div>
                </form>
            </div>

        </div>
    </xsl:template>



</xsl:stylesheet>
