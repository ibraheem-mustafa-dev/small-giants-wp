'use strict';
// Mock for @wordpress/editor — the editor store and its slot components render nothing in tests.
module.exports = {
	store: 'core/editor',
	PluginDocumentSettingPanel: () => null,
	PluginSidebar: () => null,
	PluginSidebarMoreMenuItem: () => null,
};
