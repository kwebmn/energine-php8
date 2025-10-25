<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet 
    version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 

    xmlns:set="http://exslt.org/sets"
    extension-element-prefixes="set">
    
    <!-- обработка компонента типа form -->
    <!--or descendant::field[@type='pfile']
     or descendant::field[@type='prfile']-->
    <xsl:template match="component[@type='form']">
        <xsl:variable name="FORM_ID" select="concat('form-', generate-id())"/>
        <section class="card h-100 d-flex flex-column" data-role="pane">
            <div class="card-header flex-shrink-0" data-pane-part="header" data-pane-toolbar="top">
                <xsl:apply-templates select="toolbar[@position='top']"/>
            </div>
            <div class="card-body d-flex flex-column flex-grow-1 overflow-auto" data-pane-part="body">
                <xsl:attribute name="style">min-height: 0;</xsl:attribute>
                <form method="post" action="{@action}" id="{$FORM_ID}">
                    <xsl:if test="descendant::field[@type='image'] or descendant::field[@type='file']">
                        <xsl:attribute name="enctype">multipart/form-data</xsl:attribute>
                    </xsl:if>
<!--                    <xsl:choose>-->
<!--                <xsl:when test="@class='RestorePassword'"><xsl:attribute name="class">base_form restore_password_form</xsl:attribute></xsl:when>-->
<!--                <xsl:when test="@class='Register'"><xsl:attribute name="class">base_form registration_form</xsl:attribute></xsl:when>-->
<!--                            <xsl:when test="@class='UserProfile'"><xsl:attribute name="class">base_form profile_form</xsl:attribute></xsl:when>-->
<!--                <xsl:when test="@class='FeedbackForm'"><xsl:attribute name="class">base_form feedback_form</xsl:attribute></xsl:when>-->
<!--                <xsl:when test="@class='Form'"><xsl:attribute name="class">base_form forms_form</xsl:attribute></xsl:when>-->
<!--                    </xsl:choose>-->
                    <input type="hidden" name="componentAction" value="{@componentAction}" id="componentAction"/>
                    <xsl:apply-templates select="node()[not(self::toolbar)]"/>
                </form>
            </div>
            <div class="card-footer flex-shrink-0" data-pane-part="footer" data-pane-toolbar="bottom">
                <xsl:apply-templates select="toolbar[not(@position='top')]"/>
            </div>
        </section>
    </xsl:template>
    
    <xsl:template match="component[@type='form' and @exttype='grid']">
        <!--Если есть поля типа code  - добавляем вызовы js и css-->
        <xsl:if test="recordset/record/field[@type='code']">
            <link rel="stylesheet" href="vendor/codemirror/codemirror/lib/codemirror.css" />
            <script type="text/javascript" src="vendor/codemirror/codemirror/lib/codemirror.js"></script>
            <script type="text/javascript" src="vendor/codemirror/codemirror/mode/xml/xml.js"></script>
            <script  type="text/javascript" src="vendor/codemirror/codemirror/mode/javascript/javascript.js"></script>
            <script  type="text/javascript" src="vendor/codemirror/codemirror/mode/css/css.js"></script>
            <link rel="stylesheet" href="vendor/codemirror/codemirror/theme/elegant.css" />
            <script  type="text/javascript" src="vendor/codemirror/codemirror/mode/htmlmixed/htmlmixed.js"></script>
            <!--<link rel="stylesheet" href="scripts/codemirror/css/docs.css" />-->
        </xsl:if>

        <form method="post" action="{@action}" class="e-grid-form">
            <input type="hidden" name="componentAction" value="{@componentAction}" id="componentAction"/>
            <xsl:apply-templates/>
        </form>
    </xsl:template>
    
    <xsl:template match="recordset[parent::component[@type='form']]">
        <xsl:variable name="COMPONENT_UID" select="generate-id(.)"/>
        <div>
            <xsl:attribute name="data-e-id"><xsl:value-of select="$COMPONENT_UID"/></xsl:attribute>
            <xsl:if test="../javascript/behavior/@name">
                <xsl:attribute name="data-e-js"><xsl:value-of select="../javascript/behavior/@name"/></xsl:attribute>
            </xsl:if>
            <xsl:attribute name="data-e-template">
                <xsl:value-of select="concat($BASE, $LANG_ABBR, ../@template)"/>
            </xsl:attribute>
            <xsl:attribute name="data-e-single-template">
                <xsl:value-of select="concat($BASE, $LANG_ABBR, ../@single_template)"/>
            </xsl:attribute>
            <xsl:apply-templates/>
        </div>
                <xsl:if test="$TRANSLATION[@const='TXT_REQUIRED_FIELDS']">
                        <div class="note">
                                <xsl:value-of select="$TRANSLATION[@const='TXT_REQUIRED_FIELDS']" disable-output-escaping="yes"/>
                        </div>
                </xsl:if>
    </xsl:template>

    <xsl:template match="record[ancestor::component[@type='form']]">
        <xsl:apply-templates/>
    </xsl:template>

    
    <xsl:template match="toolbar[parent::component[@type='form']]">
        <xsl:variable name="FORM_ID" select="concat('form-', generate-id(..))"/>
        <div class="card-toolbar d-flex flex-wrap align-items-center gap-2">
            <xsl:apply-templates>
                <xsl:with-param name="form-id" select="$FORM_ID"/>
            </xsl:apply-templates>
        </div>
    </xsl:template>

    <xsl:template match="toolbar[parent::component[@type='form']]/control[not(@type) or @type='button' or @type='submit']">
        <xsl:param name="form-id" select="concat('form-', generate-id(ancestor::component[@type='form'][1]))"/>
        <xsl:variable name="CONTROL">
            <xsl:choose>
                <xsl:when test="@type = 'button'">button</xsl:when>
                <xsl:when test="@type = 'submit'">button</xsl:when>
                <xsl:otherwise>button</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="CONTROL_TYPE">
            <xsl:choose>
                <xsl:when test="@type = 'button'">button</xsl:when>
                <xsl:when test="@type = 'submit'">submit</xsl:when>
                <xsl:otherwise>button</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>

        <xsl:element name="{$CONTROL}">
            <xsl:if test="@mode=1">
                <xsl:attribute name="disabled">disabled</xsl:attribute>
            </xsl:if>
            <xsl:attribute name="name"><xsl:value-of select="@id"/></xsl:attribute>
            <xsl:attribute name="title"><xsl:value-of select="@tooltip"/></xsl:attribute>
            <xsl:if test="@tooltip != ''">
                <xsl:attribute name="data-bs-toggle">tooltip</xsl:attribute>
            </xsl:if>
            <xsl:attribute name="type"><xsl:value-of select="$CONTROL_TYPE"/></xsl:attribute>
            <xsl:attribute name="form"><xsl:value-of select="$form-id"/></xsl:attribute>
            <xsl:if test="@click!=''">
                <xsl:attribute name="onclick"><xsl:value-of select="@click"/></xsl:attribute>
            </xsl:if>
            <xsl:value-of select="@title"/>
        </xsl:element>
    </xsl:template>
    
    <!-- форма как часть grid-а выводится в другом стиле -->
   <xsl:template match="recordset[parent::component[@type='form' and @exttype='grid']]">
    <xsl:variable name="FIELDS" select="record/field"/>
    <xsl:variable name="COMPONENT_UID" select="generate-id(.)"/>
    <div data-role="pane" class="card shadow-sm border-0 rounded-3 overflow-hidden d-flex flex-column h-100">
        <xsl:attribute name="data-e-id"><xsl:value-of select="$COMPONENT_UID"/></xsl:attribute>
        <xsl:if test="../javascript/behavior/@name">
            <xsl:attribute name="data-e-js"><xsl:value-of select="../javascript/behavior/@name"/></xsl:attribute>
        </xsl:if>
        <xsl:attribute name="data-e-template">
            <xsl:value-of select="concat($BASE, $LANG_ABBR, ../@template)"/>
        </xsl:attribute>
        <xsl:attribute name="data-e-single-template">
            <xsl:value-of select="concat($BASE, $LANG_ABBR, ../@single_template)"/>
        </xsl:attribute>
        <div class="card-header bg-body-tertiary border-bottom flex-shrink-0 pb-0" data-pane-part="header" data-pane-toolbar="top">
            <ul class="nav nav-tabs card-header-tabs" data-role="tabs" role="tablist">
                <xsl:for-each select="set:distinct($FIELDS/@tabName)">
                    <xsl:variable name="TAB_NAME" select="."/>
                    <xsl:if test="count(set:distinct($FIELDS[not(@index='PRI') and not(@type='hidden')][@tabName=$TAB_NAME])) &gt; 0">
                        <xsl:variable name="TAB_FIELD" select="$FIELDS[@tabName=$TAB_NAME][1]"/>
                        <xsl:variable name="TAB_UID" select="concat('gridFormTab-', generate-id($TAB_FIELD))"/>
                        <li class="nav-item" data-role="tab" role="presentation">
                            <a lang_abbr="{$TAB_FIELD/@languageAbbr}"
                               href="#{$TAB_UID}"
                               id="{$TAB_UID}-tab"
                               class="nav-link"
                               data-role="tab-link"
                               data-bs-toggle="tab"
                               data-bs-target="#{$TAB_UID}"
                               role="tab"
                               aria-controls="{$TAB_UID}"
                               aria-selected="false">
                                <xsl:if test="position()=1">
                                    <xsl:attribute name="class">nav-link active</xsl:attribute>
                                    <xsl:attribute name="aria-selected">true</xsl:attribute>
                                </xsl:if>
                                <xsl:value-of select="$TAB_NAME"/>
                            </a>
                            <xsl:if test="$FIELDS[@tabName=$TAB_NAME][1]/@language">
                                <span class="visually-hidden" data-role="tab-meta">
                                    { lang: <xsl:value-of select="$FIELDS[@tabName=$TAB_NAME][1]/@language" /> }
                                </span>
                            </xsl:if>
                        </li>
                    </xsl:if>
                </xsl:for-each>

                <!-- дополнительные вкладки-поля -->
                <xsl:apply-templates select="$FIELDS[@type='tab']" mode="field_name"/>
            </ul>
        </div>

        <div class="card-body p-4 d-flex flex-column flex-grow-1 overflow-auto" data-pane-part="body">
            <xsl:attribute name="style">min-height: 0;</xsl:attribute>
            <div class="tab-content" data-role="tab-content">
                <xsl:for-each select="set:distinct($FIELDS/@tabName)">
                    <xsl:variable name="TAB_NAME" select="."/>
                    <xsl:variable name="TAB_FIELD" select="$FIELDS[@tabName=$TAB_NAME][1]"/>
                    <xsl:variable name="TAB_UID" select="concat('gridFormTab-', generate-id($TAB_FIELD))"/>
                    <div data-role="pane-item">
                        <xsl:attribute name="id"><xsl:value-of select="$TAB_UID"/></xsl:attribute>
                        <xsl:attribute name="class">
                            <xsl:text>tab-pane fade</xsl:text>
                            <xsl:if test="position()=1">
                                <xsl:text> show active</xsl:text>
                            </xsl:if>
                        </xsl:attribute>
                        <xsl:attribute name="role">tabpanel</xsl:attribute>
                        <xsl:attribute name="aria-labelledby"><xsl:value-of select="$TAB_UID"/>-tab</xsl:attribute>
                        <xsl:apply-templates select="$FIELDS[@tabName=$TAB_NAME]"/>
                    </div>
                </xsl:for-each>

                <!-- содержимое для вкладок-полей -->
                <xsl:apply-templates select="$FIELDS[@type='tab']" mode="field_content"/>
            </div>
        </div>

        <xsl:if test="../toolbar">
            <div class="card-footer bg-body-tertiary border-top flex-shrink-0" data-pane-part="footer" data-pane-toolbar="bottom"></div>
        </xsl:if>
    </div>
</xsl:template>

    <!-- обработка сообщения об отправке данных формы -->
    <xsl:template match="component[@type='form'][@componentAction='send']" mode="custom">
        <xsl:choose>
            <xsl:when test="recordset/record/field[@name='error_message']!=''">
                <xsl:apply-templates select="."/>
            </xsl:when>
            <xsl:otherwise>
                <div class="result_message">
                    <xsl:value-of select="recordset/record/field" disable-output-escaping="yes"/>
                </div>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
</xsl:stylesheet>
