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
	TabPanel,
} from '@wordpress/components';
import DesignTokenPicker from './DesignTokenPicker';
import { UnitControl } from './primitives';

/**
 * Derive ONE of a shadow family's attribute names from its base name.
 *
 * The standard helper pair for this control, mirroring `typographyAttrName()`
 * — the one control that already shipped the pattern. See
 * `scripts/check-control-helper-parity.py` for the census of which controls
 * still owe theirs.
 *
 * ⭐ THE RULES ARE ENUMERATED, NOT GENERALISED — and generalising got one of
 * them WRONG first. Every `attrNames` map in the tree was listed and each rule
 * tested against every row that carries the key (2026-08-26):
 *   • `colour`      = `<base>Colour`        — holds **22/22**
 *   • `hoverColour` = `<base>ColourHover`   — holds **10/10**
 *   • `hover`       = `<base>Hover`         — **0 mounts use it.** The PHP
 *     `sgs_shadow_decls()` supports a hover SHAPE (Bean's full-symmetry ruling,
 *     2026-08-22) but no editor mount passes one yet, so this key is available
 *     and currently unexercised. Do not assume it is proven.
 * ⛔ The first draft of this helper returned `<base>HoverColour` for the hover
 * colour, generalised from `sgs/button`'s `boxShadowHoverColour`. That is a
 * SEPARATE family whose base IS `boxShadowHover`, so it was `<base>Colour` all
 * along and said nothing about hover colours. Against the real corpus the
 * guessed rule scored **0/10**. Enumerating cost one command.
 *
 * @param {string} base Base attribute name, e.g. 'boxShadow'.
 * @param {string} part One of 'base' | 'colour' | 'hover' | 'hoverColour'.
 * @return {string} The attribute key, or '' for an unknown part.
 */
export function shadowAttrName( base, part = 'base' ) {
	if ( ! base ) {
		return '';
	}
	switch ( part ) {
		case 'base':
			return base;
		case 'colour':
			return base + 'Colour';
		case 'hover':
			return base + 'Hover';
		case 'hoverColour':
			return base + 'ColourHover';
	}
	return '';
}

/**
 * The full attribute-key set for a shadow family.
 *
 * Returns the RESTING PAIR ONLY by default. `{ hoverColour: true }` adds the
 * hover colour; `{ hover: true }` adds the hover shape. They are INDEPENDENT
 * because the corpus has them independently — never fold them into one flag.
 *
 * ⛔ THE DEFAULT IS base+colour BECAUSE RETURNING ALL FOUR MANUFACTURES DEAD
 * CONTROLS, and the survey proves it. Measured 2026-08-26, blocks mounting this
 * control carry THREE distinct family shapes, not one:
 *   • resting only   — `boxShadow` + `boxShadowColour`   (media, brand-strip, …)
 *   • resting+hover  — plus `boxShadowHover` + `…HoverColour` (button, quote)
 *   • HOVER ONLY     — `shadowHover` + `shadowHoverColour` (info-box,
 *                      testimonial, card-grid's second family)
 * On that third shape a four-key map derives `shadowHoverHover`. This component
 * binds every key it is given, so the control would render a field wired to an
 * attribute the block never declares — and WordPress SILENTLY DISCARDS a write
 * to an undeclared attribute (D338). The client gets a knob that moves and does
 * nothing: precisely the defect `check-dead-controls.js` exists to catch. An
 * opt-in hover pair cannot produce it.
 *
 * Two uses, both removing a hand-typed key name:
 *   1. `attrNames={ shadowAttrKeys( 'boxShadow', { hoverColour: true } ) }` here.
 *   2. spreading the canonical set when registering a block's attributes,
 *      rather than hand-declaring each key in `block.json`.
 *
 * The PHP twin is `sgs_shadow_attr_map()` (`includes/helpers-colour-variants.php`),
 * which returns the same names under `snake_case` keys because that is the shape
 * `sgs_shadow_decls()` consumes, and carries the same opt-in. Both derive from
 * one rule, so a block names its base ONCE and neither side can typo the pairing.
 *
 * @param {string}  base          Base attribute name, e.g. 'boxShadow'.
 * @param {Object}  [options]     Options.
 * @param {boolean} [options.hover=false] Include the hover pair.
 * @return {{base: string, colour: string, hover?: string, hoverColour?: string}} The keys.
 */
export function shadowAttrKeys( base, { hover = false, hoverColour = false } = {} ) {
	const keys = {
		base: shadowAttrName( base, 'base' ),
		colour: shadowAttrName( base, 'colour' ),
	};
	// INDEPENDENT flags, because the corpus has them independently: 10 mounts
	// carry a hover COLOUR (e.g. sgs/before-after) and ZERO carry a hover SHAPE.
	// One combined flag would hand `sgs/before-after` a `boxShadowHover` key it
	// never declares — the D338 dead-control trap this helper exists to avoid.
	if ( hover ) {
		keys.hover = shadowAttrName( base, 'hover' );
	}
	if ( hoverColour ) {
		keys.hoverColour = shadowAttrName( base, 'hoverColour' );
	}
	return keys;
}

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
 * @param {string}   props.label               Field label.
 * @param {string}   [props.value]             Stored raw box-shadow SHAPE string (or theme slug).
 * @param {Function} props.onChange            Receives the next raw box-shadow SHAPE string.
 * @param {string}   [props.colour]            Current NORMAL-state colour value — externally owned (SgsColourPanel row).
 * @param {Function} props.onColourChange      Setter for the externally-owned normal-state colour attribute.
 * @param {string}   [props.colourHover]       Current HOVER-state colour value — externally owned sibling attribute
 *                                              (Rule 31: a colour row must carry >=2 states). Omit on a mount that has
 *                                              no meaningful hover state (e.g. a mount that IS itself a dedicated
 *                                              "…(hover)" shadow control, or a self-contained preset-slug shadow) —
 *                                              the row then stays single-state, exactly as before this change.
 * @param {Function} [props.onColourHoverChange] Setter for the hover-state colour attribute. Required whenever
 *                                              `colourHover` is meaningful; see the `colour`/`onColourChange`
 *                                              defensive-fallback note below — the same protection applies here.
 */
export default function ShadowControl( {
	label,
	value,
	onChange,
	colour,
	onColourChange,
	colourHover,
	onColourHoverChange,
	// Hover SHAPE (Bean's full-symmetry ruling 2026-08-22): before this, only the
	// COLOUR was per-state, so a hover shadow could recolour but never lift, grow or
	// soften. Optional — a caller supplying neither hover prop keeps the single-state
	// control, exactly as fillRow keeps one state when given no hover attribute.
	valueHover,
	onValueHoverChange,
	// ⭐ INSTALL-IN-ONE-CALL (Bean 2026-08-22: "I want that and the shadow control to be
	// in a helper so it's easy to install them in new places and we don't need to keep
	// rebuilding those 2 variants"). Pass `attributes` + `setAttributes` + an `attrNames`
	// map and the four value/onChange pairs are derived here, matching the shape
	// GradientOverlayControl already had. Installing shadow somewhere new becomes one
	// mount with one map instead of six hand-wired props.
	//
	// ⚠ FULLY BACKWARDS-COMPATIBLE, and that is not optional: 22 existing mount sites
	// pass the explicit props. The explicit props WIN when both are supplied, so a
	// partially-migrated caller is never silently overridden by a map it also passed.
	attributes,
	setAttributes,
	attrNames,
} ) {
	// Derive the explicit pairs from the map, without clobbering anything explicit.
	if ( attrNames && attributes && setAttributes ) {
		const bind = ( key, current, currentSetter ) => {
			const attr = attrNames[ key ];
			if ( ! attr || current !== undefined || typeof currentSetter === 'function' ) {
				return [ current, currentSetter ];
			}
			return [
				attributes[ attr ],
				( next ) => setAttributes( { [ attr ]: next ?? '' } ),
			];
		};
		[ value, onChange ] = bind( 'base', value, onChange );
		[ colour, onColourChange ] = bind( 'colour', colour, onColourChange );
		[ valueHover, onValueHoverChange ] = bind( 'hover', valueHover, onValueHoverChange );
		[ colourHover, onColourHoverChange ] = bind( 'hoverColour', colourHover, onColourHoverChange );
	}
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
	// Same defensive shape as safeOnColourChange above, for the hover sibling
	// added under Rule 31 (2026-08-22). A mount that passes `colourHover`
	// without a real `onColourHoverChange` would otherwise blank the sidebar
	// exactly like the 2026-08-20 incident this file already guards against.
	const safeOnColourHoverChange =
		onColourHoverChange ||
		( () => {
			// eslint-disable-next-line no-console
			console.warn(
				'ShadowControl: onColourHoverChange prop is missing — the hover colour field will not update the block. Pass `colourHover` + `onColourHoverChange` from the caller.'
			);
		} );
	// Two-state row only when the caller actually wired a hover sibling —
	// a mount with no meaningful hover state (documented per call site)
	// keeps rendering the single-state row it always has.
	// Same defensive shape as safeOnColourChange/safeOnColourHoverChange above. A mount
	// that opts into hover but wires only the colour half would otherwise throw on the
	// first shape edit in the Hover tab — the 2026-08-20 incident that blanked the whole
	// inspector sidebar, in a new place.
	const safeOnValueHoverChange =
		onValueHoverChange ||
		( () => {
			// eslint-disable-next-line no-console
			console.warn(
				'ShadowControl: onValueHoverChange prop is missing — the hover SHAPE fields will not update the block. Pass `valueHover` + `onValueHoverChange` from the caller.'
			);
		} );
	// Hover is offered when EITHER half is wired, so a caller migrating incrementally
	// still gets the tab (with the unwired half warning rather than crashing) instead of
	// silently falling back to a single state and looking like it worked.
	const hasHoverState =
		typeof onColourHoverChange === 'function' || typeof onValueHoverChange === 'function';
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
	return (
		<BaseControl label={ label } __nextHasNoMarginBottom>
			{ /* ⭐ ONE STATE AXIS, AT THE TOP (Bean's ruling 2026-08-22): "in the case of
			   shadow, the colour picker should be single state because the whole panel
			   should be 2 state". The tabs below own normal/hover for the ENTIRE builder —
			   presets, offsets, blur, spread, colour and inset all belong to the selected
			   state. The previous shape put a 2-state axis on the COLOUR PICKER ALONE, which
			   meant a client picked "Hover" in two different places to mean one thing, and
			   the shape was not per-state at all.
			   The inner picker is therefore SINGLE-state and carries `statesProvidedByParent`
			   so rule 31 does not read it as a below-minimum row: both states genuinely
			   exist, one level up, and the marker names where. */ }
			{ hasHoverState ? (
				<TabPanel
					className="sgs-shadow-control__states"
					tabs={ [
						{ name: 'normal', title: __( 'Normal', 'sgs-blocks' ) },
						{ name: 'hover', title: __( 'Hover', 'sgs-blocks' ) },
					] }
				>
					{ ( tab ) =>
						tab.name === 'hover' ? (
							<ShadowStateBuilder
								value={ valueHover }
								onChange={ safeOnValueHoverChange }
								colour={ colourHover }
								onColourChange={ safeOnColourHoverChange }
								presets={ presets }
							/>
						) : (
							<ShadowStateBuilder
								value={ value }
								onChange={ onChange }
								colour={ colour }
								onColourChange={ safeOnColourChange }
								presets={ presets }
							/>
						)
					}
				</TabPanel>
			) : (
				<ShadowStateBuilder
					value={ value }
					onChange={ onChange }
					colour={ colour }
					onColourChange={ safeOnColourChange }
					presets={ presets }
				/>
			) }
		</BaseControl>
	);
}

/**
 * ONE state's worth of shadow builder — presets, offsets, blur, spread, colour, inset.
 *
 * Extracted 2026-08-22 so the SAME builder renders per state inside ShadowControl's
 * tabs. Before this, only the COLOUR was per-state and the shape was shared, so a hover
 * shadow could recolour but never lift, grow or soften — Bean ruled for full symmetry
 * (shape AND colour, both states).
 *
 * `presets` is resolved ONCE by the parent and passed down: it is identical for both
 * states, and resolving it per instance would duplicate the origin-precedence merge and
 * let the two states drift.
 */
function ShadowStateBuilder( { value, onChange, colour, onColourChange, presets } ) {
	const parts = parseShadow( value ) || DEFAULT_PARTS;

	const updatePart = ( key, next ) => {
		onChange( buildShadow( { ...parts, [ key ]: next } ) );
	};

	return (
		<>
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
						onChange={ ( v ) => onColourChange( v || DEFAULT_COLOUR ) }
						linked
						enableAlpha
						statesProvidedByParent
					/>
					<ToggleControl
						label={ __( 'Inset (inner shadow)', 'sgs-blocks' ) }
						checked={ parts.inset }
						onChange={ ( v ) => updatePart( 'inset', v ) }
						__nextHasNoMarginBottom
					/>
				</div>
			) }
		</>
	);
}
