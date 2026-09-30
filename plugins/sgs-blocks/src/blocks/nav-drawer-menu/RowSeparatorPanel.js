import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, SelectControl } from '@wordpress/components';

/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — Styles tab: the "Row divider"
 * panel (the drawer's counterpart of the bar's "Item separator (bar)" panel,
 * FR-41-37).
 *
 * Shape controls only — colour and hover treatment live in the Colour panel
 * ("Row divider colour"), the same split as the row's own border above it.
 * The divider is a horizontal rule above every top-level row except the first,
 * independent of the row border (`itemBorderWidth`), which is a separate
 * control with its own colours.
 *
 * Mounted directly under edit.js's `InspectorControls group="styles"` tree,
 * not behind a second wrapper hop, so inspector-scan rule 21's control corpus
 * can see the attribute names.
 *
 * @param {Object}   root0                    Props.
 * @param {string}   root0.itemSeparatorWidth `itemSeparatorWidth` — a CSS length, e.g. '1px'.
 * @param {string}   root0.itemSeparatorStyle `itemSeparatorStyle` — solid | dashed | dotted.
 * @param {string}   root0.itemSeparatorPosition `itemSeparatorPosition` — between | below.
 * @param {Function} root0.setAttributes      The block's attribute setter.
 */
export default function RowSeparatorPanel( {
	itemSeparatorWidth,
	itemSeparatorStyle,
	itemSeparatorPosition,
	setAttributes,
} ) {
	return (
		<PanelBody title={ __( 'Row divider', 'sgs-blocks' ) } initialOpen={ false }>
			<TextControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Width', 'sgs-blocks' ) }
				value={ itemSeparatorWidth || '' }
				onChange={ ( val ) =>
					setAttributes( { itemSeparatorWidth: val || '' } )
				}
				help={ __(
					'A CSS length, e.g. 1px. Empty clears the divider entirely.',
					'sgs-blocks'
				) }
			/>
			<SelectControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Style', 'sgs-blocks' ) }
				value={ itemSeparatorStyle || 'solid' }
				options={ [
					{ label: __( 'Solid', 'sgs-blocks' ), value: 'solid' },
					{ label: __( 'Dashed', 'sgs-blocks' ), value: 'dashed' },
					{ label: __( 'Dotted', 'sgs-blocks' ), value: 'dotted' },
				] }
				onChange={ ( val ) => setAttributes( { itemSeparatorStyle: val } ) }
			/>
			<SelectControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Position', 'sgs-blocks' ) }
				value={ itemSeparatorPosition || 'between' }
				options={ [
					{ label: __( 'Between rows', 'sgs-blocks' ), value: 'between' },
					{ label: __( 'Below every row (under its open section)', 'sgs-blocks' ), value: 'below' },
				] }
				onChange={ ( val ) => setAttributes( { itemSeparatorPosition: val } ) }
			/>
			<p className="components-base-control__help">
				{ __(
					'A horizontal line between stacked top-level rows — independent of the row border above, with its own colour and hover treatment in the Colour panel.',
					'sgs-blocks'
				) }
			</p>
		</PanelBody>
	);
}
