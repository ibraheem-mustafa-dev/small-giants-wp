/**
 * `shadow` atom: L2b control + disclosure + validator + value-setter.
 *
 * Two custom properties, `--sgs-media-box-shadow` (resting) and `--sgs-media-box-shadow-hover`,
 * applied on `.sgs-media-el`. The shadow is composed by the shared composer
 * (`src/utils/shadow-layers.js`, the twin of `includes/helpers-shadow-layers.php`); this atom no
 * longer keeps its own mirrored copy of the rule. Both twins are pinned to
 * `tests/shared/shadow-compose-cases.json`.
 *
 * `css()` mirrors `includes/media/atoms/shadow.php`'s `sgs_media_atom_shadow_css()`.
 *
 * LOGIC HALF ONLY. Split from the JSX control per the purity contract
 * (`scripts/check-media-atom-purity.js`): this module must be importable by plain Node, with no
 * JSX and no `@wordpress/components`. The JSX control lives in `shadow.control.js`.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import { mediaStoredAttrName } from '../../MediaElementControls.js';
import { composeShadow } from '../../../utils/shadow-layers.js';
import { shadowHoverValue } from '../../../utils/shadow-hover.js';

/**
 * @param {string} prefix    Surface prefix.
 * @param {string} blockSlug Block slug, for STORED_AS resolution.
 * @return {{base: string, colour: string, hoverColour: string}} Stored attribute names.
 */
export function attrKeys( prefix, blockSlug ) {
	return {
		base: mediaStoredAttrName( blockSlug, prefix, 'BoxShadow' ),
		colour: mediaStoredAttrName( blockSlug, prefix, 'BoxShadowColour' ),
		hoverColour: mediaStoredAttrName( blockSlug, prefix, 'BoxShadowColourHover' ),
	};
}

/**
 * Compose a shadow SHAPE with a separate colour attribute into the final CSS `box-shadow` value.
 *
 * @param {*} shape  Layers, a bare preset slug, or `none`.
 * @param {*} colour Colour entry or list; ignored when `shape` is a preset slug.
 * @return {string} CSS `box-shadow` value, or '' when there is nothing to draw.
 */
export function resolveShadow( shape, colour ) {
	return composeShadow( 'string' === typeof shape ? shape : '', 'string' === typeof colour ? colour : '' );
}

/**
 * The hover colour row only means anything once a shape is set.
 *
 * @param {Object} props
 * @param {Object} props.attributes
 * @param {string} [props.prefix]
 * @param {string} [props.blockSlug]
 * @return {{state: string, hiddenReason: (string|null)}}
 */
export function disclosure( { attributes = {}, prefix = '', blockSlug = '' } = {} ) {
	const keys = attrKeys( prefix, blockSlug );
	if ( ! attributes[ keys.base ] ) {
		return {
			state: 'disabled',
			hiddenReason: __( 'The hover colour only applies once a shadow is set.', 'sgs-blocks' ),
		};
	}
	return { state: 'shown', hiddenReason: null };
}

/**
 * Reject-to-default for a shape string — `ShadowControl` owns the actual
 * builder UI, so this is a defensive pass-through, mirroring the same
 * contract shape every other atom's `validate()` carries.
 *
 * @param {*} value Raw candidate.
 * @return {string} `value` if it is a string, otherwise `''`.
 */
export function validate( value ) {
	return 'string' === typeof value ? value : '';
}

/**
 * Custom-property declarations for this atom. Mirrors
 * `includes/media/atoms/shadow.php`'s `sgs_media_atom_shadow_css()` exactly.
 *
 * @param {Object} props
 * @param {Object} props.attributes
 * @param {string} [props.prefix]
 * @param {string} [props.blockSlug]
 * @param {Object<string,string>} [props.hoverMap] `settings.custom.shadowHover` (design H4/H5,
 *   task lift-2) — the AUTOMATIC LIFT this atom draws when no explicit hover colour is set.
 *   Threaded in by the caller (`canvasStyle.js::elementCustomProperties()`) because this
 *   module has no WordPress data access of its own (the purity contract,
 *   `scripts/check-media-atom-purity.js`); absent/undefined simply means no lift resolves.
 * @return {string[]} `--custom-property:value;` declarations, never bare rules.
 */
export function css( { attributes, prefix = '', blockSlug = '', hoverMap } = {} ) {
	const decls = [];
	const keys = attrKeys( prefix, blockSlug );
	const shape = attributes[ keys.base ];
	if ( ! shape ) {
		return decls;
	}

	const colour = attributes[ keys.colour ];
	const resting = resolveShadow( shape, colour );
	if ( resting ) {
		decls.push( `--sgs-media-box-shadow:${ resting }` );
	}

	const hoverColour = attributes[ keys.hoverColour ];
	if ( hoverColour ) {
		const hover = resolveShadow( shape, hoverColour );
		if ( hover ) {
			decls.push( `--sgs-media-box-shadow-hover:${ hover }` );
		}
	} else if ( false !== attributes.shadowLiftOnHover ) {
		// AUTOMATIC LIFT — only when NO explicit hover colour is set; the explicit branch
		// above always wins outright. Mirrors `sgs_media_atom_shadow_css()`'s PHP branch,
		// minus the block-TYPE-level `supports.sgs.shadowLift` gate (unavailable to a
		// plain-Node-importable module without a WordPress import — sgs/media is not an
		// overlay block, so the attribute-level switch alone is the gate that matters here).
		const lift = 'string' === typeof shape ? shadowHoverValue( shape, colour, hoverMap ) : '';
		if ( lift ) {
			decls.push( `--sgs-media-box-shadow-hover:${ lift }` );
		}
	}

	return decls;
}
