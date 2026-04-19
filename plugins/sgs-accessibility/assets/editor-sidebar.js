/**
 * SGS Accessibility — Gutenberg sidebar panel.
 *
 * Registers a PluginSidebar that shows:
 *   - A warning when the currently selected block is an Image with no alt text.
 *   - The full heading hierarchy of the current post, indented by level.
 *
 * Uses global wp.* variables — no build step required.
 */
( function () {
	'use strict';

	var el         = wp.element.createElement;
	var Fragment   = wp.element.Fragment;
	var useState   = wp.element.useState;
	var useEffect  = wp.element.useEffect;

	var PluginSidebar  = wp.editPost.PluginSidebar;
	var registerPlugin = wp.plugins.registerPlugin;

	var useSelect = wp.data.useSelect;

	var PanelBody = wp.components.PanelBody;
	var Notice    = wp.components.Notice;

	/**
	 * Recursively flatten all blocks (including nested innerBlocks).
	 *
	 * @param {Array} blocks Top-level blocks array.
	 * @returns {Array} Flat list of all blocks.
	 */
	function flattenBlocks( blocks ) {
		var flat = [];
		blocks.forEach( function ( block ) {
			flat.push( block );
			if ( block.innerBlocks && block.innerBlocks.length ) {
				flat = flat.concat( flattenBlocks( block.innerBlocks ) );
			}
		} );
		return flat;
	}

	/**
	 * SGS Accessibility Sidebar component.
	 *
	 * @returns {wp.element.WPElement} Rendered sidebar.
	 */
	function SGSAccessibilitySidebar() {
		var selectedBlock = useSelect( function ( select ) {
			return select( 'core/block-editor' ).getSelectedBlock();
		}, [] );

		var allBlocks = useSelect( function ( select ) {
			return select( 'core/block-editor' ).getBlocks();
		}, [] );

		// ── Image alt-text warning ────────────────────────────────────────────
		var imageWarning = null;
		if ( selectedBlock && selectedBlock.name === 'core/image' ) {
			var alt = selectedBlock.attributes && selectedBlock.attributes.alt;
			if ( ! alt || alt.trim() === '' ) {
				imageWarning = el(
					Notice,
					{
						status:      'warning',
						isDismissible: false,
					},
					'⚠️ This image has no alt text. Add a description in the block settings.'
				);
			}
		}

		// ── Heading hierarchy ─────────────────────────────────────────────────
		var flat     = flattenBlocks( allBlocks );
		var headings = flat.filter( function ( b ) {
			return b.name === 'core/heading';
		} );

		var headingList = null;
		if ( headings.length === 0 ) {
			headingList = el( 'p', { style: { color: '#888', fontSize: '12px' } }, 'No headings found in this post.' );
		} else {
			var prevLevel  = 0;
			var hierarchyOk = true;

			var items = headings.map( function ( block, idx ) {
				var level   = block.attributes && block.attributes.level ? block.attributes.level : 2;
				var content = block.attributes && block.attributes.content ? block.attributes.content : '(empty heading)';

				// Strip HTML tags from content for display.
				var text = content.replace( /<[^>]+>/g, '' ) || '(empty heading)';

				var skipped = prevLevel > 0 && level > prevLevel + 1;
				if ( skipped ) {
					hierarchyOk = false;
				}
				prevLevel = level;

				var indent = ( level - 1 ) * 12;
				return el(
					'div',
					{
						key:   idx,
						style: {
							paddingLeft:   indent + 'px',
							marginBottom:  '4px',
							fontSize:      '12px',
							color:         skipped ? '#cc1818' : '#1d2327',
							fontWeight:    level <= 2 ? '600' : '400',
						},
					},
					el(
						'span',
						{
							style: {
								display:         'inline-block',
								minWidth:        '28px',
								color:           '#666',
								fontFamily:      'monospace',
								marginRight:     '4px',
							},
						},
						'H' + level
					),
					skipped
						? el( 'span', { style: { color: '#cc1818' } }, '⚠️ ' )
						: null,
					text
				);
			} );

			headingList = el(
				Fragment,
				null,
				hierarchyOk
					? null
					: el(
						Notice,
						{ status: 'warning', isDismissible: false },
						'⚠️ Heading levels are skipped. Headings marked in red are out of sequence.'
					),
				el( 'div', { style: { marginTop: '8px' } }, items )
			);
		}

		// ── Alt-text check when no image is selected ──────────────────────────
		var missingAltCount = flat.filter( function ( b ) {
			return (
				b.name === 'core/image' &&
				( ! b.attributes.alt || b.attributes.alt.trim() === '' )
			);
		} ).length;

		var globalImageNotice = null;
		if ( missingAltCount > 0 && ( ! selectedBlock || selectedBlock.name !== 'core/image' ) ) {
			globalImageNotice = el(
				Notice,
				{ status: 'warning', isDismissible: false },
				'⚠️ ' + missingAltCount + ' image' + ( missingAltCount > 1 ? 's' : '' ) + ' in this post have no alt text.'
			);
		}

		// ── Render ────────────────────────────────────────────────────────────
		return el(
			PluginSidebar,
			{
				name:  'sgs-accessibility-sidebar',
				title: 'Accessibility',
				icon:  'universal-access-alt',
			},
			el(
				PanelBody,
				{ title: 'Image Alt Text', initialOpen: true },
				imageWarning    || globalImageNotice ||
					el( 'p', { style: { fontSize: '12px', color: '#276800' } }, '✓ Selected image has alt text.' )
			),
			el(
				PanelBody,
				{ title: 'Heading Structure', initialOpen: true },
				headingList
			)
		);
	}

	// Register the plugin / sidebar.
	registerPlugin( 'sgs-accessibility-sidebar', {
		render: SGSAccessibilitySidebar,
	} );
}() );
