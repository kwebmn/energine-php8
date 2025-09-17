<?xml version='1.0' encoding="UTF-8"?>
<xsl:stylesheet 
    version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
    >

    <!-- Шаблоны панели управления -->
    
    <!-- Собственно панель управления -->
    <xsl:template match="toolbar">
        <xsl:apply-templates/>
    </xsl:template>
    
    <!-- Элемент панели управления -->
    <xsl:template match="toolbar/control">
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
        <xsl:variable name="CONTROL_KEY" select="translate(concat(@id, '|', @click, '|', @title), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
        <xsl:variable name="BUTTON_VARIANT">
            <xsl:choose>
                <xsl:when test="contains($CONTROL_KEY, 'save') or contains($CONTROL_KEY, 'submit') or contains($CONTROL_KEY, 'apply') or contains($CONTROL_KEY, 'update') or contains($CONTROL_KEY, 'add') or contains($CONTROL_KEY, 'create') or contains($CONTROL_KEY, 'change') or contains($CONTROL_KEY, 'select') or contains($CONTROL_KEY, 'activate') or contains($CONTROL_KEY, 'confirm') or contains($CONTROL_KEY, 'ok') or contains($CONTROL_KEY, 'upload') or contains($CONTROL_KEY, 'send') or contains($CONTROL_KEY, 'build')">btn-primary</xsl:when>
                <xsl:when test="contains($CONTROL_KEY, 'delete') or contains($CONTROL_KEY, 'remove') or contains($CONTROL_KEY, 'cancel') or contains($CONTROL_KEY, 'close') or contains($CONTROL_KEY, 'list') or contains($CONTROL_KEY, 'back') or contains($CONTROL_KEY, 'move') or contains($CONTROL_KEY, 'down') or contains($CONTROL_KEY, 'up') or contains($CONTROL_KEY, 'exit')">btn-outline-secondary</xsl:when>
                <xsl:otherwise>btn-secondary</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>

        <xsl:element name="{$CONTROL}">
            <xsl:if test="@mode=1">
                <xsl:attribute name="disabled">disabled</xsl:attribute>
            </xsl:if>
                <xsl:attribute name="name"><xsl:value-of select="@id"/></xsl:attribute>
                <xsl:attribute name="title"><xsl:value-of select="@tooltip"/></xsl:attribute>
                <xsl:if test="@tooltip != ''">
                    <xsl:attribute name="data-mdb-tooltip-init">1</xsl:attribute>
                </xsl:if>
                <xsl:attribute name="type"><xsl:value-of select="$CONTROL_TYPE"/></xsl:attribute>
            <xsl:attribute name="class">
                <xsl:text>btn btn-sm </xsl:text>
                <xsl:value-of select="$BUTTON_VARIANT"/>
            </xsl:attribute>
            <xsl:if test="@click!=''">
                <xsl:attribute name="onclick"><xsl:value-of select="@click"/></xsl:attribute>
            </xsl:if>
                <xsl:value-of select="@title"/>
        </xsl:element>
    </xsl:template>
    <xsl:template match="toolbar/control[(@type='link') and (@mode != 0) and not(@disabled)]">
        <xsl:variable name="LINK_KEY" select="translate(concat(@id, '|', @click, '|', @title), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
        <xsl:variable name="LINK_VARIANT">
            <xsl:choose>
                <xsl:when test="contains($LINK_KEY, 'save') or contains($LINK_KEY, 'submit') or contains($LINK_KEY, 'apply') or contains($LINK_KEY, 'update') or contains($LINK_KEY, 'add') or contains($LINK_KEY, 'create') or contains($LINK_KEY, 'change') or contains($LINK_KEY, 'select') or contains($LINK_KEY, 'activate') or contains($LINK_KEY, 'confirm') or contains($LINK_KEY, 'ok') or contains($LINK_KEY, 'upload') or contains($LINK_KEY, 'send') or contains($LINK_KEY, 'build')">btn-primary</xsl:when>
                <xsl:when test="contains($LINK_KEY, 'delete') or contains($LINK_KEY, 'remove') or contains($LINK_KEY, 'cancel') or contains($LINK_KEY, 'close') or contains($LINK_KEY, 'list') or contains($LINK_KEY, 'back') or contains($LINK_KEY, 'move') or contains($LINK_KEY, 'down') or contains($LINK_KEY, 'up') or contains($LINK_KEY, 'exit')">btn-outline-secondary</xsl:when>
                <xsl:otherwise>btn-secondary</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <a href="{$BASE}{$LANG_ABBR}{@click}" id="{@id}">
            <xsl:if test="@tooltip != ''">
                <xsl:attribute name="title"><xsl:value-of select="@tooltip"/></xsl:attribute>
                <xsl:attribute name="data-mdb-tooltip-init">1</xsl:attribute>
            </xsl:if>
            <xsl:attribute name="class">
                <xsl:text>btn btn-sm </xsl:text>
                <xsl:value-of select="$LINK_VARIANT"/>
            </xsl:attribute>
            <xsl:value-of select="@title"/>
        </a>
    </xsl:template>

    <!--Равно как и те действия права на которые есть, но по каким то причинам их делать нельзя-->
    <xsl:template match="toolbar/control[@disabled]"></xsl:template>

    <xsl:template match="toolbar/control[@type='separator']">
        <br/>
    </xsl:template>
    <!-- Панель управления для формы -->
    <xsl:template match="toolbar[parent::component[@exttype='grid']]">

        <script type="text/javascript">
<!--            document.addEventListener('DOMContentLoaded', function(){-->
            Energine.addTask(function(){
            componentToolbars['<xsl:value-of select="generate-id(../recordset)"/>'] = new Toolbar('<xsl:value-of select="@name"/>'<xsl:if
                test="properties/property">, <xsl:for-each select="properties/property">{'<xsl:value-of select="@name"/>':'<xsl:value-of
                select="."/>'<xsl:if test="position()!=last()">,</xsl:if>}</xsl:for-each></xsl:if>);
                <xsl:apply-templates />
            if(<xsl:value-of select="generate-id(../recordset)"/>)<xsl:value-of select="generate-id(../recordset)"/>.attachToolbar(componentToolbars['<xsl:value-of select="generate-id(../recordset)"/>']);
            var holder = document.getElementById('<xsl:value-of select="generate-id(../recordset)"/>'),
                content = holder.querySelector('[data-pane-part="body"]');
            if (content <xsl:text disable-output-escaping="yes">&amp;&amp;</xsl:text> parseInt(document.body.clientWidth) <xsl:text disable-output-escaping="yes">&lt;</xsl:text>= 680) {
                var tToolbar = holder.querySelector('[data-pane-part="header"]'),
                    bToolbar = holder.querySelector('[data-pane-part="footer"]'),
                    contentHeight = document.body.clientHeight;
                if (tToolbar) contentHeight -= tToolbar.getComputedSize().totalHeight;
                if (bToolbar) contentHeight -= bToolbar.getComputedSize().totalHeight;
                <!--content.setStyles({
                    height: contentHeight,
                    position: 'static'
                });-->
            }
        });
        </script>
    </xsl:template>    
    
    <xsl:template match="component[@exttype='grid']/toolbar/control[@type = 'button']">
            componentToolbars['<xsl:value-of select="generate-id(../../recordset)"/>'].appendControl(
                new Toolbar.Button({
                    id: '<xsl:value-of select="@id"/>',
                    title: '<xsl:value-of select="@title"/>',
                    action: '<xsl:value-of select="@onclick"/>',
                    icon: '<xsl:value-of select="@icon"/>',
                    disabled: '<xsl:value-of select="@disabled"/>'
                })
            );
    </xsl:template>


    <xsl:template match="component[@exttype='grid']/toolbar/control[@type = 'switcher']">
        componentToolbars['<xsl:value-of select="generate-id(../../recordset)"/>'].appendControl(
        new Toolbar.Switcher({
        id: '<xsl:value-of select="@id"/>',
        title: '<xsl:value-of select="@title"/>',
        action: '<xsl:value-of select="@onclick"/>',
        icon: '<xsl:value-of select="@icon"/>'
        })
        );
    </xsl:template>

    <xsl:template match="component[@exttype='grid']/toolbar/control[@type='file']">
    	componentToolbars['<xsl:value-of select="generate-id(../../recordset)"/>'].appendControl(
            new Toolbar.File({
                id: '<xsl:value-of select="@id"/>',
                title: '<xsl:value-of select="@title"/>',
                action: '<xsl:value-of select="@onclick"/>',
                icon: '<xsl:value-of select="@icon"/>'
            })
    	);
    </xsl:template>

    <xsl:template match="component[@exttype='grid']/toolbar/control[@type = 'select']">
        componentToolbars['<xsl:value-of select="generate-id(../../recordset)"/>'].appendControl(
            new Toolbar.Select({
                id: '<xsl:value-of select="@id"/>',
                title: '<xsl:value-of select="@title"/>',
                action: '<xsl:value-of select="@action"/>'
            },
            {
                <xsl:if test="options">
                    <xsl:for-each select="options/option">
                        '<xsl:value-of select="@id"/>':'<xsl:value-of select="."/>'<xsl:if test="position()!=last()">,</xsl:if>
                    </xsl:for-each>
                </xsl:if>
            })
        );
    </xsl:template>
  
    <xsl:template match="component[@exttype='grid']/toolbar/control[@type = 'separator']">
        componentToolbars['<xsl:value-of select="generate-id(../../recordset)"/>'].appendControl(
            new Toolbar.Separator({ id: '<xsl:value-of select="@id"/>' })
    	);
    </xsl:template>
    
    <!-- листалка по страницам -->
    <xsl:template match="toolbar[@name='pager']">
        <xsl:if test="count(control)&gt;1">
            <div class="pager">
                <xsl:apply-templates select="properties/property[@name='title']"/>
                <xsl:apply-templates/>    
            </div>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="control[parent::toolbar[@name='pager']]">
        <span class="control">
            <a>
                <xsl:attribute name="href"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../../@template"/><xsl:value-of select="../properties/property[@name='additional_url']"/>page-<xsl:value-of select="@action"/>/<xsl:if test="../properties/property[@name='get_string']!=''">?<xsl:value-of select="../properties/property[@name='get_string']"/></xsl:if></xsl:attribute>                            
                <xsl:value-of select="@title"/>
            </a>
        </span>
    </xsl:template>
    
    <!-- номер текущей страницы выделен -->
    <xsl:template match="control[@disabled][parent::toolbar[@name='pager']]">
        <xsl:if test="preceding-sibling::control">
            <span class="control arrow">
                <a>
                    <xsl:attribute name="href"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../../@template"/><xsl:value-of select="../properties/property[@name='additional_url']"/>page-<xsl:value-of select="@action - 1"/>/<xsl:if test="../properties/property[@name='get_string']!=''">?<xsl:value-of select="../properties/property[@name='get_string']"/></xsl:if></xsl:attribute>
                    <img src="images/prev_page.gif"/>
                </a>
            </span>
        </xsl:if>
        <span class="control current"><xsl:value-of select="@title"/></span>
        <xsl:if test="following-sibling::control">
            <span class="control arrow">
                <a>
                    <xsl:attribute name="href"><xsl:value-of select="$BASE"/><xsl:value-of select="$LANG_ABBR"/><xsl:value-of select="../../@template"/><xsl:value-of select="../properties/property[@name='additional_url']"/>page-<xsl:value-of select="@action + 1"/>/<xsl:if test="../properties/property[@name='get_string']!=''">?<xsl:value-of select="../properties/property[@name='get_string']"/></xsl:if></xsl:attribute>
                    <img src="images/next_page.gif"/>
                </a>
            </span>
        </xsl:if>
    </xsl:template>
    
    <!-- разделитель между группами цифр -->
    <xsl:template match="control[@type='separator'][parent::toolbar[@name='pager']]">
        <span class="control break">...</span>
    </xsl:template>
    
    <xsl:template match="properties[parent::toolbar[@name='pager']]"/>
    
    <xsl:template match="property[@name='title'][ancestor::toolbar[@name='pager']]">
        <span class="title"><xsl:value-of select="."/>:</span>
    </xsl:template>
    <!-- /листалка по страницам -->     
    
    <!-- Панель управления страницей обрабатывается в document.xslt  -->
    <xsl:template match="toolbar[parent::component[@class='PageToolBar']]"/>
    <!-- Те действия на которые нет прав  - прячем -->
    <xsl:template match="toolbar/control[@mode=0]"></xsl:template>


</xsl:stylesheet>