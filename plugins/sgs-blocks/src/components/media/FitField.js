/**
 * FitField: how the media fills its box (Spec 49 §9.2). Icon chips, each with a plain caption, offering the options
 * §7.9 gives the slot's kind: Crop to fill, Show all, Stretch, Actual size, Never enlarge, and Tile on image
 * backgrounds. An SVG offers Crop to fill and Show all only; an embed offers none (the player scales itself).
 * Per device through `ResponsiveOverride`.
 *
 * @package
 */
import { __, sprintf } from '@wordpress/i18n';
import ResponsiveOverride from '../ResponsiveOverride.js';
import Chips from './Chips.js';
import { slotAccess, slotKind } from './fieldBase.js';
import { deviceName } from './deviceValues.js';

const FRAME = <rect x="3" y="5" width="18" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />;

/** Small 24px pictograms; the frame is the box, the filled shape is the photo. */
const ICONS = {
	cover: (
		<svg viewBox="0 0 24 24" width="24" height="24">
			{ FRAME }
			<rect x="3" y="5" width="18" height="14" fill="currentColor" opacity="0.35" />
		</svg>
	),
	contain: (
		<svg viewBox="0 0 24 24" width="24" height="24">
			{ FRAME }
			<rect x="7" y="5" width="10" height="14" fill="currentColor" opacity="0.35" />
		</svg>
	),
	fill: (
		<svg viewBox="0 0 24 24" width="24" height="24">
			{ FRAME }
			<path d="M5 12h14M8 9l-3 3 3 3M16 9l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" />
		</svg>
	),
	none: (
		<svg viewBox="0 0 24 24" width="24" height="24">
			{ FRAME }
			<rect x="9" y="9" width="6" height="6" fill="currentColor" opacity="0.35" />
		</svg>
	),
	'scale-down': (
		<svg viewBox="0 0 24 24" width="24" height="24">
			{ FRAME }
			<rect x="8" y="8" width="8" height="8" fill="currentColor" opacity="0.35" />
			<path d="M13 11l-2 2" stroke="currentColor" strokeWidth="1.5" />
		</svg>
	),
	tile: (
		<svg viewBox="0 0 24 24" width="24" height="24">
			{ FRAME }
			<path d="M3 12h18M12 5v14" stroke="currentColor" strokeWidth="1.5" />
		</svg>
	),
};

/**
 * The fit options a slot offers.
 *
 * @param {string} kind    `image`, `video`, `embed` or `svg`.
 * @param {string} context `element` or `background`.
 * @return {Array<{value: string, label: string}>} Options; empty for an embed.
 */
export function fitOptions( kind, context = 'element' ) {
	if ( 'embed' === kind ) {
		return [];
	}
	const cover = { value: 'cover', label: __( 'Crop to fill', 'sgs-blocks' ) };
	const contain = { value: 'contain', label: __( 'Show all', 'sgs-blocks' ) };
	if ( 'svg' === kind ) {
		return [ cover, contain ];
	}
	const out = [
		cover,
		contain,
		{ value: 'fill', label: __( 'Stretch', 'sgs-blocks' ) },
		{ value: 'none', label: __( 'Actual size', 'sgs-blocks' ) },
		{ value: 'scale-down', label: __( 'Never enlarge', 'sgs-blocks' ) },
	];
	if ( 'background' === context && 'image' === kind ) {
		out.push( { value: 'tile', label: __( 'Tile', 'sgs-blocks' ) } );
	}
	return out;
}

export default function FitField( { attributes, setAttributes, prefix, slot } ) {
	const access = slotAccess( attributes, setAttributes, prefix );
	const options = fitOptions( slotKind( slot, access ), slot?.context ).map( ( option ) => ( {
		...option,
		icon: ICONS[ option.value ],
	} ) );
	if ( ! options.length ) {
		return null;
	}
	return (
		<ResponsiveOverride
			label={ __( 'How it fills', 'sgs-blocks' ) }
			value={ access.read( 'Fit' ) }
			onChange={ ( next ) => access.write( { Fit: next } ) }
		>
			{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => (
				<Chips
					label={ sprintf( /* translators: %s: device name. */ __( 'How it fills on %s', 'sgs-blocks' ), deviceName( tier ) ) }
					options={ options }
					value={ ownValue || effectiveValue || 'cover' }
					onChange={ setOwnValue }
				/>
			) }
		</ResponsiveOverride>
	);
}
