/**
 * ShadowControl — shared real shadow builder (Spec 35 Part I action item 3).
 *
 * Replaces the old None/Small/Medium 3-option select pattern with genuine
 * X/Y offset, blur, spread, and inset controls, PLUS a small preset menu
 * that SEEDS the builder from the theme's `theme.json`
 * `settings.shadow.presets` (Subtle/Raised/Floating/Brand glow) — presets are a
 * starting point, not a ceiling.
 *
 * ── Colour architecture (D621/D622, 2026-08-15) ─────────────────────────
 * Colour is now EXTERNALLY managed by the caller — this control stores
 * SHAPE ONLY (offset-x, offset-y, blur, spread, inset), never a colour. The
 * caller owns the sibling `{name}Colour` attribute (rendered as a row in the
 * block's `SgsColourPanel`, states-aware for a base+hover pair) and passes
 * its current value + setter in via the `colour`/`onColourChange` props,
 * which this control renders as one more field in the same builder — same
 * position as the old internal `DesignTokenPicker`, just externally driven.
 * PHP composes shape + colour back into a final `box-shadow` value at render
 * time via `sgs_shadow_value_composed()` (`includes/helpers-tokens.php`).
 *
 * The stored SHAPE attribute is a CSS shadow-shape STRING (matches every
 * other SGS token-shaped attribute), e.g. `"0px 4px 12px 0px"` or
 * `"inset 0px 0px 20px 0px"` — no colour token. This is exactly the shape
 * `sgs_shadow_value_composed()` expects as a "raw" shape (it starts with a
 * digit/`inset`). A bare theme shadow SLUG (e.g. `"subtle"`) is also
 * accepted unchanged — picking a preset without editing it keeps the value
 * linked to the theme token; the colour field is then irrelevant (presets
 * carry their own colour) but stays visible rather than being conditionally
 * hidden, so switching back to a custom shape doesn't lose the last colour.
 *
 * WCAG 2.1 AA: every field is a labelled native control (`UnitControl`,
 * `ToggleControl`, `DesignTokenPicker`) with WP's own focus styles; the
 * preset buttons carry `aria-pressed` so the active preset is announced.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useSettings } from '@wordpress/block-editor';
import {
	BaseControl,
	Button,
	ButtonGroup,
	ToggleControl,
} from '@wordpress/components';
import DesignTokenPicker from './DesignTokenPicker';
import { UnitControl } from './primitives';

/**
 * Parse a raw CSS shadow-SHAPE string (no colour) into its builder parts.
 * Best-effort — only handles a single shadow layer (the builder's own
 * output shape). Returns null when the string doesn't parse as a longhand
 * shape (e.g. a theme slug like "subtle", or an empty string) — the builder
 * then falls back to its defaults rather than fighting the stored value.
 *
 * @param {string} value Raw box-shadow SHAPE string (x y blur spread, no colour).
 * @return {?Object} { inset, x, y, blur, spread } or null.
 */
function parseShadow( value ) {
	if ( ! value ) {
		return null;
	}
	const match = String( value )
		.trim()
		.match(
			/^(inset\s+)?(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+([\d.]+)px$/i
		);
	if ( ! match ) {
		return null;
	}
	return {
		inset: !! match[ 1 ],
		x: Number( match[ 2 ] ),
		y: Number( match[ 3 ] ),
		blur: Number( match[ 4 ] ),
		spread: Number( match[ 5 ] ),
	};
}

/**
 * Build a raw CSS shadow-SHAPE string (no colour) from the builder parts.
 *
 * @param {Object} parts Builder parts.
 * @return {string} CSS box-shadow SHAPE value (x y blur spread, no colour).
 */
function buildShadow( { inset, x, y, blur, spread } ) {
	return [
		inset ? 'inset' : '',
		`${ x || 0 }px`,
		`${ y || 0 }px`,
		`${ blur || 0 }px`,
		`${ spread || 0 }px`,
	]
		.filter( Boolean )
		.join( ' ' );
}

const DEFAULT_PARTS = { inset: false, x: 0, y: 4, blur: 12, spread: 0 };
const DEFAULT_COLOUR = 'rgba(0,0,0,0.1)';

/**
 * @param {Object}   props
 * @param {string}   props.label           Field label.
 * @param {string}   [props.value]         Stored raw box-shadow SHAPE string (or theme slug).
 * @param {Function} props.onChange        Receives the next raw box-shadow SHAPE string.
 * @param {string}   [props.colour]        Current colour value — externally owned (SgsColourPanel row).
 * @param {Function} props.onColourChange  Setter for the externally-owned colour attribute.
 */
export default function ShadowControl( { label, value, onChange, colour, onColourChange } ) {
	// Defensive fallback (incident 2026-08-20): 5 of 22 mount sites passed no
	// `onColourChange`, so picking a shadow colour threw `TypeError:
	// onColourChange is not a function` and blanked the whole inspector
	// sidebar. The five sites are now wired with a real backing attribute —
	// but this default keeps a FUTURE unwired mount a no-op (control does
	// nothing, logged) instead of crashing the sidebar again.
	const safeOnColourChange =
		onColourChange ||
		( () => {
			// eslint-disable-next-line no-console
			console.warn(
				'ShadowControl: onColourChange prop is missing — the colour field will not update the block. Pass `colour` + `onColourChange` from the caller (see cta-section/edit.js for the reference wiring).'
			);
		} );
	// `useSettings( 'shadow.presets' )` can resolve to EITHER a flat array
	// (already-merged) OR WordPress's origin-keyed object
	// `{ default: [...], theme: [...], custom: [...] }` (raw feature shape,
	// what WP 7.0.x surfaces here) — calling `.map` on the object throws
	// `(o || []).map is not a function` and crashes the block. Normalise to a
	// single flat array (custom → theme → default precedence) before mapping.
	const [ presetSetting ] = useSettings( 'shadow.presets' );
	const mergedPresets = Array.isArray( presetSetting )
		? presetSetting
		: [
			...( presetSetting?.custom || [] ),
			...( presetSetting?.theme || [] ),
			...( presetSetting?.default || [] ),
		];
	// Dedupe by slug — first occurrence wins (custom → theme → default),
	// matching WordPress's own origin precedence so a theme preset that
	// re-declares a default slug shows once, not twice.
	const presets = mergedPresets.filter(
		( preset, i ) =>
			mergedPresets.findIndex( ( p ) => p.slug === preset.slug ) === i
	);
	const parts = parseShadow( value ) || DEFAULT_PARTS;

	const updatePart = ( key, next ) => {
		onChange( buildShadow( { ...parts, [ key ]: next } ) );
	};

	return (
		<BaseControl label={ label } __nextHasNoMarginBottom>
			<div className="sgs-shadow-control__presets">
				<ButtonGroup>
					<Button
						variant={ ! value ? 'primary' : 'secondary' }
						aria-pressed={ ! value }
						onClick={ () => onChange( '' ) }
					>
						{ __( 'None', 'sgs-blocks' ) }
					</Button>
					{ ( presets || [] ).map( ( preset ) => (
						<Button
							key={ preset.slug }
							variant={ value === preset.slug ? 'primary' : 'secondary' }
							aria-pressed={ value === preset.slug }
							onClick={ () => onChange( preset.slug ) }
						>
							{ preset.name }
						</Button>
					) ) }
				</ButtonGroup>
			</div>

			{ !! value && (
				<div className="sgs-shadow-control__builder">
					<div className="sgs-shadow-control__row">
						<UnitControl
							label={ __( 'Offset X', 'sgs-blocks' ) }
							value={ `${ parts.x }px` }
							onChange={ ( v ) => updatePart( 'x', parseFloat( v ) || 0 ) }
							units={ [ { value: 'px', label: 'px' } ] }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<UnitControl
							label={ __( 'Offset Y', 'sgs-blocks' ) }
							value={ `${ parts.y }px` }
							onChange={ ( v ) => updatePart( 'y', parseFloat( v ) || 0 ) }
							units={ [ { value: 'px', label: 'px' } ] }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</div>
					<div className="sgs-shadow-control__row">
						<UnitControl
							label={ __( 'Blur', 'sgs-blocks' ) }
							value={ `${ parts.blur }px` }
							onChange={ ( v ) => updatePart( 'blur', Math.max( 0, parseFloat( v ) || 0 ) ) }
							units={ [ { value: 'px', label: 'px' } ] }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<UnitControl
							label={ __( 'Spread', 'sgs-blocks' ) }
							value={ `${ parts.spread }px` }
							onChange={ ( v ) => updatePart( 'spread', parseFloat( v ) || 0 ) }
							units={ [ { value: 'px', label: 'px' } ] }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</div>
					{ /* D740: `linked` was MISSING here, so this picker stored a raw CSS
					   colour on EVERY pick and never a palette slug — the client's brand
					   token was unlinked the moment they chose a shadow colour, across
					   every block mounting this control. Same defect D717 fixed on the
					   overlay row; this control was simply never audited for it.
					   Safe because the consumer resolves slugs: sgs_shadow_value_composed()
					   passes the colour through sgs_colour_value() (helpers-tokens.php:717).
					   ⚠ enableAlpha DELIBERATELY STAYS ON, unlike the overlay. A shadow
					   legitimately wants alpha (a 20%-black shadow is the normal case) and
					   there is NO separate shadow-opacity attribute to carry it, so
					   removing it would delete a real capability rather than relocate it.
					   Consequence, stated not hidden: lowering alpha still stores a raw
					   colour. A palette pick at full alpha now stores the slug, which is
					   the common case and a strict improvement on storing a hex always. */ }
					<DesignTokenPicker
						label={ __( 'Shadow colour', 'sgs-blocks' ) }
						value={ colour }
						onChange={ ( v ) => safeOnColourChange( v || DEFAULT_COLOUR ) }
						linked
						enableAlpha
					/>
					<ToggleControl
						label={ __( 'Inset (inner shadow)', 'sgs-blocks' ) }
						checked={ parts.inset }
						onChange={ ( v ) => updatePart( 'inset', v ) }
						__nextHasNoMarginBottom
					/>
				</div>
			) }
		</BaseControl>
	);
}
