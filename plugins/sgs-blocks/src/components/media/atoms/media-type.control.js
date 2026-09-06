/**
 * `media-type` atom — CONTROL half (JSX-equivalent `control()`, via
 * `createElement()`).
 *
 * Pairs with `media-type.js` (the pure `css()`/`validate()`/`disclosure()`
 * half — see its docblock for the full reconciliation this atom exists for).
 * Split per `scripts/check-media-atom-purity.js`: this file owns every
 * import the parity gate's plain-Node import cannot resolve
 * (`@wordpress/components`-derived controls), so the logic half stays
 * importable there.
 *
 * ⛔ NON-DESTRUCTIVE BY CONSTRUCTION. `control()` only ever calls
 * `setAttributes()` on the MediaType key(s) it owns — it never touches
 * `Image`/`Video`/`Svg` source attributes. Switching type and switching back
 * cannot lose the other type's stored media, because nothing here ever
 * deletes it; the OTHER atom (`source`) owns those attributes and this one
 * never reaches into them.
 *
 * ⛔ WRITTEN WITH `createElement()`, NOT JSX, even though this half is not
 * imported by the plain-Node parity gate — kept consistent with the rest of
 * this atom pair and with `video-behaviour.control.js`.
 *
 * @package SGS\Blocks
 */
import { createElement, Fragment } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import MediaTypeControl from '../controls/MediaTypeControl.js';
import VideoSourceControl from '../controls/VideoSourceControl.js';
import { mediaAttrName, mediaStoredAttrName } from '../../MediaElementControls.js';
import { validate } from './media-type.js';

/**
 * Bare control rows. Never its own `<InspectorControls>` — the calling
 * block's panel owns that.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @param {string}   [props.prefix]      Surface prefix ('' for unprefixed).
 * @param {string}   props.blockSlug     e.g. 'sgs/media'.
 */
export function control( { attributes, setAttributes, prefix = '', blockSlug } ) {
	const baseKey = mediaStoredAttrName( blockSlug, prefix, 'MediaType' );
	// Tier siblings are NOT part of the generated key set (MediaType is not
	// in MEDIA_TIERED_BASES) — a surface that wants them declares its own,
	// as hero does. Presence in `attributes` is the only honest signal that
	// a given surface has opted in; this atom never invents the attribute.
	const tabletKey = mediaAttrName( prefix, 'MediaType' ) + 'Tablet';
	const mobileKey = mediaAttrName( prefix, 'MediaType' ) + 'Mobile';
	const sourceKey = mediaStoredAttrName( blockSlug, prefix, 'VideoSource' );

	const hasTablet = Object.prototype.hasOwnProperty.call( attributes, tabletKey );
	const hasMobile = Object.prototype.hasOwnProperty.call( attributes, mobileKey );
	const hasVideoSource = Object.prototype.hasOwnProperty.call( attributes, sourceKey );
	const currentType = attributes[ baseKey ] || 'image';

	const rows = [
		createElement( MediaTypeControl, {
			key: 'base',
			label: __( 'Media type', 'sgs-blocks' ),
			value: attributes[ baseKey ],
			onChange: ( value ) => setAttributes( { [ baseKey ]: validate( value ) } ),
		} ),
	];

	if ( hasTablet ) {
		rows.push(
			createElement( MediaTypeControl, {
				key: 'tablet',
				label: __( 'Media type — tablet', 'sgs-blocks' ),
				value: attributes[ tabletKey ],
				allowInherit: true,
				onChange: ( value ) =>
					setAttributes( {
						[ tabletKey ]: validate( value, { allowInherit: true } ),
					} ),
			} )
		);
	}

	if ( hasMobile ) {
		rows.push(
			createElement( MediaTypeControl, {
				key: 'mobile',
				label: __( 'Media type — mobile', 'sgs-blocks' ),
				value: attributes[ mobileKey ],
				allowInherit: true,
				onChange: ( value ) =>
					setAttributes( {
						[ mobileKey ]: validate( value, { allowInherit: true } ),
					} ),
			} )
		);
	}

	if ( hasVideoSource && 'video' === currentType ) {
		rows.push(
			createElement( VideoSourceControl, {
				key: 'video-source',
				value: attributes[ sourceKey ],
				onChange: ( value ) =>
					setAttributes( {
						[ sourceKey ]: 'internal' === value ? 'internal' : 'external',
					} ),
			} )
		);
	}

	return createElement( Fragment, {}, ...rows );
}
