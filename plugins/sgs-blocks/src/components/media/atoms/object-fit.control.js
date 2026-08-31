/**
 * `object-fit` atom — CONTROL half (JSX).
 *
 * Split from the pure logic in `object-fit.js` per the purity contract
 * (scripts/check-media-atom-purity.js): this half owns the JSX and the
 * `@wordpress/components` import (a webpack EXTERNAL, not installed in
 * node_modules — plain Node cannot load a module that imports it). Only
 * `object-fit.js`'s `css()`/`validate()`/`disclosure()` need to be
 * Node-importable; this file is a webpack-only concern.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import { mediaStoredAttrName } from '../../MediaElementControls.js';
import { MEDIA_ATOMS } from './registry.js';
import ObjectFitField from '../controls/ObjectFitField.js';
import { validate, disclosure } from './object-fit.js';

const ATOM_ID = 'object-fit';

/**
 * Bare inspector rows for this atom — one per scope the surface asks for.
 * Mounts no `InspectorControls`/`PanelBody`; the caller places these rows in
 * whichever panel owns media controls for that surface.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   [props.prefix]      Surface prefix ('' for unprefixed).
 * @param {string}   [props.blockSlug]   Block slug, for `STORED_AS` resolution.
 * @param {string}   [props.scope]       'element' | 'backdrop' | 'both'.
 * @return {Array} React elements — bare rows, never wrapped in their own panel.
 */
export function control( {
	attributes,
	setAttributes,
	prefix = '',
	blockSlug = '',
	scope = 'both',
} ) {
	const rows = [];
	const disc = disclosure();

	// `state` is the closed vocabulary shown | disabled | omitted (registry.js).
	// OMITTED means the control structurally cannot apply here, so no row at all.
	if ( 'omitted' === disc.state ) {
		return rows;
	}
	const isDisabled = 'disabled' === disc.state;

	if ( 'element' === scope || 'both' === scope ) {
		const key = mediaStoredAttrName( blockSlug, prefix, 'ObjectFit' );
		rows.push(
			<ObjectFitField
				key={ key }
				label={ __( 'Object fit', 'sgs-blocks' ) }
				value={ attributes[ key ] }
				vocabulary={ MEDIA_ATOMS[ ATOM_ID ].vocabulary.element }
				prefix={ prefix }
				disabled={ isDisabled }
				hiddenReason={ disc.hiddenReason }
				onChange={ ( next ) =>
					setAttributes( { [ key ]: validate( next, 'element' ) } )
				}
			/>
		);
	}

	if ( 'backdrop' === scope || 'both' === scope ) {
		const key = mediaStoredAttrName( blockSlug, prefix, 'Size' );
		rows.push(
			<ObjectFitField
				key={ key }
				label={ __( 'Background size', 'sgs-blocks' ) }
				value={ attributes[ key ] }
				vocabulary={ MEDIA_ATOMS[ ATOM_ID ].vocabulary.backdrop }
				prefix={ prefix }
				disabled={ isDisabled }
				hiddenReason={ disc.hiddenReason }
				onChange={ ( next ) =>
					setAttributes( { [ key ]: validate( next, 'backdrop' ) } )
				}
			/>
		);
	}

	return rows;
}
