/**
 * `focal-point` atom — CONTROL half (JSX).
 *
 * Split from the pure logic in `focal-point.js` per the purity contract
 * (scripts/check-media-atom-purity.js): this half owns the JSX and the
 * `FocalPositionField` import (which itself imports `@wordpress/components`,
 * a webpack EXTERNAL not installed in node_modules — plain Node cannot load
 * a module that imports it, transitively). Only `focal-point.js`'s
 * `css()`/`validate()`/`disclosure()`/`resolvePosition()` need to be
 * Node-importable; this file is a webpack-only concern.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import { mediaStoredAttrName } from '../../MediaElementControls.js';
import ResponsiveControl from '../../ResponsiveControl.js';
import FocalPositionField from '../../FocalPositionField.js';
import { validate, disclosure } from './focal-point.js';

/**
 * Resolve what a tier VISUALLY falls back to, for the inherit hint — mirrors
 * the CSS cascade in `assets/css/media-atoms/focal-point.css` (mobile ->
 * tablet -> desktop -> the 'center center' default).
 *
 * @param {Object} attributes Block attributes.
 * @param {Object} tierKeys   `{desktop, tablet, mobile}` attribute names.
 * @param {string} tier       'tablet' | 'mobile'.
 * @return {string} The value this tier inherits when it has no explicit one.
 */
function resolveInheritedPosition( attributes, tierKeys, tier ) {
	const fallback = __( 'centre centre', 'sgs-blocks' );
	if ( 'mobile' === tier ) {
		return attributes[ tierKeys.tablet ] || attributes[ tierKeys.desktop ] || fallback;
	}
	return attributes[ tierKeys.desktop ] || fallback;
}

/**
 * Bare inspector rows for this atom. Mounts no `InspectorControls`/
 * `PanelBody`; the caller places these rows in whichever panel owns media
 * controls for that surface.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   [props.prefix]      Surface prefix.
 * @param {string}   [props.blockSlug]   Block slug, for `STORED_AS` resolution.
 * @param {string}   [props.scope]       'element' | 'backdrop' | 'both'.
 * @param {'xy'|'css-string'} [props.format] Storage shape for the ELEMENT
 *                                           scope row only — 'css-string'
 *                                           (default) matches this atom's own
 *                                           canonical shape; pass 'xy' for a
 *                                           surface still on the universal
 *                                           `sgsObjectPosition` extension.
 * @param {string}   [props.previewUrl]  Optional media URL for the crosshair
 *                                       thumbnail.
 * @return {Array} React elements — bare rows.
 *
 * ── ELEMENT-scope row is TIERED (2026-09-01) ────────────────────────────
 * `ObjectPosition` is carried by `MEDIA_TIERED_BASES`, and the atom's
 * `css()`/PHP twin/CSS partial already emit the full tablet/mobile fallback
 * chain. This control half was the one remaining gap — it only read/wrote
 * the base key with no tier awareness. Now wrapped in `ResponsiveControl`,
 * same pattern as `object-fit.control.js`'s element-scope row. The
 * BACKDROP-scope row (`Position`) stays untiered — not in
 * `MEDIA_TIERED_BASES`.
 */
export function control( {
	attributes,
	setAttributes,
	prefix = '',
	blockSlug = '',
	scope = 'both',
	format = 'css-string',
	previewUrl = '',
} ) {
	const rows = [];

	if ( 'element' === scope || 'both' === scope ) {
		const disc = disclosure( { attributes, prefix, blockSlug, scope: 'element' } );
		// OMITTED drops the row; DISABLED renders it greyed with the reason, so a
		// client can see the control exists and learn what unlocks it.
		if ( 'omitted' !== disc.state ) {
			// Tiered — MEDIA_TIERED_BASES carries `ObjectPosition`. Reads/writes
			// whichever tier the global device toggle currently has active, via
			// `ResponsiveControl`.
			const tierKeys = {
				desktop: mediaStoredAttrName( blockSlug, prefix, 'ObjectPosition' ),
				tablet: mediaStoredAttrName( blockSlug, prefix, 'ObjectPositionTablet' ),
				mobile: mediaStoredAttrName( blockSlug, prefix, 'ObjectPositionMobile' ),
			};

			rows.push(
				<ResponsiveControl
					key={ tierKeys.desktop }
					label={ __( 'Focal point', 'sgs-blocks' ) }
					value={ attributes[ tierKeys.desktop ] }
					isInherited={ ( tier ) =>
						'desktop' !== tier && ! attributes[ tierKeys[ tier ] ]
					}
					resolvedValue={ ( tier ) =>
						resolveInheritedPosition( attributes, tierKeys, tier )
					}
					onReset={ ( tier ) =>
						setAttributes( { [ tierKeys[ tier ] ]: '' } )
					}
				>
					{ ( breakpoint ) => (
						<FocalPositionField
							label={ __( 'Focal point', 'sgs-blocks' ) }
							url={ previewUrl }
							format={ format }
							disabled={ 'disabled' === disc.state }
							help={ disc.hiddenReason || undefined }
							value={ attributes[ tierKeys[ breakpoint ] ] }
							onChange={ ( next ) =>
								setAttributes( {
									[ tierKeys[ breakpoint ] ]:
										'css-string' === format
											? validate( next, 'ObjectPosition' )
											: next,
								} )
							}
						/>
					) }
				</ResponsiveControl>
			);
		}
	}

	if ( 'backdrop' === scope || 'both' === scope ) {
		const posKey = mediaStoredAttrName( blockSlug, prefix, 'Position' );
		rows.push(
			<FocalPositionField
				key={ posKey }
				label={ __( 'Background position', 'sgs-blocks' ) }
				format="css-string"
				value={ attributes[ posKey ] }
				onChange={ ( next ) =>
					setAttributes( { [ posKey ]: validate( next, 'Position' ) } )
				}
			/>
		);
	}

	return rows;
}
