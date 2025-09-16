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
        <section class="card" data-role="pane">
            <div class="card-header" data-pane-part="header" data-pane-toolbar="top">
                <xsl:apply-templates select="toolbar[@position='top']"/>
            </div>
            <div class="card-body" data-pane-part="body">
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
            <div class="card-footer" data-pane-part="footer" data-pane-toolbar="bottom">
                <xsl:apply-templates select="toolbar[not(@position='top')]"/>
            </div>
        </section>
    </xsl:template>
    
    <xsl:template match="component[@type='form' and @exttype='grid']">
        <!--Если есть поля типа code  - добавляем вызовы js и css-->
        <xsl:if test="recordset/record/field[@type='code']">
            <link rel="stylesheet" href="scripts/codemirror/lib/codemirror.css" />
            <script type="text/javascript" src="scripts/codemirror/lib/codemirror.js"></script>
            <script type="text/javascript" src="scripts/codemirror/mode/xml/xml.js"></script>
            <script  type="text/javascript" src="scripts/codemirror/mode/javascript/javascript.js"></script>
            <script  type="text/javascript" src="scripts/codemirror/mode/css/css.js"></script>
            <link rel="stylesheet" href="scripts/codemirror/theme/elegant.css" />
            <script  type="text/javascript" src="scripts/codemirror/mode/htmlmixed/htmlmixed.js"></script>
            <!--<link rel="stylesheet" href="scripts/codemirror/css/docs.css" />-->
        </xsl:if>

        <form method="post" action="{@action}" class="e-grid-form">
            <input type="hidden" name="componentAction" value="{@componentAction}" id="componentAction"/>
            <xsl:apply-templates/>
        </form>
    </xsl:template>
    
    <xsl:template match="recordset[parent::component[@type='form']]">
    	<div id="{generate-id(.)}" single_template="{$BASE}{$LANG_ABBR}{../@single_template}" template="{$BASE}{$LANG_ABBR}{../@template}">
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
        <div id="{generate-id(.)}" data-role="pane" class="card" template="{$BASE}{$LANG_ABBR}{../@template}" single_template="{$BASE}{$LANG_ABBR}{../@single_template}">
            <div class="card-header" data-pane-part="header" data-pane-toolbar="top">
                <ul class="nav nav-tabs card-header-tabs" data-role="tabs">
                    <xsl:for-each select="set:distinct($FIELDS/@tabName)">
                        <xsl:variable name="TAB_NAME" select="."></xsl:variable>
                        <xsl:if test="count(set:distinct($FIELDS[not(@index='PRI') and not(@type='hidden')][@tabName=$TAB_NAME]))&gt;0">
                            <li class="nav-item" data-role="tab">
                                <a lang_abbr="{$FIELDS[@tabName=$TAB_NAME][1]/@languageAbbr}" href="#{generate-id(.)}" class="nav-link" data-mdb-tab-init="1" data-role="tab-link"><xsl:value-of select="$TAB_NAME" /></a>
                                <xsl:if test="$FIELDS[@tabName=$TAB_NAME][1]/@language">
                                    <span class="visually-hidden" data-role="tab-meta">{ lang: <xsl:value-of select="$FIELDS[@tabName=$TAB_NAME][1]/@language" /> }</span>
                                </xsl:if>
                            </li>
                        </xsl:if>
                    </xsl:for-each>
                    <xsl:apply-templates select="$FIELDS[@type='tab']" mode="field_name"/>
                </ul>
            </div>
            <div class="card-body" data-pane-part="body">
                <div class="tab-content" data-role="tab-content">
                    <xsl:for-each select="set:distinct($FIELDS/@tabName)">
                        <xsl:variable name="TAB_NAME" select="."/>
                        <div id="{generate-id(.)}" class="tab-pane" data-role="pane-item">
                            <xsl:apply-templates select="$FIELDS[@tabName=$TAB_NAME]"/>
                        </div>
                    </xsl:for-each>
                    <xsl:apply-templates select="$FIELDS[@type='tab']" mode="field_content"/>
                </div>
            </div>
            <xsl:if test="../toolbar">
                <div class="card-footer" data-pane-part="footer" data-pane-toolbar="bottom"></div>
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