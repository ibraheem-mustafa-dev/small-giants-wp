/**
 * SgsBoxControl — compact 4-side box editor (padding / margin / border-width),
 * built from native primitives with a hand-aligned row (Bean-directed rebuild,
 * 2026-08-19).
 *
 * ── Why this exists, not core's `BoxControl` ────────────────────────────
 * `ResponsiveBoxControl.js` used to render WP core's composite `BoxControl`
 * directly. Its own internal layout (`InputWrapper` as an `HStack` sharing a
 * CSS grid area with the reset button and linked-sides icon — WP core
 * `@wordpress/components/src/box-control/styles/box-control-styles.ts`) puts
 * the unlink icon and the slider at the BOTTOM of the input's own height
 * rather than centred against it — a real, confirmed visual defect, not a
 * scoped-CSS override on this tree's side (grepped: no `.components-box-
 * control` rule exists anywhere in this codebase). Patching WP core's own
 * Emotion-styled internals via scoped CSS would be fragile against every WP
 * core update. This component reproduces the same DATA MODEL (a
 * {top,right,bottom,left} box, linked/unlinked toggle) from the same native
 * primitives (`UnitControl`, `RangeControl`, `Button`) laid out in one
 * `Flex` row with `align="center"`, so the slider and icon sit exactly level
 * with the input.
 *
 * ── Linked/unlinked model ──────────────────────────────────────────────
 * Mirrors core `BoxControl`'s own behaviour: `isLinked` starts true when
 * every requested side already holds the same value (or is empty), false
 * otherwise — computed once on mount, then lives as local editor UI state
 * only (same pattern as `ScaleAxisControl.js`'s `isLinked`). Linked mode
 * edits all requested sides together; unlinked mode shows one compact row
 * per side.
 *
 * @package SGS\Blocks
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { BaseControl, Button, Flex, FlexBlock, FlexItem, RangeControl } from '@wordpress/components';
import { link as linkIcon, linkOff as linkOffIcon } from '@wordpress/icons';
import { UnitControl } from './primitives';

const ALL_SIDES = [ 'top', 'right', 'bottom', 'left' ];

const SIDE_LABELS = {
	top: __( 'Top', 'sgs-blocks' ),
	right: __( 'Right', 'sgs-blocks' ),
	bottom: __( 'Bottom', 'sgs-blocks' ),
	left: __( 'Left', 'sgs-blocks' ),
};

/**
 * Parse a CSS length string ("20px") into { num, unit }. Returns num:
 * undefined for an empty/unparseable value so inputs show blank rather than
 * a garbled "0px" default.
 *
 * @param {string} raw Stored side value.
 * @return {{num: number|undefined, unit: string}} Parsed parts.
 */
function parseLength( raw ) {
	if ( ! raw && raw !== 0 ) {
		return { num: undefined, unit: 'px' };
	}
	const match = String( raw )
		.trim()
		.match( /^(-?[\d.]+)\s*([a-z%]*)$/i );
	if ( ! match ) {
		return { num: undefined, unit: 'px' };
	}
	const num = parseFloat( match[ 1 ] );
	return { num: isNaN( num ) ? undefined : num, unit: match[ 2 ] || 'px' };
}

/**
 * @param {Object}   props
 * @param {string}   props.label     Field label (BaseControl heading).
 * @param {Object}   [props.values]  { top, right, bottom, left } — each a
 *                                   CSS length string or absent.
 * @param {Function} props.onChange  Receives the next full box object.
 * @param {ReadonlyArray<string>} [props.sides=ALL_SIDES] Restrict to a
 *                                   subset of sides (e.g. block-start/end
 *                                   in future — currently always all 4).
 * @param {Array}    [props.units]   UnitControl unit list.
 * @param {number}   [props.min=0]   RangeControl minimum.
 * @param {number}   [props.max=300] RangeControl maximum.
 * @return {JSX.Element} Controls fragment.
 */
export default function SgsBoxControl( {
	label,
	values = {},
	onChange,
	sides = ALL_SIDES,
	units,
	min = 0,
	max = 300,
} ) {
	const [ isLinked, setIsLinked ] = useState( () => {
		const raw = sides.map( ( s ) => values[ s ] ?? '' );
		return raw.every( ( v ) => v === raw[ 0 ] );
	} );

	const firstSide = sides[ 0 ];
	const { num: linkedNum, unit: linkedUnit } = parseLength( values[ firstSide ] );

	const setSide = ( side, raw ) => {
		onChange( { ...values, [ side ]: raw } );
	};

	const setAllSides = ( raw ) => {
		const next = { ...values };
		sides.forEach( ( s ) => {
			next[ s ] = raw;
		} );
		onChange( next );
	};

	const toggleLinked = () => {
		if ( ! isLinked ) {
			// Re-linking collapses to the first side's value, mirroring core
			// BoxControl's own re-link-collapses-to-one-value behaviour.
			setAllSides( values[ firstSide ] ?? '' );
		}
		setIsLinked( ! isLinked );
	};

	const linkLabel = isLinked
		? __( 'Unlink sides', 'sgs-blocks' )
		: __( 'Link sides', 'sgs-blocks' );

	const row = ( sideKey, value, onSideChange, rowLabel ) => {
		const { num, unit } = parseLength( value );
		return (
			<Flex align="center" gap={ 2 } key={ sideKey || 'linked' }>
				<FlexItem style={ { width: 90 } }>
					<UnitControl
						label={ rowLabel }
						hideLabelFromVision={ ! sideKey }
						value={ num === undefined ? '' : `${ num }${ unit }` }
						onChange={ ( raw ) => onSideChange( raw ?? '' ) }
						units={ units }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</FlexItem>
				<FlexBlock>
					<RangeControl
						label={ rowLabel }
						hideLabelFromVision
						value={ num ?? 0 }
						onChange={ ( v ) => onSideChange( `${ v }${ unit }` ) }
						min={ min }
						max={ max }
						withInputField={ false }
						__nextHasNoMarginBottom
					/>
				</FlexBlock>
				{ ! sideKey && (
					<FlexItem>
						<Button
							icon={ isLinked ? linkIcon : linkOffIcon }
							label={ linkLabel }
							aria-label={ linkLabel }
							aria-pressed={ isLinked }
							isPressed={ isLinked }
							onClick={ toggleLinked }
						/>
					</FlexItem>
				) }
			</Flex>
		);
	};

	return (
		<BaseControl label={ label } __nextHasNoMarginBottom>
			{ isLinked
				? row( null, values[ firstSide ] ?? '', setAllSides, label )
				: sides.map( ( side ) =>
						row( side, values[ side ] ?? '', ( raw ) => setSide( side, raw ), SIDE_LABELS[ side ] )
				  ) }
			{ ! isLinked && (
				<Flex justify="flex-end">
					<Button
						icon={ linkIcon }
						label={ __( 'Link sides', 'sgs-blocks' ) }
						aria-label={ __( 'Link sides', 'sgs-blocks' ) }
						onClick={ toggleLinked }
					/>
				</Flex>
			) }
		</BaseControl>
	);
}
