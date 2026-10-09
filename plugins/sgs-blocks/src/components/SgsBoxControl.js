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
 * `Flex` row with `align="center"`, so every part of a row sits level.
 *
 * ── Layout (core's spacing-sizes control) ───────────────────────────────
 * The label and a small link/unlink button share the header line. Each row
 * starts with a side icon (`sidesAll`/`cornerAll` when linked, one side or
 * corner when unlinked; the side's text label is the inputs' accessible
 * name). With presets a row is a names-only preset select plus a value box
 * with its unit, which shows the chosen preset's size; typing a value stores
 * a length and the select reads Custom. Without presets a row is the value
 * box plus a slider.
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
import { useContext, useState } from '@wordpress/element';
import { useInstanceId } from '@wordpress/compose';
import { __, sprintf } from '@wordpress/i18n';
import { useSettings } from '@wordpress/block-editor';
import { BaseControl, Button, Flex, FlexBlock, FlexItem, RangeControl, SelectControl } from '@wordpress/components';
import {
	Icon,
	link as linkIcon,
	linkOff as linkOffIcon,
	sidesAll,
	sidesTop,
	sidesRight,
	sidesBottom,
	sidesLeft,
	cornerAll,
	cornerTopLeft,
	cornerTopRight,
	cornerBottomRight,
	cornerBottomLeft,
} from '@wordpress/icons';
import { UnitControl, VStack } from './primitives';
import { InheritedBoxContext } from './InheritedBoxContext';
import { flattenPresetSetting } from '../utils/presetSettings';
import { inheritedValueLabel } from '../utils/inherited-box';

const ALL_SIDES = [ 'top', 'right', 'bottom', 'left' ];

const SIDE_LABELS = {
	top: __( 'Top', 'sgs-blocks' ),
	right: __( 'Right', 'sgs-blocks' ),
	bottom: __( 'Bottom', 'sgs-blocks' ),
	left: __( 'Left', 'sgs-blocks' ),
};

/** Row icons, as core's spacing and radius controls draw them; the text label stays the accessible name. */
const KEY_ICONS = {
	top: sidesTop,
	right: sidesRight,
	bottom: sidesBottom,
	left: sidesLeft,
	topLeft: cornerTopLeft,
	topRight: cornerTopRight,
	bottomRight: cornerBottomRight,
	bottomLeft: cornerBottomLeft,
};

/**
 * @param {ReadonlyArray<string>} keys The control's sides or corners.
 * @return {Object} The all-corners icon for a radius, the all-sides icon otherwise.
 */
function allIconFor( keys ) {
	return keys.some( ( k ) => k.startsWith( 'top' ) && k !== 'top' ) ? cornerAll : sidesAll;
}

/**
 * The value box (number + unit) keeps a fixed width so the preset select beside it fills the rest of the row;
 * left to size itself, the unit control takes the whole row and the select collapses (read on sandybrown,
 * 280px inspector, 2026-10-08).
 */
const VALUE_BOX_STYLE = { width: 104, flexShrink: 0 };

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
 * @param {Object}   [props.inherited] { side: value } — what each unset side
 *                                   takes from a wider tier. An unset side shows
 *                                   it as placeholder text and the slider rests
 *                                   at it; nothing is written until the client
 *                                   types (`utils/inherited-box.js`).
 * @param {Object}   [props.defaults] { side: value } — the spacing preset the
 *                                   block declares for each untouched side
 *                                   (`utils/spacing-defaults.js`). An unset side
 *                                   that inherits nothing from a wider tier
 *                                   shows it exactly as an inherited value;
 *                                   nothing is written.
 * @param {Object}   [props.labels]  { side: label } — names for non-side keys
 *                                   (the four corners of a radius).
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
	inherited: inheritedProp,
	defaults = {},
	labels = SIDE_LABELS,
} ) {
	// A caller that knows the tiers passes `inherited`; inside a ResponsiveOverride it comes from the override.
	const inheritedFromOverride = useContext( InheritedBoxContext );
	const inherited = inheritedProp ?? inheritedFromOverride;
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

	// What an unset side paints: a wider tier's value first, else the block's declared default.
	const unsetValue = ( key ) => inherited[ key ] || defaults?.[ key ] || '';

	// Starts linked only when every side reads the same, counting what an unset side inherits.
	const [ isLinked, setIsLinked ] = useState( () => {
		const raw = sides.map( ( s ) => values[ s ] || unsetValue( s ) );
		return raw.every( ( v ) => v === raw[ 0 ] );
	} );

	const firstSide = sides[ 0 ];
	const labelId = `sgs-box-control-label-${ useInstanceId( SgsBoxControl ) }`;

	// Rows whose select the client set to Custom… before typing a value (keyed by side, 'linked' for the linked row).
	const [ customRows, setCustomRows ] = useState( {} );
	const setRowCustom = ( rowKey, on ) =>
		setCustomRows( ( prev ) => ( !! prev[ rowKey ] === on ? prev : { ...prev, [ rowKey ]: on } ) );

	// What an unset row takes from a wider tier or, failing that, the block's declared default: the side's own,
	// or the first side's on the linked row. '' when the row has its own value.
	const inheritedFor = ( sideKey, value ) => ( value ? '' : unsetValue( sideKey || firstSide ) );

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

	// Core's spacing-control link button: small, unpressed, on the label's line.
	const linkButton = (
		<Button
			size="small"
			icon={ isLinked ? linkIcon : linkOffIcon }
			iconSize={ 24 }
			label={ linkLabel }
			onClick={ toggleLinked }
		/>
	);

	const rowIcon = ( sideKey ) => {
		const icon = sideKey ? KEY_ICONS[ sideKey ] : allIconFor( sides );
		return icon ? (
			<FlexItem className="sgs-box-control__side-icon">
				<Icon icon={ icon } size={ 24 } />
			</FlexItem>
		) : null;
	};

	/** What the value box shows for a stored or inherited value: a preset's size, anything else as stored. */
	const presetSize = ( raw ) => {
		const slug = presetSlugFromValue( raw );
		const preset = slug ? filteredSizes.find( ( s ) => s.slug === slug ) : undefined;
		return preset ? preset.size : raw;
	};

	/**
	 * Side icon, preset select (names only), then the value box with its unit. Picking a preset puts its size in
	 * the value box; typing stores a length, which the select reads as Custom. `Custom…` picked from Default keeps
	 * the select on Custom (`customRows`) until a value is typed or another option is picked.
	 */
	const presetRow = ( sideKey, value, onSideChange, rowLabel ) => {
		const rowKey = sideKey || 'linked';
		const slug = presetSlugFromValue( value );
		const knownPreset = slug ? filteredSizes.find( ( s ) => s.slug === slug ) : undefined;
		const isUnknownPreset = !! slug && ! knownPreset; // design doc row H

		let selectValue = '';
		if ( knownPreset ) {
			selectValue = slug;
		} else if ( isUnknownPreset ) {
			selectValue = UNKNOWN_VALUE;
		} else if ( value || customRows[ rowKey ] ) {
			selectValue = CUSTOM_VALUE;
		}

		// "Default" (value '') is unset: the side paints what the block's stylesheet or a wider tier gives it,
		// and an inherited value is named in the label. Nothing is written for it.
		const inheritedRaw = inheritedFor( sideKey, value );
		const options = [
			{
				label: inheritedRaw
					? sprintf(
							/* translators: %s: the length this side takes from a wider device, or the block's default spacing preset. */
							__( 'Default (%s)', 'sgs-blocks' ),
							inheritedValueLabel( inheritedRaw, filteredSizes )
					  )
					: __( 'Default', 'sgs-blocks' ),
				value: '',
			},
			...filteredSizes.map( ( s ) => ( { label: s.name || s.slug, value: s.slug } ) ),
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

		const { num, unit } = parseLength( presetSize( value ) );

		return (
			<Flex align="center" gap={ 2 } key={ rowKey } className="sgs-box-control__row">
				{ rowIcon( sideKey ) }
				<FlexBlock>
					<SelectControl
						label={ rowLabel }
						hideLabelFromVision
						value={ selectValue }
						options={ options }
						onChange={ ( next ) => {
							setRowCustom( rowKey, next === CUSTOM_VALUE );
							if ( next === CUSTOM_VALUE ) {
								// Row E: Custom starts from the size of the preset just left; from Default it waits
								// for a typed value.
								if ( knownPreset ) {
									onSideChange( knownPreset.size );
								}
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
				</FlexBlock>
				<FlexItem className="sgs-box-control__value" style={ VALUE_BOX_STYLE }>
					<UnitControl
						label={ rowLabel }
						hideLabelFromVision
						value={ num === undefined ? '' : `${ num }${ unit }` }
						placeholder={ presetSize( inheritedRaw ) }
						onChange={ ( raw ) => {
							setRowCustom( rowKey, true );
							onSideChange( raw ?? '' );
						} }
						units={ units }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</FlexItem>
			</Flex>
		);
	};

	/** Side icon, value box and slider (no presets). */
	const plainRow = ( sideKey, value, onSideChange, rowLabel ) => {
		const own = parseLength( value );
		const inheritedRaw = inheritedFor( sideKey, value );
		const rest = parseLength( inheritedRaw );
		const unit = own.num === undefined && rest.num !== undefined ? rest.unit : own.unit;
		const unitRange = rangeForUnit( unit );
		const rowMin = explicitRange ? min ?? 0 : unitRange.min;
		const rowMax = explicitRange ? max ?? 300 : unitRange.max;
		const rowStep = explicitRange ? 1 : unitRange.step;
		return (
			<Flex align="center" gap={ 2 } key={ sideKey || 'linked' } className="sgs-box-control__row">
				{ rowIcon( sideKey ) }
				<FlexItem className="sgs-box-control__value" style={ VALUE_BOX_STYLE }>
					<UnitControl
						label={ rowLabel }
						hideLabelFromVision
						value={ own.num === undefined ? '' : `${ own.num }${ unit }` }
						placeholder={ inheritedRaw }
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
						value={ own.num ?? rest.num ?? 0 }
						onChange={ ( v ) => onSideChange( `${ v }${ unit }` ) }
						min={ rowMin }
						max={ rowMax }
						step={ rowStep }
						withInputField={ false }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</FlexBlock>
			</Flex>
		);
	};

	const row = hasPresets ? presetRow : plainRow;

	return (
		<div className="sgs-box-control" role="group" aria-labelledby={ labelId }>
			<Flex align="center" justify="space-between" className="sgs-box-control__header">
				<BaseControl.VisualLabel id={ labelId }>{ label }</BaseControl.VisualLabel>
				{ sides.length > 1 && linkButton }
			</Flex>
			<VStack spacing={ 2 }>
				{ isLinked
					? row( null, values[ firstSide ] ?? '', setAllSides, label )
					: sides.map( ( side ) =>
							row( side, values[ side ] ?? '', ( raw ) => setSide( side, raw ), labels[ side ] ?? side )
					  ) }
			</VStack>
		</div>
	);
}
