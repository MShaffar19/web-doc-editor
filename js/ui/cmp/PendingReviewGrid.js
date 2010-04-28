Ext.namespace('ui','ui.cmp','ui.cmp._PendingReviewGrid');

//------------------------------------------------------------------------------
// PendingReviewGrid internals

// PendingReviewGrid store
ui.cmp._PendingReviewGrid.store = new Ext.data.GroupingStore(
{
    proxy : new Ext.data.HttpProxy({
        url : './do/getFilesNeedReviewed'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'path'},
            {name : 'name'},
            {name : 'reviewed'},
            {name : 'maintainer'},
            {name : 'needcommit'}
        ]
    }),
    sortInfo : {
        field     : 'name',
        direction : 'ASC'
    },
    groupField : 'path',
    listeners  : {
        datachanged : function(ds)
        {
            Ext.getDom('acc-need-reviewed-nb').innerHTML = ds.getCount();
        }
    }
});

// PendingReviewGrid columns definition
ui.cmp._PendingReviewGrid.columns = [{
    id        : 'name',
    header    : _('Files'),
    sortable  : true,
    dataIndex : 'name'
}, {
    header    : _('Reviewed'),
    width     : 45,
    sortable  : true,
    dataIndex : 'reviewed'
}, {
    header    : _('Maintainer'),
    width     : 45,
    sortable  : true,
    dataIndex : 'maintainer'
}, {
    header    : _('Path'),
    dataIndex : 'path',
    hidden    : true
}];

// PendingReviewGrid view
ui.cmp._PendingReviewGrid.view = new Ext.grid.GroupingView({
    forceFit      : true,
    startCollapsed: true,
    groupTextTpl  : '{[values.rs[0].data["path"]]} ' +
                    '({[values.rs.length]} ' +
                    '{[values.rs.length > 1 ? "' + _('Files') + '" : "' + _('File') + '"]})',
    getRowClass   : function(record)
    {
        if (record.data.needcommit) {
            return 'file-need-commit';
        }
        return false;
    },
    deferEmptyText : false,
    emptyText      : '<div style="text-align: center;">' + _('No Files') + '</div>'
});

Ext.namespace('ui.cmp._PendingReviewGrid.menu');
// PendingReviewGrid diff menu
// config - { rowIdx, fpath, fname }
ui.cmp._PendingReviewGrid.menu.diff = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._PendingReviewGrid.menu.diff.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PendingReviewGrid.menu.diff, Ext.menu.Item,
{
    text    : _('View diff'),
    iconCls : 'iconViewDiff',
    init : function()
    {
        Ext.apply(this,
        {
            handler : function()
            {
                // Add tab for the diff
                Ext.getCmp('main-panel').add({
                    xtype      : 'panel',
                    id         : 'diff_panel_' + this.rowIdx,
                    title      : _('Diff'),
                    tabTip     : _('Diff'),
                    closable   : true,
                    autoScroll : true,
                    iconCls    : 'iconTabLink',
                    html       : '<div id="diff_content_' + this.rowIdx + '" class="diff-content"></div>'
                });
                Ext.getCmp('main-panel').setActiveTab('diff_panel_' + this.rowIdx);

                Ext.get('diff_panel_' + this.rowIdx).mask(
                    '<img src="themes/img/loading.gif" ' +
                        'style="vertical-align: middle;" /> ' +
                    _('Please, wait...')
                );

                // Load diff data
                XHR({
                    scope   : this,
                    params  : {
                        task     : 'getDiff',
                        FilePath : PhDOE.userLang + this.fpath,
                        FileName : this.fname
                    },
                    success : function(r)
                    {
                        var o = Ext.util.JSON.decode(r.responseText);

                        // We display in diff div
                        Ext.get('diff_content_' + this.rowIdx).dom.innerHTML = o.content;
                        Ext.get('diff_panel_' + this.rowIdx).unmask();
                    }
                });
            }
        });
    }
});

// PendingReviewGrid refence group menu
// config - { gname }
ui.cmp._PendingReviewGrid.menu.group = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._PendingReviewGrid.menu.group.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PendingReviewGrid.menu.group, Ext.menu.Item,
{
    iconCls : 'iconViewDiff',
    init    : function()
    {
        Ext.apply(this,
        {
            text    : String.format(
                _('Open all files about {0} extension'), this.gname
            ),
            handler : function()
            {
                Ext.getBody().mask(
                    '<img src="themes/img/loading.gif" ' +
                        'style="vertical-align: middle;" /> ' +
                    String.format(_('Open all files about {0} extension'), this.gname) + '. ' +
                    _('Please, wait...')
                );

                XHR({
                    params  : {
                        task    : 'getAllFilesAboutExtension',
                        ExtName : this.gname
                    },
                    success : function(r)
                    {
                        var o = Ext.util.JSON.decode(r.responseText);

                        PhDOE.AFfilePendingOpen = [];

                        for (var i = 0; i < o.files.length; i = i + 1) {
                            PhDOE.AFfilePendingOpen[i] = {
                                fpath : PhDOE.userLang + o.files[i].path,
                                fname : o.files[i].name
                            };
                        }

                        // Start the first
                        ui.cmp.RepositoryTree.getInstance().openFile(
                            'byPath',
                            PhDOE.AFfilePendingOpen[0].fpath,
                            PhDOE.AFfilePendingOpen[0].fname
                        );

                        PhDOE.AFfilePendingOpen.shift();

                        Ext.getBody().unmask();
                    }
                });
            }
        });
    }
});

// PendingReviewGrid menu
// config - { hideDiff, hideGroup, gname, grid, rowIdx, event, fpath, fname }
ui.cmp._PendingReviewGrid.menu.main = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._PendingReviewGrid.menu.main.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PendingReviewGrid.menu.main, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
                text    : '<b>'+_('Edit in a new Tab')+'</b>',
                iconCls : 'iconFilesNeedReviewed',
                scope   : this,
                handler : function()
                {
                    this.grid.fireEvent('rowdblclick',
                        this.grid, this.rowIdx, this.event
                    );
                }
            }, new ui.cmp._PendingReviewGrid.menu.diff({
                fpath  : this.fpath,
                fname  : this.fname,
                rowIdx : this.rowIdx,
                hidden : this.hideDiff
            }), new Ext.menu.Separator({ // Only display a separator when we display the group menu
                hidden : this.hideGroup
            }), new ui.cmp._PendingReviewGrid.menu.group({
                gname  : this.gname,
                hidden : this.hideGroup
            })]
        });
    }
});

//------------------------------------------------------------------------------
// PendingReviewGrid
ui.cmp.PendingReviewGrid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    border           : false,
    autoExpandColumn : 'name',
    enableDragDrop   : true,
    ddGroup          : 'mainPanelDDGroup',
    columns          : ui.cmp._PendingReviewGrid.columns,
    view             : ui.cmp._PendingReviewGrid.view,

    onRowContextMenu: function(grid, rowIndex, e)
    {
        e.stopEvent();

        var storeRecord = grid.store.getAt(rowIndex),
            FilePath    = storeRecord.data.path,
            FileName    = storeRecord.data.name,
            fpath_split = FilePath.split('/');

        grid.getSelectionModel().selectRow(rowIndex);

        new ui.cmp._PendingReviewGrid.menu.main({
            grid      : grid,
            rowIdx    : rowIndex,
            event     : e,
            fpath     : FilePath,
            fname     : FileName,
            hideDiff  : (!storeRecord.data.needcommit),
            hideGroup : (fpath_split[1] !== 'reference'),
            gname     : fpath_split[2]
        }).showAt(e.getXY());
    },

    onRowDblClick: function(grid, rowIndex, e)
    {
        this.openFile(grid.store.getAt(rowIndex).data.id);
    },

    openFile: function(rowId)
    {
        var storeRecord = this.store.getById(rowId),
            FilePath    = storeRecord.data.path,
            FileName    = storeRecord.data.name,
            FileID      = Ext.util.md5('FNR-' + PhDOE.userLang + FilePath + FileName);

        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('FNR-' + FileID)) {

            Ext.getCmp('main-panel').add({
                id             : 'FNR-' + FileID,
                title          : FileName,
                layout         : 'border',
                iconCls        : 'iconTabNeedReviewed',
                closable       : true,
                tabLoaded      : false,
                panVCSLang     : !PhDOE.userConf.reviewedDisplaylog,
                panVCSEn       : !PhDOE.userConf.reviewedDisplaylog,
                panLANGLoaded  : false, // Use to monitor if the LANG panel is loaded
                panENLoaded    : false, // Use to monitor if the EN panel is loaded
                originTitle    : FileName,
                defaults       : { split : true },
                tabTip         : String.format(
                    _('Need Reviewed in: {0}'), FilePath
                ),
                listeners: {
                    resize: function(panel) {
                        Ext.getCmp('FNR-EN-PANEL-' + FileID).setWidth(panel.getWidth()/2);
                    }
                },
                items : [{
                    region           : 'west',
                    xtype            : 'panel',
                    title            : _('Tools'),
                    iconCls          : 'iconConf',
                    collapsedIconCls : 'iconConf',
                    plugins          : [Ext.ux.PanelCollapsedTitle],
                    collapsible      : true,
                    collapsed        : !PhDOE.userConf.reviewedDisplaylogPanel,
                    layout           : 'fit',
                    bodyBorder       : false,
                    width            : PhDOE.userConf.reviewedDisplaylogPanelWidth || 375,
                    listeners        : {
                        collapse: function() {
                            if ( this.ownerCt.tabLoaded ) {
                                new ui.task.UpdateConfTask({
                                    item  : 'reviewedDisplaylogPanel',
                                    value : false,
                                    notify: false
                                });
                            }
                        },
                        expand: function() {
                            if ( this.ownerCt.tabLoaded ) {
                                new ui.task.UpdateConfTask({
                                    item  : 'reviewedDisplaylogPanel',
                                    value : true,
                                    notify: false
                                });
                            }
                        },
                        resize: function(a,newWidth) {
                            if( this.ownerCt.tabLoaded && newWidth && newWidth != PhDOE.userConf.reviewedDisplaylogPanelWidth ) { // As the type is different, we can't use !== to compare with !
                                new ui.task.UpdateConfTask({
                                    item  : 'reviewedDisplaylogPanelWidth',
                                    value : newWidth,
                                    notify: false
                                });
                            }
                        }
                    },
                    items : {
                        xtype          : 'tabpanel',
                        activeTab      : 0,
                        tabPosition    : 'bottom',
                        enableTabScroll:true,
                        defaults       : { autoScroll : true },
                        items          : [
                            new ui.cmp.VCSLogGrid({
                                layout    : 'fit',
                                title     : String.format(_('{0} Log'), PhDOE.userLang.ucFirst()),
                                prefix    : 'FNR-LANG',
                                fid       : FileID,
                                fpath     : PhDOE.userLang + FilePath,
                                fname     : FileName,
                                loadStore : PhDOE.userConf.reviewedDisplaylog
                            }),
                            new ui.cmp.VCSLogGrid({
                                layout    : 'fit',
                                title     : String.format(_('{0} Log'), 'En'),
                                prefix    : 'FNR-EN',
                                fid       : FileID,
                                fpath     : 'en' + FilePath,
                                fname     : FileName,
                                loadStore : PhDOE.userConf.reviewedDisplaylog
                            }),
                            new ui.cmp.DictionaryGrid({
                                layout    : 'fit',
                                title     : _('Dictionary'),
                                prefix    : 'FNR',
                                fid       : FileID
                            })
                        ]
                    }
                }, new ui.cmp.FilePanel({
                    id             : 'FNR-LANG-PANEL-' + FileID,
                    region         : 'center',
                    title          : String.format(_('{0} File: '), PhDOE.userLang) + FilePath + FileName,
                    prefix         : 'FNR',
                    ftype          : 'LANG',
                    spellCheck     : PhDOE.userConf.reviewedSpellCheckLang,
                    spellCheckConf : 'reviewedSpellCheckLang',
                    fid            : FileID,
                    fpath          : FilePath,
                    fname          : FileName,
                    lang           : PhDOE.userLang,
                    parser         : 'xml',
                    storeRecord    : storeRecord,
                    syncScrollCB   : true,
                    syncScroll     : true,
                    syncScrollConf : 'reviewedScrollbars'
                }), new ui.cmp.FilePanel({
                    id             : 'FNR-EN-PANEL-' + FileID,
                    region         : 'east',
                    title          : _('en File: ') + FilePath + FileName,
                    prefix         : 'FNR',
                    ftype          : 'EN',
                    spellCheck     : PhDOE.userConf.reviewedSpellCheckEn,
                    spellCheckConf : 'reviewedSpellCheckEn',
                    fid            : FileID,
                    fpath          : FilePath,
                    fname          : FileName,
                    lang           : 'en',
                    parser         : 'xml',
                    storeRecord    : storeRecord,
                    syncScroll     : true,
                    syncScrollConf : 'reviewedScrollbars'
                })]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('FNR-' + FileID);
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            store : ui.cmp._PendingReviewGrid.store,
            tbar  : [
                _('Filter: '), ' ',
                new Ext.form.TwinTriggerField({
                    id              : 'FNR-filter',
                    width           : 180,
                    hideTrigger1    : true,
                    enableKeyEvents : true,
                    validateOnBlur  : false,
                    validationEvent : false,
                    trigger1Class   : 'x-form-clear-trigger',
                    trigger2Class   : 'x-form-search-trigger',
                    listeners : {
                        keypress : function(field, e)
                        {
                            if (e.getKey() == e.ENTER) {
                                this.onTrigger2Click();
                            }
                        }
                    },
                    onTrigger1Click : function()
                    {
                        this.setValue('');
                        this.triggers[0].hide();
                        this.setSize(180,10);
                        ui.cmp._PendingReviewGrid.instance.store.clearFilter();
                    },
                    onTrigger2Click : function()
                    {
                        var v = this.getValue(), regexp;

                        if( v === '' || v.length < 3) {
                            this.markInvalid(
                                _('Your filter must contain at least 3 characters')
                            );
                            return;
                        }
                        this.clearInvalid();
                        this.triggers[0].show();
                        this.setSize(180,10);

                        regexp = new RegExp(v, 'i');

                        // We filter on 'path', 'name', 'reviewed', 'maintainer'
                        ui.cmp._PendingReviewGrid.instance.store.filterBy(function(record) {

                            if( regexp.test(record.data.path)       ||
                                regexp.test(record.data.name)       ||
                                regexp.test(record.data.reviewed)   ||
                                regexp.test(record.data.maintainer)
                            ) {
                                return true;
                            } else {
                                return false;
                            }
                        }, this);
                    }
                })
            ]
        });
        ui.cmp.PendingReviewGrid.superclass.initComponent.call(this);

        this.on('rowcontextmenu', this.onRowContextMenu, this);
        this.on('rowdblclick',    this.onRowDblClick,  this);
    }
});

// singleton
ui.cmp._PendingReviewGrid.instance = null;
ui.cmp.PendingReviewGrid.getInstance = function(config)
{
    if (!ui.cmp._PendingReviewGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PendingReviewGrid.instance = new ui.cmp.PendingReviewGrid(config);
    }
    return ui.cmp._PendingReviewGrid.instance;
};