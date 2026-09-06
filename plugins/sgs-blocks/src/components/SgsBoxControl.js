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
 * per side. **Mixed preset/custom state (C16, 2026-08-27): unlinked rows are
 * fully independent** — one side can hold a theme preset while a sibling
 * holds a hand-typed length; each row renders its OWN preset-vs-custom UI
 * from its own stored value, with no cross-row coupling. Linked mode cannot
 * produce a mixed state because re-linking always collapses every side to
 * the first side's value first (`toggleLinked`, unchanged).
 *
 * ── Spacing presets (C16, 2026-08-27, opt-in via `presets` prop) ────────
 * Mirrors `SgsLengthControl.js`'s existing single-length preset pattern
 * (`useSettings( 'spacing.spacingSizes' )` normalised through
 * `flattenPresetSetting()`, the same `"${name||slug} (${size})"` option
 * label, the same `Custom…` / `— none —` semantics, the same fallback to the
 * plain control when the theme declares no scale) — extended per-SIDE rather
 * than to a single value, because a box is four independent lengths. See
 * `.claude/scratch/2026-08-27-c16-spacing-presets-design.md` for the full
 * design (unit-switch table §3, storage-format rationale §2, slider-range
 * defect §3a). Default OFF (`presets = false`) — every existing mount of
 * `ResponsiveBoxControl`/`SgsBoxControl` is unaffected until a caller opts
 * in explicitly. Pilot: `sgs/container` only (padding / margin / border
 * width), per Bean's design-gate sign-off.
 *
 * **Storage: the literal `var(--wp--preset--spacing--{slug})` form, never
 * the bare slug and never WordPress's `var:preset|spacing|{slug}` shorthand**
 * — the literal form is the only one that survives BOTH CSS paths a box side
 * can take (`sgs_css_length_value()` and `wp_style_engine_get_styles()`);
 * see the design doc §2 for the two-path proof. A preset is detected by an
 * ANCHORED regex (`PRESET_VAR_RE`), not a loose `var(` search, so a real
 * custom value like `calc(2rem + 1vw)` is never misread as a preset chip
 * (design doc row K).
 *
 * @package SGS\Blocks
 */
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useSettings } from '@wordpress/block-editor';
import { BaseControl, Button, Flex, FlexBlock, FlexItem, RangeControl, SelectControl } from '@wordpress/components';
import { link as linkIcon, linkOff as linkOffIcon } from '@wordpress/icons';
import { UnitControl } from './primitives';
import { flattenPresetSetting } from '../utils/presetSettings';

const ALL_SIDES = [ 'top', 'right', 'bottom', 'left' ];

const SIDE_LABELS = {
	top: __( 'Top', 'sgs-blocks' ),
	right: __( 'Right', 'sgs-blocks' ),
	bottom: __( 'Bottom', 'sgs-blocks' ),
	left: __( 'Left', 'sgs-blocks' ),
};

/** Sentinel select values — mirrors SgsLengthControl.js's CUSTOM_VALUE shape. */
const CUSTOM_VALUE = '__custom__';
/** Row H: a stored preset slug the ACTIVE theme's scale no longer declares. */
const UNKNOWN_VALUE = '__unknown_preset__';

/** Anchored — never matches inside a larger expression like `calc(var(--x) + 2px)` (design doc row K). */
const PRESET_VAR_RE = /^var\(\s*--wp--preset--spacing--([a-zA-Z0-9_-]+)\s*\)$/;

/**
 * @param {string} value Stored side value.
 * @return {string|null} The spacing slug if `value` is exactly a literal
 *                        preset var() call, else null.
 */
function presetSlugFromValue( value ) {
	if ( typeof value !== 'string' ) {
		return null;
	}
	const match = value.trim().match( PRESET_VAR_RE );
	return match ? match[ 1 ] : null;
}

/**
 * Per-unit slider range (design doc §3a) — replaces the old hardcoded
 * `min:0, max:300` which was a 0-300 **rem** slider once the unit is rem,
 * putting every useful rem value in the first 4% of the track. Presets are
 * always rem-valued, so this exists whether or not `presets` is on.
 */
const UNIT_RANGES = {
	px: { min: 0, max: 200, step: 1 },
	rem: { min: 0, max: 12, step: 0.25 },
	em: { min: 0, max: 12, step: 0.25 },
	'%': { min: 0, max: 100, step: 1 },
	vw: { min: 0, max: 20, step: 0.5 },
};
const DEFAULT_RANGE = { min: 0, max: 200, step: 1 };

/**
 * @param {string} unit Parsed unit ('px'|'rem'|'em'|'%'|'vw'|'').
 * @return {{min: number, max: number, step: number}} Slider range for that unit.
 */
function rangeForUnit( unit ) {
	return UNIT_RANGES[ unit ] || DEFAULT_RANGE;
}

/**
 * Parse a CSS length string ("20px") into { num, unit }. Returns num:
 * undefined for an empty/unparseable value so inputs show blank rather than
 * a garbled "0px" default. A preset var() or a calc()/env() expression also
 * fails to parse here by design — those are never shown as a plain number.
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
 * @param {number}   [props.min]     RangeControl minimum override. Omit to
 *                                   use the per-unit range in UNIT_RANGES.
 * @param {number}   [props.max]     RangeControl maximum override. Omit to
 *                                   use the per-unit range in UNIT_RANGES.
 * @param {boolean|ReadonlyArray<string>} [props.presets=false] Offer the
 *                                   theme.json spacing-scale dropdown per
 *                                   side. OPT-IN, default OFF — see file
 *                                   header. `true` offers the FULL scale;
 *                                   an array of spacing slugs (e.g.
 *                                   `[ 'XXS', 'XS', 'S' ]`, D-2026-08-27
 *                                   box-control-presets-rollout) restricts
 *                                   the dropdown to that subset — for a
 *                                   property like border-width where the
 *                                   full XXS-XXXL ladder is nonsensical.
 *                                   Falls back to the plain control when the
 *                                   active theme declares no spacing scale
 *                                   (or the array resolves to zero matching
 *                                   sizes), same as SgsLengthControl.
 * @return {JSX.Element} Controls fragment.
 */
export default function SgsBoxControl( {
	label,
	values = {},
	onChange,
	sides = ALL_SIDES,
	units,
	min,
	max,
	presets = false,
} ) {
	// Hook must run unconditionally regardless of the `presets` prop.
	const [ spacingSizesRaw ] = useSettings( 'spacing.spacingSizes' );
	const spacingSizes = flattenPresetSetting( spacingSizesRaw );
	// `presets` is EITHER `true` (full scale, unchanged pre-2026-08-27
	// behaviour) OR an array of slugs (a filtered subset — e.g. border-width's
	// restricted `[ 'XXS', 'XS', 'S' ]`, since offering the full spacing ladder
	// for a border stroke width is nonsensical). Every other existing caller
	// still passes `presets={ false }`, which `Array.isArray` safely treats as
	// falsy, so this is zero-ripple for the pre-existing single-boolean callers.
	const allowedSlugs = Array.isArray( presets ) ? presets : null;
	const filteredSizes = allowedSlugs
		? spacingSizes.filter( ( s ) => allowedSlugs.includes( s.slug ) )
		: spacingSizes;
	const hasPresets = ( presets === true || Array.isArray( presets ) ) && filteredSizes.length > 0;

	const [ isLinked, setIsLinked ] = useState( () => {
		const raw = sides.map( ( s ) => values[ s ] ?? '' );
		return raw.every( ( v ) => v === raw[ 0 ] );
	} );

	const firstSide = sides[ 0 ];

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
			// BoxControl's own re-link-collapses-to-one-value behaviour. A
			// preset value collapses cleanly too — it's just another string.
			setAllSides( values[ firstSide ] ?? '' );
		}
		setIsLinked( ! isLinked );
	};

	const linkLabel = isLinked
		? __( 'Unlink sides', 'sgs-blocks' )
		: __( 'Link sides', 'sgs-blocks' );

	const explicitRange = min !== undefined || max !== undefined;

	const linkButton = (
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
	);

	/**
	 * Preset-select + conditional number/slider row (presets branch).
	 * Mirrors SgsLengthControl's SelectControl decision shape (option
	 * format, Custom…/— none — semantics) — see file header.
	 */
	const presetRow = ( sideKey, value, onSideChange, rowLabel ) => {
		const slug = presetSlugFromValue( value );
		const knownPreset = slug ? filteredSizes.find( ( s ) => s.slug === slug ) : undefined;
		const isUnknownPreset = !! slug && ! knownPreset; // design doc row H

		const selectValue = knownPreset ? slug : isUnknownPreset ? UNKNOWN_VALUE : value ? CUSTOM_VALUE : '';

		const options = [
			{ label: __( '— none —', 'sgs-blocks' ), value: '' },
			...filteredSizes.map( ( s ) => ( { label: `${ s.name || s.slug } (${ s.size })`, value: s.slug } ) ),
			{ label: __( 'Custom…', 'sgs-blocks' ), value: CUSTOM_VALUE },
		];
		if ( isUnknownPreset ) {
			options.push( {
				label: sprintf(
					/* translators: %s: the stored spacing preset slug. */
					__( 'Preset %s — not in this theme', 'sgs-blocks' ),
					slug
				),
				value: UNKNOWN_VALUE,
			} );
		}

		const { num, unit } = parseLength( value );
		const unitRange = rangeForUnit( unit );
		const rowMin = explicitRange ? min ?? 0 : unitRange.min;
		const rowMax = explicitRange ? max ?? 300 : unitRange.max;
		const rowStep = explicitRange ? 1 : unitRange.step;

		return (
			<Flex align="center" gap={ 2 } key={ sideKey || 'linked' }>
				<FlexItem style={ { width: 140 } }>
					<SelectControl
						label={ rowLabel }
						hideLabelFromVision={ ! sideKey }
						value={ selectValue }
						options={ options }
						onChange={ ( next ) => {
							if ( next === CUSTOM_VALUE ) {
								// Row E: Custom starts from the theme's CURRENT
								// resolved size for the preset just left, not
								// blank — design doc row E.
								onSideChange( knownPreset ? knownPreset.size : '' );
								return;
							}
							if ( next === UNKNOWN_VALUE ) {
								// Passive row H option — re-selecting itself is a no-op.
								return;
							}
							if ( next === '' ) {
								onSideChange( '' ); // Clear (row F).
								return;
							}
							// Row A/B/C/D: literal var() form — see file header.
							onSideChange( `var(--wp--preset--spacing--${ next })` );
						} }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</FlexItem>
				{ selectValue === CUSTOM_VALUE && (
					<>
						<FlexItem style={ { width: 90 } }>
							<UnitControl
								label={ rowLabel }
								hideLabelFromVision
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
								min={ rowMin }
								max={ rowMax }
								step={ rowStep }
								withInputField={ false }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</FlexBlock>
					</>
				) }
				{ ! sideKey && linkButton }
			</Flex>
		);
	};

	/** Plain number+slider row (no presets — existing behaviour, unchanged). */
	const plainRow = ( sideKey, value, onSideChange, rowLabel ) => {
		const { num, unit } = parseLength( value );
		const unitRange = rangeForUnit( unit );
		const rowMin = explicitRange ? min ?? 0 : unitRange.min;
		const rowMax = explicitRange ? max ?? 300 : unitRange.max;
		const rowStep = explicitRange ? 1 : unitRange.step;
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
						min={ rowMin }
						max={ rowMax }
						step={ rowStep }
						withInputField={ false }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</FlexBlock>
				{ ! sideKey && linkButton }
			</Flex>
		);
	};

	const row = hasPresets ? presetRow : plainRow;

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
