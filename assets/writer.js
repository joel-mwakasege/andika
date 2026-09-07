( function() {
    'use strict';

    // =========================================================================
    // GLOBAL ANDIKA EXTENSION ARCHITECTURE & EVENT BUS
    // =========================================================================
    window.Andika = window.Andika || ( function() {
        var extensions = {};
        var listeners = {};
        var apiInstance = null;

        function on( event, fn ) {
            if ( ! listeners[ event ] ) {
                listeners[ event ] = [];
            }
            listeners[ event ].push( fn );
        }

        function off( event, fn ) {
            if ( ! listeners[ event ] ) return;
            var idx = listeners[ event ].indexOf( fn );
            if ( idx !== -1 ) listeners[ event ].splice( idx, 1 );
        }

        function emit( event, payload ) {
            if ( listeners[ event ] ) {
                listeners[ event ].forEach( function( fn ) {
                    try {
                        fn( payload );
                    } catch ( e ) {
                        console.error( '[Andika Extension Error in ' + event + ']:', e );
                    }
                } );
            }
        }

        function registerExtension( id, definition ) {
            extensions[ id ] = definition;
            if ( apiInstance && typeof definition.init === 'function' ) {
                try {
                    definition.init( apiInstance );
                } catch ( err ) {
                    console.error( '[Andika Extension Init Error: ' + id + ']:', err );
                }
            }
        }

        function initAll( api ) {
            apiInstance = api;
            Object.keys( extensions ).forEach( function( id ) {
                if ( typeof extensions[ id ].init === 'function' ) {
                    try {
                        extensions[ id ].init( apiInstance );
                    } catch ( err ) {
                        console.error( '[Andika Extension Init Error: ' + id + ']:', err );
                    }
                }
            } );
            emit( 'ready', apiInstance );
        }

        return {
            extensions: extensions,
            on: on,
            off: off,
            emit: emit,
            registerExtension: registerExtension,
            _initAll: initAll,
            getApi: function() { return apiInstance; }
        };
    } )();

    document.addEventListener( 'DOMContentLoaded', function() {
        var screen = document.getElementById( 'script-writer-screen' );
        var editorView = document.getElementById( 'script-writer-editor-view' );
        var dashboardView = document.getElementById( 'script-writer-dashboard-view' );
        var textarea = document.getElementById( 'script-writer-textarea' );
        var toolbarWrap = document.getElementById( 'script-writer-toolbar-wrap' );
        var statsEl = document.getElementById( 'script-writer-stats' );
        var statusEl = document.getElementById( 'script-writer-status' );
        var titleInput = document.getElementById( 'script-writer-title' );
        var saveBtn = document.getElementById( 'script-writer-save-btn' );
        var newBtn = document.getElementById( 'script-writer-new-btn' );
        var scriptsBtn = document.getElementById( 'script-writer-scripts-btn' );
        var dropdown = document.getElementById( 'script-writer-dropdown' );
        var dropdownList = document.getElementById( 'script-writer-dropdown-list' );
        var dropdownNewBtn = document.getElementById( 'sw-dropdown-new-btn' );
        var dropdownOpenDash = document.getElementById( 'sw-dropdown-open-dash' );
        var dashboardBtn = document.getElementById( 'script-writer-dashboard-btn' );
        var exportBtn = document.getElementById( 'script-writer-export-btn' );
        var importBtn = document.getElementById( 'script-writer-import-btn' );
        var dashImportBtn = document.getElementById( 'sw-dash-import-btn' );
        var importFileInput = document.getElementById( 'script-writer-import-file' );
        var dropdownImportBtn = document.getElementById( 'sw-dropdown-import-btn' );
        var dropOverlay = document.getElementById( 'script-writer-drop-overlay' );
        var ctxMenu = document.getElementById( 'script-writer-context-menu' );
        var canvasWrap = document.getElementById( 'script-writer-canvas-wrap' );

        // Export Modal Elements
        var exportModal = document.getElementById( 'script-writer-export-modal' );
        var exportCloseBtn = document.getElementById( 'sw-export-close-btn' );
        var exportBackdrop = document.getElementById( 'sw-export-backdrop' );
        var exportStyleSelect = document.getElementById( 'sw-export-style' );
        var exportPageSizeSelect = document.getElementById( 'sw-export-pagesize' );
        var exportTitleBadge = document.getElementById( 'sw-export-script-title' );
        var exportOptTitlePage = document.getElementById( 'sw-export-opt-titlepage' );
        var exportOptPageNumbers = document.getElementById( 'sw-export-opt-pagenumbers' );
        var exportOptBoldSlugs = document.getElementById( 'sw-export-opt-boldslugs' );
        var exportOptHideNotes = document.getElementById( 'sw-export-opt-hidenotes' );
        var exportPdfBtn = document.getElementById( 'sw-export-pdf-btn' );
        var exportHtmlBtn = document.getElementById( 'sw-export-html-btn' );
        var exportFountainBtn = document.getElementById( 'sw-export-fountain-btn' );
        var exportTxtBtn = document.getElementById( 'sw-export-txt-btn' );
        var previewSheet = document.getElementById( 'sw-paper-sheet' );
        var previewViewport = document.getElementById( 'sw-preview-viewport' );
        var previewPageCount = document.getElementById( 'sw-preview-page-count' );

        // Dashboard Elements
        var dashNewBtn = document.getElementById( 'sw-dash-new-script-btn' );
        var dashBackEditorBtn = document.getElementById( 'sw-dash-back-editor-btn' );
        var dashActiveLink = document.getElementById( 'sw-stat-active-link' );
        var dashSearch = document.getElementById( 'sw-dash-search' );
        var dashSort = document.getElementById( 'sw-dash-sort' );
        var dashGrid = document.getElementById( 'sw-dashboard-scripts-grid' );
        var statTotalScripts = document.getElementById( 'sw-stat-total-scripts' );
        var statTotalWords = document.getElementById( 'sw-stat-total-words' );
        var statTotalLines = document.getElementById( 'sw-stat-total-lines' );
        var statActiveTitle = document.getElementById( 'sw-stat-active-title' );
        var statCommScripts = document.getElementById( 'sw-stat-comm-scripts' );
        var statCommMembers = document.getElementById( 'sw-stat-comm-members' );
        var tabMy = document.getElementById( 'sw-tab-my' );
        var tabCommunity = document.getElementById( 'sw-tab-community' );
        var tabMyCount = document.getElementById( 'sw-tab-my-count' );
        var tabCommunityCount = document.getElementById( 'sw-tab-community-count' );
        var tabHint = document.getElementById( 'sw-dash-tab-hint' );

        // Auth Elements
        var authView = document.getElementById( 'script-writer-auth-view' );
        var authLoginForm = document.getElementById( 'sw-auth-login-form' );
        var authRegisterForm = document.getElementById( 'sw-auth-register-form' );
        var authTabLogin = document.getElementById( 'sw-tab-btn-login' );
        var authTabRegister = document.getElementById( 'sw-tab-btn-register' );
        var authAlert = document.getElementById( 'sw-auth-alert' );
        var editorLogoutBtn = document.getElementById( 'sw-editor-logout-btn' );
        var dashLogoutBtn = document.getElementById( 'sw-dash-logout-btn' );
        var toolbarVisibilityBtn = document.getElementById( 'sw-toolbar-visibility-btn' );
        var gearBtn = document.getElementById( 'sw-dash-gear-btn' );
        var gearMenu = document.getElementById( 'sw-dash-gear-menu' );

        // Settings Modal Elements
        var settingsModal = document.getElementById( 'script-writer-settings-modal' );
        var settingsBackdrop = document.getElementById( 'sw-settings-backdrop' );
        var settingsCloseBtn = document.getElementById( 'sw-settings-close-btn' );
        var settingsCancelBtn = document.getElementById( 'sw-settings-cancel-btn' );
        var settingsForm = document.getElementById( 'sw-settings-form' );
        var settingsAlert = document.getElementById( 'sw-settings-alert' );
        var settingsSaveBtn = document.getElementById( 'sw-settings-save-btn' );
        var settingsBtn = document.getElementById( 'sw-dash-settings-btn' );
        var spaceSettingsBtn = document.getElementById( 'sw-dash-space-settings-btn' );
        var userPill = document.getElementById( 'sw-dash-user-pill' );
        var settingName = document.getElementById( 'sw-setting-name' );
        var settingEmail = document.getElementById( 'sw-setting-email' );
        var settingUsername = document.getElementById( 'sw-setting-username' );
        var settingSpaceName = document.getElementById( 'sw-setting-space-name' );
        var settingBio = document.getElementById( 'sw-setting-bio' );
        var settingCurPass = document.getElementById( 'sw-setting-cur-pass' );
        var settingNewPass = document.getElementById( 'sw-setting-new-pass' );
        var settingConfirmPass = document.getElementById( 'sw-setting-confirm-pass' );

        var tabAuthorSettings = document.getElementById( 'sw-tab-user-settings' );
        var tabSpaceSettings = document.getElementById( 'sw-tab-admin-settings' );
        var tabExtensionsSettings = document.getElementById( 'sw-tab-extensions-settings' );
        var extensionsPanel = document.getElementById( 'sw-extensions-panel' );
        var extensionsCloseBtn = document.getElementById( 'sw-extensions-close-btn' );
        var adminSpaceForm = document.getElementById( 'sw-admin-space-form' );
        var adminSpaceName = document.getElementById( 'sw-admin-space-name' );
        var adminSpaceAbout = document.getElementById( 'sw-admin-space-about' );
        var adminSpaceSlug = document.getElementById( 'sw-admin-space-slug' );
        var adminSpaceDesc = document.getElementById( 'sw-admin-space-desc' );
        var adminLoginLabel = document.getElementById( 'sw-admin-login-label' );
        var adminLoginAbout = document.getElementById( 'sw-admin-login-about' );
        var slugPreviewCode = document.getElementById( 'sw-slug-preview-code' );
        var adminSpaceCancelBtn = document.getElementById( 'sw-admin-space-cancel-btn' );
        var adminSpaceSaveBtn = document.getElementById( 'sw-admin-space-save-btn' );
        var settingsModalTitle = document.getElementById( 'sw-settings-modal-title' );
        var settingsHeaderSub = document.getElementById( 'sw-settings-header-sub' );

        // Review Notes & Track Changes Elements
        var reviewGutter = document.getElementById( 'sw-review-gutter' );
        var reviewPopover = document.getElementById( 'sw-review-popover' );
        var reviewPopoverText = document.getElementById( 'sw-popover-text' );
        var reviewPopoverQuote = document.getElementById( 'sw-popover-quote' );
        var reviewPopoverSaveBtn = document.getElementById( 'sw-popover-save-btn' );
        var reviewPopoverCancelBtn = document.getElementById( 'sw-popover-cancel-btn' );
        var reviewPopoverCloseBtn = document.getElementById( 'sw-popover-close-btn' );
        var reviewDrawer = document.getElementById( 'sw-review-drawer' );
        var reviewDrawerList = document.getElementById( 'sw-review-drawer-list' );
        var reviewDrawerCloseBtn = document.getElementById( 'sw-review-drawer-close-btn' );
        var reviewDrawerCount = document.getElementById( 'sw-drawer-notes-count' );
        var notesToggleBtn = document.getElementById( 'script-writer-notes-toggle-btn' );
        var notesTotalCount = document.getElementById( 'sw-notes-total-count' );
        var trackBtn = document.getElementById( 'script-writer-track-btn' );
        var revisionsBtn = document.getElementById( 'script-writer-revisions-btn' );
        var revisionsDrawer = document.getElementById( 'sw-revisions-drawer' );
        var revisionsDrawerCloseBtn = document.getElementById( 'sw-revisions-drawer-close-btn' );
        var revisionsList = document.getElementById( 'sw-revisions-list' );
        var revisionsCount = document.getElementById( 'sw-drawer-rev-count' );
        var revDiffWrap = document.getElementById( 'sw-rev-diff-wrap' );
        var revDiffContent = document.getElementById( 'sw-rev-diff-content' );
        var revDiffCloseBtn = document.getElementById( 'sw-rev-diff-close-btn' );
        var revRestoreBtn = document.getElementById( 'sw-rev-restore-btn' );

        var currentComments = [];
        var activeNotePopoverTarget = null;
        var isTrackChangesActive = false;
        var baselineLines = [];
        var changedLineIndices = new Set();
        var currentRevisions = [];
        var activeDiffRevision = null;
        var exportProviders = {};
        var activeExportProviderId = 'standard';

        if ( ! textarea && ! authView ) {
            return;
        }

        var saveTimeout = null;
        var storageKey = 'script_writer_draft';
        var isToolbarPinned = true;
        var isCtxMenuEnabled = true; // Floating tools always active on right-click alongside blinking cursor
        var currentExportTitle = '';
        var currentExportContent = '';

        var currentView = ( window.scriptWriterData && window.scriptWriterData.initialView ) ? window.scriptWriterData.initialView : 'dashboard';
        var currentDashTab = 'my'; // 'my' or 'community'
        var dashboardScripts = [];
        var dashboardMyScripts = [];
        var dashboardCommunityScripts = [];
        var currentVisibility = ( window.scriptWriterData && window.scriptWriterData.visibility ) ? window.scriptWriterData.visibility : 'private';

        // Toast Notification Helper
        var toastEl = document.getElementById( 'script-writer-toast' );
        if ( ! toastEl ) {
            toastEl = document.createElement( 'div' );
            toastEl.id = 'script-writer-toast';
            document.body.appendChild( toastEl );
        }

        var toastTimer = null;
        function showToast( message ) {
            toastEl.textContent = message;
            toastEl.classList.add( 'active' );
            clearTimeout( toastTimer );
            toastTimer = setTimeout( function() {
                toastEl.classList.remove( 'active' );
            }, 1800 );
        }

        function updateVisibilityUI( visibility ) {
            currentVisibility = visibility || 'private';
            if ( toolbarVisibilityBtn ) {
                if ( currentVisibility === 'community' ) {
                    toolbarVisibilityBtn.textContent = 'Community';
                    toolbarVisibilityBtn.className = 'sw-btn sw-btn-visibility sw-btn-visibility-community';
                    toolbarVisibilityBtn.title = 'Visibility: Shared with Community (Click to make personal)';
                } else {
                    toolbarVisibilityBtn.textContent = 'Personal';
                    toolbarVisibilityBtn.className = 'sw-btn sw-btn-visibility sw-btn-visibility-private';
                    toolbarVisibilityBtn.title = 'Visibility: Personal Workspace (Click to share with community)';
                }
            }
        }

        // 1. View Switching: Auth vs Editor Canvas vs Dedicated Dashboard
        function switchView( view ) {
            currentView = view;
            if ( typeof hideContextMenu === 'function' ) {
                hideContextMenu();
            }

            if ( window.Andika && typeof window.Andika.emit === 'function' ) {
                window.Andika.emit( 'viewChange', { view: view } );
            }

            if ( authView ) {
                authView.classList.toggle( 'sw-view-active', view === 'auth' );
                authView.classList.toggle( 'sw-view-hidden', view !== 'auth' );
            }

            if ( view === 'auth' ) {
                if ( editorView ) {
                    editorView.classList.remove( 'sw-view-active' );
                    editorView.classList.add( 'sw-view-hidden' );
                }
                if ( dashboardView ) {
                    dashboardView.classList.remove( 'sw-view-active' );
                    dashboardView.classList.add( 'sw-view-hidden' );
                }
                return;
            }

            if ( view === 'dashboard' ) {
                // Silently auto-save current draft before leaving editor
                if ( textarea && textarea.value.trim().length > 0 ) {
                    saveToServer( textarea.value );
                }

                if ( editorView ) {
                    editorView.classList.remove( 'sw-view-active' );
                    editorView.classList.add( 'sw-view-hidden' );
                }
                if ( dashboardView ) {
                    dashboardView.classList.remove( 'sw-view-hidden' );
                    dashboardView.classList.add( 'sw-view-active' );
                }

                if ( window.history.replaceState && window.scriptWriterData ) {
                    var dashUrl = window.scriptWriterData.appUrl || window.scriptWriterData.adminScriptUrl;
                    if ( dashUrl ) {
                        var separator = dashUrl.indexOf( '?' ) !== -1 ? '&' : '?';
                        window.history.replaceState( {}, '', dashUrl + separator + 'view=dashboard' );
                    }
                }

                loadDashboardData();
            } else {
                if ( dashboardView ) {
                    dashboardView.classList.remove( 'sw-view-active' );
                    dashboardView.classList.add( 'sw-view-hidden' );
                }
                if ( editorView ) {
                    editorView.classList.remove( 'sw-view-hidden' );
                    editorView.classList.add( 'sw-view-active' );
                }

                var scriptId = ( textarea && textarea.dataset.scriptId ) || ( window.scriptWriterData ? window.scriptWriterData.scriptId : 0 );
                if ( window.history.replaceState && window.scriptWriterData ) {
                    var editUrl = window.scriptWriterData.appUrl || window.scriptWriterData.adminScriptUrl;
                    if ( editUrl ) {
                        var separator = editUrl.indexOf( '?' ) !== -1 ? '&' : '?';
                        if ( scriptId && parseInt( scriptId, 10 ) > 0 ) {
                            editUrl += separator + 'script_id=' + scriptId;
                        } else {
                            editUrl += separator + 'view=editor';
                        }
                        window.history.replaceState( {}, '', editUrl );
                    }
                }

                if ( textarea ) {
                    placeCursorAtEnd( textarea );
                    updateStats();
                }
                updateVisibilityUI( currentVisibility );

                if ( window.Andika && typeof window.Andika.emit === 'function' ) {
                    window.Andika.emit( 'change', {
                        text: textarea ? textarea.value : '',
                        scriptId: scriptId,
                        title: titleInput ? titleInput.value : ''
                    } );
                }
            }
        }

        // 2. Initial State & Auto-Focus
        function placeCursorAtEnd( el ) {
            el.focus();
            var len = el.value.length;
            el.setSelectionRange( len, len );
        }

        var isProd = window.scriptWriterData && window.scriptWriterData.isProductionEnabled;
        var activeId = ( textarea && textarea.dataset.scriptId ) ? parseInt( textarea.dataset.scriptId, 10 ) : ( ( window.scriptWriterData && window.scriptWriterData.scriptId ) ? parseInt( window.scriptWriterData.scriptId, 10 ) : 0 );

        if ( isProd && ! activeId ) {
            // Production extension enabled & on default canvas: seed dummy script
            var dummy = ( window.scriptWriterData.movieProduction && window.scriptWriterData.movieProduction.dummyScript ) || '';
            if ( dummy && ( ! textarea.value || textarea.value.trim() === '' ) ) {
                textarea.value = dummy;
            }
            if ( titleInput && ( ! titleInput.value || titleInput.value === 'Untitled' ) ) {
                titleInput.value = 'Midnight Protocol';
            }
            if ( statActiveTitle && ( ! statActiveTitle.textContent || statActiveTitle.textContent === 'Untitled' ) ) {
                statActiveTitle.textContent = 'Midnight Protocol';
            }
            try { localStorage.removeItem( storageKey ); } catch ( e ) {}
        } else {
            var localDraft = null;
            try {
                localDraft = localStorage.getItem( storageKey );
            } catch ( e ) {}

            if ( localDraft !== null && localDraft.length > 0 && textarea && textarea.value.trim() === '' ) {
                textarea.value = localDraft;
            }
        }

        if ( currentView === 'dashboard' ) {
            switchView( 'dashboard' );
        } else if ( currentView === 'auth' ) {
            switchView( 'auth' );
        } else {
            if ( textarea ) {
                placeCursorAtEnd( textarea );
                updateStats();
            }
        }

        if ( screen ) {
            screen.addEventListener( 'click', function( e ) {
                var isModalOpen = exportModal && exportModal.classList.contains( 'open' );
                if (
                    currentView === 'editor' &&
                    ! isModalOpen &&
                    ! e.target.closest( '#script-writer-toolbar' ) &&
                    ! e.target.closest( '.sw-modal-overlay' ) &&
                    ! e.target.closest( '#script-writer-context-menu' ) &&
                    ! e.target.closest( '#script-writer-dropdown' ) &&
                    e.target !== textarea
                ) {
                    textarea.focus();
                }
            } );
        }

        // 3. Formatting Helpers
        function wrapSelection( before, after ) {
            var start = textarea.selectionStart;
            var end = textarea.selectionEnd;
            var text = textarea.value;
            var selected = text.substring( start, end );

            if ( selected.length > 0 ) {
                var replacement = before + selected + after;
                textarea.value = text.substring( 0, start ) + replacement + text.substring( end );
                textarea.selectionStart = start + before.length;
                textarea.selectionEnd = end + before.length;
            } else {
                textarea.value = text.substring( 0, start ) + before + after + text.substring( end );
                textarea.selectionStart = textarea.selectionEnd = start + before.length;
            }
            textarea.focus();
            triggerAutoSave();
            updateStats();
        }

        function toggleLinePrefix( prefix ) {
            var start = textarea.selectionStart;
            var end = textarea.selectionEnd;
            var text = textarea.value;

            var lineStart = text.lastIndexOf( '\n', start - 1 ) + 1;
            var lineEnd = text.indexOf( '\n', end );
            if ( lineEnd === -1 ) lineEnd = text.length;

            var block = text.substring( lineStart, lineEnd );
            var lines = block.split( '\n' );
            var allHavePrefix = lines.every( function( line ) {
                return line.startsWith( prefix );
            } );

            var modified = lines.map( function( line ) {
                return allHavePrefix ? line.substring( prefix.length ) : prefix + line;
            } ).join( '\n' );

            textarea.value = text.substring( 0, lineStart ) + modified + text.substring( lineEnd );
            textarea.selectionStart = lineStart;
            textarea.selectionEnd = lineStart + modified.length;
            textarea.focus();
            triggerAutoSave();
            updateStats();
        }

        function cycleHeading() {
            var start = textarea.selectionStart;
            var end = textarea.selectionEnd;
            var text = textarea.value;

            var lineStart = text.lastIndexOf( '\n', start - 1 ) + 1;
            var lineEnd = text.indexOf( '\n', end );
            if ( lineEnd === -1 ) lineEnd = text.length;

            var line = text.substring( lineStart, lineEnd );
            var newLine;

            if ( line.startsWith( '### ' ) ) {
                newLine = line.substring( 4 );
            } else if ( line.startsWith( '## ' ) ) {
                newLine = '### ' + line.substring( 3 );
            } else if ( line.startsWith( '# ' ) ) {
                newLine = '## ' + line.substring( 2 );
            } else {
                newLine = '# ' + line;
            }

            textarea.value = text.substring( 0, lineStart ) + newLine + text.substring( lineEnd );
            textarea.selectionStart = lineStart;
            textarea.selectionEnd = lineStart + newLine.length;
            textarea.focus();
            triggerAutoSave();
            updateStats();
        }

        function toggleCase() {
            var start = textarea.selectionStart;
            var end = textarea.selectionEnd;
            var text = textarea.value;
            var selected = text.substring( start, end );

            if ( selected.length === 0 ) {
                var lineStart = text.lastIndexOf( '\n', start - 1 ) + 1;
                var lineEnd = text.indexOf( '\n', end );
                if ( lineEnd === -1 ) lineEnd = text.length;
                selected = text.substring( lineStart, lineEnd );
                var isUpper = ( selected === selected.toUpperCase() );
                var transformed = isUpper ? selected.toLowerCase() : selected.toUpperCase();
                textarea.value = text.substring( 0, lineStart ) + transformed + text.substring( lineEnd );
                textarea.selectionStart = lineStart;
                textarea.selectionEnd = lineStart + transformed.length;
            } else {
                var isUpper = ( selected === selected.toUpperCase() );
                var transformed = isUpper ? selected.toLowerCase() : selected.toUpperCase();
                textarea.value = text.substring( 0, start ) + transformed + text.substring( end );
                textarea.selectionStart = start;
                textarea.selectionEnd = start + transformed.length;
            }
            textarea.focus();
            triggerAutoSave();
            updateStats();
        }

        function indentLines( isIndent ) {
            var start = textarea.selectionStart;
            var end = textarea.selectionEnd;
            var text = textarea.value;

            var lineStart = text.lastIndexOf( '\n', start - 1 ) + 1;
            var lineEnd = text.indexOf( '\n', end );
            if ( lineEnd === -1 ) lineEnd = text.length;

            var block = text.substring( lineStart, lineEnd );
            var lines = block.split( '\n' );

            var modified = lines.map( function( line ) {
                if ( isIndent ) {
                    return '    ' + line;
                } else {
                    return line.replace( /^ {1,4}/, '' );
                }
            } ).join( '\n' );

            textarea.value = text.substring( 0, lineStart ) + modified + text.substring( lineEnd );
            textarea.selectionStart = lineStart;
            textarea.selectionEnd = lineStart + modified.length;
            textarea.focus();
            triggerAutoSave();
            updateStats();
        }

        function formatCode() {
            var start = textarea.selectionStart;
            var end = textarea.selectionEnd;
            var text = textarea.value;
            var selected = text.substring( start, end );

            if ( selected.indexOf( '\n' ) !== -1 ) {
                wrapSelection( '```\n', '\n```' );
            } else {
                wrapSelection( '`', '`' );
            }
        }

        function copyScript() {
            var start = textarea ? textarea.selectionStart : 0;
            var end = textarea ? textarea.selectionEnd : 0;
            var isSelected = ( textarea && typeof start === 'number' && typeof end === 'number' && start !== end );
            var textToCopy = isSelected ? textarea.value.substring( start, end ) : ( textarea ? textarea.value : '' );

            if ( navigator.clipboard && window.isSecureContext ) {
                navigator.clipboard.writeText( textToCopy ).then( function() {
                    showToast( isSelected ? 'Copied selection to clipboard' : 'Copied writing to clipboard' );
                } );
            } else {
                if ( ! isSelected && textarea ) {
                    textarea.select();
                }
                document.execCommand( 'copy' );
                showToast( isSelected ? 'Copied selection to clipboard' : 'Copied writing to clipboard' );
            }
        }

        // 4. Explicit Script Saving
        var activeScriptSeq = 0;
        var isCreatingNewScript = false;

        function silentSaveScript( scriptId, title, content, visibility ) {
            if ( ! window.scriptWriterData || ! scriptId ) return;
            var fd = new FormData();
            fd.append( 'action', 'script_writer_save_script' );
            fd.append( 'nonce', window.scriptWriterData.nonce );
            fd.append( 'script_id', scriptId );
            fd.append( 'title', title || 'Untitled' );
            fd.append( 'content', content || '' );
            fd.append( 'visibility', visibility || 'private' );

            fetch( window.scriptWriterData.ajaxUrl, {
                method: 'POST',
                body: fd,
                credentials: 'same-origin'
            } ).catch( function() {} );
        }

        function saveScriptExplicitly( callback ) {
            if ( typeof window.scriptWriterData === 'undefined' ) {
                if ( callback ) callback();
                return;
            }

            var seq = activeScriptSeq;
            var title = ( titleInput && titleInput.value.trim().length > 0 )
                ? titleInput.value.trim()
                : 'Untitled';

            var content = textarea.value;
            var scriptId = textarea.dataset.scriptId || window.scriptWriterData.scriptId || 0;

            if ( saveBtn ) {
                saveBtn.textContent = 'Saving...';
            }
            if ( statusEl ) {
                statusEl.textContent = 'saving...';
                statusEl.className = 'sw-status active';
            }

            var fd = new FormData();
            fd.append( 'action', 'script_writer_save_script' );
            fd.append( 'nonce', window.scriptWriterData.nonce );
            fd.append( 'script_id', scriptId );
            fd.append( 'title', title );
            fd.append( 'content', content );
            fd.append( 'visibility', currentVisibility );

            fetch( window.scriptWriterData.ajaxUrl, {
                method: 'POST',
                body: fd,
                credentials: 'same-origin'
            } )
            .then( function( res ) { return res.json(); } )
            .then( function( res ) {
                // If user switched scripts or clicked New in the meantime, discard stale callback!
                if ( seq !== activeScriptSeq ) {
                    if ( callback ) callback();
                    return;
                }

                if ( res.success && res.data ) {
                    var newId = res.data.script_id;
                    textarea.dataset.scriptId = newId;
                    window.scriptWriterData.scriptId = newId;

                    if ( titleInput ) {
                        titleInput.value = res.data.title;
                    }
                    if ( statActiveTitle ) {
                        statActiveTitle.textContent = res.data.title;
                    }
                    if ( res.data.visibility ) {
                        currentVisibility = res.data.visibility;
                        updateVisibilityUI( currentVisibility );
                    }

                    var appUrl = window.scriptWriterData.appUrl || window.scriptWriterData.adminScriptUrl;
                    if ( currentView === 'editor' && window.history.replaceState && appUrl ) {
                        var sep = appUrl.indexOf( '?' ) !== -1 ? '&' : '?';
                        window.history.replaceState(
                            {},
                            '',
                            appUrl + sep + 'script_id=' + newId
                        );
                    }

                    // Invalidate dashboard initial data cache so dashboard re-fetches updated list
                    window.scriptWriterInitialData = null;

                    if ( saveBtn ) {
                        saveBtn.textContent = 'Saved';
                        saveBtn.classList.add( 'saved' );
                        setTimeout( function() {
                            saveBtn.textContent = 'Save';
                            saveBtn.classList.remove( 'saved' );
                        }, 1800 );
                    }

                    if ( statusEl ) {
                        statusEl.textContent = 'saved';
                        statusEl.className = 'sw-status saved';
                    }

                    showToast( 'Saved "' + res.data.title + '"' );
                } else {
                    var errMsg = ( res.data && res.data.message ) ? res.data.message : 'Save error';
                    showToast( errMsg );
                    if ( saveBtn ) saveBtn.textContent = 'Save';
                }
                if ( callback ) callback();
            } )
            .catch( function() {
                if ( seq !== activeScriptSeq ) {
                    if ( callback ) callback();
                    return;
                }
                showToast( 'Connection error while saving' );
                if ( saveBtn ) saveBtn.textContent = 'Save';
                if ( callback ) callback();
            } );
        }

        function createNewScript( callback ) {
            if ( isCreatingNewScript ) return;
            isCreatingNewScript = true;

            // Invalidate pending save callbacks so they can never overwrite new writing UI
            activeScriptSeq++;
            var mySeq = activeScriptSeq;

            clearTimeout( saveTimeout );

            // If existing writing has content and an ID, save it silently in the background
            var prevId = parseInt( textarea.dataset.scriptId || ( window.scriptWriterData ? window.scriptWriterData.scriptId : 0 ), 10 );
            var prevContent = textarea.value;
            var prevTitle = ( titleInput && titleInput.value.trim().length > 0 ) ? titleInput.value.trim() : 'Untitled';

            if ( prevId > 0 && prevContent.trim().length > 0 ) {
                silentSaveScript( prevId, prevTitle, prevContent, currentVisibility );
            }

            // Immediately clear the UI (0ms instant response)
            delete textarea.dataset.scriptId;
            if ( window.scriptWriterData ) {
                window.scriptWriterData.scriptId = 0;
            }

            currentVisibility = 'private';
            updateVisibilityUI( 'private' );

            if ( titleInput ) {
                titleInput.value = 'Untitled';
            }
            if ( statActiveTitle ) {
                statActiveTitle.textContent = 'Untitled';
            }

            textarea.value = '';

            try {
                localStorage.removeItem( storageKey );
            } catch ( err ) {}

            var appUrl = window.scriptWriterData ? ( window.scriptWriterData.appUrl || window.scriptWriterData.adminScriptUrl ) : '';
            if ( currentView === 'editor' && window.history.replaceState && appUrl ) {
                window.history.replaceState( {}, '', appUrl );
            }

            placeCursorAtEnd( textarea );
            updateStats();

            // Notify extensions immediately of the cleared canvas
            if ( window.Andika && typeof window.Andika.emit === 'function' ) {
                window.Andika.emit( 'change', { text: '', scriptId: 0, title: 'Untitled' } );
            }

            // Invalidate initial dashboard data cache so dashboard re-fetches immediately
            window.scriptWriterInitialData = null;

            // Immediately create a real writing post on the server
            if ( window.scriptWriterData && window.scriptWriterData.isLoggedIn ) {
                var fd = new FormData();
                fd.append( 'action', 'script_writer_create_script' );
                fd.append( 'nonce', window.scriptWriterData.nonce );
                fd.append( 'title', 'Untitled' );
                fd.append( 'content', '' );

                fetch( window.scriptWriterData.ajaxUrl, {
                    method: 'POST',
                    body: fd,
                    credentials: 'same-origin'
                } )
                .then( function( res ) { return res.json(); } )
                .then( function( res ) {
                    isCreatingNewScript = false;
                    if ( mySeq !== activeScriptSeq ) return;

                    if ( res.success && res.data ) {
                        var newId = res.data.script_id;
                        textarea.dataset.scriptId = newId;
                        window.scriptWriterData.scriptId = newId;

                        if ( window.Andika && typeof window.Andika.emit === 'function' ) {
                            window.Andika.emit( 'change', {
                                text: textarea.value,
                                scriptId: newId,
                                title: titleInput ? titleInput.value : 'Untitled'
                            } );
                        }

                        if ( currentView === 'editor' && window.history.replaceState && appUrl ) {
                            var sep = appUrl.indexOf( '?' ) !== -1 ? '&' : '?';
                            window.history.replaceState( {}, '', appUrl + sep + 'script_id=' + newId );
                        }

                        // Add placeholder to dashboardMyScripts so it shows immediately if user switches to dashboard
                        if ( typeof dashboardMyScripts !== 'undefined' && Array.isArray( dashboardMyScripts ) ) {
                            dashboardMyScripts.unshift( {
                                id: newId,
                                title: 'Untitled',
                                preview: '',
                                content: '',
                                words: 0,
                                lines: 0,
                                visibility: 'private',
                                author_name: window.scriptWriterData.currentUser ? window.scriptWriterData.currentUser.name : 'You',
                                is_author: true,
                                time: res.data.time || 'just now',
                                date: res.data.date || 'Today'
                            } );
                            if ( typeof tabMyCount !== 'undefined' && tabMyCount ) {
                                tabMyCount.textContent = dashboardMyScripts.length;
                            }
                        }

                        showToast( 'New writing created' );
                        if ( typeof callback === 'function' ) callback( newId );
                    } else {
                        showToast( 'New writing ready' );
                        if ( typeof callback === 'function' ) callback( 0 );
                    }
                } )
                .catch( function() {
                    isCreatingNewScript = false;
                    showToast( 'New writing ready' );
                    if ( typeof callback === 'function' ) callback( 0 );
                } );
            } else {
                isCreatingNewScript = false;
                showToast( 'New writing ready' );
                if ( typeof callback === 'function' ) callback( 0 );
            }
        }

        // 4b. Format Action Executor (Shared between Top Toolbar and Right-Click Context Menu)
        function executeFormatAction( action ) {
            switch ( action ) {
                case 'bold':
                    wrapSelection( '**', '**' );
                    break;
                case 'italic':
                    wrapSelection( '*', '*' );
                    break;
                case 'heading':
                    cycleHeading();
                    break;
                case 'uppercase':
                    toggleCase();
                    break;
                case 'code':
                    formatCode();
                    break;
                case 'quote':
                    toggleLinePrefix( '> ' );
                    break;
                case 'bullet':
                    toggleLinePrefix( '- ' );
                    break;
                case 'comment':
                    toggleLinePrefix( '// ' );
                    break;
                case 'indent':
                    indentLines( true );
                    break;
                case 'outdent':
                    indentLines( false );
                    break;
                case 'copy':
                case 'copy':
                    copyScript();
                    break;
                case 'save':
                    saveScriptExplicitly();
                    break;
                case 'review-note':
                    triggerReviewNoteFromSelection();
                    break;
            }
        }

        // 4c. Floating Right-Click Quick Tools Helpers
        function showContextMenu( x, y ) {
            if ( ! ctxMenu || currentView !== 'editor' ) return;

            ctxMenu.style.display = 'block';
            ctxMenu.classList.add( 'visible' );

            var menuWidth = ctxMenu.offsetWidth || 380;
            var menuHeight = ctxMenu.offsetHeight || 36;
            var padding = 10;

            var posX = x + 2;
            var posY = y + 4; // adjacent to blinking cursor / mouse pointer

            // Prevent overflowing screen edges
            if ( posX + menuWidth > window.innerWidth - padding ) {
                posX = window.innerWidth - menuWidth - padding;
            }
            if ( posX < padding ) {
                posX = padding;
            }

            if ( posY + menuHeight > window.innerHeight - padding ) {
                posY = y - menuHeight - 6; // Flip above caret if near bottom
            }
            if ( posY < padding ) {
                posY = padding;
            }

            ctxMenu.style.left = posX + 'px';
            ctxMenu.style.top = posY + 'px';
        }

        function hideContextMenu() {
            if ( ! ctxMenu ) return;
            ctxMenu.style.display = 'none';
            ctxMenu.classList.remove( 'visible' );
        }

        // ---------------------------------------------------------------------
        // 4c-1. In-Context Review Notes (Icon-Free Minimal Line Pills · 1)
        // ---------------------------------------------------------------------
        function getActiveScriptId() {
            var elId = textarea ? textarea.getAttribute( 'data-script-id' ) : 0;
            return parseInt( elId, 10 ) || ( window.scriptWriterData ? window.scriptWriterData.scriptId : 0 ) || 0;
        }

        function triggerReviewNoteFromSelection() {
            if ( ! textarea ) return;
            var start = textarea.selectionStart || 0;
            var end = textarea.selectionEnd || 0;
            var textBefore = textarea.value.substring( 0, start );
            var line = ( textBefore.match( /\n/g ) || [] ).length + 1;
            var quote = textarea.value.substring( start, end ).trim();
            if ( ! quote ) {
                var lines = textarea.value.split( '\n' );
                quote = ( lines[ line - 1 ] || '' ).trim();
            }
            if ( quote.length > 80 ) {
                quote = quote.substring( 0, 77 ) + '...';
            }
            openNotePopover( line, quote );
        }

        function openNotePopover( line, quote ) {
            if ( ! reviewPopover || ! textarea ) return;
            activeNotePopoverTarget = { line: line, quote: quote };

            if ( reviewPopoverQuote ) {
                if ( quote ) {
                    reviewPopoverQuote.textContent = quote;
                    reviewPopoverQuote.style.display = 'block';
                } else {
                    reviewPopoverQuote.style.display = 'none';
                }
            }
            if ( reviewPopoverText ) {
                reviewPopoverText.value = '';
            }

            var basePadTop = 72;
            var lineHeight = 31.5;
            var targetY = basePadTop + ( ( line - 1 ) * lineHeight ) - textarea.scrollTop;
            targetY = Math.max( 80, Math.min( window.innerHeight - 240, targetY ) );

            reviewPopover.style.top = targetY + 'px';
            reviewPopover.style.right = '90px';
            reviewPopover.style.display = 'block';

            setTimeout( function() {
                if ( reviewPopoverText ) reviewPopoverText.focus();
            }, 60 );
        }

        function closeReviewPopover() {
            if ( reviewPopover ) {
                reviewPopover.style.display = 'none';
            }
            activeNotePopoverTarget = null;
        }

        function submitReviewNote() {
            if ( ! reviewPopoverText || ! activeNotePopoverTarget ) return;
            var text = reviewPopoverText.value.trim();
            if ( ! text ) {
                showToast( 'Note cannot be empty' );
                return;
            }

            var scriptId = getActiveScriptId();
            if ( ! scriptId ) {
                showToast( 'Save writing first to attach notes' );
                return;
            }

            var formData = new FormData();
            formData.append( 'action', 'script_writer_save_comment' );
            formData.append( 'nonce', ( window.scriptWriterData && window.scriptWriterData.nonce ) || '' );
            formData.append( 'script_id', scriptId );
            formData.append( 'line', activeNotePopoverTarget.line );
            formData.append( 'quote', activeNotePopoverTarget.quote || '' );
            formData.append( 'text', text );

            fetch( window.scriptWriterData.ajaxUrl, {
                method: 'POST',
                body: formData
            } )
            .then( function( r ) { return r.json(); } )
            .then( function( res ) {
                if ( res.success && res.data && res.data.comments ) {
                    currentComments = res.data.comments;
                    updateNotesUi();
                    closeReviewPopover();
                    showToast( 'Review note posted' );
                } else {
                    showToast( ( res.data && res.data.message ) || 'Error saving note' );
                }
            } )
            .catch( function( err ) {
                console.error( err );
                showToast( 'Error connecting to server' );
            } );
        }

        function loadComments( scriptId ) {
            if ( ! scriptId || ! window.scriptWriterData ) {
                currentComments = [];
                updateNotesUi();
                return;
            }
            fetch( window.scriptWriterData.ajaxUrl + '?action=script_writer_get_comments&script_id=' + scriptId + '&nonce=' + ( window.scriptWriterData.nonce || '' ) )
                .then( function( r ) { return r.json(); } )
                .then( function( res ) {
                    if ( res.success && res.data && res.data.comments ) {
                        currentComments = res.data.comments;
                        updateNotesUi();
                    }
                } )
                .catch( function( e ) { console.warn( 'Could not load comments', e ); } );
        }

        function resolveComment( commentId, resolved ) {
            var scriptId = getActiveScriptId();
            if ( ! scriptId || ! window.scriptWriterData ) return;
            var fd = new FormData();
            fd.append( 'action', 'script_writer_resolve_comment' );
            fd.append( 'nonce', window.scriptWriterData.nonce || '' );
            fd.append( 'script_id', scriptId );
            fd.append( 'comment_id', commentId );
            fd.append( 'resolved', resolved ? '1' : '0' );

            fetch( window.scriptWriterData.ajaxUrl, { method: 'POST', body: fd } )
                .then( function( r ) { return r.json(); } )
                .then( function( res ) {
                    if ( res.success && res.data && res.data.comments ) {
                        currentComments = res.data.comments;
                        updateNotesUi();
                    }
                } );
        }

        function deleteComment( commentId ) {
            var scriptId = getActiveScriptId();
            if ( ! scriptId || ! window.scriptWriterData ) return;
            var fd = new FormData();
            fd.append( 'action', 'script_writer_delete_comment' );
            fd.append( 'nonce', window.scriptWriterData.nonce || '' );
            fd.append( 'script_id', scriptId );
            fd.append( 'comment_id', commentId );

            fetch( window.scriptWriterData.ajaxUrl, { method: 'POST', body: fd } )
                .then( function( r ) { return r.json(); } )
                .then( function( res ) {
                    if ( res.success && res.data && res.data.comments ) {
                        currentComments = res.data.comments;
                        updateNotesUi();
                        showToast( 'Note deleted' );
                    }
                } );
        }

        function updateNotesUi() {
            var total = ( currentComments || [] ).length;
            var activeCount = ( currentComments || [] ).filter( function( c ) { return ! c.resolved; } ).length;

            if ( notesToggleBtn ) {
                if ( total > 0 ) {
                    notesToggleBtn.style.display = 'inline-flex';
                    if ( notesTotalCount ) notesTotalCount.textContent = activeCount;
                } else {
                    notesToggleBtn.style.display = 'none';
                }
            }
            if ( reviewDrawerCount ) {
                reviewDrawerCount.textContent = total + ( total === 1 ? ' note' : ' notes' );
            }

            renderReviewGutter();
            renderReviewDrawerList();
        }

        function renderReviewGutter() {
            if ( ! reviewGutter || ! textarea ) return;
            reviewGutter.innerHTML = '';

            var scrollTop = textarea.scrollTop;
            var clientHeight = textarea.clientHeight;
            var basePadTop = 72;
            var lineHeight = 31.5;

            // 1. Hollywood Revision Marks (*) when Track Changes is ON
            if ( isTrackChangesActive && changedLineIndices.size > 0 ) {
                changedLineIndices.forEach( function( lineIdx ) {
                    var topPos = basePadTop + ( lineIdx * lineHeight ) - scrollTop;
                    if ( topPos >= 40 && topPos <= clientHeight - 20 ) {
                        var mark = document.createElement( 'div' );
                        mark.className = 'sw-rev-mark';
                        mark.textContent = '*';
                        mark.title = 'Revision on line ' + ( lineIdx + 1 );
                        mark.style.top = topPos + 'px';
                        reviewGutter.appendChild( mark );
                    }
                } );
            }

            // 2. Icon-Free Minimal Line Pills (· 1)
            if ( currentComments && currentComments.length > 0 ) {
                var lineMap = {};
                currentComments.forEach( function( c ) {
                    var l = c.line || 1;
                    if ( ! lineMap[ l ] ) lineMap[ l ] = [];
                    lineMap[ l ].push( c );
                } );

                Object.keys( lineMap ).forEach( function( lineStr ) {
                    var lineNum = parseInt( lineStr, 10 );
                    var lineIdx = Math.max( 0, lineNum - 1 );
                    var topPos = basePadTop + ( lineIdx * lineHeight ) - scrollTop;

                    if ( topPos >= 40 && topPos <= clientHeight - 20 ) {
                        var notesOnLine = lineMap[ lineStr ];
                        var allResolved = notesOnLine.every( function( n ) { return n.resolved; } );
                        var pill = document.createElement( 'div' );
                        pill.className = 'sw-line-pill' + ( allResolved ? ' resolved' : '' );
                        pill.textContent = '· ' + notesOnLine.length;
                        pill.title = notesOnLine.length + ( notesOnLine.length === 1 ? ' note' : ' notes' ) + ' on line ' + lineNum;
                        pill.style.top = ( topPos + 4 ) + 'px';

                        pill.addEventListener( 'click', function( e ) {
                            e.stopPropagation();
                            openReviewDrawer();
                            highlightNoteInDrawer( lineNum );
                        } );

                        reviewGutter.appendChild( pill );
                    }
                } );
            }
        }

        function openReviewDrawer() {
            if ( reviewDrawer ) reviewDrawer.classList.add( 'active' );
            renderReviewDrawerList();
        }

        function closeReviewDrawer() {
            if ( reviewDrawer ) reviewDrawer.classList.remove( 'active' );
        }

        function renderReviewDrawerList() {
            if ( ! reviewDrawerList ) return;
            if ( ! currentComments || currentComments.length === 0 ) {
                reviewDrawerList.innerHTML = '<div class="sw-drawer-empty">No review notes on this writing yet.<br>Right-click text or press Alt+C to add a note.</div>';
                return;
            }

            var sorted = currentComments.slice().sort( function( a, b ) {
                return ( a.line || 1 ) - ( b.line || 1 );
            } );

            var html = '';
            sorted.forEach( function( c ) {
                var isRes = !! c.resolved;
                html += '<div class="sw-note-card' + ( isRes ? ' resolved' : '' ) + '" id="sw-note-' + escapeHtml( c.id ) + '" data-line="' + c.line + '">' +
                    '<div class="sw-note-header">' +
                        '<span class="sw-note-author">' + escapeHtml( c.author || 'Reviewer' ) + '</span>' +
                        '<span class="sw-note-line">Line ' + ( c.line || 1 ) + '</span>' +
                    '</div>';
                if ( c.quote ) {
                    html += '<div class="sw-note-quote">“' + escapeHtml( c.quote ) + '”</div>';
                }
                html += '<div class="sw-note-text">' + escapeHtml( c.text || '' ) + '</div>' +
                    '<div class="sw-note-actions">' +
                        '<button type="button" class="sw-note-btn sw-note-btn-jump" data-line="' + ( c.line || 1 ) + '">Jump</button>' +
                        '<button type="button" class="sw-note-btn sw-note-btn-res" data-id="' + escapeHtml( c.id ) + '" data-res="' + ( isRes ? '0' : '1' ) + '">' + ( isRes ? 'Reopen' : 'Resolve' ) + '</button>' +
                        '<button type="button" class="sw-note-btn sw-note-btn-danger" data-id="' + escapeHtml( c.id ) + '">Delete</button>' +
                    '</div>' +
                '</div>';
            } );

            reviewDrawerList.innerHTML = html;

            reviewDrawerList.querySelectorAll( '.sw-note-btn-jump' ).forEach( function( b ) {
                b.addEventListener( 'click', function() {
                    var l = parseInt( this.getAttribute( 'data-line' ), 10 ) || 1;
                    jumpToLine( l );
                } );
            } );
            reviewDrawerList.querySelectorAll( '.sw-note-btn-res' ).forEach( function( b ) {
                b.addEventListener( 'click', function() {
                    var id = this.getAttribute( 'data-id' );
                    var res = this.getAttribute( 'data-res' ) === '1';
                    resolveComment( id, res );
                } );
            } );
            reviewDrawerList.querySelectorAll( '.sw-note-btn-danger' ).forEach( function( b ) {
                b.addEventListener( 'click', function() {
                    var id = this.getAttribute( 'data-id' );
                    if ( confirm( 'Delete this review note?' ) ) {
                        deleteComment( id );
                    }
                } );
            } );
        }

        function highlightNoteInDrawer( line ) {
            setTimeout( function() {
                var card = reviewDrawerList ? reviewDrawerList.querySelector( '.sw-note-card[data-line="' + line + '"]' ) : null;
                if ( card ) {
                    card.scrollIntoView( { behavior: 'smooth', block: 'center' } );
                    card.style.borderColor = '#38bdf8';
                    setTimeout( function() { card.style.borderColor = ''; }, 1500 );
                }
            }, 100 );
        }

        function jumpToLine( lineNum ) {
            if ( ! textarea ) return;
            var lines = textarea.value.split( '\n' );
            var targetIdx = Math.max( 0, lineNum - 1 );
            var charPos = 0;
            for ( var i = 0; i < targetIdx && i < lines.length; i++ ) {
                charPos += lines[ i ].length + 1;
            }
            textarea.focus();
            textarea.setSelectionRange( charPos, charPos );
            var lineHeight = 31.5;
            textarea.scrollTop = Math.max( 0, ( targetIdx * lineHeight ) - 120 );
            renderReviewGutter();
        }

        // ---------------------------------------------------------------------
        // 4c-2. Track Changes & Revisions Viewer (In Core Plugin)
        // ---------------------------------------------------------------------
        function toggleTrackChanges() {
            isTrackChangesActive = ! isTrackChangesActive;
            if ( isTrackChangesActive ) {
                baselineLines = textarea.value.split( '\n' );
                changedLineIndices.clear();
                if ( trackBtn ) trackBtn.classList.add( 'active' );
                showToast( 'Track Changes ON: Revision marks (*) active' );
            } else {
                changedLineIndices.clear();
                if ( trackBtn ) trackBtn.classList.remove( 'active' );
                showToast( 'Track Changes OFF' );
            }
            renderReviewGutter();
        }

        function updateTrackChangesDiff() {
            if ( ! isTrackChangesActive || ! textarea ) return;
            var curLines = textarea.value.split( '\n' );
            changedLineIndices.clear();
            for ( var i = 0; i < curLines.length; i++ ) {
                if ( i >= baselineLines.length || curLines[ i ] !== baselineLines[ i ] ) {
                    changedLineIndices.add( i );
                }
            }
        }

        function openRevisionsDrawer() {
            var scriptId = getActiveScriptId();
            if ( ! scriptId ) {
                showToast( 'Save writing first to see revisions' );
                return;
            }
            if ( revisionsDrawer ) revisionsDrawer.classList.add( 'active' );
            if ( revDiffWrap ) revDiffWrap.style.display = 'none';
            if ( revisionsList ) {
                revisionsList.style.display = 'flex';
                revisionsList.innerHTML = '<div class="sw-drawer-empty">Loading revisions...</div>';
            }

            fetch( window.scriptWriterData.ajaxUrl + '?action=script_writer_get_revisions&script_id=' + scriptId + '&nonce=' + ( window.scriptWriterData.nonce || '' ) )
                .then( function( r ) { return r.json(); } )
                .then( function( res ) {
                    if ( res.success && res.data && res.data.revisions && res.data.revisions.length > 0 ) {
                        currentRevisions = res.data.revisions;
                        renderRevisionsList();
                    } else {
                        if ( revisionsList ) revisionsList.innerHTML = '<div class="sw-drawer-empty">No past drafts saved yet.<br>Drafts are saved automatically as you write.</div>';
                    }
                } )
                .catch( function() {
                    if ( revisionsList ) revisionsList.innerHTML = '<div class="sw-drawer-empty">Could not load revisions.</div>';
                } );
        }

        function closeRevisionsDrawer() {
            if ( revisionsDrawer ) revisionsDrawer.classList.remove( 'active' );
        }

        function renderRevisionsList() {
            if ( ! revisionsList ) return;
            if ( revisionsCount ) revisionsCount.textContent = currentRevisions.length + ( currentRevisions.length === 1 ? ' draft' : ' drafts' );

            var html = '';
            currentRevisions.forEach( function( rev, idx ) {
                html += '<div class="sw-rev-item" data-rev-idx="' + idx + '">' +
                    '<div class="sw-rev-meta">' +
                        '<span class="sw-rev-date">' + escapeHtml( rev.humanDate || rev.date ) + '</span>' +
                        '<span class="sw-rev-author">' + escapeHtml( rev.author || 'Author' ) + '</span>' +
                    '</div>' +
                    '<div style="font-size:11px;color:#64748b;">' + escapeHtml( rev.date ) + ' &bull; ' + ( rev.content ? rev.content.split( /\s+/ ).length : 0 ) + ' words</div>' +
                '</div>';
            } );

            revisionsList.innerHTML = html;
            revisionsList.querySelectorAll( '.sw-rev-item' ).forEach( function( item ) {
                item.addEventListener( 'click', function() {
                    var idx = parseInt( this.getAttribute( 'data-rev-idx' ), 10 );
                    if ( currentRevisions[ idx ] ) {
                        showRevisionDiff( currentRevisions[ idx ] );
                    }
                } );
            } );
        }

        function showRevisionDiff( rev ) {
            activeDiffRevision = rev;
            if ( ! revDiffWrap || ! revDiffContent ) return;
            if ( revisionsList ) revisionsList.style.display = 'none';
            revDiffWrap.style.display = 'flex';
            var titleEl = document.getElementById( 'sw-rev-diff-title' );
            if ( titleEl ) titleEl.textContent = 'Diff vs ' + ( rev.humanDate || rev.date );

            var oldLines = ( rev.content || '' ).split( '\n' );
            var newLines = textarea.value.split( '\n' );
            revDiffContent.innerHTML = computeSimpleRedlineDiff( oldLines, newLines );
        }

        function computeSimpleRedlineDiff( oldLines, newLines ) {
            var html = '';
            var o = 0, n = 0;

            while ( o < oldLines.length || n < newLines.length ) {
                if ( o < oldLines.length && n < newLines.length && oldLines[ o ] === newLines[ n ] ) {
                    html += '<div style="color:#94a3b8;">  ' + escapeHtml( oldLines[ o ] || ' ' ) + '</div>';
                    o++;
                    n++;
                } else if ( o < oldLines.length && ( n >= newLines.length || ! newLines.includes( oldLines[ o ] ) ) ) {
                    html += '<div class="sw-diff-del">− ' + escapeHtml( oldLines[ o ] || ' ' ) + '</div>';
                    o++;
                } else if ( n < newLines.length ) {
                    html += '<div class="sw-diff-ins">+ ' + escapeHtml( newLines[ n ] || ' ' ) + '</div>';
                    n++;
                } else {
                    o++;
                    n++;
                }
            }
            return html;
        }

        function restoreActiveRevision() {
            if ( ! activeDiffRevision || ! textarea ) return;
            if ( confirm( 'Restore this draft? Current unsaved edits will be replaced.' ) ) {
                textarea.value = activeDiffRevision.content || '';
                saveScriptExplicitly();
                updateStats();
                closeRevisionsDrawer();
                showToast( 'Restored draft from ' + ( activeDiffRevision.humanDate || activeDiffRevision.date ) );
            }
        }

        // ---------------------------------------------------------------------
        // 4c-3. Modular Export Provider Architecture & Core Standard Manuscript
        // ---------------------------------------------------------------------
        function registerExportProvider( id, provider ) {
            exportProviders[ id ] = provider;
            if ( provider && provider.isDefault ) {
                activeExportProviderId = id;
            }
        }

        function unescapeHtml( str ) {
            if ( ! str ) return '';
            var txt = document.createElement( 'textarea' );
            txt.innerHTML = str;
            return txt.value;
        }

        function formatInlineMarkdown( text ) {
            if ( ! text ) return '';
            var esc = escapeHtml( text );
            esc = esc.replace( /\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>' );
            esc = esc.replace( /\*\*(.*?)\*\*/g, '<strong>$1</strong>' );
            esc = esc.replace( /\*(.*?)\*/g, '<em>$1</em>' );
            esc = esc.replace( /_([^_]+)_/g, '<u>$1</u>' );
            esc = esc.replace( /`([^`]+)`/g, '<code class="sc-code">$1</code>' );
            return esc;
        }

        function parseStandardManuscript( rawText, options ) {
            options = options || {};
            var clean = unescapeHtml( rawText || '' );
            var lines = clean.split( /\r?\n/ );
            var title = options.title || 'Untitled';
            var html = '';

            if ( options.includeTitlePage !== false ) {
                html += '<div class="sc-title-page" style="min-height:8in;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">' +
                    '<h1 style="font-size:22pt;text-transform:uppercase;margin-bottom:12pt;">' + escapeHtml( title ) + '</h1>' +
                    '<div style="font-size:12pt;color:#555;margin-bottom:30pt;">Manuscript</div>' +
                '</div><div class="sc-page-break"></div>';
            }

            for ( var i = 0; i < lines.length; i++ ) {
                var l = lines[ i ].trim();
                if ( ! l ) continue;
                if ( l.startsWith( '#' ) ) {
                    var headingText = l.replace( /^#+\s*/, '' );
                    html += '<h2 style="font-size:14pt;margin-top:18pt;margin-bottom:8pt;">' + escapeHtml( headingText ) + '</h2>';
                } else if ( l.startsWith( '> ' ) ) {
                    html += '<blockquote style="margin:10pt 0 10pt 20pt;font-style:italic;color:#333;">' + escapeHtml( l.substring( 2 ) ) + '</blockquote>';
                } else {
                    html += '<p style="margin:0 0 10pt 0;line-height:1.4;text-indent:0.5in;">' + formatInlineMarkdown( l ) + '</p>';
                }
            }
            return html;
        }

        function getStandardPrintCss( pageSize ) {
            var isA4 = ( pageSize === 'a4' );
            var sizeRule = isA4 ? '210mm 297mm' : 'letter portrait';
            return '@page { size: ' + sizeRule + '; margin: 1.0in; }' +
                '@media print { body { margin: 0; padding: 0; } .sc-page-break { page-break-before: always; break-before: page; height: 0; border: none; } }' +
                'html, body { background: #fff; color: #111; font-family: "Courier Prime", "Courier New", monospace; font-size: 12pt; line-height: 1.4; }';
        }

        // Register default Core Standard Manuscript
        registerExportProvider( 'standard', {
            id: 'standard',
            name: 'Standard Manuscript',
            tag: '12pt Submission Manuscript',
            sub: 'Distraction-Free Standard',
            isDefault: true,
            parse: parseStandardManuscript,
            getCss: getStandardPrintCss
        } );

        function parseScriptToManuscript( rawText, options ) {
            var provider = exportProviders[ activeExportProviderId ];
            if ( provider && typeof provider.parse === 'function' ) {
                return provider.parse( rawText, options );
            }
            return parseStandardManuscript( rawText, options );
        }

        function getPrintCss( style, pageSize ) {
            var provider = exportProviders[ activeExportProviderId ];
            if ( provider && typeof provider.getCss === 'function' ) {
                return provider.getCss( pageSize );
            }
            return getStandardPrintCss( pageSize );
        }

        var previewRafId = null;
        function updateManuscriptPreview() {
            var viewport = previewViewport || document.getElementById( 'sw-preview-viewport' );
            if ( ! viewport ) return;

            var pageSize = exportPageSizeSelect ? exportPageSizeSelect.value : 'letter';
            var includeTitlePage = exportOptTitlePage ? exportOptTitlePage.checked : true;
            var pageNumbers = exportOptPageNumbers ? exportOptPageNumbers.checked : true;
            var boldSlugs = exportOptBoldSlugs ? exportOptBoldSlugs.checked : true;
            var hideNotes = exportOptHideNotes ? exportOptHideNotes.checked : true;

            var options = {
                style: activeExportProviderId,
                pageSize: pageSize,
                includeTitlePage: includeTitlePage,
                pageNumbers: pageNumbers,
                boldSlugs: boldSlugs,
                hideNotes: hideNotes,
                title: currentExportTitle || 'Untitled'
            };

            var provider = exportProviders[ activeExportProviderId ];
            if ( provider && typeof provider.getExtraOptions === 'function' ) {
                var extraOpts = provider.getExtraOptions();
                for ( var k in extraOpts ) {
                    options[ k ] = extraOpts[ k ];
                }
            }

            // Smooth batch rendering via requestAnimationFrame to eliminate flicker and stutter
            if ( previewRafId ) {
                window.cancelAnimationFrame( previewRafId );
            }
            previewRafId = window.requestAnimationFrame( function() {
                var parsedHtml = parseScriptToManuscript( currentExportContent, options );
                var pageChunks = parsedHtml.split( '<div class="sc-page-break"></div>' ).filter( function( chunk ) {
                    return chunk.trim().length > 0;
                } );

                if ( pageChunks.length === 0 ) {
                    pageChunks = [ parsedHtml ];
                }

                var sheetsHtml = '';
                for ( var p = 0; p < pageChunks.length; p++ ) {
                    sheetsHtml += '<div class="sw-paper-sheet style-' + activeExportProviderId + ' pagesize-' + pageSize + '">' +
                        pageChunks[ p ] +
                    '</div>';
                }
                viewport.innerHTML = sheetsHtml;

                if ( previewPageCount ) {
                    previewPageCount.textContent = pageChunks.length + ( pageChunks.length === 1 ? ' page' : ' pages' );
                }
            } );
        }

        function printManuscriptPdf() {
            var pageSize = exportPageSizeSelect ? exportPageSizeSelect.value : 'letter';
            var includeTitlePage = exportOptTitlePage ? exportOptTitlePage.checked : true;
            var pageNumbers = exportOptPageNumbers ? exportOptPageNumbers.checked : true;
            var boldSlugs = exportOptBoldSlugs ? exportOptBoldSlugs.checked : true;
            var hideNotes = exportOptHideNotes ? exportOptHideNotes.checked : true;

            var options = {
                style: activeExportProviderId,
                pageSize: pageSize,
                includeTitlePage: includeTitlePage,
                pageNumbers: pageNumbers,
                boldSlugs: boldSlugs,
                hideNotes: hideNotes,
                title: currentExportTitle || 'Untitled'
            };

            var provider = exportProviders[ activeExportProviderId ];
            if ( provider && typeof provider.getExtraOptions === 'function' ) {
                var extraOpts = provider.getExtraOptions();
                for ( var k in extraOpts ) {
                    options[ k ] = extraOpts[ k ];
                }
            }

            var parsedHtml = parseScriptToManuscript( currentExportContent, options );
            var css = getPrintCss( activeExportProviderId, pageSize );

            showToast( 'Opening PDF print dialog...' );

            var iframe = document.getElementById( 'sw-print-iframe' );
            if ( ! iframe ) {
                iframe = document.createElement( 'iframe' );
                iframe.id = 'sw-print-iframe';
                iframe.style.position = 'fixed';
                iframe.style.right = '0';
                iframe.style.bottom = '0';
                iframe.style.width = '0';
                iframe.style.height = '0';
                iframe.style.border = '0';
                iframe.style.visibility = 'hidden';
                document.body.appendChild( iframe );
            }

            var doc = iframe.contentWindow.document;
            doc.open();
            doc.write( '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHtml( currentExportTitle || 'writing' ) + '</title><style>' + css + '</style></head><body>' + parsedHtml + '</body></html>' );
            doc.close();

            setTimeout( function() {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }, 250 );
        }

        function downloadManuscriptHtml() {
            var pageSize = exportPageSizeSelect ? exportPageSizeSelect.value : 'letter';
            var options = {
                style: activeExportProviderId,
                pageSize: pageSize,
                includeTitlePage: exportOptTitlePage ? exportOptTitlePage.checked : true,
                pageNumbers: exportOptPageNumbers ? exportOptPageNumbers.checked : true,
                boldSlugs: exportOptBoldSlugs ? exportOptBoldSlugs.checked : true,
                hideNotes: exportOptHideNotes ? exportOptHideNotes.checked : true,
                title: currentExportTitle || 'Untitled'
            };

            var provider = exportProviders[ activeExportProviderId ];
            if ( provider && typeof provider.getExtraOptions === 'function' ) {
                var extraOpts = provider.getExtraOptions();
                for ( var k in extraOpts ) {
                    options[ k ] = extraOpts[ k ];
                }
            }

            var parsedHtml = parseScriptToManuscript( currentExportContent, options );
            var css = getPrintCss( activeExportProviderId, pageSize );
            var fullHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHtml( currentExportTitle ) + ' - Manuscript</title><style>' + css + '</style></head><body style="padding: 20px;">' + parsedHtml + '</body></html>';

            var filename = ( currentExportTitle || 'writing' ).replace(/[^a-z0-9_\-]/gi, '_').toLowerCase() + '-manuscript.html';
            var blob = new Blob( [ fullHtml ], { type: 'text/html;charset=utf-8' } );
            var url = URL.createObjectURL( blob );
            var a = document.createElement( 'a' );
            a.href = url;
            a.download = filename;
            document.body.appendChild( a );
            a.click();
            document.body.removeChild( a );
            URL.revokeObjectURL( url );
            showToast( 'Exported ' + filename );
        }

        function openExportModal( title, content ) {
            currentExportTitle = title || ( titleInput ? titleInput.value.trim() : '' ) || 'Untitled';
            currentExportContent = ( typeof content === 'string' ) ? content : textarea.value;

            if ( exportTitleBadge ) {
                exportTitleBadge.textContent = currentExportTitle;
            }

            var provider = exportProviders[ activeExportProviderId ];
            if ( provider && typeof provider.onExportOpen === 'function' ) {
                provider.onExportOpen( {
                    title: currentExportTitle,
                    content: currentExportContent,
                    modal: exportModal,
                    updatePreview: updateManuscriptPreview
                } );
            }
            if ( window.Andika && typeof window.Andika.emit === 'function' ) {
                window.Andika.emit( 'export:open', { title: currentExportTitle, content: currentExportContent, modal: exportModal, updatePreview: updateManuscriptPreview } );
            }
            if ( previewViewport ) {
                previewViewport.scrollTop = 0;
            }

            updateManuscriptPreview();

            if ( exportModal ) {
                exportModal.classList.add( 'open' );
                exportModal.setAttribute( 'aria-hidden', 'false' );
            }
        }

        function closeExportModal() {
            if ( exportModal ) {
                exportModal.classList.remove( 'open' );
                exportModal.setAttribute( 'aria-hidden', 'true' );
            }
        }

        // 5. Scripts Quick Dropdown in Editor
        function toggleScriptsDropdown() {
            if ( ! dropdown ) return;
            var isOpen = dropdown.classList.contains( 'open' );
            if ( isOpen ) {
                dropdown.classList.remove( 'open' );
            } else {
                dropdown.classList.add( 'open' );
                fetchSavedScripts();
            }
        }

        function fetchSavedScripts() {
            if ( ! dropdownList ) return;

            // Instant memory cache hit
            if ( dashboardMyScripts && dashboardMyScripts.length > 0 ) {
                renderScriptsDropdown( dashboardMyScripts );
                return;
            }

            if ( window.scriptWriterInitialData && ( window.scriptWriterInitialData.my_scripts || window.scriptWriterInitialData.scripts ) ) {
                dashboardMyScripts = window.scriptWriterInitialData.my_scripts || window.scriptWriterInitialData.scripts;
                renderScriptsDropdown( dashboardMyScripts );
                return;
            }

            dropdownList.innerHTML = '<div class="sw-dropdown-loading">Loading...</div>';

            var fd = new FormData();
            fd.append( 'action', 'script_writer_get_scripts' );
            fd.append( 'nonce', window.scriptWriterData.nonce );

            fetch( window.scriptWriterData.ajaxUrl, {
                method: 'POST',
                body: fd,
                credentials: 'same-origin'
            } )
            .then( function( res ) { return res.json(); } )
            .then( function( res ) {
                if ( res.success && res.data && res.data.scripts ) {
                    dashboardMyScripts = res.data.scripts;
                    renderScriptsDropdown( res.data.scripts );
                } else {
                    dropdownList.innerHTML = '<div class="sw-dropdown-empty">No writings found</div>';
                }
            } )
            .catch( function() {
                dropdownList.innerHTML = '<div class="sw-dropdown-empty">Failed to load writings</div>';
            } );
        }

        function renderScriptsDropdown( scripts ) {
            if ( ! dropdownList ) return;
            if ( scripts.length === 0 ) {
                dropdownList.innerHTML = '<div class="sw-dropdown-empty">No saved writings yet</div>';
                return;
            }

            dropdownList.innerHTML = '';
            var currentId = parseInt( textarea.dataset.scriptId || window.scriptWriterData.scriptId || 0, 10 );

            scripts.forEach( function( s ) {
                var btn = document.createElement( 'button' );
                btn.type = 'button';
                btn.className = 'sw-dropdown-item' + ( s.id === currentId ? ' active' : '' );
                btn.dataset.id = s.id;

                var titleSpan = document.createElement( 'span' );
                titleSpan.className = 'sw-dropdown-item-title';
                titleSpan.textContent = s.title;

                var metaSpan = document.createElement( 'span' );
                metaSpan.className = 'sw-dropdown-item-meta';
                metaSpan.textContent = s.modified;

                btn.appendChild( titleSpan );
                btn.appendChild( metaSpan );

                btn.addEventListener( 'click', function() {
                    loadScriptById( s.id, function() {
                        if ( dropdown ) dropdown.classList.remove( 'open' );
                    } );
                } );

                dropdownList.appendChild( btn );
            } );
        }

        function loadScriptById( id, onComplete ) {
            activeScriptSeq++;
            var mySeq = activeScriptSeq;
            var appUrl = window.scriptWriterData ? ( window.scriptWriterData.appUrl || window.scriptWriterData.adminScriptUrl ) : '';

            // Instant 0ms cache load if available in memory
            for ( var i = 0; i < dashboardScripts.length; i++ ) {
                if ( dashboardScripts[i].id == id && typeof dashboardScripts[i].content === 'string' ) {
                    var cached = dashboardScripts[i];
                    textarea.value = cached.content;
                    textarea.dataset.scriptId = cached.id;
                    if ( window.scriptWriterData ) {
                        window.scriptWriterData.scriptId = cached.id;
                    }
                    if ( titleInput ) {
                        titleInput.value = cached.title;
                    }
                    if ( statActiveTitle ) {
                        statActiveTitle.textContent = cached.title;
                    }
                    if ( cached.visibility ) {
                        currentVisibility = cached.visibility;
                        updateVisibilityUI( currentVisibility );
                    }
                    if ( currentView === 'editor' && window.history.replaceState && appUrl ) {
                        var sep = appUrl.indexOf( '?' ) !== -1 ? '&' : '?';
                        window.history.replaceState(
                            {},
                            '',
                            appUrl + sep + 'script_id=' + cached.id
                        );
                    }
                    placeCursorAtEnd( textarea );
                    updateStats();
                    showToast( 'Loaded: "' + cached.title + '"' );
                    window.Andika.emit( 'load', { id: cached.id, title: cached.title, content: cached.content } );
                    if ( onComplete ) onComplete();
                    return;
                }
            }

            if ( typeof window.scriptWriterData === 'undefined' ) return;

            showToast( 'Loading writing...' );

            var fd = new FormData();
            fd.append( 'action', 'script_writer_load_script' );
            fd.append( 'nonce', window.scriptWriterData.nonce );
            fd.append( 'script_id', id );

            fetch( window.scriptWriterData.ajaxUrl, {
                method: 'POST',
                body: fd,
                credentials: 'same-origin'
            } )
            .then( function( res ) { return res.json(); } )
            .then( function( res ) {
                if ( mySeq !== activeScriptSeq ) return;

                if ( res.success && res.data ) {
                    textarea.value = res.data.content;
                    textarea.dataset.scriptId = res.data.id;
                    window.scriptWriterData.scriptId = res.data.id;

                    if ( titleInput ) {
                        titleInput.value = res.data.title;
                    }
                    if ( statActiveTitle ) {
                        statActiveTitle.textContent = res.data.title;
                    }
                    if ( res.data.visibility ) {
                        currentVisibility = res.data.visibility;
                        updateVisibilityUI( currentVisibility );
                    }

                    if ( currentView === 'editor' && window.history.replaceState && appUrl ) {
                        var sep = appUrl.indexOf( '?' ) !== -1 ? '&' : '?';
                        window.history.replaceState(
                            {},
                            '',
                            appUrl + sep + 'script_id=' + res.data.id
                        );
                    }

                    placeCursorAtEnd( textarea );
                    updateStats();
                    showToast( 'Loaded: "' + res.data.title + '"' );
                    window.Andika.emit( 'load', { id: res.data.id, title: res.data.title, content: res.data.content } );
                } else {
                    showToast( 'Failed to load writing' );
                }
                if ( onComplete ) onComplete();
            } )
            .catch( function() {
                showToast( 'Error loading writing' );
                if ( onComplete ) onComplete();
            } );
        }

        // 6. Dedicated Dashboard Management Logic
        function loadDashboardData() {
            if ( ! dashGrid || typeof window.scriptWriterData === 'undefined' ) return;

            // Fast-path: Pre-hydrated server data (0ms initial latency!)
            if ( window.scriptWriterInitialData && ( window.scriptWriterInitialData.scripts || window.scriptWriterInitialData.my_scripts ) ) {
                dashboardMyScripts = window.scriptWriterInitialData.my_scripts || window.scriptWriterInitialData.scripts || [];
                dashboardCommunityScripts = window.scriptWriterInitialData.community_scripts || [];
                dashboardScripts = ( currentDashTab === 'community' ) ? dashboardCommunityScripts : dashboardMyScripts;

                if ( statTotalScripts && window.scriptWriterInitialData.stats ) {
                    statTotalScripts.textContent = window.scriptWriterInitialData.stats.total_scripts;
                }
                if ( statTotalWords && window.scriptWriterInitialData.stats ) {
                    statTotalWords.textContent = window.scriptWriterInitialData.stats.total_words;
                }
                if ( statTotalLines && window.scriptWriterInitialData.stats ) {
                    statTotalLines.textContent = window.scriptWriterInitialData.stats.total_lines;
                }
                if ( statCommScripts && window.scriptWriterInitialData.stats ) {
                    statCommScripts.textContent = window.scriptWriterInitialData.stats.community_scripts;
                }
                if ( statCommMembers && window.scriptWriterInitialData.stats ) {
                    statCommMembers.textContent = window.scriptWriterInitialData.stats.community_members + ' community writers';
                }
                if ( tabMyCount ) {
                    tabMyCount.textContent = dashboardMyScripts.length;
                }
                if ( tabCommunityCount ) {
                    tabCommunityCount.textContent = dashboardCommunityScripts.length;
                }

                renderDashboardGrid();
                window.scriptWriterInitialData = null;
                return;
            }

            dashGrid.innerHTML = '<div class="sw-dash-loading">Loading writings...</div>';

            var fd = new FormData();
            fd.append( 'action', 'script_writer_get_dashboard_data' );
            fd.append( 'nonce', window.scriptWriterData.nonce );

            fetch( window.scriptWriterData.ajaxUrl, {
                method: 'POST',
                body: fd,
                credentials: 'same-origin'
            } )
            .then( function( res ) { return res.json(); } )
            .then( function( res ) {
                if ( res.success && res.data ) {
                    dashboardMyScripts = res.data.my_scripts || res.data.scripts || [];
                    dashboardCommunityScripts = res.data.community_scripts || [];
                    dashboardScripts = ( currentDashTab === 'community' ) ? dashboardCommunityScripts : dashboardMyScripts;

                    if ( statTotalScripts ) statTotalScripts.textContent = res.data.stats.total_scripts;
                    if ( statTotalWords ) statTotalWords.textContent = res.data.stats.total_words;
                    if ( statTotalLines ) statTotalLines.textContent = res.data.stats.total_lines;
                    if ( statCommScripts ) statCommScripts.textContent = res.data.stats.community_scripts;
                    if ( statCommMembers ) statCommMembers.textContent = res.data.stats.community_members + ' community writers';
                    if ( tabMyCount ) tabMyCount.textContent = dashboardMyScripts.length;
                    if ( tabCommunityCount ) tabCommunityCount.textContent = dashboardCommunityScripts.length;

                    renderDashboardGrid();
                } else {
                    dashGrid.innerHTML = '<div class="sw-dash-empty">Failed to load dashboard data.</div>';
                }
            } )
            .catch( function() {
                dashGrid.innerHTML = '<div class="sw-dash-empty">Connection error loading dashboard.</div>';
            } );
        }

        function renderDashboardGrid() {
            if ( ! dashGrid ) return;

            var query = dashSearch ? dashSearch.value.trim().toLowerCase() : '';
            var sortMode = dashSort ? dashSort.value : 'modified-desc';
            var activeScripts = ( currentDashTab === 'community' ) ? dashboardCommunityScripts : dashboardMyScripts;

            var filtered = activeScripts.filter( function( s ) {
                if ( ! query ) return true;
                return ( s.title && s.title.toLowerCase().indexOf( query ) !== -1 ) ||
                       ( s.content && s.content.toLowerCase().indexOf( query ) !== -1 ) ||
                       ( s.author_name && s.author_name.toLowerCase().indexOf( query ) !== -1 );
            } );

            // Sorting
            filtered.sort( function( a, b ) {
                if ( sortMode === 'title-asc' ) {
                    return a.title.localeCompare( b.title );
                } else if ( sortMode === 'words-desc' ) {
                    return b.word_count - a.word_count;
                } else {
                    return b.timestamp - a.timestamp;
                }
            } );

            if ( filtered.length === 0 ) {
                if ( query ) {
                    dashGrid.innerHTML = '<div class="sw-dash-empty">No writings match "' + escapeHtml( query ) + '"</div>';
                } else if ( currentDashTab === 'community' ) {
                    dashGrid.innerHTML = '<div class="sw-dash-empty">No writings shared with the community library yet.<div class="sw-dash-empty-sub" style="margin-top:8px;font-size:13px;color:#888;">Share any writing from your workspace to start collaborating!</div></div>';
                } else {
                    dashGrid.innerHTML = '<div class="sw-dash-empty">No personal writings created yet.<div class="sw-dash-empty-create"><button type="button" class="sw-btn sw-btn-primary" id="sw-empty-create-btn">+ Create First Writing</button></div></div>';
                    var emptyBtn = document.getElementById( 'sw-empty-create-btn' );
                    if ( emptyBtn ) {
                        emptyBtn.addEventListener( 'click', function() {
                            createNewScript();
                            switchView( 'editor' );
                        } );
                    }
                }
                return;
            }

            dashGrid.innerHTML = '';
            var currentActiveId = parseInt( textarea.dataset.scriptId || window.scriptWriterData.scriptId || 0, 10 );

            filtered.forEach( function( script ) {
                var card = document.createElement( 'article' );
                card.className = 'sw-card' + ( script.id === currentActiveId ? ' sw-card-active' : '' );
                card.dataset.id = script.id;

                // If on community tab, display author attribution header
                if ( currentDashTab === 'community' ) {
                    var authorRow = document.createElement( 'div' );
                    authorRow.className = 'sw-card-author-row';

                    var authorAvatar = document.createElement( 'span' );
                    authorAvatar.className = 'sw-card-author-avatar';
                    authorAvatar.textContent = ( script.author_name || 'W' ).charAt(0).toUpperCase();

                    var authorName = document.createElement( 'span' );
                    authorName.className = 'sw-card-author-name';
                    authorName.textContent = script.author_name || 'Community Writer';

                    authorRow.appendChild( authorAvatar );
                    authorRow.appendChild( authorName );

                    if ( script.is_author ) {
                        var yourBadge = document.createElement( 'span' );
                        yourBadge.className = 'sw-card-author-badge';
                        yourBadge.textContent = 'Your Writing';
                        authorRow.appendChild( yourBadge );
                    }

                    card.appendChild( authorRow );
                }

                // Card Header
                var cardHeader = document.createElement( 'div' );
                cardHeader.className = 'sw-card-header';

                var titleWrap = document.createElement( 'div' );
                titleWrap.className = 'sw-card-title-wrap';

                var titleEl = document.createElement( 'h3' );
                titleEl.className = 'sw-card-title';
                titleEl.textContent = script.title;

                if ( script.is_author || currentDashTab === 'my' ) {
                    titleEl.title = 'Click to open in editor';
                    titleEl.addEventListener( 'click', function() {
                        loadScriptById( script.id, function() {
                            switchView( 'editor' );
                        } );
                    } );
                } else {
                    titleEl.title = 'Click to read manuscript';
                    titleEl.addEventListener( 'click', function() {
                        openExportModal( script.title, script.content );
                    } );
                }

                var timeEl = document.createElement( 'div' );
                timeEl.className = 'sw-card-time';
                timeEl.textContent = 'Updated ' + script.modified + ' · ' + script.date;

                titleWrap.appendChild( titleEl );
                titleWrap.appendChild( timeEl );
                cardHeader.appendChild( titleWrap );

                // Card Excerpt Preview
                var excerptEl = document.createElement( 'div' );
                excerptEl.className = 'sw-card-excerpt';
                excerptEl.textContent = script.excerpt || '(Empty writing)';

                if ( script.is_author || currentDashTab === 'my' ) {
                    excerptEl.title = 'Click to open in editor';
                    excerptEl.addEventListener( 'click', function() {
                        loadScriptById( script.id, function() {
                            switchView( 'editor' );
                        } );
                    } );
                } else {
                    excerptEl.title = 'Click to read manuscript';
                    excerptEl.addEventListener( 'click', function() {
                        openExportModal( script.title, script.content );
                    } );
                }

                // Card Footer
                var cardFooter = document.createElement( 'div' );
                cardFooter.className = 'sw-card-footer';

                // Meta Row: Words & Lines on left, Visibility Status Pill on right
                var metaRow = document.createElement( 'div' );
                metaRow.className = 'sw-card-meta-row';

                var metaEl = document.createElement( 'div' );
                metaEl.className = 'sw-card-meta';
                metaEl.textContent = script.word_count.toLocaleString() + ' words · ' + script.line_count.toLocaleString() + ' lines';
                metaRow.appendChild( metaEl );

                var actionsWrap = document.createElement( 'div' );
                actionsWrap.className = 'sw-card-actions';

                if ( currentDashTab === 'my' ) {
                    // 1. Personal Visibility Toggle Button (in metaRow for clean balance)
                    var isShared = ( script.visibility === 'community' );
                    var visBtn = document.createElement( 'button' );
                    visBtn.type = 'button';
                    visBtn.className = 'sw-card-btn-visibility' + ( isShared ? ' sw-card-btn-shared' : '' );
                    visBtn.textContent = isShared ? 'Shared' : 'Personal';
                    visBtn.title = isShared ? 'Shared with community. Click to make personal.' : 'Personal to you. Click to share with community.';
                    visBtn.addEventListener( 'click', function( e ) {
                        e.stopPropagation();
                        toggleScriptVisibility( script.id );
                    } );
                    metaRow.appendChild( visBtn );

                    // 2. Primary Action: Write in Canvas
                    var openBtn = document.createElement( 'button' );
                    openBtn.type = 'button';
                    openBtn.className = 'sw-card-btn sw-card-btn-open';
                    openBtn.textContent = 'Write';
                    openBtn.title = 'Open writing in canvas';
                    openBtn.addEventListener( 'click', function() {
                        loadScriptById( script.id, function() {
                            switchView( 'editor' );
                        } );
                    } );
                    actionsWrap.appendChild( openBtn );

                    // 3. Secondary Actions Container (Mobile 4-column touch grid / Desktop inline flex)
                    var secondaryWrap = document.createElement( 'div' );
                    secondaryWrap.className = 'sw-card-secondary-actions';

                    var renameBtn = document.createElement( 'button' );
                    renameBtn.type = 'button';
                    renameBtn.className = 'sw-card-btn sw-card-btn-sec';
                    renameBtn.textContent = 'Rename';
                    renameBtn.title = 'Rename writing';
                    renameBtn.addEventListener( 'click', function( e ) {
                        e.stopPropagation();
                        startInlineRename( titleWrap, titleEl, script );
                    } );
                    secondaryWrap.appendChild( renameBtn );

                    var dupBtn = document.createElement( 'button' );
                    dupBtn.type = 'button';
                    dupBtn.className = 'sw-card-btn sw-card-btn-sec';
                    dupBtn.textContent = 'Copy';
                    dupBtn.title = 'Duplicate this writing';
                    dupBtn.addEventListener( 'click', function( e ) {
                        e.stopPropagation();
                        duplicateScript( script.id );
                    } );
                    secondaryWrap.appendChild( dupBtn );

                    var cardExportBtn = document.createElement( 'button' );
                    cardExportBtn.type = 'button';
                    cardExportBtn.className = 'sw-card-btn sw-card-btn-sec';
                    cardExportBtn.textContent = 'Export';
                    cardExportBtn.title = 'Export as PDF, Manuscript, or Fountain';
                    cardExportBtn.addEventListener( 'click', function( e ) {
                        e.stopPropagation();
                        openExportModal( script.title, script.content );
                    } );
                    secondaryWrap.appendChild( cardExportBtn );

                    if ( window.Andika && typeof window.Andika.emit === 'function' ) {
                        window.Andika.emit( 'renderCardActions', { script: script, container: secondaryWrap, api: andikaApi } );
                    }

                    var delBtn = document.createElement( 'button' );
                    delBtn.type = 'button';
                    delBtn.className = 'sw-card-btn sw-card-btn-sec sw-card-btn-delete';
                    delBtn.textContent = 'Delete';
                    delBtn.title = 'Delete writing';
                    delBtn.addEventListener( 'click', function( e ) {
                        e.stopPropagation();
                        deleteScript( script.id, script.title );
                    } );
                    secondaryWrap.appendChild( delBtn );

                    actionsWrap.appendChild( secondaryWrap );
                } else {
                    // Community Library Tab
                    if ( script.is_author ) {
                        var commVisBtn = document.createElement( 'button' );
                        commVisBtn.type = 'button';
                        commVisBtn.className = 'sw-card-btn-visibility sw-card-btn-shared';
                        commVisBtn.textContent = 'Shared';
                        commVisBtn.title = 'Shared with community. Click to make personal.';
                        commVisBtn.addEventListener( 'click', function( e ) {
                            e.stopPropagation();
                            toggleScriptVisibility( script.id );
                        } );
                        metaRow.appendChild( commVisBtn );

                        var authorOpenBtn = document.createElement( 'button' );
                        authorOpenBtn.type = 'button';
                        authorOpenBtn.className = 'sw-card-btn sw-card-btn-open';
                        authorOpenBtn.textContent = 'Write';
                        authorOpenBtn.title = 'Open in canvas';
                        authorOpenBtn.addEventListener( 'click', function() {
                            loadScriptById( script.id, function() {
                                switchView( 'editor' );
                            } );
                        } );
                        actionsWrap.appendChild( authorOpenBtn );

                        var commSecWrap = document.createElement( 'div' );
                        commSecWrap.className = 'sw-card-secondary-actions sw-card-secondary-actions-2';

                        var commExpBtn = document.createElement( 'button' );
                        commExpBtn.type = 'button';
                        commExpBtn.className = 'sw-card-btn sw-card-btn-sec';
                        commExpBtn.textContent = 'Export';
                        commExpBtn.title = 'Export as PDF, Manuscript, or Fountain';
                        commExpBtn.addEventListener( 'click', function( e ) {
                            e.stopPropagation();
                            openExportModal( script.title, script.content );
                        } );
                        commSecWrap.appendChild( commExpBtn );

                        var commDelBtn = document.createElement( 'button' );
                        commDelBtn.type = 'button';
                        commDelBtn.className = 'sw-card-btn sw-card-btn-sec sw-card-btn-delete';
                        commDelBtn.textContent = 'Delete';
                        commDelBtn.title = 'Delete writing';
                        commDelBtn.addEventListener( 'click', function( e ) {
                            e.stopPropagation();
                            deleteScript( script.id, script.title );
                        } );
                        commSecWrap.appendChild( commDelBtn );

                        actionsWrap.appendChild( commSecWrap );
                    } else {
                        var commBadge = document.createElement( 'span' );
                        commBadge.className = 'sw-card-btn-visibility sw-card-btn-shared';
                        commBadge.textContent = 'Community';
                        metaRow.appendChild( commBadge );

                        var readBtn = document.createElement( 'button' );
                        readBtn.type = 'button';
                        readBtn.className = 'sw-card-btn sw-card-btn-open';
                        readBtn.textContent = 'Read';
                        readBtn.title = 'Read manuscript';
                        readBtn.addEventListener( 'click', function( e ) {
                            e.stopPropagation();
                            openExportModal( script.title, script.content );
                        } );
                        actionsWrap.appendChild( readBtn );

                        var commOtherSecWrap = document.createElement( 'div' );
                        commOtherSecWrap.className = 'sw-card-secondary-actions sw-card-secondary-actions-2';

                        var forkBtn = document.createElement( 'button' );
                        forkBtn.type = 'button';
                        forkBtn.className = 'sw-card-btn sw-card-btn-sec sw-card-btn-fork';
                        forkBtn.textContent = 'Copy to Workspace';
                        forkBtn.title = 'Copy this writing to your private workspace to continue editing';
                        forkBtn.addEventListener( 'click', function( e ) {
                            e.stopPropagation();
                            forkCommunityScript( script.id );
                        } );
                        commOtherSecWrap.appendChild( forkBtn );

                        var otherExpBtn = document.createElement( 'button' );
                        otherExpBtn.type = 'button';
                        otherExpBtn.className = 'sw-card-btn sw-card-btn-sec';
                        otherExpBtn.textContent = 'Export';
                        otherExpBtn.title = 'Export writing';
                        otherExpBtn.addEventListener( 'click', function( e ) {
                            e.stopPropagation();
                            openExportModal( script.title, script.content );
                        } );
                        commOtherSecWrap.appendChild( otherExpBtn );

                        actionsWrap.appendChild( commOtherSecWrap );
                    }
                }

                cardFooter.appendChild( metaRow );
                cardFooter.appendChild( actionsWrap );

                card.appendChild( cardHeader );
                card.appendChild( excerptEl );
                card.appendChild( cardFooter );

                dashGrid.appendChild( card );
            } );
        }

        function startInlineRename( titleWrap, titleEl, script ) {
            var input = document.createElement( 'input' );
            input.type = 'text';
            input.className = 'sw-card-rename-input';
            input.value = script.title;

            titleWrap.replaceChild( input, titleEl );
            input.focus();
            input.select();

            function commitRename() {
                var newTitle = input.value.trim() || 'Untitled';
                if ( newTitle === script.title ) {
                    titleWrap.replaceChild( titleEl, input );
                    return;
                }

                var fd = new FormData();
                fd.append( 'action', 'script_writer_rename_script' );
                fd.append( 'nonce', window.scriptWriterData.nonce );
                fd.append( 'script_id', script.id );
                fd.append( 'title', newTitle );

                fetch( window.scriptWriterData.ajaxUrl, {
                    method: 'POST',
                    body: fd,
                    credentials: 'same-origin'
                } )
                .then( function( r ) { return r.json(); } )
                .then( function( res ) {
                    if ( res.success ) {
                        script.title = newTitle;
                        titleEl.textContent = newTitle;
                        titleWrap.replaceChild( titleEl, input );
                        if ( ( textarea.dataset.scriptId || window.scriptWriterData.scriptId ) == script.id ) {
                            if ( titleInput ) titleInput.value = newTitle;
                            if ( statActiveTitle ) statActiveTitle.textContent = newTitle;
                        }
                        showToast( 'Renamed to "' + newTitle + '"' );
                    } else {
                        titleWrap.replaceChild( titleEl, input );
                        showToast( 'Rename failed' );
                    }
                } )
                .catch( function() {
                    titleWrap.replaceChild( titleEl, input );
                    showToast( 'Connection error' );
                } );
            }

            input.addEventListener( 'keydown', function( e ) {
                if ( e.key === 'Enter' ) {
                    e.preventDefault();
                    commitRename();
                } else if ( e.key === 'Escape' ) {
                    titleWrap.replaceChild( titleEl, input );
                }
            } );

            input.addEventListener( 'blur', commitRename );
        }

        function duplicateScript( scriptId ) {
            showToast( 'Duplicating writing...' );

            var fd = new FormData();
            fd.append( 'action', 'script_writer_duplicate_script' );
            fd.append( 'nonce', window.scriptWriterData.nonce );
            fd.append( 'script_id', scriptId );

            fetch( window.scriptWriterData.ajaxUrl, {
                method: 'POST',
                body: fd,
                credentials: 'same-origin'
            } )
            .then( function( r ) { return r.json(); } )
            .then( function( res ) {
                if ( res.success ) {
                    showToast( 'Duplicated: "' + res.data.title + '"' );
                    loadDashboardData();
                } else {
                    showToast( 'Failed to duplicate' );
                }
            } )
            .catch( function() {
                showToast( 'Error duplicating writing' );
            } );
        }

        function deleteScript( scriptId, title ) {
            if ( ! confirm( 'Are you sure you want to delete "' + title + '"?' ) ) {
                return;
            }

            showToast( 'Deleting writing...' );

            var fd = new FormData();
            fd.append( 'action', 'script_writer_delete_script' );
            fd.append( 'nonce', window.scriptWriterData.nonce );
            fd.append( 'script_id', scriptId );

            fetch( window.scriptWriterData.ajaxUrl, {
                method: 'POST',
                body: fd,
                credentials: 'same-origin'
            } )
            .then( function( r ) { return r.json(); } )
            .then( function( res ) {
                if ( res.success ) {
                    showToast( 'Deleted "' + title + '"' );
                    if ( ( textarea.dataset.scriptId || window.scriptWriterData.scriptId ) == scriptId ) {
                        delete textarea.dataset.scriptId;
                        window.scriptWriterData.scriptId = 0;
                        if ( titleInput ) titleInput.value = 'Untitled';
                        textarea.value = '';
                    }
                    loadDashboardData();
                } else {
                    showToast( 'Delete failed' );
                }
            } )
            .catch( function() {
                showToast( 'Error deleting writing' );
            } );
        }

        function toggleScriptVisibility( scriptId, callback ) {
            showToast( 'Updating visibility...' );

            var fd = new FormData();
            fd.append( 'action', 'script_writer_toggle_visibility' );
            fd.append( 'nonce', window.scriptWriterData.nonce );
            fd.append( 'script_id', scriptId );

            fetch( window.scriptWriterData.ajaxUrl, {
                method: 'POST',
                body: fd,
                credentials: 'same-origin'
            } )
            .then( function( r ) { return r.json(); } )
            .then( function( res ) {
                if ( res.success && res.data ) {
                    var newVis = res.data.visibility;
                    var currentActiveId = parseInt( textarea.dataset.scriptId || window.scriptWriterData.scriptId || 0, 10 );
                    if ( currentActiveId === scriptId ) {
                        updateVisibilityUI( newVis );
                    }
                    showToast( 'Visibility: ' + ( newVis === 'community' ? 'Shared with Community' : 'Personal Workspace' ) );
                    if ( callback ) {
                        callback( newVis );
                    } else {
                        loadDashboardData();
                    }
                } else {
                    showToast( res.data && res.data.message ? res.data.message : 'Failed to update visibility' );
                }
            } )
            .catch( function() {
                showToast( 'Error updating visibility' );
            } );
        }

        function forkCommunityScript( scriptId ) {
            showToast( 'Copying to your workspace...' );

            var fd = new FormData();
            fd.append( 'action', 'script_writer_fork_community_script' );
            fd.append( 'nonce', window.scriptWriterData.nonce );
            fd.append( 'script_id', scriptId );

            fetch( window.scriptWriterData.ajaxUrl, {
                method: 'POST',
                body: fd,
                credentials: 'same-origin'
            } )
            .then( function( r ) { return r.json(); } )
            .then( function( res ) {
                if ( res.success && res.data ) {
                    showToast( 'Copied! Opening in editor...' );
                    loadScriptById( res.data.new_id, function() {
                        switchView( 'editor' );
                    } );
                } else {
                    showToast( res.data && res.data.message ? res.data.message : 'Failed to copy writing' );
                }
            } )
            .catch( function() {
                showToast( 'Error copying writing' );
            } );
        }

        function handlePdfImport( file ) {
            if ( ! file ) return;

            var filename = file.name || 'document.pdf';
            var isPdf = /\.pdf$/i.test( filename );
            var isText = /\.(txt|fountain|md)$/i.test( filename );

            if ( ! isPdf && ! isText ) {
                showToast( 'Unsupported file format. Please upload a .pdf, .txt, or .fountain file.' );
                return;
            }

            // Direct local FileReader parsing for plain text or fountain formats
            if ( isText && typeof FileReader !== 'undefined' ) {
                var reader = new FileReader();
                reader.onload = function( evt ) {
                    var content = evt.target.result;
                    var detectedTitle = filename.replace( /\.[^.]+$/, '' ).replace( /[_\-]/g, ' ' );
                    detectedTitle = detectedTitle.replace( /\s+(SCRIPT|FINAL|DRAFT|COVER|PAGES|BK)+/gi, '' ).trim();
                    if ( ! detectedTitle ) detectedTitle = 'Imported Script';
                    detectedTitle = detectedTitle.charAt( 0 ).toUpperCase() + detectedTitle.slice( 1 );

                    activeScriptSeq++;
                    textarea.value = content;
                    delete textarea.dataset.scriptId;
                    if ( window.scriptWriterData ) {
                        window.scriptWriterData.scriptId = 0;
                    }
                    if ( titleInput ) {
                        titleInput.value = detectedTitle;
                    }
                    if ( statActiveTitle ) {
                        statActiveTitle.textContent = detectedTitle;
                    }
                    currentVisibility = 'private';
                    updateVisibilityUI( 'private' );

                    textarea.scrollTop = 0;
                    textarea.selectionStart = 0;
                    textarea.selectionEnd = 0;
                    updateStats();

                    showToast( 'Imported: "' + detectedTitle + '"' );
                    saveScriptExplicitly();

                    var isMovieScript = /(?:INT|EXT|I\/E)\./i.test( content );
                    var pageEstimate = Math.max( 1, Math.round( content.split( '\n' ).length / 54 ) );

                    window.Andika.emit( 'screenplay:imported', {
                        id: 0,
                        title: detectedTitle,
                        content: content,
                        is_movie_script: isMovieScript,
                        page_count: pageEstimate,
                        author: ''
                    } );
                    window.Andika.emit( 'change', {
                        text: content,
                        scriptId: 0,
                        title: detectedTitle
                    } );
                };
                reader.readAsText( file );
                return;
            }

            // Server-side PDF layout stream decoding & normalization
            showToast( 'Importing "' + filename + '"...' );
            if ( statusEl ) {
                statusEl.textContent = 'importing...';
                statusEl.className = 'sw-status active';
            }

            var fd = new FormData();
            fd.append( 'action', 'script_writer_import_pdf' );
            fd.append( 'nonce', ( window.scriptWriterData && window.scriptWriterData.nonce ) ? window.scriptWriterData.nonce : '' );
            fd.append( 'pdf_file', file );

            fetch( window.scriptWriterData.ajaxUrl, {
                method: 'POST',
                body: fd,
                credentials: 'same-origin'
            } )
            .then( function( res ) { return res.json(); } )
            .then( function( res ) {
                if ( res.success && res.data ) {
                    activeScriptSeq++;
                    var d = res.data;
                    textarea.value = d.content;
                    textarea.dataset.scriptId = d.script_id;
                    if ( window.scriptWriterData ) {
                        window.scriptWriterData.scriptId = d.script_id;
                    }
                    if ( titleInput ) {
                        titleInput.value = d.title;
                    }
                    if ( statActiveTitle ) {
                        statActiveTitle.textContent = d.title;
                    }
                    currentVisibility = 'private';
                    updateVisibilityUI( 'private' );

                    var appUrl = window.scriptWriterData ? ( window.scriptWriterData.appUrl || window.scriptWriterData.adminScriptUrl ) : '';
                    if ( currentView === 'editor' && window.history.replaceState && appUrl && d.script_id ) {
                        var sep = appUrl.indexOf( '?' ) !== -1 ? '&' : '?';
                        window.history.replaceState( {}, '', appUrl + sep + 'script_id=' + d.script_id );
                    }

                    textarea.scrollTop = 0;
                    textarea.selectionStart = 0;
                    textarea.selectionEnd = 0;
                    updateStats();

                    try {
                        localStorage.setItem( storageKey, d.content );
                    } catch ( err ) {}

                    if ( statusEl ) {
                        statusEl.textContent = 'saved';
                        statusEl.className = 'sw-status saved';
                    }

                    window.scriptWriterInitialData = null;
                    loadDashboardData();

                    var msg = d.message || ( 'Imported: "' + d.title + '"' );
                    showToast( msg );

                    window.Andika.emit( 'screenplay:imported', {
                        id: d.script_id,
                        title: d.title,
                        content: d.content,
                        is_movie_script: d.is_movie_script,
                        page_count: d.page_count,
                        author: d.author
                    } );
                    window.Andika.emit( 'change', {
                        text: d.content,
                        scriptId: d.script_id,
                        title: d.title
                    } );
                } else {
                    var errMsg = ( res.data && res.data.message ) ? res.data.message : 'Failed to import PDF file.';
                    showToast( errMsg );
                    if ( statusEl ) {
                        statusEl.textContent = 'saved';
                        statusEl.className = 'sw-status';
                    }
                }
            } )
            .catch( function( err ) {
                showToast( 'Error importing PDF file.' );
                if ( statusEl ) {
                    statusEl.textContent = 'saved';
                    statusEl.className = 'sw-status';
                }
            } );
        }

        function downloadScript( title, content ) {
            var filename = ( title || 'writing' ).replace(/[^a-z0-9_\-]/gi, '_').toLowerCase() + '.fountain';
            var blob = new Blob( [ content || '' ], { type: 'text/plain;charset=utf-8' } );
            var url = URL.createObjectURL( blob );
            var a = document.createElement( 'a' );
            a.href = url;
            a.download = filename;
            document.body.appendChild( a );
            a.click();
            document.body.removeChild( a );
            URL.revokeObjectURL( url );
            showToast( 'Exported ' + filename );
        }

        function escapeHtml( str ) {
            var div = document.createElement( 'div' );
            div.textContent = str || '';
            return div.innerHTML;
        }

        // 7. Navigation & Switch Event Bindings
        if ( dashboardBtn ) {
            dashboardBtn.addEventListener( 'click', function() {
                switchView( 'dashboard' );
            } );
        }

        if ( dropdownOpenDash ) {
            dropdownOpenDash.addEventListener( 'click', function() {
                if ( dropdown ) dropdown.classList.remove( 'open' );
                switchView( 'dashboard' );
            } );
        }

        if ( dashBackEditorBtn ) {
            dashBackEditorBtn.addEventListener( 'click', function() {
                switchView( 'editor' );
            } );
        }

        if ( dashActiveLink ) {
            dashActiveLink.addEventListener( 'click', function() {
                switchView( 'editor' );
            } );
        }

        if ( dashNewBtn ) {
            dashNewBtn.addEventListener( 'click', function() {
                createNewScript();
                switchView( 'editor' );
            } );
        }

        if ( dashSearch ) {
            dashSearch.addEventListener( 'input', renderDashboardGrid );
        }

        if ( dashSort ) {
            dashSort.addEventListener( 'change', renderDashboardGrid );
        }

        // Close dropdown when clicking outside
        document.addEventListener( 'click', function( e ) {
            if ( dropdown && dropdown.classList.contains( 'open' ) ) {
                if ( ! e.target.closest( '.sw-dropdown-anchor' ) ) {
                    dropdown.classList.remove( 'open' );
                }
            }
        } );

        if ( scriptsBtn ) {
            scriptsBtn.addEventListener( 'click', function( e ) {
                e.stopPropagation();
                toggleScriptsDropdown();
            } );
        }

        if ( dropdownNewBtn ) {
            dropdownNewBtn.addEventListener( 'click', function() {
                if ( dropdown ) dropdown.classList.remove( 'open' );
                createNewScript();
            } );
        }

        if ( newBtn ) {
            newBtn.addEventListener( 'click', createNewScript );
        }

        if ( saveBtn ) {
            saveBtn.addEventListener( 'click', function() {
                saveScriptExplicitly();
            } );
        }

        if ( importBtn ) {
            importBtn.addEventListener( 'click', function() {
                if ( importFileInput ) importFileInput.click();
            } );
        }

        if ( dashImportBtn ) {
            dashImportBtn.addEventListener( 'click', function() {
                if ( importFileInput ) importFileInput.click();
            } );
        }

        if ( dropdownImportBtn ) {
            dropdownImportBtn.addEventListener( 'click', function() {
                if ( dropdown ) dropdown.classList.remove( 'open' );
                if ( importFileInput ) importFileInput.click();
            } );
        }

        if ( importFileInput ) {
            importFileInput.addEventListener( 'change', function() {
                if ( this.files && this.files[0] ) {
                    handlePdfImport( this.files[0] );
                    this.value = '';
                }
            } );
        }

        // Drag-and-drop import overlay and drop handler
        ( function initDragAndDropImport() {
            var dragCounter = 0;

            function isFileDrag( e ) {
                if ( ! e.dataTransfer || ! e.dataTransfer.types ) return false;
                for ( var i = 0; i < e.dataTransfer.types.length; i++ ) {
                    if ( e.dataTransfer.types[ i ] === 'Files' ) return true;
                }
                return false;
            }

            [ 'dragenter', 'dragover', 'dragleave', 'drop' ].forEach( function( evtName ) {
                window.addEventListener( evtName, function( e ) {
                    if ( isFileDrag( e ) ) {
                        e.preventDefault();
                    }
                }, false );
            } );

            window.addEventListener( 'dragenter', function( e ) {
                if ( currentView !== 'editor' ) return;
                if ( isFileDrag( e ) ) {
                    dragCounter++;
                    if ( dropOverlay ) dropOverlay.style.display = 'flex';
                }
            } );

            window.addEventListener( 'dragleave', function( e ) {
                dragCounter--;
                if ( dragCounter <= 0 ) {
                    dragCounter = 0;
                    if ( dropOverlay ) dropOverlay.style.display = 'none';
                }
            } );

            window.addEventListener( 'drop', function( e ) {
                dragCounter = 0;
                if ( dropOverlay ) dropOverlay.style.display = 'none';
                if ( currentView !== 'editor' ) return;
                if ( e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0 ) {
                    e.preventDefault();
                    handlePdfImport( e.dataTransfer.files[ 0 ] );
                }
            } );
        } )();

        // 7b. Workspace Tabs (My Workspace vs Community Library)
        if ( tabMy ) {
            tabMy.addEventListener( 'click', function() {
                currentDashTab = 'my';
                tabMy.classList.add( 'active' );
                tabMy.setAttribute( 'aria-selected', 'true' );
                if ( tabCommunity ) {
                    tabCommunity.classList.remove( 'active' );
                    tabCommunity.setAttribute( 'aria-selected', 'false' );
                }
                if ( tabHint ) {
                    tabHint.textContent = 'Your private workspace writings. Only you can access and edit these.';
                }
                renderDashboardGrid();
            } );
        }

        if ( tabCommunity ) {
            tabCommunity.addEventListener( 'click', function() {
                currentDashTab = 'community';
                tabCommunity.classList.add( 'active' );
                tabCommunity.setAttribute( 'aria-selected', 'true' );
                if ( tabMy ) {
                    tabMy.classList.remove( 'active' );
                    tabMy.setAttribute( 'aria-selected', 'false' );
                }
                if ( tabHint ) {
                    var sName = ( window.scriptWriterData && window.scriptWriterData.spaceName ) ? window.scriptWriterData.spaceName : 'Andika';
                    tabHint.textContent = 'Shared writings from the ' + sName + ' writers community. Read and copy to your workspace.';
                }
                renderDashboardGrid();
            } );
        }

        // 7c. Toolbar Visibility Button (Editor Header)
        if ( toolbarVisibilityBtn ) {
            toolbarVisibilityBtn.addEventListener( 'click', function() {
                var scriptId = parseInt( textarea.dataset.scriptId || window.scriptWriterData.scriptId || 0, 10 );
                if ( ! scriptId ) {
                    currentVisibility = ( currentVisibility === 'community' ) ? 'private' : 'community';
                    updateVisibilityUI( currentVisibility );
                    showToast( 'Visibility: ' + ( currentVisibility === 'community' ? 'Community (will publish on save)' : 'Personal Workspace' ) );
                    return;
                }
                toggleScriptVisibility( scriptId, function( newVis ) {
                    updateVisibilityUI( newVis );
                } );
            } );
        }

        // 7d. Authentication View & Switcher
        if ( authTabLogin && authTabRegister ) {
            authTabLogin.addEventListener( 'click', function() {
                authTabLogin.classList.add( 'active' );
                authTabLogin.setAttribute( 'aria-selected', 'true' );
                authTabRegister.classList.remove( 'active' );
                authTabRegister.setAttribute( 'aria-selected', 'false' );
                if ( authLoginForm ) authLoginForm.style.display = 'flex';
                if ( authRegisterForm ) authRegisterForm.style.display = 'none';
                if ( authAlert ) authAlert.style.display = 'none';
            } );

            authTabRegister.addEventListener( 'click', function() {
                authTabRegister.classList.add( 'active' );
                authTabRegister.setAttribute( 'aria-selected', 'true' );
                authTabLogin.classList.remove( 'active' );
                authTabLogin.setAttribute( 'aria-selected', 'false' );
                if ( authRegisterForm ) authRegisterForm.style.display = 'flex';
                if ( authLoginForm ) authLoginForm.style.display = 'none';
                if ( authAlert ) authAlert.style.display = 'none';
            } );
        }

        // Auth Login Form Submission
        if ( authLoginForm ) {
            authLoginForm.addEventListener( 'submit', function( e ) {
                e.preventDefault();
                if ( ! window.scriptWriterData || ! window.scriptWriterData.authNonce ) return;

                var submitBtn = document.getElementById( 'sw-login-submit-btn' );
                var userField = document.getElementById( 'sw-login-user' );
                var pwdField = document.getElementById( 'sw-login-pwd' );
                var rememberField = document.getElementById( 'sw-login-remember' );

                var username = userField ? userField.value.trim() : '';
                var password = pwdField ? pwdField.value : '';
                var remember = rememberField ? ( rememberField.checked ? 1 : 0 ) : 0;

                if ( ! username || ! password ) {
                    if ( authAlert ) {
                        authAlert.className = 'sw-auth-alert sw-auth-alert-error';
                        authAlert.textContent = 'Please enter your username/email and password.';
                        authAlert.style.display = 'block';
                    }
                    return;
                }

                if ( submitBtn ) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Signing in...';
                }
                if ( authAlert ) authAlert.style.display = 'none';

                var fd = new FormData();
                fd.append( 'action', 'script_writer_auth_login' );
                fd.append( 'nonce', window.scriptWriterData.authNonce );
                fd.append( 'log', username );
                fd.append( 'pwd', password );
                fd.append( 'remember', remember );

                fetch( window.scriptWriterData.ajaxUrl, {
                    method: 'POST',
                    body: fd,
                    credentials: 'same-origin'
                } )
                .then( function( r ) { return r.json(); } )
                .then( function( res ) {
                    if ( res.success ) {
                        if ( authAlert ) {
                            authAlert.className = 'sw-auth-alert sw-auth-alert-success';
                            authAlert.textContent = res.data && res.data.message ? res.data.message : 'Sign in successful! Loading your dashboard...';
                            authAlert.style.display = 'block';
                        }
                        if ( submitBtn ) {
                            submitBtn.textContent = 'Loading Dashboard...';
                        }
                        var targetUrl = ( res.data && res.data.redirect ) ? res.data.redirect : ( window.scriptWriterData.appUrl + '&view=dashboard' );
                        performAuthRedirect( targetUrl );
                    } else {
                        if ( submitBtn ) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Sign In to Workspace →';
                        }
                        if ( authAlert ) {
                            authAlert.className = 'sw-auth-alert sw-auth-alert-error';
                            authAlert.textContent = res.data && res.data.message ? res.data.message : 'Invalid credentials. Please try again.';
                            authAlert.style.display = 'block';
                        }
                    }
                } )
                .catch( function() {
                    if ( submitBtn ) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Sign In to Workspace →';
                    }
                    if ( authAlert ) {
                        authAlert.className = 'sw-auth-alert sw-auth-alert-error';
                        authAlert.textContent = 'Connection error during sign in. Please try again.';
                        authAlert.style.display = 'block';
                    }
                } );
            } );
        }

        // Auth Register Form Submission
        if ( authRegisterForm ) {
            authRegisterForm.addEventListener( 'submit', function( e ) {
                e.preventDefault();
                if ( ! window.scriptWriterData || ! window.scriptWriterData.authNonce ) return;

                var submitBtn = document.getElementById( 'sw-reg-submit-btn' );
                var nameField = document.getElementById( 'sw-reg-name' );
                var userField = document.getElementById( 'sw-reg-user' );
                var emailField = document.getElementById( 'sw-reg-email' );
                var pwdField = document.getElementById( 'sw-reg-pwd' );
                var confirmField = document.getElementById( 'sw-reg-pwd-confirm' );

                var displayName = nameField ? nameField.value.trim() : '';
                var username = userField ? userField.value.trim() : '';
                var email = emailField ? emailField.value.trim() : '';
                var password = pwdField ? pwdField.value : '';
                var confirmPwd = confirmField ? confirmField.value : '';

                if ( password !== confirmPwd ) {
                    if ( authAlert ) {
                        authAlert.className = 'sw-auth-alert sw-auth-alert-error';
                        authAlert.textContent = 'Passwords do not match. Please verify and try again.';
                        authAlert.style.display = 'block';
                    }
                    return;
                }

                if ( password.length < 6 ) {
                    if ( authAlert ) {
                        authAlert.className = 'sw-auth-alert sw-auth-alert-error';
                        authAlert.textContent = 'Password must be at least 6 characters long.';
                        authAlert.style.display = 'block';
                    }
                    return;
                }

                if ( submitBtn ) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Creating account...';
                }
                if ( authAlert ) authAlert.style.display = 'none';

                var fd = new FormData();
                fd.append( 'action', 'script_writer_auth_register' );
                fd.append( 'nonce', window.scriptWriterData.authNonce );
                fd.append( 'display_name', displayName );
                fd.append( 'username', username );
                fd.append( 'email', email );
                fd.append( 'password', password );
                fd.append( 'confirm_password', confirmPwd );

                fetch( window.scriptWriterData.ajaxUrl, {
                    method: 'POST',
                    body: fd,
                    credentials: 'same-origin'
                } )
                .then( function( r ) { return r.json(); } )
                .then( function( res ) {
                    if ( res.success ) {
                        if ( authAlert ) {
                            authAlert.className = 'sw-auth-alert sw-auth-alert-success';
                            authAlert.textContent = res.data && res.data.message ? res.data.message : 'Account created! Loading your dashboard...';
                            authAlert.style.display = 'block';
                        }
                        if ( submitBtn ) {
                            submitBtn.textContent = 'Loading Dashboard...';
                        }
                        var targetUrl = ( res.data && res.data.redirect ) ? res.data.redirect : ( window.scriptWriterData.appUrl + '&view=dashboard' );
                        performAuthRedirect( targetUrl );
                    } else {
                        if ( submitBtn ) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Join Community & Start Writing →';
                        }
                        if ( authAlert ) {
                            authAlert.className = 'sw-auth-alert sw-auth-alert-error';
                            authAlert.textContent = res.data && res.data.message ? res.data.message : 'Registration failed.';
                            authAlert.style.display = 'block';
                        }
                    }
                } )
                .catch( function() {
                    if ( submitBtn ) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Join Community & Start Writing →';
                    }
                    if ( authAlert ) {
                        authAlert.className = 'sw-auth-alert sw-auth-alert-error';
                        authAlert.textContent = 'Connection error during registration. Please try again.';
                        authAlert.style.display = 'block';
                    }
                } );
            } );
        }

        // Robust Navigation Helper (prevents browser from getting stuck when targetUrl matches current href)
        function performAuthRedirect( targetUrl ) {
            var url = targetUrl || ( window.scriptWriterData ? window.scriptWriterData.appUrl : '/?andika=1' );
            var separator = url.indexOf( '?' ) !== -1 ? '&' : '?';
            var destination = url + separator + '_auth=' + Date.now();

            try {
                window.location.replace( destination );
            } catch ( err ) {
                window.location.href = destination;
            }

            // Unconditional reload fallback if location.replace did not trigger
            setTimeout( function() {
                if ( window.location.href !== destination ) {
                    window.location.href = destination;
                } else {
                    window.location.reload();
                }
            }, 200 );
        }

        // 7e. Sign Out Handlers
        function handleLogout() {
            var sName = ( window.scriptWriterData && window.scriptWriterData.spaceName ) ? window.scriptWriterData.spaceName : 'Andika';
            if ( ! confirm( 'Are you sure you want to sign out of ' + sName + '?' ) ) return;
            showToast( 'Signing out...' );

            var fd = new FormData();
            fd.append( 'action', 'script_writer_auth_logout' );
            fd.append( 'nonce', window.scriptWriterData.nonce );

            fetch( window.scriptWriterData.ajaxUrl, {
                method: 'POST',
                body: fd,
                credentials: 'same-origin'
            } )
            .then( function( r ) { return r.json(); } )
            .then( function( res ) {
                var targetUrl = ( res && res.data && res.data.redirect ) ? res.data.redirect : ( window.scriptWriterData.appUrl + '&view=auth' );
                performAuthRedirect( targetUrl );
            } )
            .catch( function() {
                performAuthRedirect( window.scriptWriterData.appUrl + '&view=auth' );
            } );
        }

        if ( editorLogoutBtn ) {
            editorLogoutBtn.addEventListener( 'click', handleLogout );
        }
        if ( dashLogoutBtn ) {
            dashLogoutBtn.addEventListener( 'click', handleLogout );
        }

        // 8. Toolbar Button Click Handler
        if ( toolbarWrap ) {
            toolbarWrap.addEventListener( 'click', function( e ) {
                var btn = e.target.closest( '.sw-btn' );
                if ( ! btn ) return;

                var action = btn.getAttribute( 'data-action' );
                if ( action ) {
                    executeFormatAction( action );
                }
            } );
        }

        // 8b. Floating Right-Click Context Menu Listeners (Along Caret)
        if ( ctxMenu ) {
            // Prevent mousedown on buttons from stealing focus or dropping text selection
            ctxMenu.addEventListener( 'mousedown', function( e ) {
                e.preventDefault();
            } );

            ctxMenu.addEventListener( 'click', function( e ) {
                var btn = e.target.closest( '.sw-ctx-btn' );
                if ( ! btn ) return;
                e.preventDefault();
                e.stopPropagation();

                var action = btn.getAttribute( 'data-action' );
                if ( action ) {
                    executeFormatAction( action );
                }
                hideContextMenu();
                textarea.focus();
            } );
        }

        // 8c. Export Modal Event Bindings
        if ( exportBtn ) {
            exportBtn.addEventListener( 'click', function() {
                var title = ( titleInput && titleInput.value.trim().length > 0 )
                    ? titleInput.value.trim()
                    : 'Untitled';
                openExportModal( title, textarea.value );
            } );
        }

        if ( exportCloseBtn ) {
            exportCloseBtn.addEventListener( 'click', closeExportModal );
        }
        if ( exportBackdrop ) {
            exportBackdrop.addEventListener( 'click', closeExportModal );
        }

        var exportDialog = document.querySelector( '.sw-export-dialog' );
        if ( exportDialog ) {
            exportDialog.addEventListener( 'click', function( e ) {
                e.stopPropagation();
            } );
            exportDialog.addEventListener( 'mousedown', function( e ) {
                e.stopPropagation();
            } );
        }

        // Style Choice Card Switcher
        var stylePicker = document.getElementById( 'sw-style-picker' );
        if ( stylePicker ) {
            stylePicker.addEventListener( 'click', function( e ) {
                var card = e.target.closest( '.sw-style-card' );
                if ( ! card ) return;
                var selectedStyle = card.getAttribute( 'data-style' );
                if ( ! selectedStyle ) return;

                if ( exportStyleSelect ) {
                    exportStyleSelect.value = selectedStyle;
                }
                updateManuscriptPreview();
            } );
        }

        if ( exportStyleSelect ) {
            exportStyleSelect.addEventListener( 'change', updateManuscriptPreview );
        }
        if ( exportPageSizeSelect ) {
            exportPageSizeSelect.addEventListener( 'change', updateManuscriptPreview );
        }
        if ( exportOptTitlePage ) {
            exportOptTitlePage.addEventListener( 'change', updateManuscriptPreview );
        }
        if ( exportOptPageNumbers ) {
            exportOptPageNumbers.addEventListener( 'change', updateManuscriptPreview );
        }
        if ( exportOptBoldSlugs ) {
            exportOptBoldSlugs.addEventListener( 'change', updateManuscriptPreview );
        }
        if ( exportOptHideNotes ) {
            exportOptHideNotes.addEventListener( 'change', updateManuscriptPreview );
        }

        if ( exportPdfBtn ) {
            exportPdfBtn.addEventListener( 'click', printManuscriptPdf );
        }
        if ( exportHtmlBtn ) {
            exportHtmlBtn.addEventListener( 'click', downloadManuscriptHtml );
        }
        if ( exportFountainBtn ) {
            exportFountainBtn.addEventListener( 'click', function() {
                downloadScript( currentExportTitle, currentExportContent );
            } );
        }
        if ( exportTxtBtn ) {
            exportTxtBtn.addEventListener( 'click', function() {
                var filename = ( currentExportTitle || 'writing' ).replace(/[^a-z0-9_\-]/gi, '_').toLowerCase() + '.txt';
                var blob = new Blob( [ currentExportContent || '' ], { type: 'text/plain;charset=utf-8' } );
                var url = URL.createObjectURL( blob );
                var a = document.createElement( 'a' );
                a.href = url;
                a.download = filename;
                document.body.appendChild( a );
                a.click();
                document.body.removeChild( a );
                URL.revokeObjectURL( url );
                showToast( 'Exported ' + filename );
            } );
        }

        // 8c-1. Review Notes, Track Changes & Revisions Event Bindings
        if ( notesToggleBtn ) {
            notesToggleBtn.addEventListener( 'click', function( e ) {
                e.stopPropagation();
                if ( reviewDrawer && reviewDrawer.classList.contains( 'active' ) ) {
                    closeReviewDrawer();
                } else {
                    openReviewDrawer();
                }
            } );
        }

        if ( trackBtn ) {
            trackBtn.addEventListener( 'click', function( e ) {
                e.stopPropagation();
                toggleTrackChanges();
            } );
        }

        if ( revisionsBtn ) {
            revisionsBtn.addEventListener( 'click', function( e ) {
                e.stopPropagation();
                if ( revisionsDrawer && revisionsDrawer.classList.contains( 'active' ) ) {
                    closeRevisionsDrawer();
                } else {
                    openRevisionsDrawer();
                }
            } );
        }

        if ( reviewPopoverSaveBtn ) {
            reviewPopoverSaveBtn.addEventListener( 'click', submitReviewNote );
        }
        if ( reviewPopoverCancelBtn ) {
            reviewPopoverCancelBtn.addEventListener( 'click', closeReviewPopover );
        }
        if ( reviewPopoverCloseBtn ) {
            reviewPopoverCloseBtn.addEventListener( 'click', closeReviewPopover );
        }
        if ( reviewPopoverText ) {
            reviewPopoverText.addEventListener( 'keydown', function( e ) {
                if ( e.key === 'Enter' && ( e.ctrlKey || e.metaKey ) ) {
                    e.preventDefault();
                    submitReviewNote();
                } else if ( e.key === 'Escape' ) {
                    e.preventDefault();
                    closeReviewPopover();
                }
            } );
        }

        if ( reviewDrawerCloseBtn ) {
            reviewDrawerCloseBtn.addEventListener( 'click', closeReviewDrawer );
        }
        if ( revisionsDrawerCloseBtn ) {
            revisionsDrawerCloseBtn.addEventListener( 'click', closeRevisionsDrawer );
        }
        if ( revDiffCloseBtn ) {
            revDiffCloseBtn.addEventListener( 'click', function() {
                if ( revDiffWrap ) revDiffWrap.style.display = 'none';
                if ( revisionsList ) revisionsList.style.display = 'flex';
            } );
        }
        if ( revRestoreBtn ) {
            revRestoreBtn.addEventListener( 'click', restoreActiveRevision );
        }

        // Close popover when clicking outside
        document.addEventListener( 'mousedown', function( e ) {
            if ( reviewPopover && reviewPopover.style.display !== 'none' ) {
                if ( ! reviewPopover.contains( e.target ) && ! ( ctxMenu && ctxMenu.contains( e.target ) ) ) {
                    closeReviewPopover();
                }
            }
        } );

        if ( textarea ) {
            textarea.addEventListener( 'scroll', renderReviewGutter );
        }
        window.addEventListener( 'resize', renderReviewGutter );

        window.Andika.on( 'load', function( data ) {
            if ( data && data.id ) {
                loadComments( data.id );
                if ( textarea ) {
                    baselineLines = textarea.value.split( '\n' );
                    changedLineIndices.clear();
                    renderReviewGutter();
                }
            }
        } );

        var initScriptId = getActiveScriptId();
        if ( initScriptId ) {
            loadComments( initScriptId );
        }
        if ( textarea ) {
            baselineLines = textarea.value.split( '\n' );
        }

        // 8c-2. Dashboard Gear Menu Handlers (Houses User Profile, Settings, WP Admin, Logout)
        function openGearMenu() {
            if ( ! gearMenu ) return;
            gearMenu.classList.add( 'open' );
            if ( gearBtn ) {
                gearBtn.setAttribute( 'aria-expanded', 'true' );
                gearBtn.classList.add( 'active' );
            }
        }

        function closeGearMenu() {
            if ( ! gearMenu ) return;
            gearMenu.classList.remove( 'open' );
            if ( gearBtn ) {
                gearBtn.setAttribute( 'aria-expanded', 'false' );
                gearBtn.classList.remove( 'active' );
            }
        }

        function toggleGearMenu() {
            if ( ! gearMenu ) return;
            if ( gearMenu.classList.contains( 'open' ) ) {
                closeGearMenu();
            } else {
                openGearMenu();
            }
        }

        if ( gearBtn ) {
            gearBtn.addEventListener( 'click', function( e ) {
                e.stopPropagation();
                toggleGearMenu();
            } );
        }

        if ( gearMenu ) {
            gearMenu.addEventListener( 'click', function( e ) {
                e.stopPropagation();
            } );
        }

        document.addEventListener( 'click', function( e ) {
            if ( gearMenu && gearMenu.classList.contains( 'open' ) ) {
                if ( ! e.target.closest( '.sw-gear-anchor' ) ) {
                    closeGearMenu();
                }
            }
        } );

        // 8d. Account & Space Settings Modal Handlers
        function switchSettingsTab( tab ) {
            if ( tab === 'extensions' && extensionsPanel ) {
                if ( settingsForm ) settingsForm.style.display = 'none';
                if ( adminSpaceForm ) adminSpaceForm.style.display = 'none';
                extensionsPanel.style.display = 'block';
                if ( tabAuthorSettings ) {
                    tabAuthorSettings.classList.remove( 'active' );
                    tabAuthorSettings.setAttribute( 'aria-selected', 'false' );
                }
                if ( tabSpaceSettings ) {
                    tabSpaceSettings.classList.remove( 'active' );
                    tabSpaceSettings.setAttribute( 'aria-selected', 'false' );
                }
                if ( tabExtensionsSettings ) {
                    tabExtensionsSettings.classList.add( 'active' );
                    tabExtensionsSettings.setAttribute( 'aria-selected', 'true' );
                }
                if ( settingsModalTitle ) {
                    settingsModalTitle.textContent = 'Extensions';
                }
                if ( settingsHeaderSub ) {
                    settingsHeaderSub.textContent = 'Enable or disable modular extensions to expand your writing studio workflows.';
                }
                if ( settingsAlert ) settingsAlert.style.display = 'none';
            } else if ( tab === 'space' && adminSpaceForm ) {
                if ( settingsForm ) settingsForm.style.display = 'none';
                if ( extensionsPanel ) extensionsPanel.style.display = 'none';
                adminSpaceForm.style.display = 'block';
                if ( tabAuthorSettings ) {
                    tabAuthorSettings.classList.remove( 'active' );
                    tabAuthorSettings.setAttribute( 'aria-selected', 'false' );
                }
                if ( tabSpaceSettings ) {
                    tabSpaceSettings.classList.add( 'active' );
                    tabSpaceSettings.setAttribute( 'aria-selected', 'true' );
                }
                if ( tabExtensionsSettings ) {
                    tabExtensionsSettings.classList.remove( 'active' );
                    tabExtensionsSettings.setAttribute( 'aria-selected', 'false' );
                }
                if ( settingsModalTitle ) {
                    settingsModalTitle.textContent = 'Settings';
                }
                if ( settingsHeaderSub ) {
                    settingsHeaderSub.textContent = 'Configure platform branding, login screen, tagline, and dynamic permalinks.';
                }
                if ( settingsAlert ) settingsAlert.style.display = 'none';
                if ( adminSpaceName ) {
                    setTimeout( function() { adminSpaceName.focus(); }, 60 );
                }
            } else {
                if ( adminSpaceForm ) adminSpaceForm.style.display = 'none';
                if ( extensionsPanel ) extensionsPanel.style.display = 'none';
                if ( settingsForm ) settingsForm.style.display = 'block';
                if ( tabAuthorSettings ) {
                    tabAuthorSettings.classList.add( 'active' );
                    tabAuthorSettings.setAttribute( 'aria-selected', 'true' );
                }
                if ( tabSpaceSettings ) {
                    tabSpaceSettings.classList.remove( 'active' );
                    tabSpaceSettings.setAttribute( 'aria-selected', 'false' );
                }
                if ( tabExtensionsSettings ) {
                    tabExtensionsSettings.classList.remove( 'active' );
                    tabExtensionsSettings.setAttribute( 'aria-selected', 'false' );
                }
                if ( settingsModalTitle ) {
                    settingsModalTitle.textContent = 'Profile';
                }
                if ( settingsHeaderSub ) {
                    settingsHeaderSub.textContent = 'Manage your author profile, login credentials, and workspace details.';
                }
                if ( settingsAlert ) settingsAlert.style.display = 'none';
                if ( settingName ) {
                    setTimeout( function() { settingName.focus(); }, 60 );
                }
            }
        }

        function openSettingsModal( targetPanel ) {
            closeGearMenu();
            if ( ! settingsModal ) return;

            // Populate form fields with latest user data if available
            var u = ( window.scriptWriterData && window.scriptWriterData.currentUser ) ? window.scriptWriterData.currentUser : {};
            if ( settingName && u.name ) {
                settingName.value = u.name;
            }
            if ( settingEmail && u.email ) {
                settingEmail.value = u.email;
            }
            if ( settingUsername && u.username ) {
                settingUsername.value = u.username;
            }
            if ( settingSpaceName && typeof u.space_name !== 'undefined' ) {
                settingSpaceName.value = u.space_name;
            }
            if ( settingBio && typeof u.bio !== 'undefined' ) {
                settingBio.value = u.bio;
            }

            // Populate admin space form fields if available
            var d = window.scriptWriterData || {};
            if ( adminSpaceName && d.spaceName ) {
                adminSpaceName.value = d.spaceName;
            }
            if ( adminSpaceAbout && d.spaceAbout ) {
                adminSpaceAbout.value = d.spaceAbout;
            }
            if ( adminSpaceSlug && d.spaceSlug ) {
                adminSpaceSlug.value = d.spaceSlug;
            }
            if ( adminSpaceDesc && d.spaceDescription ) {
                adminSpaceDesc.value = d.spaceDescription;
            }
            if ( adminLoginLabel && typeof d.loginLabel !== 'undefined' ) {
                adminLoginLabel.value = d.loginLabel;
            }
            if ( adminLoginAbout && typeof d.loginAbout !== 'undefined' ) {
                adminLoginAbout.value = d.loginAbout;
            }
            if ( slugPreviewCode && d.appUrl ) {
                slugPreviewCode.textContent = d.appUrl;
            }

            // Clear password fields
            if ( settingCurPass ) settingCurPass.value = '';
            if ( settingNewPass ) settingNewPass.value = '';
            if ( settingConfirmPass ) settingConfirmPass.value = '';

            // Reset alert
            if ( settingsAlert ) {
                settingsAlert.style.display = 'none';
                settingsAlert.textContent = '';
                settingsAlert.className = 'sw-settings-alert';
            }

            // Reset buttons
            if ( settingsSaveBtn ) {
                settingsSaveBtn.disabled = false;
                settingsSaveBtn.textContent = 'Save Changes';
            }
            if ( adminSpaceSaveBtn ) {
                adminSpaceSaveBtn.disabled = false;
                adminSpaceSaveBtn.textContent = 'Save Settings';
            }

            // Activate requested panel
            switchSettingsTab( targetPanel === 'space' ? 'space' : 'author' );

            settingsModal.style.display = 'flex';
            settingsModal.classList.add( 'open' );
            settingsModal.setAttribute( 'aria-hidden', 'false' );
        }

        function closeSettingsModal() {
            if ( ! settingsModal ) return;
            settingsModal.classList.remove( 'open' );
            settingsModal.style.display = 'none';
            settingsModal.setAttribute( 'aria-hidden', 'true' );
            if ( settingsAlert ) {
                settingsAlert.style.display = 'none';
            }
        }

        function showSettingsAlert( msg, type ) {
            if ( ! settingsAlert ) return;
            settingsAlert.className = 'sw-settings-alert sw-settings-alert-' + ( type === 'success' ? 'success' : 'error' );
            settingsAlert.textContent = msg;
            settingsAlert.style.display = 'block';
        }

        if ( settingsBtn ) {
            settingsBtn.addEventListener( 'click', openSettingsModal );
        }
        if ( userPill ) {
            userPill.addEventListener( 'click', openSettingsModal );
            userPill.addEventListener( 'keydown', function( e ) {
                if ( e.key === 'Enter' || e.key === ' ' ) {
                    e.preventDefault();
                    openSettingsModal();
                }
            } );
        }
        if ( settingsCloseBtn ) {
            settingsCloseBtn.addEventListener( 'click', closeSettingsModal );
        }
        if ( settingsCancelBtn ) {
            settingsCancelBtn.addEventListener( 'click', closeSettingsModal );
        }
        if ( settingsBackdrop ) {
            settingsBackdrop.addEventListener( 'click', closeSettingsModal );
        }
        var settingsDialog = document.querySelector( '.sw-settings-dialog' );
        if ( settingsDialog ) {
            settingsDialog.addEventListener( 'click', function( e ) {
                e.stopPropagation();
            } );
            settingsDialog.addEventListener( 'mousedown', function( e ) {
                e.stopPropagation();
            } );
        }

        if ( settingsForm ) {
            settingsForm.addEventListener( 'submit', function( e ) {
                e.preventDefault();
                if ( ! window.scriptWriterData || ! window.scriptWriterData.nonce ) return;

                var displayName = settingName ? settingName.value.trim() : '';
                var email = settingEmail ? settingEmail.value.trim() : '';
                var spaceName = settingSpaceName ? settingSpaceName.value.trim() : '';
                var bio = settingBio ? settingBio.value.trim() : '';
                var curPass = settingCurPass ? settingCurPass.value : '';
                var newPass = settingNewPass ? settingNewPass.value : '';
                var confirmPass = settingConfirmPass ? settingConfirmPass.value : '';

                if ( ! displayName ) {
                    showSettingsAlert( 'Display name cannot be empty.', 'error' );
                    if ( settingName ) settingName.focus();
                    return;
                }

                if ( ! email ) {
                    showSettingsAlert( 'Email address cannot be empty.', 'error' );
                    if ( settingEmail ) settingEmail.focus();
                    return;
                }

                // If user entered a new password, validate
                if ( newPass ) {
                    if ( ! curPass ) {
                        showSettingsAlert( 'Please enter your current password to verify this change.', 'error' );
                        if ( settingCurPass ) settingCurPass.focus();
                        return;
                    }
                    if ( newPass.length < 6 ) {
                        showSettingsAlert( 'New password must be at least 6 characters long.', 'error' );
                        if ( settingNewPass ) settingNewPass.focus();
                        return;
                    }
                    if ( newPass !== confirmPass ) {
                        showSettingsAlert( 'New passwords do not match.', 'error' );
                        if ( settingConfirmPass ) settingConfirmPass.focus();
                        return;
                    }
                }

                if ( settingsSaveBtn ) {
                    settingsSaveBtn.disabled = true;
                    settingsSaveBtn.textContent = 'Saving...';
                }
                if ( settingsAlert ) settingsAlert.style.display = 'none';

                var fd = new FormData();
                fd.append( 'action', 'script_writer_update_profile' );
                fd.append( 'nonce', window.scriptWriterData.nonce );
                fd.append( 'display_name', displayName );
                fd.append( 'email', email );
                fd.append( 'space_name', spaceName );
                fd.append( 'bio', bio );
                if ( newPass ) {
                    fd.append( 'current_password', curPass );
                    fd.append( 'new_password', newPass );
                    fd.append( 'confirm_password', confirmPass );
                }

                fetch( window.scriptWriterData.ajaxUrl, {
                    method: 'POST',
                    body: fd,
                    credentials: 'same-origin'
                } )
                .then( function( r ) { return r.json(); } )
                .then( function( res ) {
                    if ( res.success ) {
                        showSettingsAlert( res.data && res.data.message ? res.data.message : 'Settings saved successfully!', 'success' );
                        if ( settingsSaveBtn ) {
                            settingsSaveBtn.textContent = 'Saved!';
                        }

                        // Clear password inputs
                        if ( settingCurPass ) settingCurPass.value = '';
                        if ( settingNewPass ) settingNewPass.value = '';
                        if ( settingConfirmPass ) settingConfirmPass.value = '';

                        // Update in-memory user data
                        if ( res.data && res.data.user ) {
                            var u = res.data.user;
                            if ( window.scriptWriterData && window.scriptWriterData.currentUser ) {
                                window.scriptWriterData.currentUser.name = u.name;
                                window.scriptWriterData.currentUser.email = u.email;
                                window.scriptWriterData.currentUser.space_name = u.space_name;
                                window.scriptWriterData.currentUser.bio = u.bio;
                            }

                            // Update user pill display name & avatar in the dashboard header
                            var nameEl = document.querySelector( '.sw-user-name' );
                            if ( nameEl && u.name ) {
                                nameEl.textContent = u.name;
                            }
                            var avatarEl = document.querySelector( '.sw-user-avatar' );
                            if ( avatarEl && u.initial ) {
                                avatarEl.textContent = u.initial;
                            }
                            if ( userPill && u.name ) {
                                userPill.setAttribute( 'title', 'Account & Space Settings for ' + u.name );
                            }

                            // Update author name in existing script objects if rendered
                            if ( dashboardMyScripts && dashboardMyScripts.length > 0 ) {
                                for ( var i = 0; i < dashboardMyScripts.length; i++ ) {
                                    if ( dashboardMyScripts[i].is_author ) {
                                        dashboardMyScripts[i].author_name = u.name;
                                    }
                                }
                            }
                        }

                        showToast( 'Settings updated' );

                        // Automatically close modal after brief delay
                        setTimeout( function() {
                            closeSettingsModal();
                        }, 1200 );
                    } else {
                        if ( settingsSaveBtn ) {
                            settingsSaveBtn.disabled = false;
                            settingsSaveBtn.textContent = 'Save Changes';
                        }
                        showSettingsAlert( res.data && res.data.message ? res.data.message : 'Failed to update settings.', 'error' );
                    }
                } )
                .catch( function() {
                    if ( settingsSaveBtn ) {
                        settingsSaveBtn.disabled = false;
                        settingsSaveBtn.textContent = 'Save Changes';
                    }
                    showSettingsAlert( 'Connection error while saving settings. Please try again.', 'error' );
                } );
            } );
        }

        // 8d-2. Admin Space Settings Event Listeners & Form Submission
        if ( tabAuthorSettings ) {
            tabAuthorSettings.addEventListener( 'click', function() {
                switchSettingsTab( 'author' );
            } );
        }
        if ( tabSpaceSettings ) {
            tabSpaceSettings.addEventListener( 'click', function() {
                switchSettingsTab( 'space' );
            } );
        }
        if ( tabExtensionsSettings ) {
            tabExtensionsSettings.addEventListener( 'click', function() {
                switchSettingsTab( 'extensions' );
            } );
        }
        if ( extensionsCloseBtn ) {
            extensionsCloseBtn.addEventListener( 'click', closeSettingsModal );
        }

        // Modular Extension Toggles (Instant activation / deactivation)
        var extToggleBtns = document.querySelectorAll( '.sw-btn-toggle-ext' );
        extToggleBtns.forEach( function( btn ) {
            btn.addEventListener( 'click', function() {
                var extId = btn.dataset.extId;
                var currentEnabled = btn.dataset.enabled === '1';
                var newEnabled = ! currentEnabled;

                btn.disabled = true;
                btn.textContent = 'Saving...';

                var fd = new FormData();
                fd.append( 'action', 'script_writer_toggle_extension' );
                fd.append( 'nonce', window.scriptWriterData.nonce );
                fd.append( 'extension_id', extId );
                fd.append( 'enabled', newEnabled ? '1' : '0' );

                fetch( window.scriptWriterData.ajaxUrl, {
                    method: 'POST',
                    body: fd,
                    credentials: 'same-origin'
                } )
                .then( function( res ) { return res.json(); } )
                .then( function( res ) {
                    btn.disabled = false;
                    if ( res.success ) {
                        btn.dataset.enabled = newEnabled ? '1' : '0';
                        if ( newEnabled ) {
                            btn.classList.add( 'active' );
                            btn.textContent = 'Enabled';
                        } else {
                            btn.classList.remove( 'active' );
                            btn.textContent = 'Enable';
                        }
                        showToast( res.data.message || 'Extension preference saved.' );
                        setTimeout( function() {
                            window.location.reload();
                        }, 500 );
                    } else {
                        btn.textContent = currentEnabled ? 'Enabled' : 'Enable';
                        showToast( 'Failed to update extension.' );
                    }
                } )
                .catch( function() {
                    btn.disabled = false;
                    btn.textContent = currentEnabled ? 'Enabled' : 'Enable';
                    showToast( 'Error updating extension.' );
                } );
            } );
        } );

        if ( spaceSettingsBtn ) {
            spaceSettingsBtn.addEventListener( 'click', function() {
                openSettingsModal( 'space' );
            } );
        }

        if ( adminSpaceCancelBtn ) {
            adminSpaceCancelBtn.addEventListener( 'click', closeSettingsModal );
        }

        function getComputedAppUrl( slug ) {
            var s = slug ? slug.toLowerCase().replace( /[^a-z0-9_-]/g, '-' ).replace( /^-+|-+$/g, '' ) : 'andika';
            if ( ! s ) s = 'andika';
            var d = window.scriptWriterData || {};
            var base = d.homeUrl || ( window.location.origin + window.location.pathname.replace( /\/[^/]*$/, '' ) );
            if ( d.permalinkStructure ) {
                return base.replace( /\/+$/, '' ) + '/' + encodeURIComponent( s ) + '/';
            }
            return base.replace( /\/+$/, '' ) + '/?' + encodeURIComponent( s ) + '=1';
        }

        if ( adminSpaceSlug ) {
            adminSpaceSlug.addEventListener( 'input', function() {
                var clean = this.value.toLowerCase().replace( /[^a-z0-9_-]/g, '-' );
                this.value = clean;
                if ( slugPreviewCode ) {
                    slugPreviewCode.textContent = getComputedAppUrl( clean );
                }
            } );
        }

        if ( adminSpaceForm ) {
            adminSpaceForm.addEventListener( 'submit', function( e ) {
                e.preventDefault();
                if ( ! window.scriptWriterData || ! window.scriptWriterData.nonce ) return;

                var spaceName = adminSpaceName ? adminSpaceName.value.trim() : '';
                var spaceAbout = adminSpaceAbout ? adminSpaceAbout.value.trim() : '';
                var spaceSlug = adminSpaceSlug ? adminSpaceSlug.value.trim().toLowerCase().replace( /[^a-z0-9_-]/g, '-' ) : 'andika';
                var spaceDesc = adminSpaceDesc ? adminSpaceDesc.value.trim() : '';
                var loginLabel = adminLoginLabel ? adminLoginLabel.value.trim() : '';
                var loginAbout = adminLoginAbout ? adminLoginAbout.value.trim() : '';

                if ( ! spaceName ) {
                    showSettingsAlert( 'Space name cannot be empty.', 'error' );
                    if ( adminSpaceName ) adminSpaceName.focus();
                    return;
                }

                if ( ! spaceSlug ) {
                    spaceSlug = 'andika';
                }

                if ( adminSpaceSaveBtn ) {
                    adminSpaceSaveBtn.disabled = true;
                    adminSpaceSaveBtn.textContent = 'Saving Settings...';
                }
                if ( settingsAlert ) settingsAlert.style.display = 'none';

                var fd = new FormData();
                fd.append( 'action', 'script_writer_update_space_settings' );
                fd.append( 'nonce', window.scriptWriterData.nonce );
                fd.append( 'space_name', spaceName );
                fd.append( 'space_about', spaceAbout );
                fd.append( 'space_slug', spaceSlug );
                fd.append( 'space_desc', spaceDesc );
                fd.append( 'login_label', loginLabel );
                fd.append( 'login_about', loginAbout );

                fetch( window.scriptWriterData.ajaxUrl, {
                    method: 'POST',
                    body: fd,
                    credentials: 'same-origin'
                } )
                .then( function( r ) { return r.json(); } )
                .then( function( res ) {
                    if ( res.success && res.data && res.data.settings ) {
                        var s = res.data.settings;
                        showSettingsAlert( res.data.message || 'Settings updated successfully!', 'success' );
                        if ( adminSpaceSaveBtn ) {
                            adminSpaceSaveBtn.textContent = 'Saved!';
                        }

                        // Update window.scriptWriterData in memory
                        if ( window.scriptWriterData ) {
                            window.scriptWriterData.spaceName = s.space_name;
                            window.scriptWriterData.spaceAbout = s.space_about;
                            window.scriptWriterData.spaceSlug = s.space_slug;
                            window.scriptWriterData.spaceDescription = s.space_desc;
                            window.scriptWriterData.loginLabel = s.login_label;
                            window.scriptWriterData.loginAbout = s.login_about;
                            window.scriptWriterData.appUrl = s.app_url;
                        }

                        // Update live DOM elements: Header logo and tagline
                        var logoEls = document.querySelectorAll( '.sw-dash-logo' );
                        for ( var i = 0; i < logoEls.length; i++ ) {
                            logoEls[i].textContent = s.space_name;
                        }
                        var tagEls = document.querySelectorAll( '.sw-dash-tag' );
                        for ( var j = 0; j < tagEls.length; j++ ) {
                            tagEls[j].textContent = s.space_about;
                        }

                        // Update auth screen branding if present in DOM
                        var authBadgeEl = document.getElementById( 'sw-auth-space-badge' );
                        if ( authBadgeEl && s.space_name ) {
                            authBadgeEl.textContent = s.space_name + ' Writing Studio';
                        }
                        var authTitleEl = document.getElementById( 'sw-auth-space-name' );
                        if ( authTitleEl && ( s.login_label || s.space_name ) ) {
                            authTitleEl.textContent = s.login_label || s.space_name;
                        }
                        var authDescEl = document.getElementById( 'sw-auth-space-desc' );
                        if ( authDescEl && ( s.login_about || s.space_desc ) ) {
                            authDescEl.textContent = s.login_about || s.space_desc;
                        }

                        // Update browser tab document title
                        var currentDocTitle = document.title;
                        if ( currentDocTitle.indexOf( ' — ' ) !== -1 ) {
                            var titleParts = currentDocTitle.split( ' — ' );
                            document.title = titleParts[0] + ' — ' + s.space_name;
                        } else {
                            document.title = s.space_name;
                        }

                        // Update slug preview text if open
                        if ( slugPreviewCode && s.app_url ) {
                            slugPreviewCode.textContent = s.app_url;
                        }

                        // Sync browser address bar URL with dynamic permalink
                        if ( window.history && window.history.replaceState && s.app_url ) {
                            var viewParam = ( currentView === 'editor' ) ? ( ( s.app_url.indexOf('?') !== -1 ? '&' : '?' ) + 'view=editor' ) : ( ( s.app_url.indexOf('?') !== -1 ? '&' : '?' ) + 'view=dashboard' );
                            window.history.replaceState( null, '', s.app_url + viewParam );
                        }

                        // Update logout tooltip if in DOM
                        var logoutBtn = document.getElementById( 'sw-dash-logout-btn' );
                        if ( logoutBtn ) {
                            logoutBtn.setAttribute( 'title', 'Sign out of ' + s.space_name );
                        }

                        showToast( 'Settings updated' );

                        // Automatically close modal after brief delay
                        setTimeout( function() {
                            closeSettingsModal();
                        }, 1200 );
                    } else {
                        if ( adminSpaceSaveBtn ) {
                            adminSpaceSaveBtn.disabled = false;
                            adminSpaceSaveBtn.textContent = 'Save Settings';
                        }
                        showSettingsAlert( ( res.data && res.data.message ) ? res.data.message : 'Failed to update settings.', 'error' );
                    }
                } )
                .catch( function() {
                    if ( adminSpaceSaveBtn ) {
                        adminSpaceSaveBtn.disabled = false;
                        adminSpaceSaveBtn.textContent = 'Save Settings';
                    }
                    showSettingsAlert( 'Connection error while saving settings. Please try again.', 'error' );
                } );
            } );
        }

        // Global Escape Key Listener for Modals & Dropdown Menus
        document.addEventListener( 'keydown', function( e ) {
            if ( e.key === 'Escape' ) {
                if ( reviewPopover && reviewPopover.style.display !== 'none' ) {
                    e.preventDefault();
                    closeReviewPopover();
                    return;
                }
                if ( reviewDrawer && reviewDrawer.classList.contains( 'active' ) ) {
                    e.preventDefault();
                    closeReviewDrawer();
                    return;
                }
                if ( revisionsDrawer && revisionsDrawer.classList.contains( 'active' ) ) {
                    e.preventDefault();
                    closeRevisionsDrawer();
                    return;
                }
                if ( gearMenu && gearMenu.classList.contains( 'open' ) ) {
                    e.preventDefault();
                    closeGearMenu();
                    return;
                }
                if ( settingsModal && settingsModal.classList.contains( 'open' ) ) {
                    e.preventDefault();
                    closeSettingsModal();
                    return;
                }
                if ( exportModal && exportModal.classList.contains( 'open' ) ) {
                    e.preventDefault();
                    closeExportModal();
                    return;
                }
            } else if ( e.altKey && ( e.key === 'c' || e.key === 'C' ) ) {
                if ( currentView === 'editor' && textarea ) {
                    e.preventDefault();
                    triggerReviewNoteFromSelection();
                }
            }
        } );

        // 8e. Right-Click Triggers on Writing Canvas
        textarea.addEventListener( 'contextmenu', function( e ) {
            if ( ! isCtxMenuEnabled || currentView !== 'editor' ) return;
            e.preventDefault();
            showContextMenu( e.clientX, e.clientY );
        } );

        if ( canvasWrap ) {
            canvasWrap.addEventListener( 'contextmenu', function( e ) {
                if ( ! isCtxMenuEnabled || currentView !== 'editor' ) return;
                if ( e.target === textarea ) return;
                e.preventDefault();
                showContextMenu( e.clientX, e.clientY );
            } );
        }

        // Dismiss context menu on click outside, scroll, resize
        document.addEventListener( 'pointerdown', function( e ) {
            if ( ctxMenu && ctxMenu.style.display !== 'none' ) {
                if ( ! e.target.closest( '#script-writer-context-menu' ) ) {
                    hideContextMenu();
                }
            }
        } );

        textarea.addEventListener( 'scroll', hideContextMenu );
        window.addEventListener( 'resize', hideContextMenu );

        // Proximity-based Scrollbar: Keep hidden until cursor gets close to the right edge
        ( function initProximityScrollbar() {
            if ( ! textarea ) return;

            var hideTimeout = null;
            var isDraggingScrollbar = false;

            function showScrollbar() {
                if ( hideTimeout ) clearTimeout( hideTimeout );
                textarea.classList.add( 'sw-show-scrollbar' );
            }

            function scheduleHideScrollbar( delay ) {
                if ( isDraggingScrollbar ) return;
                if ( hideTimeout ) clearTimeout( hideTimeout );
                hideTimeout = setTimeout( function() {
                    if ( ! isDraggingScrollbar ) {
                        textarea.classList.remove( 'sw-show-scrollbar' );
                    }
                }, delay || 250 );
            }

            document.addEventListener( 'mousemove', function( e ) {
                if ( isDraggingScrollbar ) return;
                if ( editorView && editorView.classList.contains( 'sw-view-hidden' ) ) return;

                var rect = textarea.getBoundingClientRect();
                // Check if cursor is within 75px of the right edge of textarea
                var isNearRightEdge = (
                    e.clientY >= rect.top &&
                    e.clientY <= rect.bottom &&
                    e.clientX >= ( rect.right - 75 ) &&
                    e.clientX <= ( rect.right + 25 )
                );

                if ( isNearRightEdge ) {
                    showScrollbar();
                } else {
                    scheduleHideScrollbar( 150 );
                }
            } );

            textarea.addEventListener( 'mousedown', function( e ) {
                var rect = textarea.getBoundingClientRect();
                if ( e.clientX >= rect.right - 18 ) {
                    isDraggingScrollbar = true;
                    showScrollbar();
                }
            } );

            document.addEventListener( 'mouseup', function() {
                if ( isDraggingScrollbar ) {
                    isDraggingScrollbar = false;
                    scheduleHideScrollbar( 400 );
                }
            } );

            textarea.addEventListener( 'scroll', function() {
                showScrollbar();
                scheduleHideScrollbar( 1200 );
            } );
        } )();

        // 9. Keyboard Shortcuts
        textarea.addEventListener( 'keydown', function( e ) {
            var isMod = e.ctrlKey || e.metaKey;

            if ( isMod && e.key.toLowerCase() === 's' ) {
                e.preventDefault();
                saveScriptExplicitly();
            } else if ( isMod && e.key.toLowerCase() === 'b' ) {
                e.preventDefault();
                wrapSelection( '**', '**' );
            } else if ( isMod && e.key.toLowerCase() === 'i' ) {
                e.preventDefault();
                wrapSelection( '*', '*' );
            } else if ( isMod && e.key.toLowerCase() === 'u' ) {
                e.preventDefault();
                toggleCase();
            } else if ( isMod && e.key.toLowerCase() === 'k' ) {
                e.preventDefault();
                formatCode();
            } else if ( isMod && e.key === '/' ) {
                e.preventDefault();
                toggleLinePrefix( '// ' );
            } else if ( e.key === 'Tab' ) {
                e.preventDefault();
                if ( ! e.shiftKey ) {
                    var start = this.selectionStart;
                    var end = this.selectionEnd;
                    if ( start === end ) {
                        var val = this.value;
                        this.value = val.substring( 0, start ) + '    ' + val.substring( end );
                        this.selectionStart = this.selectionEnd = start + 4;
                        triggerAutoSave();
                        updateStats();
                    } else {
                        indentLines( true );
                    }
                } else {
                    indentLines( false );
                }
            } else if ( e.key === 'Escape' ) {
                if ( gearMenu && gearMenu.classList.contains( 'open' ) ) {
                    e.preventDefault();
                    closeGearMenu();
                    return;
                }
                if ( settingsModal && settingsModal.classList.contains( 'open' ) ) {
                    e.preventDefault();
                    closeSettingsModal();
                    return;
                }
                if ( exportModal && exportModal.classList.contains( 'open' ) ) {
                    e.preventDefault();
                    closeExportModal();
                    return;
                }
                if ( ctxMenu && ctxMenu.style.display !== 'none' ) {
                    e.preventDefault();
                    hideContextMenu();
                    return;
                }
                if ( dropdown && dropdown.classList.contains( 'open' ) ) {
                    dropdown.classList.remove( 'open' );
                    return;
                }
            }
        } );

        if ( titleInput ) {
            titleInput.addEventListener( 'keydown', function( e ) {
                if ( ( e.ctrlKey || e.metaKey ) && e.key.toLowerCase() === 's' ) {
                    e.preventDefault();
                    saveScriptExplicitly();
                } else if ( e.key === 'Enter' ) {
                    e.preventDefault();
                    textarea.focus();
                }
            } );
        }

        // 10. Live Stats (Word & Line Count)
        function updateStats() {
            if ( ! statsEl ) return;
            var val = textarea.value;
            var trimmed = val.trim();
            var words = trimmed.length > 0 ? trimmed.split( /\s+/ ).length : 0;
            var lines = val.length > 0 ? val.split( '\n' ).length : 0;
            statsEl.textContent = words + ' words · ' + lines + ' lines';
        }

        // 11. Auto-Save Logic (Local + Server DB)
        function triggerAutoSave() {
            var content = textarea.value;

            try {
                localStorage.setItem( storageKey, content );
            } catch ( err ) {}

            clearTimeout( saveTimeout );
            saveTimeout = setTimeout( function() {
                saveToServer( content );
            }, 700 );
        }

        function saveToServer( content ) {
            if ( typeof window.scriptWriterData === 'undefined' ) {
                return;
            }

            if ( statusEl ) {
                statusEl.textContent = 'saving...';
                statusEl.className = 'sw-status active';
            }

            var scriptId = textarea.dataset.scriptId || window.scriptWriterData.scriptId || 0;
            var formData = new FormData();
            formData.append( 'action', 'script_writer_save_content' );
            formData.append( 'nonce', window.scriptWriterData.nonce );
            formData.append( 'script_id', scriptId );
            formData.append( 'content', content );

            fetch( window.scriptWriterData.ajaxUrl, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            } )
            .then( function( res ) { return res.json(); } )
            .then( function( res ) {
                if ( statusEl ) {
                    statusEl.textContent = 'saved';
                    statusEl.className = 'sw-status saved';
                }
                window.Andika.emit( 'save', { id: scriptId, content: content, response: res } );
            } )
            .catch( function() {
                if ( statusEl ) {
                    statusEl.textContent = 'saved';
                    statusEl.className = 'sw-status';
                }
            } );
        }

        textarea.addEventListener( 'input', function() {
            hideContextMenu();
            triggerAutoSave();
            updateStats();
            if ( isTrackChangesActive ) {
                updateTrackChangesDiff();
            }
            renderReviewGutter();
            window.Andika.emit( 'change', {
                text: textarea.value,
                scriptId: ( textarea && textarea.dataset.scriptId ) || ( window.scriptWriterData ? window.scriptWriterData.scriptId : 0 ),
                title: titleInput ? titleInput.value : ''
            } );
        } );

        // =====================================================================
        // Initialize Andika Extension Core API
        // =====================================================================
        var andikaApi = {
            getText: function() {
                return textarea ? textarea.value : '';
            },
            setText: function( val ) {
                if ( textarea ) {
                    textarea.value = val;
                    triggerAutoSave();
                    updateStats();
                    if ( isTrackChangesActive ) {
                        updateTrackChangesDiff();
                    }
                    renderReviewGutter();
                    window.Andika.emit( 'change', {
                        text: val,
                        scriptId: andikaApi.getScriptId(),
                        title: andikaApi.getTitle()
                    } );
                }
            },
            insertAtCursor: function( text ) {
                if ( ! textarea ) return;
                var start = textarea.selectionStart;
                var end = textarea.selectionEnd;
                var curVal = textarea.value;
                textarea.value = curVal.substring( 0, start ) + text + curVal.substring( end );
                textarea.selectionStart = textarea.selectionEnd = start + text.length;
                textarea.focus();
                triggerAutoSave();
                updateStats();
                if ( isTrackChangesActive ) {
                    updateTrackChangesDiff();
                }
                renderReviewGutter();
                window.Andika.emit( 'change', {
                    text: textarea.value,
                    scriptId: andikaApi.getScriptId(),
                    title: andikaApi.getTitle()
                } );
            },
            getSelection: function() {
                if ( ! textarea ) return '';
                return textarea.value.substring( textarea.selectionStart, textarea.selectionEnd );
            },
            scrollToLine: function( lineNumber ) {
                if ( ! textarea ) return;
                var lines = textarea.value.split( '\n' );
                var charIndex = 0;
                for ( var i = 0; i < lineNumber && i < lines.length; i++ ) {
                    charIndex += lines[ i ].length + 1;
                }
                textarea.focus();
                textarea.setSelectionRange( charIndex, charIndex );
                // Approximate line height ~24px
                textarea.scrollTop = Math.max( 0, ( lineNumber - 4 ) * 24 );
            },
            getScriptId: function() {
                return textarea ? ( parseInt( textarea.dataset.scriptId, 10 ) || ( window.scriptWriterData ? window.scriptWriterData.scriptId : 0 ) ) : 0;
            },
            getTitle: function() {
                return titleInput ? titleInput.value : '';
            },
            setTitle: function( title ) {
                if ( titleInput ) {
                    titleInput.value = title;
                }
            },
            showToast: showToast,
            importFile: handlePdfImport,
            triggerImport: function() {
                if ( importFileInput ) {
                    importFileInput.click();
                }
            },
            addToolbarButton: function() {
                // Kept for compatibility: Editor toolbar is left completely untouched
                return null;
            },
            addDashboardAction: function( opts ) {
                var container = document.getElementById( 'sw-dash-ext-actions' );
                if ( ! container ) return null;
                var btn = document.createElement( 'button' );
                btn.type = 'button';
                btn.className = 'sw-btn ' + ( opts.className || '' );
                if ( opts.id ) btn.id = opts.id;
                if ( opts.title ) btn.title = opts.title;
                btn.textContent = opts.label || '';
                if ( typeof opts.onClick === 'function' ) {
                    btn.addEventListener( 'click', function( e ) {
                        opts.onClick( e, andikaApi );
                    } );
                }
                container.appendChild( btn );
                return btn;
            },
            createDrawer: function( opts ) {
                var drawerId = opts.id || 'andika-drawer-' + Math.random().toString( 36 ).substr( 2, 9 );
                var existing = document.getElementById( drawerId );
                if ( existing && existing._drawerApi ) return existing._drawerApi;

                var drawer = document.createElement( 'div' );
                drawer.id = drawerId;
                drawer.className = 'andika-drawer ' + ( opts.className || '' );
                if ( opts.width ) drawer.style.width = opts.width;

                drawer.innerHTML = [
                    '<div class="andika-drawer-header">',
                    '   <div class="andika-drawer-title-wrap">',
                    '       <h3 class="andika-drawer-title">' + ( opts.title || '' ) + '</h3>',
                    '   </div>',
                    '   <button type="button" class="andika-drawer-close-btn" title="Close (Esc)">&times;</button>',
                    '</div>',
                    '<div class="andika-drawer-body">',
                    opts.contentHtml || '',
                    '</div>'
                ].join( '' );

                var screenEl = document.getElementById( 'script-writer-screen' ) || document.body;
                screenEl.appendChild( drawer );

                var closeBtn = drawer.querySelector( '.andika-drawer-close-btn' );
                var bodyEl = drawer.querySelector( '.andika-drawer-body' );

                function open() {
                    drawer.classList.add( 'active' );
                    if ( typeof opts.onOpen === 'function' ) opts.onOpen( andikaApi );
                }
                function close() {
                    drawer.classList.remove( 'active' );
                    if ( typeof opts.onClose === 'function' ) opts.onClose( andikaApi );
                }
                function toggle() {
                    if ( drawer.classList.contains( 'active' ) ) {
                        close();
                    } else {
                        open();
                    }
                }

                if ( closeBtn ) {
                    closeBtn.addEventListener( 'click', function( e ) {
                        if ( e ) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                        close();
                    } );
                    closeBtn.addEventListener( 'pointerdown', function( e ) {
                        if ( e ) {
                            e.stopPropagation();
                        }
                    } );
                }

                // Click outside drawer to dismiss
                document.addEventListener( 'mousedown', function( e ) {
                    if ( drawer.classList.contains( 'active' ) ) {
                        if ( ! drawer.contains( e.target ) && ! e.target.closest( '#andika-screenplay-pill' ) ) {
                            close();
                        }
                    }
                } );

                document.addEventListener( 'keydown', function( e ) {
                    if ( e.key === 'Escape' && drawer.classList.contains( 'active' ) ) {
                        close();
                    }
                } );

                var drawerApi = {
                    element: drawer,
                    body: bodyEl,
                    open: open,
                    close: close,
                    toggle: toggle,
                    isOpen: function() { return drawer.classList.contains( 'active' ); },
                    setContent: function( html ) { bodyEl.innerHTML = html; }
                };

                drawer._drawerApi = drawerApi;
                return drawerApi;
            },
            registerExportProvider: registerExportProvider,
            setActiveExportProvider: function( id ) {
                if ( exportProviders[ id ] ) {
                    activeExportProviderId = id;
                    var titleEl = document.getElementById( 'sw-export-format-title' );
                    var tagEl = document.getElementById( 'sw-export-format-tag' );
                    var subEl = document.getElementById( 'sw-export-format-sub' );
                    var helpEl = document.getElementById( 'sw-export-help' );
                    var prov = exportProviders[ id ];
                    if ( titleEl && prov.name ) titleEl.textContent = prov.name;
                    if ( tagEl && prov.tag ) tagEl.textContent = prov.tag;
                    if ( subEl && prov.sub ) subEl.textContent = prov.sub;
                    if ( helpEl && prov.help ) helpEl.textContent = prov.help;
                    updateManuscriptPreview();
                }
            },
            getActiveExportProvider: function() {
                return exportProviders[ activeExportProviderId ];
            },
            getExportProviders: function() {
                return exportProviders;
            },
            openExportModal: openExportModal,
            closeExportModal: closeExportModal,
            updateExportPreview: updateManuscriptPreview,
            openReviewDrawer: openReviewDrawer,
            closeReviewDrawer: closeReviewDrawer,
            openRevisionsDrawer: openRevisionsDrawer,
            closeRevisionsDrawer: closeRevisionsDrawer,
            loadComments: loadComments,
            getComments: function() {
                return currentComments;
            },
            toggleTrackChanges: toggleTrackChanges,
            on: window.Andika.on,
            off: window.Andika.off,
            emit: window.Andika.emit
        };

        window.Andika._initAll( andikaApi );
    } );
} )();
