/**
 * SGS Theme — Header Mode Editor Panel
 *
 * Adds a "Header Behaviour" panel to the block editor sidebar
 * allowing per-page header mode selection (sticky, transparent, etc.).
 *
 * @package SGS\Theme
 */

( function () {
	'use strict';

	const { registerPlugin } = wp.plugins;
	const { PluginDocumentSettingPanel } = wp.editPost;
	const { SelectControl } = wp.components;
	const { useSelect, useDispatch } = wp.data;
	const { createElement } = wp.element;
	const { __ } = wp.i18n;

	const META_KEY = '_sgs_header_mode';

	const HEADER_MODES = [
		{ label: __( 'Default (use global setting)', 'sgs-theme' ), value: '' },
		{ label: __( 'Static', 'sgs-theme' ), value: 'static' },
		{ label: __( 'Sticky', 'sgs-theme' ), value: 'sticky' },
		{ label: __( 'Transparent', 'sgs-theme' ), value: 'transparent' },
		{ label: __( 'Transparent + Sticky', 'sgs-theme' ), value: 'transparent-sticky' },
		{ label: __( 'Smart Reveal', 'sgs-theme' ), value: 'smart-reveal' },
		{ label: __( 'Shrink on Scroll', 'sgs-theme' ), value: 'shrink' },
		{ label: __( 'Hidden', 'sgs-theme' ), value: 'hidden' },
	];

	/**
	 * Header mode panel component.
	 */
	function HeaderModePanel() {
		var meta = useSelect( function ( select ) {
			return select( 'core/editor' ).getEditedPostAttribute( 'meta' ) || {};
		}, [] );

		var editPost = useDispatch( 'core/editor' ).editPost;

		var currentMode = meta[ META_KEY ] || '';

		function onChange( newValue ) {
			editPost( {
				meta: Object.assign( {}, meta, { [ META_KEY ]: newValue } ),
			} );
		}

		return createElement(
			PluginDocumentSettingPanel,
			{
				name: 'sgs-header-mode',
				title: __( 'Header Behaviour', 'sgs-theme' ),
				icon: 'admin-appearance',
			},
			createElement( SelectControl, {
				label: __( 'Header mode for this page', 'sgs-theme' ),
				value: currentMode,
				options: HEADER_MODES,
				onChange: onChange,
				help: __(
					'Override the global header mode for this page only. Leave as "Default" to use the setting from Settings > SGS Header.',
					'sgs-theme'
				),
			} )
		);
	}

	registerPlugin( 'sgs-header-mode-panel', {
		render: HeaderModePanel,
		icon: null,
	} );
} )();
