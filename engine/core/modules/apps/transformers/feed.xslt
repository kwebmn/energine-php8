<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:import href="../../share/transformers/base.xslt"/>

    <!-- компонент типа feed -->
    <xsl:template match="component[@exttype='feed']">
        <div class="feed">
            <xsl:call-template name="energine-component-attributes"/>
            <xsl:variable name="RECORDSET_UID" select="generate-id(recordset)"/>
            <xsl:choose>
                <xsl:when test="recordset/@empty">
                    <div class="empty_message">
                        <xsl:attribute name="data-energine-param-recordset"><xsl:value-of select="$RECORDSET_UID"/></xsl:attribute>
                        <xsl:value-of select="recordset/@empty" disable-output-escaping="yes"/>
                    </div>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:apply-templates/>
                </xsl:otherwise>
            </xsl:choose>
        </div>
    </xsl:template>

    <!-- компонент feed в режиме списка -->
    <xsl:template match="recordset[parent::component[@exttype='feed'][@type='list']]">
        <xsl:variable name="RECORDSET_UID" select="generate-id(.)"/>
        <ul class="feed_list">
            <xsl:attribute name="data-energine-param-recordset"><xsl:value-of select="$RECORDSET_UID"/></xsl:attribute>
            <xsl:attribute name="id"><xsl:value-of select="$RECORDSET_UID"/></xsl:attribute>
            <xsl:apply-templates/>
        </ul>
    </xsl:template>

    <xsl:template match="record[ancestor::component[@exttype='feed'][@type='list']]">
        <li class="feed_item">
            <xsl:if test="$COMPONENTS[@editable]">
                <xsl:attribute name="data-energine-param-record">
                    <xsl:value-of select="field[@index='PRI']"/>
                </xsl:attribute>
                <xsl:attribute name="record">
                    <xsl:value-of select="field[@index='PRI']"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:apply-templates/>
            <xsl:if test="../../toolbar[@name!='pager']">
                <xsl:apply-templates select="../../toolbar[@name!='pager']/control" />
            </xsl:if>
        </li>
    </xsl:template>

    <xsl:template match="toolbar[ancestor::component[@exttype='feed'][@type='list']][@name!='pager']"/>

    <xsl:template match="control[parent::toolbar[@name!='pager' and ancestor::component[@exttype='feed'][@type='list']]]">
        <a href="{$BASE}{$LANG_ABBR}{ancestor::component/@template}"><xsl:value-of select="@title"/></a>
    </xsl:template>

    <!-- компонент feed в режиме просмотра -->
    <xsl:template match="recordset[parent::component[@exttype='feed'][@type='form']]">
        <xsl:apply-templates/>
    </xsl:template>

    <xsl:template match="record[ancestor::component[@exttype='feed'][@type='form']]">
        <div class="feed_view">
            <xsl:variable name="VIEW_UID" select="generate-id(../.)"/>
            <xsl:attribute name="data-energine-param-recordset"><xsl:value-of select="$VIEW_UID"/></xsl:attribute>
            <xsl:attribute name="id"><xsl:value-of select="$VIEW_UID"/></xsl:attribute>
            <xsl:if test="$COMPONENTS[@editable]">
                <xsl:attribute name="data-energine-param-current">
                    <xsl:value-of select="field[@index='PRI']"/>
                </xsl:attribute>
                <xsl:attribute name="current">
                    <xsl:value-of select="field[@index='PRI']"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <!-- для поля name (или title) в режиме просмотра добавляется возможность редактирования -->
    <xsl:template match="field[contains(@name,'name') or contains(@name,'title')][ancestor::component[@exttype='feed' and @type='form']]">
        <h3 class="feed_name">
            <xsl:if test="ancestor::component/@editable">
                <xsl:attribute name="class">nrgnEditor feed_name</xsl:attribute>
                <xsl:attribute name="data-energine-param-num"><xsl:value-of select="@name"/></xsl:attribute>
                <xsl:attribute name="num"><xsl:value-of select="@name"/></xsl:attribute>
                <xsl:attribute name="data-energine-param-single_template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="ancestor::component/@single_template"/></xsl:attribute>
                <xsl:attribute name="single_template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="ancestor::component/@single_template"/></xsl:attribute>
                <xsl:attribute name="data-energine-param-eID"><xsl:value-of select="../field[@index='PRI']"/></xsl:attribute>
                <xsl:attribute name="eID"><xsl:value-of select="../field[@index='PRI']"/></xsl:attribute>
            </xsl:if>
            <xsl:value-of select="." disable-output-escaping="yes"/>
        </h3>
    </xsl:template>

    <!-- для поля text_rtf в режиме просмотра добавляется возможность редактирования -->
    <xsl:template match="field[contains(@name,'text_rtf') and ancestor::component[@exttype='feed' and @type='form']]">
        <xsl:variable name="FIELD_VALUE">
            <xsl:choose>
                <xsl:when test="ancestor::component/@editable and (.='')"><xsl:value-of select="$NBSP" disable-output-escaping="yes"/></xsl:when>
                <xsl:otherwise><xsl:value-of select="."/></xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <div class="feed_text">
            <xsl:if test="ancestor::component/@editable">
                <xsl:attribute name="class">nrgnEditor feed_text</xsl:attribute>
                <xsl:attribute name="data-energine-param-num"><xsl:value-of select="@name"/></xsl:attribute>
                <xsl:attribute name="num"><xsl:value-of select="@name"/></xsl:attribute>
                <xsl:attribute name="data-energine-param-single_template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="ancestor::component/@single_template"/></xsl:attribute>
                <xsl:attribute name="single_template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="ancestor::component/@single_template"/></xsl:attribute>
                <xsl:attribute name="data-energine-param-eID"><xsl:value-of select="../field[@index='PRI']"/></xsl:attribute>
                <xsl:attribute name="eID"><xsl:value-of select="../field[@index='PRI']"/></xsl:attribute>
            </xsl:if>
            <xsl:value-of select="$FIELD_VALUE" disable-output-escaping="yes"/>
        </div>
    </xsl:template>

    <xsl:template match="component[@exttype='feededitor'][@type='list']">
        <xsl:if test="recordset">
            <xsl:variable name="LINK">
                <xsl:value-of select="@linkedComponent"/>
            </xsl:variable>
            <div class="feed-editor-toolbar d-none" aria-hidden="true">
                <xsl:call-template name="energine-component-attributes"/>
                <xsl:attribute name="data-energine-param-linked-component"><xsl:value-of select="$LINK"/></xsl:attribute>
                <xsl:attribute name="data-energine-param-linked-recordset"><xsl:value-of select="generate-id($COMPONENTS[@name=$LINK]/recordset)"/></xsl:attribute>
                <xsl:attribute name="linkedTo"><xsl:value-of select="generate-id($COMPONENTS[@name=$LINK]/recordset)"/></xsl:attribute>
                <xsl:attribute name="data-energine-param-single_template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="@single_template"/></xsl:attribute>
                <xsl:attribute name="single_template"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="@single_template"/></xsl:attribute>
                <xsl:for-each select="toolbar">
                    <div data-energine-toolbar="{@name}">
                        <xsl:call-template name="energine-toolbar-attributes"/>
                        <xsl:apply-templates select="control"/>
                    </div>
                </xsl:for-each>
            </div>
        </xsl:if>
    </xsl:template>

    <xsl:template match="field[ancestor::component[@exttype='feed' and @type='form']][@name='smap_id']"/>
    <!-- /компонент типа feed -->

    <!-- фид новостей -->
    <xsl:template match="component[@class='NewsFeed']">
        <div class="feed news">
            <xsl:call-template name="energine-component-attributes"/>
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <xsl:template match="record[ancestor::component[@class='NewsFeed'][@type='list']]">
        <li class="feed_item">
            <xsl:if test="$COMPONENTS[@editable]">
                <xsl:attribute name="record">
                    <xsl:value-of select="field[@index='PRI']"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:if test="field[@name='attachments']/recordset">
                <div class="feed_image">
                    <xsl:choose>
                        <xsl:when test="field[@name='news_text_rtf']=1">
                            <a href="{$BASE}{$LANG_ABBR}{field[@name='category']/@url}{field[@name='news_id']}--{field[@name='news_segment']}/">
                                <xsl:apply-templates select="field[@name='attachments']" mode="preview">
                                    <xsl:with-param name="PREVIEW_WIDTH">90</xsl:with-param>
                                    <xsl:with-param name="PREVIEW_HEIGHT">68</xsl:with-param>
                                </xsl:apply-templates>
                            </a>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:apply-templates select="field[@name='attachments']" mode="preview">
                                <xsl:with-param name="PREVIEW_WIDTH">90</xsl:with-param>
                                <xsl:with-param name="PREVIEW_HEIGHT">68</xsl:with-param>
                            </xsl:apply-templates>
                        </xsl:otherwise>
                    </xsl:choose>
                </div>
            </xsl:if>
            <div class="feed_date">
                <xsl:value-of select="field[@name='news_date']"/>
            </div>
            <h4 class="feed_name">
                <xsl:choose>
                    <xsl:when test="field[@name='news_text_rtf']=1">
                        <a href="{$BASE}{$LANG_ABBR}{field[@name='category']/@url}{field[@name='news_id']}--{field[@name='news_segment']}/">
                            <xsl:value-of select="field[@name='news_title']" disable-output-escaping="yes"/>
                        </a>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="field[@name='news_title']" disable-output-escaping="yes"/>
                    </xsl:otherwise>
                </xsl:choose>
            </h4>
            <div class="feed_announce">
                <xsl:value-of select="field[@name='news_announce_rtf']" disable-output-escaping="yes"/>
            </div>
        </li>
    </xsl:template>

    <xsl:template match="record[ancestor::component[@class='NewsFeed'][@type='form']]">
        <div class="feed_view" id="{generate-id(../.)}">
            <xsl:if test="$COMPONENTS[@editable]">
                <xsl:attribute name="current">
                    <xsl:value-of select="field[@index='PRI']"/>
                </xsl:attribute>
            </xsl:if>
            <div class="feed_date">
                <xsl:value-of select="field[@name='news_date']"/>
            </div>
            <xsl:apply-templates select="field[@name='news_title']"/>
            <xsl:if test="field[@name='attachments']/recordset">
                <div class="feed_image">
                    <xsl:apply-templates select="field[@name='attachments']" mode="preview">
                        <xsl:with-param name="PREVIEW_WIDTH">260</xsl:with-param>
                        <xsl:with-param name="PREVIEW_HEIGHT">195</xsl:with-param>
                    </xsl:apply-templates>
                </div>
            </xsl:if>
            <xsl:apply-templates select="field[@name='news_text_rtf']"/>
            <xsl:if test="field[@name='attachments']/recordset">
                <div class="media_box">
                    <xsl:apply-templates select="field[@name='attachments']" mode="carousel">
                        <xsl:with-param name="WIDTH">664</xsl:with-param>
                        <xsl:with-param name="HEIGHT">498</xsl:with-param>
                    </xsl:apply-templates>
                </div>
            </xsl:if>
            <div class="go_back">
                <a href="{$BASE}{$LANG_ABBR}{../../@template}"><xsl:value-of select="$TRANSLATION[@const='TXT_BACK_TO_LIST']"/></a>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="component[@name='topNews']">
        <div class="feed short_feed news short_news">
            <xsl:call-template name="energine-component-attributes"/>
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <xsl:template match="recordset[parent::component[@name='topNews'][@type='list']]">
        <ul id="{generate-id(.)}" class="feed_list">
            <xsl:apply-templates/>
        </ul>
        <div class="read_more">
            <a href="{$BASE}{$LANG_ABBR}{../@template}"><xsl:value-of select="$TRANSLATION[@const='TXT_ALL_NEWS']"/></a>
        </div>
    </xsl:template>

    <xsl:template match="record[ancestor::component[@name='topNews'][@type='list']]">
        <li class="feed_item">
            <xsl:if test="$COMPONENTS[@editable]">
                <xsl:attribute name="record">
                    <xsl:value-of select="field[@index='PRI']"/>
                </xsl:attribute>
            </xsl:if>
            <div class="feed_image">
                <xsl:choose>
                    <xsl:when test="field[@name='news_text_rtf']=1">
                        <a href="{$BASE}{$LANG_ABBR}{field[@name='category']/@url}{field[@name='news_id']}--{field[@name='news_segment']}/">
                            <xsl:apply-templates select="field[@name='attachments']" mode="preview">
                                <xsl:with-param name="PREVIEW_WIDTH">90</xsl:with-param>
                                <xsl:with-param name="PREVIEW_HEIGHT">68</xsl:with-param>
                            </xsl:apply-templates>
                        </a>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:apply-templates select="field[@name='attachments']" mode="preview">
                            <xsl:with-param name="PREVIEW_WIDTH">90</xsl:with-param>
                            <xsl:with-param name="PREVIEW_HEIGHT">68</xsl:with-param>
                        </xsl:apply-templates>
                    </xsl:otherwise>
                </xsl:choose>
            </div>
            <div class="feed_date">
                <xsl:value-of select="field[@name='news_date']"/>
            </div>
            <h4 class="feed_name">
                <xsl:choose>
                    <xsl:when test="field[@name='news_text_rtf']=1">
                        <a href="{$BASE}{$LANG_ABBR}{field[@name='category']/@url}{field[@name='news_id']}--{field[@name='news_segment']}/">
                            <xsl:value-of select="field[@name='news_title']" disable-output-escaping="yes"/>
                        </a>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="field[@name='news_title']" disable-output-escaping="yes"/>
                    </xsl:otherwise>
                </xsl:choose>
            </h4>            
        </li>
    </xsl:template>
    <!-- /фид новостей -->

    <!-- фид проектов (тестовый фид из apps_feed) -->
    <xsl:template match="component[@name='testFeed']">
        <div class="feed news">
            <xsl:call-template name="energine-component-attributes"/>
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <xsl:template match="record[ancestor::component[@name='testFeed'][@type='list']]">
        <li class="feed_item">
            <xsl:if test="$COMPONENTS[@editable]">
                <xsl:attribute name="record">
                    <xsl:value-of select="field[@index='PRI']"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:if test="field[@name='attachments']/recordset">
                <div class="feed_image">
                    <xsl:choose>
                        <xsl:when test="field[@name='tf_text_rtf']!=''">
                            <a href="{$BASE}{$LANG_ABBR}{field[@name='category']/@url}{field[@name='tf_id']}/">
                                <xsl:apply-templates select="field[@name='attachments']" mode="preview">
                                    <xsl:with-param name="PREVIEW_WIDTH">90</xsl:with-param>
                                    <xsl:with-param name="PREVIEW_HEIGHT">68</xsl:with-param>
                                </xsl:apply-templates>
                            </a>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:apply-templates select="field[@name='attachments']" mode="preview">
                                <xsl:with-param name="PREVIEW_WIDTH">90</xsl:with-param>
                                <xsl:with-param name="PREVIEW_HEIGHT">68</xsl:with-param>
                            </xsl:apply-templates>
                        </xsl:otherwise>
                    </xsl:choose>
                </div>
            </xsl:if>
            <h4 class="feed_name">
                <xsl:choose>
                    <xsl:when test="field[@name='tf_text_rtf']!=''">
                        <a href="{$BASE}{$LANG_ABBR}{field[@name='category']/@url}{field[@name='tf_id']}/">
                            <xsl:value-of select="field[@name='tf_name']" disable-output-escaping="yes"/>
                        </a>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="field[@name='tf_name']" disable-output-escaping="yes"/>
                    </xsl:otherwise>
                </xsl:choose>
            </h4>
            <div class="feed_announce">
                <xsl:value-of select="field[@name='tf_annotation_rtf']" disable-output-escaping="yes"/>
            </div>
        </li>
    </xsl:template>

    <xsl:template match="record[ancestor::component[@name='testFeed'][@type='form']]">
        <div class="feed_view" id="{generate-id(../.)}">
            <xsl:if test="$COMPONENTS[@editable]">
                <xsl:attribute name="current">
                    <xsl:value-of select="field[@index='PRI']"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:apply-templates select="field[@name='tf_name']"/>
            <div class="feed_date">
                <xsl:value-of select="field[@name='tf_date']"/>
            </div>
            <xsl:if test="field[@name='attachments']/recordset">
                <div class="feed_image">
                    <xsl:apply-templates select="field[@name='attachments']" mode="preview">
                        <xsl:with-param name="PREVIEW_WIDTH">260</xsl:with-param>
                        <xsl:with-param name="PREVIEW_HEIGHT">195</xsl:with-param>
                    </xsl:apply-templates>
                </div>
            </xsl:if>
            <xsl:apply-templates select="field[@name='tf_text_rtf']"/>
            <xsl:if test="field[@name='attachments']/recordset">
                <div class="media_box">
                    <xsl:apply-templates select="field[@name='attachments']" mode="player">
                        <xsl:with-param name="PLAYER_WIDTH">664</xsl:with-param>
                        <xsl:with-param name="PLAYER_HEIGHT">498</xsl:with-param>
                    </xsl:apply-templates>
                    <xsl:apply-templates select="field[@name='attachments']" mode="carousel">
                        <xsl:with-param name="PREVIEW_WIDTH">90</xsl:with-param>
                        <xsl:with-param name="PREVIEW_HEIGHT">68</xsl:with-param>
                    </xsl:apply-templates>
                </div>
            </xsl:if>
            <div class="go_back">
                <a href="{$BASE}{$LANG_ABBR}{../../@template}"><xsl:value-of select="$TRANSLATION[@const='TXT_BACK_TO_LIST']"/></a>
            </div>
        </div>
    </xsl:template>

    <!-- фид проектов (тестовый фид из apps_feed) -->

</xsl:stylesheet>
        