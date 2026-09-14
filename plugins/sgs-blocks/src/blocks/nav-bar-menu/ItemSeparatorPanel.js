import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, SelectControl } from '@wordpress/components';

/**
 * SGS Nav Bar Menu (sgs/nav-bar-menu) — Styles tab: the "Item separator (bar)" panel
 * (FR-41-37, 2026-09-13).
 *
 * Split out of edit.js (file-size maintenance pass, 2026-09-14) — pure
 * relocation, verbatim JSX, mounted directly under edit.js's own
 * `InspectorControls group="styles"` tree exactly like every sibling panel
 * (BarPanel, ItemsPanel, etc.) — NOT behind a second wrapper hop. A second
 * hop is what previously blinded inspector-scan rule 21's control corpus
 * (measured 2026-09-11: 21 findings → 48, see edit.js's own docblock); a
 * directly-mounted sibling component does not have that failure mode.
 *
 * Shape controls only — colour lives in the Colour panel (Spec 41 §9.6), same
 * split as the item border's own underline/separator family above it.
 *
 * Bar-only by construction: the caller omits (not disables) this panel inside
 * a drawer instance, where a vertical list has no "next item to the right".
 *
 * @param {Object}   root0                          Props.
 * @param {string}   root0.itemSeparatorWidth       `itemSeparatorWidth` — a CSS length, e.g. '1px'.
 * @param {string}   root0.itemSeparatorStyle       `itemSeparatorStyle` — solid | dashed | dotted.
 * @param {Function} root0.setAttributes            The block's attribute setter.
 */
export default function ItemSeparatorPanel( {
	itemSeparatorWidth,
	itemSeparatorStyle,
	setAttributes,
} ) {
	return (
		<PanelBody
			title={ __( 'Item separator (bar)', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<TextControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Width', 'sgs-blocks' ) }
				value={ itemSeparatorWidth || '' }
				onChange={ ( val ) =>
					setAttributes( { itemSeparatorWidth: val || '' } )
				}
				help={ __(
					'A CSS length, e.g. 1px. Empty clears the separator entirely.',
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
			<p className="components-base-control__help">
				{ __(
					'A vertical line between adjacent top-level bar items — independent of the underline above, with its own colour in the Colour panel.',
					'sgs-blocks'
				) }
			</p>
		</PanelBody>
	);
}
