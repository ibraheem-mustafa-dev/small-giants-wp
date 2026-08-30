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
import FocalPositionField from '../../FocalPositionField.js';
import { validate, disclosure } from './focal-point.js';

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
		const key = mediaStoredAttrName( blockSlug, prefix, 'ObjectPosition' );
		if ( 'visible' === disc.state ) {
			rows.push(
				<FocalPositionField
					key={ key }
					label={ __( 'Focal point', 'sgs-blocks' ) }
					url={ previewUrl }
					format={ format }
					value={ attributes[ key ] }
					onChange={ ( next ) =>
						setAttributes( {
							[ key ]: 'css-string' === format ? validate( next, 'ObjectPosition' ) : next,
						} )
					}
				/>
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
