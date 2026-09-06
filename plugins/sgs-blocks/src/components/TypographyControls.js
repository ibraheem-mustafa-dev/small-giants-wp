/**
 * TypographyControls — shared, uniform typography UI for every SGS block.
 *
 * Extracted from the canonical sgs/text + sgs/heading pattern so that EVERY
 * block customises the SAME variables in the SAME way (Bean R-22-13, 2026-06-11).
 *
 * CANONICAL UI — WordPress's OWN native typography controls, rendered directly
 * (2026-09-06 rebuild). This panel is not "styled like" core's Typography panel;
 * with the single unavoidable exception noted below, it IS core's components,
 * wired to SGS's attribute store (tiered-responsive shape + `prefix` system)
 * underneath. Every prop contract below was read verbatim from the
 * `WordPress/gutenberg` `wp/7.1` branch.
 *
 *   - Font size    → core <FontSizePicker> (`withSlider`): its own header,
 *                    preset/custom gear toggle, t-shirt ToggleGroup or dropdown,
 *                    and UnitControl + RangeControl custom body.
 *   - Font family  → core <FontFamilyControl>.
 *   - Weight+style → core <FontAppearanceControl> — ONE combined dropdown, not
 *                    two separate ones.
 *   - Line height  → core <LineHeightControl> (unitless stepper). Writes
 *                    LineHeight and pins LineHeightUnit to '' — the PHP
 *                    helper's unitless semantic, where the number is emitted
 *                    with no suffix.
 *   - Letter space → core <LetterSpacingControl>.
 *   - Decoration   → core <TextDecorationControl> (icon ToggleGroup).
 *   - Letter case  → FAITHFUL PARTIAL REBUILD of core's TextTransformControl
 *                    (icon ToggleGroup) — 3 tiles, not core's 4 (2026-09-06,
 *                    Bean-directed: the None tile was dropped so this row fits
 *                    beside Decoration; 'none' stays reachable via a reset
 *                    button next to the label). See its render site.
 *   - Text align   → FAITHFUL REIMPLEMENTATION of core's TextAlignmentControl.
 *                    Core's is a PRIVATE API (`private-apis.js` only, needs
 *                    `unlock()`), so it cannot be imported; it is rebuilt from
 *                    its real source with the same icons, labels, options and
 *                    deselect behaviour. See its render site.
 *
 * SGS-ONLY, rendered LAST (no WordPress equivalent exists at all):
 *   - Text wrap    → CSS `text-wrap`. Core has no such control and no
 *                    `textWrap` typography support anywhere in `packages/`.
 *   - Hover trio   → decoration/transform/weight on :hover.
 *
 * ⛔ Do NOT reintroduce a hand-built lookalike for anything in the first list.
 * A local copy of a core control drifts from it silently — nothing in this repo
 * would report that it had.
 *
 * Parameterised by `prefix` so one component drives any element's typography:
 *   prefix ''       → fontSize / fontSizeUnit / fontSizeTablet / fontSizeMobile /
 *                     fontWeight / fontStyle / lineHeight / lineHeightUnit / …
 *   prefix 'label'  → labelFontSize / labelFontSizeUnit / labelFontSizeTablet / …
 *   prefix 'title'  → titleFontSize / …    prefix 'pill' → pillFontSize / …
 *
 * Attribute shape (UNCHANGED — consumers + PHP helper work with zero changes):
 *   {prefix}FontSize        number   (e.g. 18)        — desktop; blocks that
 *                           opt in via fontSizePresets may ALSO store a theme
 *                           preset slug STRING (e.g. 'small') here — the PHP
 *                           side resolves it to var(--wp--preset--font-size--…)
 *   {prefix}FontSizeUnit    string   (px|em|rem)       — shared across breakpoints
 *   {prefix}FontSizeTablet  number
 *   {prefix}FontSizeMobile  number
 *   {prefix}FontWeight      string   (100–900 | '')
 *   {prefix}FontStyle       string   (normal|italic | '')
 *   {prefix}LineHeight      number   (e.g. 1.5)
 *   {prefix}LineHeightUnit  string   (em|rem|px | '')  — unitless when empty
 *
 * The matching CSS is emitted server-side by sgs_typography_css_rule() in
 * includes/helpers-typography.php — one helper, one shape, every block.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useSettings } from '@wordpress/block-editor';
import { BaseControl, Button, Flex, FlexItem, RangeControl, SelectControl } from '@wordpress/components';
// The same four icons core's own TextAlignmentControl imports — see the
// reimplementation note at its render site for why it is rebuilt, not imported.
// formatUppercase/Lowercase/Capitalize are the same three icons core's own
// TextTransformControl uses for those tiles — see the letter-case rebuild note.
import {
	alignLeft,
	alignCenter,
	alignRight,
	alignJustify,
	formatUppercase,
	formatLowercase,
	formatCapitalize,
} from '@wordpress/icons';
import ResponsiveControl from './ResponsiveControl';
import ResponsiveOverride from './ResponsiveOverride';
import {
	VStack,
	UnitControl,
	NumberControl,
	ToggleGroupControl,
	ToggleGroupControlOption,
	ToggleGroupControlOptionIcon,
	// The REAL WordPress typography controls. Routed through the primitives
	// barrel (the `__experimental*` compat boundary) rather than imported raw —
	// `survey-experimental-imports.js --check` fails the build on any raw
	// `__experimental*` component import outside that one file.
	FontSizePicker,
	LineHeightControl,
	LetterSpacingControl,
	TextDecorationControl,
	FontAppearanceControl,
	FontFamilyControl,
	WritingModeControl,
} from './primitives';
import { makeResponsive } from '../utils/responsive';
import { flattenPresetSetting } from '../utils/presetSettings';
// `flattenPresetSetting` + `useSettings` ARE imported, for `FontFamilyControl`
// only — see the note at the top of TypographyControlsFields. `FontSizePicker`
// still needs neither; it sources `fontSizes` itself via a settings-aware
// block-editor wrapper that overrides anything we pass.

/**
 * Multi-target switcher threshold (Bean-approved design, 2026-09-05).
 * 1 target -> no switcher (render the full control set directly, byte-identical
 * to every existing single-target call site). 2-3 targets -> segmented
 * ToggleGroupControl. 4+ targets -> SelectControl dropdown (a segmented control
 * gets cramped beyond 3 options). This is a DATA-DRIVEN condition on the length
 * of the `targets` array — never a per-block override prop or a per-block choice
 * of control type (Rule 3, universal/no-carve-outs).
 */
const SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED = 3;

/** Plain-text suffix marking a target with at least one non-default value set.
 * A trailing bullet character (not a coloured DOM dot) so the SAME string works
 * unchanged as both a ToggleGroupControlOption label and a SelectControl option
 * label — the latter requires a plain string, so a JSX/coloured-dot indicator
 * would only work in one of the two switcher shapes. */
const SGS_TYPOGRAPHY_MODIFIED_SUFFIX = ' •';

/**
 * Is this stored attribute value the modern {desktop,tablet,mobile} OBJECT
 * shape (Spec 35 tier-object migration), rather than the legacy flat scalar?
 * `null` is deliberately excluded (typeof null === 'object' in JS) since a
 * `null` default on a legacy scalar attr means "inherit", not "tiered".
 *
 * @param {*} val Stored attribute value.
 * @return {boolean} True when tiered-object shaped.
 */
function isTieredValue( val ) {
	return val !== null && typeof val === 'object' && ! Array.isArray( val );
}

/**
 * The empty-option label used by EVERY typography dropdown.
 *
 * WordPress core's own typography dropdowns label their unset option with the
 * plain word "Default" (never a dash, an em-dash sandwich, or the word
 * "inherit"). Bean's 2026-09-06 spec adopts that verbatim: a client reads
 * "Default" as "whatever the theme decides", where "— inherit —" reads as
 * developer jargon. One constant so a single edit changes every dropdown
 * rather than eight separate option arrays drifting apart.
 */
const SGS_TYPOGRAPHY_DEFAULT_LABEL = __( 'Default', 'sgs-blocks' );

export const SGS_FONT_WEIGHT_OPTIONS = [
	{ label: SGS_TYPOGRAPHY_DEFAULT_LABEL, value: '' },
	{ label: __( 'Thin (100)', 'sgs-blocks' ), value: '100' },
	{ label: __( 'Extra-light (200)', 'sgs-blocks' ), value: '200' },
	{ label: __( 'Light (300)', 'sgs-blocks' ), value: '300' },
	{ label: __( 'Regular (400)', 'sgs-blocks' ), value: '400' },
	{ label: __( 'Medium (500)', 'sgs-blocks' ), value: '500' },
	{ label: __( 'Semi-bold (600)', 'sgs-blocks' ), value: '600' },
	{ label: __( 'Bold (700)', 'sgs-blocks' ), value: '700' },
	{ label: __( 'Extra-bold (800)', 'sgs-blocks' ), value: '800' },
	{ label: __( 'Black (900)', 'sgs-blocks' ), value: '900' },
];

export const SGS_FONT_STYLE_OPTIONS = [
	{ label: SGS_TYPOGRAPHY_DEFAULT_LABEL, value: '' },
	{ label: __( 'Normal', 'sgs-blocks' ), value: 'normal' },
	{ label: __( 'Italic', 'sgs-blocks' ), value: 'italic' },
];

// text-decoration / text-transform enums (match the PHP helper's allowlists in
// sgs_typography_css_rule — none/underline/line-through/overline and
// none/uppercase/lowercase/capitalize). '' = inherit (emit nothing).
export const SGS_TEXT_DECORATION_OPTIONS = [
	{ label: SGS_TYPOGRAPHY_DEFAULT_LABEL, value: '' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Underline', 'sgs-blocks' ), value: 'underline' },
	{ label: __( 'Line-through', 'sgs-blocks' ), value: 'line-through' },
	{ label: __( 'Overline', 'sgs-blocks' ), value: 'overline' },
];

export const SGS_TEXT_TRANSFORM_OPTIONS = [
	{ label: SGS_TYPOGRAPHY_DEFAULT_LABEL, value: '' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'UPPERCASE', 'sgs-blocks' ), value: 'uppercase' },
	{ label: __( 'lowercase', 'sgs-blocks' ), value: 'lowercase' },
	{ label: __( 'Capitalise', 'sgs-blocks' ), value: 'capitalize' },
];

/**
 * Letter-case TILE options for the icon ToggleGroupControl (2026-09-06,
 * Bean-directed) — deliberately 3 entries, not core TextTransformControl's 4.
 * 'None' is dropped as a tile: it stays the underlying default value, just
 * reachable via the reset button next to the control's label instead of a
 * tile, so this row + the Decoration row's 3 tiles fit one line (6 total).
 * See the render site for the full rationale.
 */
export const SGS_TEXT_TRANSFORM_TILE_OPTIONS = [
	{ label: __( 'UPPERCASE', 'sgs-blocks' ), value: 'uppercase', icon: formatUppercase },
	{ label: __( 'lowercase', 'sgs-blocks' ), value: 'lowercase', icon: formatLowercase },
	{ label: __( 'Capitalise', 'sgs-blocks' ), value: 'capitalize', icon: formatCapitalize },
];

/**
 * text-align enum. Mirrors `sgs/text`'s own TEXT_ALIGN_OPTIONS verbatim (the
 * reference panel Bean named for row/spacing conventions) so the two blocks
 * offer an identical vocabulary — only the empty label differs, now "Default".
 *
 * ⚠ WordPress core's own alignment control (`TextAlignmentControl`,
 * `block-editor/src/components/text-alignment-control/`) is a PRIVATE API — it
 * lives in `private-apis.js` and is deliberately absent from the package's
 * public `components/index.js`, so it cannot be imported by a plugin at all
 * (verified against Gutenberg trunk, 2026-09-06). Reimplementing it as a
 * SelectControl — matching the shape `sgs/text` already ships — is the only
 * route, not a preference.
 *
 * The values match the PHP allowlist in `sgs_typography_css_rule()`
 * (`left|center|right|justify|start|end`); `start`/`end` are omitted from the
 * picker for the same reason `sgs/text` omits them — they are RTL-aware
 * logical values the converter may set, not something a client picks.
 */
export const SGS_TEXT_ALIGN_OPTIONS = [
	{ label: __( 'Align text left', 'sgs-blocks' ), value: 'left', icon: alignLeft },
	{ label: __( 'Align text center', 'sgs-blocks' ), value: 'center', icon: alignCenter },
	{ label: __( 'Align text right', 'sgs-blocks' ), value: 'right', icon: alignRight },
	{ label: __( 'Justify text', 'sgs-blocks' ), value: 'justify', icon: alignJustify },
];

/**
 * CSS `text-wrap` enum.
 *
 * ⚠ WordPress core has NO text-wrap control of any kind — a search of the whole
 * Gutenberg `packages/` tree returns no such component and `core/heading`'s
 * `supports.typography` does not list it (verified against trunk, 2026-09-06).
 * This one is genuinely SGS-only, so there is no native shape to mirror.
 *
 * `nowrap` and `stable` are carried because `sgs/heading`'s render.php allowlist
 * already accepts them and the cloning converter can set them on a cloned
 * heading (heading/render.php `$allowed_text_wrap`). `stable` is deliberately
 * NOT offered in the picker — it is a re-layout hint with no authoring value —
 * but a stored `stable` still renders, it simply isn't client-selectable.
 */
export const SGS_TEXT_WRAP_OPTIONS = [
	{ label: SGS_TYPOGRAPHY_DEFAULT_LABEL, value: '' },
	{ label: __( 'Wrap', 'sgs-blocks' ), value: 'wrap' },
	{ label: __( 'Balance', 'sgs-blocks' ), value: 'balance' },
	{ label: __( 'Pretty', 'sgs-blocks' ), value: 'pretty' },
	{ label: __( 'No wrap', 'sgs-blocks' ), value: 'nowrap' },
];

/**
 * Units + per-unit starting quantities for the text-indent control.
 *
 * Lifted verbatim from core's own `TextIndentControl`, which builds them via
 * `useCustomUnits({ availableUnits: useSettings('spacing.units') || [ 'px',
 * 'em', 'rem', 'ch', '%', 'vw', 'vh' ], defaultValues: { px: 16, em: 2,
 * rem: 2, ch: 2 } })`. Only those four units get a starting quantity in core;
 * %/vw/vh deliberately get none, and that asymmetry is reproduced rather than
 * tidied away.
 */
const TEXT_INDENT_UNITS = [
	{ value: 'px', label: 'px', default: 16 },
	{ value: 'em', label: 'em', default: 2 },
	{ value: 'rem', label: 'rem', default: 2 },
	{ value: 'ch', label: 'ch', default: 2 },
	{ value: '%', label: '%' },
	{ value: 'vw', label: 'vw' },
	{ value: 'vh', label: 'vh' },
];

/**
 * Text-indent slider bounds, keyed by unit — core's own expression:
 * `isValueUnitRelative ? 10 : 100` for max and `? 0.1 : 1` for step, where
 * `isValueUnitRelative` is `[ 'em','rem','%','ch','vw','vh' ].includes(unit)`.
 *
 * ⚠ Note the relative set here is NOT the same as the font-size picker's
 * (`em/rem/vw/vh`) — this one also counts `%` and `ch`. `px` is the only unit
 * core treats as non-relative for text-indent. Reproduced exactly.
 *
 * @param {string} unit The active unit.
 * @return {{max: number, step: number}} Slider bounds.
 */
function textIndentSliderBounds( unit ) {
	const isRelative = [ 'em', 'rem', '%', 'ch', 'vw', 'vh' ].includes( unit );
	return isRelative ? { max: 10, step: 0.1 } : { max: 100, step: 1 };
}

/**
 * ⛔ NO line-height, letter-spacing or font-size-slider constants live here.
 *
 * An earlier pass declared SGS copies of core's `BASE_DEFAULT_VALUE` (1.5),
 * `STEP` (0.01), `SPIN_FACTOR` (10), the font-size slider bounds
 * (min 0 / max 10-or-100 / step 0.1-or-1) and the letter-spacing unit list with
 * its per-unit defaults. Every one is now owned by the REAL core control this
 * file renders — `LineHeightControl`, `FontSizePicker`, `LetterSpacingControl` —
 * so the copies were DELETED rather than kept in sync.
 *
 * That is the whole point of rendering the real components rather than
 * lookalikes: a copied constant can silently drift from the thing it copies,
 * and nothing in this repo would ever have told us it had.
 */

/**
 * Units offered by the font-size picker.
 *
 * ⚠ A PLAIN STRING ARRAY, not the `{ value, label, default }` object array
 * UnitControl takes. Core's `FontSizePicker` declares
 * `units?: string[]` and feeds it to `useCustomUnits( { availableUnits } )`,
 * which builds the object form itself — handing it the object array produces a
 * picker with no usable units.
 *
 * The set is narrower than core's default (`px/em/rem/vw/vh`) on purpose: it
 * matches the PHP helper's accepted units, which `sgs_responsive_sanitise_unit()`
 * strips to `[a-z]`. Offering `vw`/`vh` here would let a client choose a unit
 * the server then renders differently from the editor preview.
 */
const FONT_SIZE_UNIT_SLUGS = [ 'px', 'em', 'rem' ];

/**
 * ⛔ There is deliberately NO line-height unit list any more.
 *
 * Line height is UNITLESS-ONLY, matching WordPress core: its `LineHeightControl`
 * renders `__experimentalNumberControl`, not `UnitControl`, and offers no unit
 * or measure switcher at all (verified against Gutenberg trunk, 2026-09-06 —
 * `block-editor/src/components/line-height-control/index.jsx`). A unitless
 * line-height is also the correct default in CSS: `1.5` inherits as a RATIO
 * recomputed against each descendant's own font-size, whereas `1.5em` inherits
 * as a fixed computed length and silently breaks nested text.
 *
 * The stepper therefore writes `{prefix}LineHeightUnit: ''` alongside the
 * number. The PHP helper's `''` → unitless semantic is unchanged, so this needs
 * no server-side edit: `sgs_typography_css_rule()` already emits the bare
 * number when the unit string is empty (helpers-typography.php, `$line_unit`).
 */

/**
 * Build the attribute name for a given prefix + base (camelCase).
 * prefix '' + 'FontSize' → 'fontSize' ; prefix 'label' + 'FontSize' → 'labelFontSize'.
 *
 * @param {string} prefix Attribute prefix ('' | 'label' | 'title' | …).
 * @param {string} base   PascalCase base ('FontSize', 'FontWeight', …).
 * @return {string} The attribute key.
 */
export function typographyAttrName( prefix, base ) {
	return prefix ? prefix + base : base.charAt( 0 ).toLowerCase() + base.slice( 1 );
}

/**
 * The full set of attribute keys this component reads/writes for a prefix.
 * Use in a block's block.json generator or to register attrs — exported so a
 * block can spread the canonical set rather than hand-declaring each key.
 *
 * @param {string} prefix Attribute prefix.
 * @return {Object} Map of logical-name → attribute-key.
 */
export function typographyAttrKeys( prefix ) {
	return {
		fontFamily: typographyAttrName( prefix, 'FontFamily' ),
		fontSize: typographyAttrName( prefix, 'FontSize' ),
		fontSizeUnit: typographyAttrName( prefix, 'FontSizeUnit' ),
		fontSizeTablet: typographyAttrName( prefix, 'FontSizeTablet' ),
		fontSizeMobile: typographyAttrName( prefix, 'FontSizeMobile' ),
		fontWeight: typographyAttrName( prefix, 'FontWeight' ),
		fontStyle: typographyAttrName( prefix, 'FontStyle' ),
		lineHeight: typographyAttrName( prefix, 'LineHeight' ),
		lineHeightUnit: typographyAttrName( prefix, 'LineHeightUnit' ),
		textDecoration: typographyAttrName( prefix, 'TextDecoration' ),
		textTransform: typographyAttrName( prefix, 'TextTransform' ),
		letterSpacing: typographyAttrName( prefix, 'LetterSpacing' ),
		letterSpacingUnit: typographyAttrName( prefix, 'LetterSpacingUnit' ),
		textColumns: typographyAttrName( prefix, 'TextColumns' ),
		textIndent: typographyAttrName( prefix, 'TextIndent' ),
		writingMode: typographyAttrName( prefix, 'WritingMode' ),
		// OPT-IN fields (showTextAlign / showTextWrap). Present in the key map
		// unconditionally so `targetHasCustomValues` can see them; a block that
		// does not declare the attribute simply reads `undefined` there, which
		// the modified-indicator scan already treats as unset.
		textAlign: typographyAttrName( prefix, 'TextAlign' ),
		textWrap: typographyAttrName( prefix, 'TextWrap' ),
		// Hover companions (D309). Consumed only when showHover is enabled AND the
		// block declares + renders them (else the dead-control gate flags it).
		fontWeightHover: typographyAttrName( prefix, 'FontWeightHover' ),
		textDecorationHover: typographyAttrName( prefix, 'TextDecorationHover' ),
		textTransformHover: typographyAttrName( prefix, 'TextTransformHover' ),
	};
}

/**
 * Compose a UnitControl display value from a numeric attr + a unit string.
 * Returns '' when the number attr is absent/empty so UnitControl shows blank
 * (allowing the user to perceive "unset" correctly).
 *
 * @param {number|undefined} num  The numeric attribute value.
 * @param {string}           unit The unit string (e.g. 'px', 'em', 'rem').
 * @return {string} Combined value string or ''.
 */
function composeUnitValue( num, unit ) {
	if ( num === undefined || num === null || num === '' ) {
		return '';
	}
	// A string value is a theme preset slug (or a legacy raw-CSS size) — not
	// representable in the numeric UnitControl. Show blank rather than a
	// garbled concatenation like 'smallpx'.
	if ( typeof num === 'string' ) {
		return '';
	}
	return `${ num }${ unit || '' }`;
}

/**
 * Parse a UnitControl onChange value (e.g. '18px', '1.2em', '24') into its
 * numeric and unit parts. Returns { num: number|undefined, unit: string }.
 * When the string is empty/null, returns { num: undefined, unit } preserving
 * the current unit so it is not wiped on clear.
 *
 * @param {string} raw         Raw string from UnitControl onChange.
 * @param {string} currentUnit The currently-stored unit (used when raw is empty).
 * @return {{ num: number|undefined, unit: string }}
 */
function parseUnitValue( raw, currentUnit ) {
	if ( ! raw && raw !== 0 ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	const str = String( raw ).trim();
	if ( '' === str ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	// Match leading number (int or float), optional unit suffix.
	const match = str.match( /^([\d.]+)\s*([a-z%]*)$/i );
	if ( match ) {
		const num = parseFloat( match[ 1 ] );
		const unit = match[ 2 ] || currentUnit || 'px';
		return { num: isNaN( num ) ? undefined : num, unit };
	}
	// Couldn't parse — treat as clear.
	return { num: undefined, unit: currentUnit || 'px' };
}

/**
 * Uniform typography controls. Drop into any InspectorControls panel.
 *
 * Renders:
 *   - Font size: ResponsiveControl (device-icon switcher) → UnitControl
 *     (number + unit in one input). showResponsive=false → single UnitControl.
 *   - Line height: single UnitControl (number + unit; '' unit = unitless).
 *   - Font weight: SelectControl.
 *   - Font style: SelectControl.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setter.
 * @param {string}   [props.prefix='']   Attribute prefix for this element.
 * @param {boolean}  [props.showSize=true]
 * @param {boolean}  [props.showWeight=true]
 * @param {boolean}  [props.showStyle=true]
 * @param {boolean}  [props.showLineHeight=true]
 * @param {boolean}  [props.showResponsive=true] Show device-icon switcher for size.
 * @param {boolean}  [props.fontSizePresets=false] Offer the theme.json preset
 *   scale as a dropdown. OPT-IN: only pass true when the block's
 *   {prefix}FontSize attr is typed ["number","string"] — on a number-only
 *   attr WP discards the stored slug at render (silent-discard class, D338).
 * @param {boolean}  [props.showTextAlign=false] Offer a text-align dropdown.
 *   OPT-IN: only pass true when the block declares {prefix}TextAlign. Emitted
 *   server-side by sgs_typography_css_rule() (allowlist
 *   left|center|right|justify|start|end).
 * @param {boolean}  [props.showTextWrap=false] Offer a CSS text-wrap dropdown.
 *   OPT-IN: only pass true when the block declares {prefix}TextWrap. Emitted
 *   server-side by sgs_typography_css_rule() (allowlist
 *   wrap|nowrap|balance|pretty|stable). WordPress core has no equivalent
 *   control — this one is SGS-only.
 * @param {boolean}  [props.showFontFamily=false] Offer a font-family picker
 *   sourced from the theme.json `typography.fontFamilies` preset list (same
 *   opt-in shape as fontSizePresets). OPT-IN: only pass true when the block
 *   declares {prefix}FontFamily as a string attr — an undeclared attr is
 *   silently discarded by WP at render (D338), same trap fontSizePresets
 *   already guards against.
 * @return {JSX.Element} Controls fragment.
 */
function TypographyControlsFields( {
	attributes,
	setAttributes,
	prefix = '',
	showSize = true,
	showWeight = true,
	showStyle = true,
	showLineHeight = true,
	showResponsive = true,
	fontSizePresets = false,
	showFontFamily = false,
	showDecoration = false,
	showTransform = false,
	showLetterSpacing = false,
	showTextAlign = false,
	showTextWrap = false,
	showTextColumns = false,
	showTextIndent = false,
	showWritingMode = false,
	showHover = false,
} ) {
	const k = typographyAttrKeys( prefix );

	// ⛔ NO "More typography options" disclosure. Every field renders expanded,
	// always. The 2026-08-19 compact-by-default pass collapsed weight / style /
	// line height / letter spacing behind a Button; Bean REVERSED that on
	// 2026-09-06 after comparing the panel against core/heading's, whose fields
	// are likewise all visible. A control a client cannot see is a control they
	// do not know exists — and the row-pairing below already recovers the
	// vertical space the disclosure was introduced to save.

	// `FontSizePicker` still needs no local settings read: the block-editor
	// wrapper force-overrides `fontSizes`/`disableCustomFontSizes` from its own
	// `useSettings` call AFTER spreading our props, so anything we passed would
	// be discarded regardless.
	//
	// `FontFamilyControl` is different, and this is the crash this block
	// re-introduced 2026-09-06: passing no `fontFamilies` makes it fall back to
	// reading `useSettings( 'typography.fontFamilies' )` INTERNALLY, inside a
	// WP-core component this file cannot patch. That setting resolves to
	// WordPress's raw origin-keyed object (`{ theme: [...], custom: [...] }`),
	// not a flat array, on this theme/WP version — the exact
	// `flattenPresetSetting()` existed to guard (measured live on the canary
	// 2026-08-19; see that helper's own docblock). The theory that "core's own
	// controls handle that shape internally" was wrong for THIS control — it
	// crashed `sgs/text`'s Styles tab with `.map is not a function` the moment
	// `showFontFamily` was switched on for a second block. Reading the setting
	// HERE and flattening it before handing it to `FontFamilyControl` (below)
	// removes the dependency on that internal fallback entirely.
	const [ fontFamiliesRaw ] = useSettings( 'typography.fontFamilies' );
	const fontFamilies = flattenPresetSetting( fontFamiliesRaw );

	// Each property's tier shape is read from the CURRENTLY STORED value, not
	// hardcoded per-block — the tier-object migration runs property-by-property,
	// so e.g. sgs/label has an object fontSize but a still-scalar lineHeight.
	const fontSizeRaw       = attributes[ k.fontSize ];
	const fontSizeIsTiered  = isTieredValue( fontSizeRaw );
	const lineHeightRaw     = attributes[ k.lineHeight ];
	const lineHeightIsTiered = isTieredValue( lineHeightRaw );
	const letterSpacingRaw  = attributes[ k.letterSpacing ];
	const letterSpacingIsTiered = isTieredValue( letterSpacingRaw );

	/**
	 * onChange for the preset-size dropdown. A preset is global (no device
	 * tiers), so selecting one stores the slug string on the base attr and
	 * clears the tablet/mobile numeric tiers; '— none —' clears back to unset.
	 * Typing a numeric size afterwards overwrites the slug (mutual exclusion).
	 *
	 * @param {string} slug Preset slug or '' to clear.
	 */
	function onFontSizePresetChange( slug ) {
		if ( fontSizeIsTiered ) {
			setAttributes( {
				[ k.fontSize ]: slug ? makeResponsive( { desktop: slug } ) : makeResponsive( {} ),
			} );
			return;
		}
		setAttributes( {
			[ k.fontSize ]: slug || undefined,
			[ k.fontSizeTablet ]: undefined,
			[ k.fontSizeMobile ]: undefined,
		} );
	}

	const currentLetterSpacingUnit = attributes[ k.letterSpacingUnit ] || 'px';
	const currentLetterSpacingValue = letterSpacingIsTiered
		? letterSpacingRaw?.desktop
		: letterSpacingRaw;

	function onLetterSpacingChange( raw ) {
		const { num, unit } = parseUnitValue( raw, currentLetterSpacingUnit );
		if ( letterSpacingIsTiered ) {
			setAttributes( {
				[ k.letterSpacing ]: makeResponsive( { ...( letterSpacingRaw || {} ), desktop: num } ),
				[ k.letterSpacingUnit ]: unit,
			} );
			return;
		}
		setAttributes( {
			[ k.letterSpacing ]: num,
			[ k.letterSpacingUnit ]: unit,
		} );
	}

	/**
	 * onChange for the letter-spacing control in TIERED mode, writing ONLY the
	 * active tier via ResponsiveOverride's setOwnValue — the exact shape
	 * onFontSizeChangeTiered() uses.
	 *
	 * ⛔ Never call setAttributes with a freshly-built `{ [tier]: value }`
	 * object here. `setOwnValue` spreads the EXISTING tier object first; a bare
	 * write would silently drop the other two tiers, and WordPress applies no
	 * schema validation inside a tier object to catch it.
	 *
	 * @param {Function} setOwnValue Writer for the active tier.
	 * @param {string}   raw         Raw value from the control.
	 */
	function onLetterSpacingChangeTiered( setOwnValue, raw ) {
		const { num, unit } = parseUnitValue( raw, currentLetterSpacingUnit );
		setOwnValue( num );
		if ( unit !== currentLetterSpacingUnit ) {
			setAttributes( { [ k.letterSpacingUnit ]: unit } );
		}
	}

	// Shared unit across all breakpoints. Default 'px' if unset.
	const currentFontSizeUnit = attributes[ k.fontSizeUnit ] || 'px';

	// Responsive breakpoint → attr key map (mirrors the PHP helper's responsive output).
	const fontSizeAttrMap = {
		desktop: k.fontSize,
		tablet: k.fontSizeTablet,
		mobile: k.fontSizeMobile,
	};

	/**
	 * onChange for the font-size UnitControl for a given breakpoint.
	 * Writes the numeric part to the breakpoint attr and the unit to fontSizeUnit.
	 *
	 * @param {string} breakpoint 'desktop'|'tablet'|'mobile'
	 * @param {string} raw        Raw value from UnitControl onChange.
	 */
	function onFontSizeChange( breakpoint, raw ) {
		const { num, unit } = parseUnitValue( raw, currentFontSizeUnit );
		if ( fontSizeIsTiered ) {
			setAttributes( {
				[ k.fontSize ]: makeResponsive( { ...( fontSizeRaw || {} ), [ breakpoint ]: num } ),
				[ k.fontSizeUnit ]: unit,
			} );
			return;
		}
		const attrKey = fontSizeAttrMap[ breakpoint ];
		setAttributes( {
			[ attrKey ]: num,
			[ k.fontSizeUnit ]: unit,
		} );
	}

	/**
	 * onChange for the font-size UnitControl in TIERED mode, writing only the
	 * active tier via ResponsiveOverride's setOwnValue.
	 *
	 * @param {Function} setOwnValue Writer for the active tier (from ResponsiveOverride).
	 * @param {string}   raw         Raw value from UnitControl onChange.
	 */
	function onFontSizeChangeTiered( setOwnValue, raw ) {
		const { num, unit } = parseUnitValue( raw, currentFontSizeUnit );
		setOwnValue( num );
		if ( unit !== currentFontSizeUnit ) {
			setAttributes( { [ k.fontSizeUnit ]: unit } );
		}
	}

	const currentLineHeightValue = lineHeightIsTiered
		? lineHeightRaw?.desktop
		: lineHeightRaw;

	/**
	 * onChange for the line-height STEPPER (NumberControl).
	 *
	 * Line height is unitless-only now (see the LINE_HEIGHT_UNITS tombstone
	 * above), so this writes the bare number and pins the companion unit attr
	 * to `''` — the PHP helper's unitless semantic. Pinning it rather than
	 * leaving it alone is deliberate: a block whose `block.json` still declares
	 * `lineHeightUnit` with a `"default": "em"` (most of them do) would
	 * otherwise render `1.5em` while this control displays a bare `1.5`, i.e.
	 * the number the client typed would not be the number the page renders.
	 *
	 * NumberControl hands back a STRING (or undefined when cleared).
	 *
	 * @param {string|undefined} raw Raw value from NumberControl onChange.
	 */
	function onLineHeightChange( raw ) {
		const parsed = ( raw === undefined || raw === null || '' === String( raw ).trim() )
			? undefined
			: parseFloat( raw );
		const num = ( parsed === undefined || isNaN( parsed ) ) ? undefined : parsed;
		if ( lineHeightIsTiered ) {
			setAttributes( {
				[ k.lineHeight ]: makeResponsive( { ...( lineHeightRaw || {} ), desktop: num } ),
				[ k.lineHeightUnit ]: '',
			} );
			return;
		}
		setAttributes( {
			[ k.lineHeight ]: num,
			[ k.lineHeightUnit ]: '',
		} );
	}

	/**
	 * onChange for the line-height stepper in TIERED mode, writing ONLY the
	 * active tier via ResponsiveOverride's setOwnValue — the exact shape
	 * onFontSizeChangeTiered() uses.
	 *
	 * ⛔ Never call setAttributes with a freshly-built `{ [tier]: value }`
	 * object here (see onLetterSpacingChangeTiered's note — same trap).
	 *
	 * @param {Function}         setOwnValue Writer for the active tier.
	 * @param {string|undefined} raw         Raw value from NumberControl.
	 */
	function onLineHeightChangeTiered( setOwnValue, raw ) {
		const parsed = ( raw === undefined || raw === null || '' === String( raw ).trim() )
			? undefined
			: parseFloat( raw );
		setOwnValue( ( parsed === undefined || isNaN( parsed ) ) ? undefined : parsed );
		// Line height is unitless-only; pin the companion unit the same way the
		// flat path does, so the displayed number is the rendered number.
		if ( '' !== ( attributes[ k.lineHeightUnit ] ?? '' ) ) {
			setAttributes( { [ k.lineHeightUnit ]: '' } );
		}
	}

	/**
	 * The font-size field: THE REAL core `FontSizePicker`.
	 *
	 * It brings its own header ("Font size" label + the gear that toggles
	 * between preset and custom), its own preset body (a t-shirt-size
	 * ToggleGroup at <=5 presets, a dropdown above that — core's
	 * `MAX_TOGGLE_GROUP_SIZES`), and its own custom body (UnitControl +
	 * RangeControl). We pass `withSlider` so the slider is present, and
	 * `withReset={ false }` because clearing is already reachable through the
	 * unit input and, on a tiered attribute, through ResponsiveOverride's own
	 * "Reset to inherited".
	 *
	 * ⚠ We import the BLOCK-EDITOR FontSizePicker, not the components one. The
	 * block-editor build is a settings-aware wrapper that force-overrides
	 * `fontSizes` and `disableCustomFontSizes` from `useSettings` AFTER
	 * spreading our props — so passing our own `fontSizes` would be silently
	 * discarded. That is exactly what we want here (the theme's preset scale is
	 * the same source `flattenPresetSetting` was reading), but it does mean
	 * `fontSizePresets={ false }` cannot suppress the preset body; see the
	 * `disableCustomFontSizes` note on the call itself.
	 *
	 * ⚠ `valueMode` is ASYMMETRIC and this is the trap the wiring turns on.
	 * It changes only how `value` is READ (matched against `fontSize.slug` vs
	 * `fontSize.size`). `onChange` ALWAYS emits the literal SIZE as its first
	 * argument; the slug arrives as the optional SECOND argument
	 * (`selectedItem`). So "did the client pick a preset?" is answered by
	 * `selectedItem` being present, never by inspecting the first argument.
	 *
	 * @param {Object}                args
	 * @param {number|string|undefined} args.value    Numeric size, or a preset slug.
	 * @param {Function}              args.onChange   Receives a UnitControl-style string.
	 * @param {Function}              args.onPreset   Receives a preset slug (or '').
	 * @return {JSX.Element} The picker.
	 */
	function renderFontSizeRow( { value, onChange, onPreset } ) {
		const isSlug = typeof value === 'string' && '' !== value;
		return (
			<FontSizePicker
				value={ isSlug ? value : composeUnitValue( value, currentFontSizeUnit ) }
				valueMode={ isSlug ? 'slug' : 'literal' }
				withSlider
				withReset={ false }
				units={ FONT_SIZE_UNIT_SLUGS }
				onChange={ ( next, selectedItem ) => {
					// A preset was chosen — store the SLUG, not the resolved size,
					// so the client's size follows the theme if the theme changes.
					if ( selectedItem?.slug ) {
						onPreset( selectedItem.slug );
						return;
					}
					// Cleared entirely.
					if ( next === undefined || next === null || '' === next ) {
						onPreset( '' );
						onChange( '' );
						return;
					}
					onChange( String( next ) );
				} }
			/>
		);
	}

	// Font size, in whichever of the 3 shapes applies (tiered / responsive /
	// static). Every shape renders the SAME real FontSizePicker via
	// renderFontSizeRow() — the shapes differ only in where the value is read
	// from and written to, never in what the client sees.
	let fontSizeField = null;
	if ( showSize && showResponsive && fontSizeIsTiered ) {
		fontSizeField = (
			<ResponsiveOverride
				// No `label` here: FontSizePicker (rendered inside, via
				// renderFontSizeRow()) already brings its own "FONT SIZE"
				// header — a label here would just duplicate it.
				value={ fontSizeRaw }
				onChange={ ( obj ) => setAttributes( { [ k.fontSize ]: obj } ) }
			>
				{ ( { ownValue, inherited, setOwnValue } ) =>
					renderFontSizeRow( {
						value: inherited ? undefined : ownValue,
						onChange: ( val ) => onFontSizeChangeTiered( setOwnValue, val ),
						onPreset: onFontSizePresetChange,
					} )
				}
			</ResponsiveOverride>
		);
	} else if ( showSize && showResponsive && ! fontSizeIsTiered ) {
		fontSizeField = (
			// No `label` here either — same reason as the ResponsiveOverride
			// branch above: FontSizePicker owns its own "FONT SIZE" header.
			<ResponsiveControl>
				{ ( breakpoint ) =>
					renderFontSizeRow( {
						value: attributes[ fontSizeAttrMap[ breakpoint ] ],
						onChange: ( val ) => onFontSizeChange( breakpoint, val ),
						onPreset: onFontSizePresetChange,
					} )
				}
			</ResponsiveControl>
		);
	} else if ( showSize && ! showResponsive ) {
		fontSizeField = renderFontSizeRow( {
			value: fontSizeIsTiered ? fontSizeRaw?.desktop : attributes[ k.fontSize ],
			onChange: ( val ) => onFontSizeChange( 'desktop', val ),
			onPreset: onFontSizePresetChange,
		} );
	}

	return (
		/* ONE VStack owns the vertical rhythm for every row below.
		 *
		 * Before this pass each field brought its own margin (or suppressed it
		 * with __nextHasNoMarginBottom and brought none), so the gaps between
		 * rows were inconsistent — the specific complaint Bean raised comparing
		 * sgs/heading against sgs/text. Spacing is now declared ONCE here and
		 * every row inherits it, so no future row can drift. */
		<VStack spacing={ 3 }>
			{ /* ── Font size ── THE REAL core FontSizePicker, which brings its
			     own "Font size" header and preset/custom gear toggle. No SGS
			     label wrapper: adding one would double the heading. */ }
			{ fontSizeField }

			{ /* ── Font family ── THE REAL core control, given an explicit,
			     already-flattened `fontFamilies` array (see the crash note
			     above `fontFamiliesRaw` for why this is no longer left to the
			     control's own internal `useSettings` fallback). Renders
			     `Default` as its own empty option, and matches `value` against
			     the fontFamily CSS STRING (its `option.key`) — which is exactly
			     what this attribute stores, per the PHP helper's own docblock
			     ("the raw CSS font-family VALUE, not a slug"). Returns null by
			     itself when `fontFamilies` is empty. */ }
			{ showFontFamily && (
				<FontFamilyControl
					fontFamilies={ fontFamilies }
					value={ attributes[ k.fontFamily ] || '' }
					onChange={ ( val ) =>
						setAttributes( { [ k.fontFamily ]: val || undefined } )
					}
				/>
			) }

			{ /* ── Appearance ── THE REAL core FontAppearanceControl: ONE
			     dropdown combining weight and style, not two. It relabels
			     itself ("Appearance" / "Font weight" / "Font style") from the
			     two has* flags, and returns false on its own when both are off.

			     ⚠ `value` is REQUIRED and destructured as `{ fontStyle,
			     fontWeight }` — passing undefined throws. Always pass the
			     object, with undefined MEMBERS for unset.

			     ⚠ onChange emits the option's `style` OBJECT, and selecting
			     Default emits `{ fontStyle: undefined, fontWeight: undefined }`.
			     Both members are normalised to '' on the way into
			     setAttributes because these attributes are declared
			     `"type":"string"` with a '' default — writing undefined would
			     leave the previous stored value untouched instead of clearing
			     it. Weight is String()-coerced so it round-trips against
			     core's own option values. */ }
			{ ( showWeight || showStyle ) && (
				<FontAppearanceControl
					value={ {
						fontStyle: attributes[ k.fontStyle ] || undefined,
						fontWeight: attributes[ k.fontWeight ] || undefined,
					} }
					hasFontStyles={ !! showStyle }
					hasFontWeights={ !! showWeight }
					onChange={ ( next ) =>
						setAttributes( {
							...( showStyle
								? { [ k.fontStyle ]: next?.fontStyle ?? '' }
								: {} ),
							...( showWeight
								? {
										[ k.fontWeight ]:
											next?.fontWeight === undefined ||
											next?.fontWeight === null
												? ''
												: String( next.fontWeight ),
								  }
								: {} ),
						} )
					}
				/>
			) }

			{ /* ── Line height + Letter spacing ── paired two-per-row.
			     Line height is a UNITLESS STEPPER: NumberControl with custom
			     spin buttons and a GREYED 1.5 placeholder when unset, exactly
			     reproducing core's LineHeightControl (which is itself a
			     NumberControl, not a UnitControl — no measure switcher exists
			     on it, verified against Gutenberg trunk 2026-09-06).
			     Letter spacing keeps its unit switcher and stays EMPTY when
			     unset — no placeholder number, per Bean's spec. */ }
			{ ( showLineHeight || showLetterSpacing ) && (
				<Flex gap={ 2 } align="flex-start">
					{ showLineHeight && (
						<FlexItem isBlock>
							{ /* THE REAL core control. It owns its own
							   placeholder (1.5), step (0.01), spinFactor (10),
							   min (0) and `spinControls="custom"` internally —
							   we pass NONE of them, so there is nothing here to
							   drift out of sync with core. Unset is signalled by
							   passing undefined; it substitutes its own
							   RESET_VALUE ('') to stay a controlled input.

							   TIER-AWARE, exactly like font size above: when the
							   stored value is a {desktop,tablet,mobile} OBJECT it
							   is wrapped in <ResponsiveOverride>, so ONE control
							   edits whichever tier the global device toggle has
							   selected. There are no separate tablet/mobile
							   siblings — those were the bolted-on shape this
							   replaced (2026-09-06).

							   ⚠ `placeholder` is genuinely forwarded here:
							   core's LineHeightControl sets its own
							   `placeholder={BASE_DEFAULT_VALUE}` BEFORE spreading
							   `{...otherProps}`, so ours overrides it. That makes
							   an inherited tier show the INHERITED number greyed,
							   rather than a misleading 1.5. */ }
							{ lineHeightIsTiered ? (
								<ResponsiveOverride
									label={ __( 'Line height', 'sgs-blocks' ) }
									value={ lineHeightRaw }
									onChange={ ( obj ) =>
										setAttributes( { [ k.lineHeight ]: obj } )
									}
								>
									{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
										<LineHeightControl
											value={
												inherited || ownValue === '' || ownValue === undefined
													? undefined
													: ownValue
											}
											placeholder={
												inherited && effectiveValue !== undefined
													&& effectiveValue !== null && '' !== effectiveValue
													? effectiveValue
													: undefined
											}
											onChange={ ( val ) =>
												onLineHeightChangeTiered( setOwnValue, val )
											}
											__unstableInputWidth="100%"
										/>
									) }
								</ResponsiveOverride>
							) : (
								<LineHeightControl
									value={
										( currentLineHeightValue === undefined
											|| currentLineHeightValue === null
											|| '' === currentLineHeightValue )
											? undefined
											: currentLineHeightValue
									}
									onChange={ onLineHeightChange }
									__unstableInputWidth="100%"
								/>
							) }
						</FlexItem>
					) }
					{ showLetterSpacing && (
						<FlexItem isBlock>
							{ /* THE REAL core control. It sources its own unit
							   list from the theme (`useSettings('spacing.units')`,
							   falling back to px/em/rem) and its own per-unit
							   default quantities — so SGS no longer declares
							   either. It speaks whole CSS length STRINGS
							   ('2px'), which we split back into our stored
							   number + unit pair on the way in and out. */ }
							{ /* TIER-AWARE, same shape as line height and font size
							   above. `placeholder` passes straight through to the
							   underlying UnitControl — LetterSpacingControl
							   spreads `{...otherProps}` FIRST and never sets a
							   placeholder of its own — so an inherited tier shows
							   the inherited length greyed. */ }
							{ letterSpacingIsTiered ? (
								<ResponsiveOverride
									label={ __( 'Letter spacing', 'sgs-blocks' ) }
									value={ letterSpacingRaw }
									onChange={ ( obj ) =>
										setAttributes( { [ k.letterSpacing ]: obj } )
									}
								>
									{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
										<LetterSpacingControl
											value={ composeUnitValue(
												inherited ? undefined : ownValue,
												currentLetterSpacingUnit
											) }
											placeholder={
												inherited
													? composeUnitValue(
															effectiveValue,
															currentLetterSpacingUnit
													  )
													: undefined
											}
											onChange={ ( val ) =>
												onLetterSpacingChangeTiered( setOwnValue, val )
											}
											__unstableInputWidth="100%"
										/>
									) }
								</ResponsiveOverride>
							) : (
							<LetterSpacingControl
								value={ composeUnitValue(
									currentLetterSpacingValue,
									currentLetterSpacingUnit
								) }
								onChange={ onLetterSpacingChange }
								__unstableInputWidth="100%"
							/>
							) }
						</FlexItem>
					) }
				</Flex>
			) }

			{ /* ── Line indent + Columns ── core render positions 7 and 8,
			     immediately after Line height (5) / Letter spacing (6) and
			     before Decoration (9). Both are paragraph-only in core
			     (`core/heading` declares neither), so both are OPT-IN here.

			     "Line indent" is a FAITHFUL REIMPLEMENTATION — core's
			     TextIndentControl is a PRIVATE API (absent from the package's
			     public components/index.js), the same situation as
			     TextAlignmentControl. Rebuilt from its real source: the
			     with-slider branch is BaseControl.VisualLabel + Flex[ UnitControl,
			     RangeControl ], the UnitControl carries min=0 and hides its
			     label, and the RangeControl is withInputField={false},
			     initialPosition={0}, with core's own unit-dependent max/step.
			     ⚠ Its label is "Line indent", NOT "Text indent". */ }
			{ ( showTextIndent || showTextColumns ) && (
				<VStack spacing={ 1 }>
					{ showTextIndent && (
						<VStack spacing={ 1 }>
							<BaseControl.VisualLabel>
								{ __( 'Line indent', 'sgs-blocks' ) }
							</BaseControl.VisualLabel>
							{ ( () => {
								const raw = attributes[ k.textIndent ] || '';
								const parsed = parseUnitValue( raw, 'px' );
								const bounds = textIndentSliderBounds( parsed.unit );
								return (
									<Flex gap={ 2 } align="flex-end">
										<FlexItem isBlock>
											<UnitControl
												label={ __( 'Line indent', 'sgs-blocks' ) }
												hideLabelFromVision
												value={ raw }
												units={ TEXT_INDENT_UNITS }
												min={ 0 }
												onChange={ ( val ) =>
													setAttributes( { [ k.textIndent ]: val ?? '' } )
												}
												__nextHasNoMarginBottom
												__next40pxDefaultSize
											/>
										</FlexItem>
										<FlexItem isBlock style={ { flexGrow: 2 } }>
											<RangeControl
												label={ __( 'Line indent', 'sgs-blocks' ) }
												hideLabelFromVision
												value={ parsed.num }
												withInputField={ false }
												initialPosition={ 0 }
												min={ 0 }
												max={ bounds.max }
												step={ bounds.step }
												onChange={ ( val ) =>
													setAttributes( {
														[ k.textIndent ]:
															val === undefined || val === null
																? ''
																: `${ val }${ parsed.unit || 'px' }`,
													} )
												}
												__nextHasNoMarginBottom
												__next40pxDefaultSize
											/>
										</FlexItem>
									</Flex>
								);
							} )() }
						</VStack>
					) }
					{ showTextColumns && (
						<NumberControl
							label={ __( 'Columns', 'sgs-blocks' ) }
							min={ 1 }
							max={ 6 }
							spinControls="custom"
							initialPosition={ 1 }
							value={
								attributes[ k.textColumns ] === undefined
									|| attributes[ k.textColumns ] === null
									|| '' === attributes[ k.textColumns ]
									? ''
									: attributes[ k.textColumns ]
							}
							onChange={ ( val ) => {
								const parsed = ( val === undefined || val === null
									|| '' === String( val ).trim() )
									? undefined
									: parseInt( val, 10 );
								setAttributes( {
									[ k.textColumns ]:
										parsed === undefined || isNaN( parsed ) ? undefined : parsed,
								} );
							} }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</VStack>
			) }

			{ /* ── Decoration + Letter case ── Decoration is THE REAL core
			     control (icon ToggleGroupControl, brings its own "Decoration"
			     label + 3 options: None/Underline/Line-through).

			     Letter case is a FAITHFUL PARTIAL REBUILD of core's
			     TextTransformControl, not an import — 2026-09-06, Bean-directed.
			     Core's real version ships 4 tiles (None/UPPERCASE/lowercase/
			     Capitalise); combined with Decoration's 3 that's 7 icon tiles
			     in one row, wider than the sidebar. Fix: drop the None tile.
			     'none' stays the underlying default/reachable value — a client
			     who picked a casing reaches it again via the small reset button
			     next to the label, not a 4th tile. 3+3 = 6 tiles, fits.

			     ⚠ 'none' is the real CSS keyword `none`, a DIFFERENT state from
			     unset (''), same distinction core's own control draws — this
			     rebuild keeps that: the tile group only ever writes uppercase/
			     lowercase/capitalize, and the reset button is the only thing
			     that writes 'none' explicitly. */ }
			{ ( showDecoration || showTransform ) && (
				<Flex gap={ 2 } align="flex-start">
					{ showDecoration && (
						<FlexItem isBlock>
							<TextDecorationControl
								value={ attributes[ k.textDecoration ] || undefined }
								onChange={ ( val ) =>
									setAttributes( { [ k.textDecoration ]: val ?? '' } )
								}
							/>
						</FlexItem>
					) }
					{ showTransform && (
						<FlexItem isBlock>
							<Flex justify="space-between" align="center">
								<FlexItem>
									<BaseControl.VisualLabel>
										{ __( 'Letter case', 'sgs-blocks' ) }
									</BaseControl.VisualLabel>
								</FlexItem>
								{ !! attributes[ k.textTransform ]
									&& 'none' !== attributes[ k.textTransform ] && (
									<FlexItem>
										<Button
											variant="tertiary"
											size="small"
											onClick={ () =>
												setAttributes( { [ k.textTransform ]: 'none' } )
											}
										>
											{ __( 'Reset', 'sgs-blocks' ) }
										</Button>
									</FlexItem>
								) }
							</Flex>
							<ToggleGroupControl
								label={ __( 'Letter case', 'sgs-blocks' ) }
								hideLabelFromVision
								value={
									SGS_TEXT_TRANSFORM_TILE_OPTIONS.some(
										( option ) => option.value === attributes[ k.textTransform ]
									)
										? attributes[ k.textTransform ]
										: undefined
								}
								onChange={ ( val ) =>
									setAttributes( { [ k.textTransform ]: val ?? 'none' } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							>
								{ SGS_TEXT_TRANSFORM_TILE_OPTIONS.map( ( option ) => (
									<ToggleGroupControlOptionIcon
										key={ option.value }
										value={ option.value }
										icon={ option.icon }
										label={ option.label }
									/>
								) ) }
							</ToggleGroupControl>
						</FlexItem>
					) }
				</Flex>
			) }

			{ /* ── Orientation + Text alignment ── combined onto one row
			     (2026-09-06, Bean-directed): Orientation (2 options) + Text
			     alignment (4 options) = 6 icon tiles, the same row-width budget
			     the Decoration + Letter case row above fits at 3+3. Previously
			     two separate full-width rows; same Flex/FlexItem template.

			     Orientation is THE REAL core control,
			     `__experimentalWritingModeControl`, public and a drop-in. Its
			     own label is "Orientation" (OPTIONS: Horizontal/Vertical,
			     icon-only), and it owns its `isDeselectable` + deselect-to-
			     undefined handling internally.

			     ⚠ Its vertical VALUE is direction-dependent — core emits
			     'vertical-lr' under isRTL() and 'vertical-rl' otherwise — so
			     the PHP allowlist accepts BOTH verticals plus 'horizontal-tb'.
			     Applies to heading AND text: core declares
			     __experimentalWritingMode on both blocks.

			     Text alignment is a FAITHFUL REIMPLEMENTATION of core's
			     TextAlignmentControl, not an approximation.

			     ⛔ Core's own component CANNOT be imported: it is registered
			     ONLY in `block-editor/src/private-apis.js` (inside the
			     `lock( privateApis, … )` object) and appears nowhere in the
			     package's public `components/index.js`. Reaching it needs
			     `unlock()`, which is core's explicit consent mechanism and not
			     available to a plugin.

			     So this is rebuilt from its real source, element for element:
			     the same `ToggleGroupControl` + `ToggleGroupControlOptionIcon`
			     pair, the same four `@wordpress/icons` (alignLeft / alignCenter
			     / alignRight / alignJustify), the same per-option labels, the
			     same `isDeselectable`, and the same deselect idiom
			     `onChange( newValue === value ? undefined : newValue )`.

			     ⚠ Do NOT swap this for the PUBLIC `AlignmentControl`. That one
			     is core's TOOLBAR control — `hooks/text-align.js` mounts it
			     inside `BlockControls`, it takes `alignmentControls` with
			     `{ icon, title, align }` keys, and it offers no `justify`. It
			     is a different control for a different surface. */ }
			{ ( showWritingMode || showTextAlign ) && (
				<Flex gap={ 2 } align="flex-start">
					{ showWritingMode && (
						<FlexItem isBlock>
							<WritingModeControl
								value={ attributes[ k.writingMode ] || undefined }
								onChange={ ( val ) =>
									setAttributes( { [ k.writingMode ]: val ?? '' } )
								}
							/>
						</FlexItem>
					) }
					{ showTextAlign && (
						<FlexItem isBlock>
							<ToggleGroupControl
								isDeselectable
								label={ __( 'Text alignment', 'sgs-blocks' ) }
								value={ attributes[ k.textAlign ] || undefined }
								onChange={ ( val ) =>
									setAttributes( {
										[ k.textAlign ]:
											val === ( attributes[ k.textAlign ] || undefined )
												? ''
												: val ?? '',
									} )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							>
								{ SGS_TEXT_ALIGN_OPTIONS.map( ( option ) => (
									<ToggleGroupControlOptionIcon
										key={ option.value }
										value={ option.value }
										icon={ option.icon }
										label={ option.label }
									/>
								) ) }
							</ToggleGroupControl>
						</FlexItem>
					) }
				</Flex>
			) }

			{ /* ═══ BELOW THIS LINE: controls with NO WordPress-native
			     equivalent. They sit LAST in the panel, after everything that
			     mirrors a core control, so the familiar native surface reads
			     first and the SGS-only extras read as additions to it. ═══ */ }

			{ /* ── Text wrap ── SGS-ONLY. Core has no text-wrap control and no
			     `textWrap` typography support: a full-tree search of
			     `packages/` on `wp/7.1` (code search, the 14,955-entry file
			     tree, `hooks/typography.js`'s TYPOGRAPHY_SUPPORT_KEYS, and
			     `style-engine`'s generator roster) returns nothing. There is no
			     native shape to mirror, so this stays a plain SelectControl.

			     OPT-IN (showTextWrap): the block must DECLARE `{prefix}TextWrap`
			     first, or WordPress silently discards what this writes (D338,
			     the silent-discard class). */ }
			{ showTextWrap && (
				<SelectControl
					label={ __( 'Text wrap', 'sgs-blocks' ) }
					value={ attributes[ k.textWrap ] || '' }
					options={ SGS_TEXT_WRAP_OPTIONS }
					onChange={ ( val ) => setAttributes( { [ k.textWrap ]: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }

			{ /* Hover typography (D309). Opt-in: only render for a block that
			     DECLARES + renders the {prop}Hover companions, else the
			     dead-control gate flags it. Paired into one compact row, same
			     as the base fields above — three narrow SelectControls with
			     short labels fit comfortably at the standard sidebar width. */ }
			{ showHover && (
				<Flex gap={ 2 } align="flex-start">
					<FlexItem isBlock>
						<SelectControl
							label={ __( 'Decoration (hover)', 'sgs-blocks' ) }
							value={ attributes[ k.textDecorationHover ] || '' }
							options={ SGS_TEXT_DECORATION_OPTIONS }
							onChange={ ( val ) => setAttributes( { [ k.textDecorationHover ]: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</FlexItem>
					<FlexItem isBlock>
						<SelectControl
							label={ __( 'Transform (hover)', 'sgs-blocks' ) }
							value={ attributes[ k.textTransformHover ] || '' }
							options={ SGS_TEXT_TRANSFORM_OPTIONS }
							onChange={ ( val ) => setAttributes( { [ k.textTransformHover ]: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</FlexItem>
					<FlexItem isBlock>
						<SelectControl
							label={ __( 'Weight (hover)', 'sgs-blocks' ) }
							value={ attributes[ k.fontWeightHover ] || '' }
							options={ SGS_FONT_WEIGHT_OPTIONS }
							onChange={ ( val ) => setAttributes( { [ k.fontWeightHover ]: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</FlexItem>
				</Flex>
			) }
		</VStack>
	);
}

/**
 * Unit-companion keys never carry meaning on their own — `block.json` gives
 * every one of them a non-empty default (`'px'`) so `<UnitControl>` has
 * something to display, independent of whether the paired numeric field is
 * set. Included in `targetHasCustomValues`'s scan, that default alone always
 * satisfies "has a set value", making the indicator fire unconditionally on
 * every target — live-verified 2026-09-06 on a freshly inserted `sgs/card-grid`
 * (both "Title" and "Subtitle" showed the modified suffix with every
 * typography attribute genuinely empty). Excluded here so only a key that can
 * actually signal customisation is checked.
 */
const SGS_TYPOGRAPHY_UNIT_COMPANION_KEYS = [ 'fontSizeUnit', 'lineHeightUnit', 'letterSpacingUnit' ];

/**
 * Does the given target prefix carry at least one non-default typography
 * value? Drives the switcher's modified-indicator (Bean-requested UX guard,
 * 2026-09-05) — without it a client who customises target B, switches to
 * target A, and sees A's defaults reads that as "the control does nothing"
 * rather than "B is customised, A is untouched".
 *
 * Checks every attribute key this component reads/writes for the prefix
 * (`typographyAttrKeys`), minus the unit-companion keys (see
 * `SGS_TYPOGRAPHY_UNIT_COMPANION_KEYS`), tiered-object-aware (a
 * `{desktop:'',tablet:18,…}` object counts as modified because SOME tier is
 * set, even though its own `desktop` slot is empty).
 *
 * ⚠ An empty ARRAY also means "unset", not just an empty object. A tiered
 * attr declared `{"type":"object","default":{}}` (e.g. card-grid's
 * `titleFontSize`) reads back from WordPress as `[]`, not `{}` — PHP cannot
 * distinguish an empty associative array from an empty list, so an empty
 * object default round-trips through block registration as a JSON array.
 * `isTieredValue()` deliberately excludes arrays (so a real array-typed attr
 * is never misread as a tier object), which without this check made every
 * untouched tiered font-size attribute count as "customised" — live-verified
 * 2026-09-06 on a freshly inserted `sgs/card-grid`, `titleFontSize:[]`
 * still tripped the indicator after the unit-companion fix alone.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} prefix     Attribute prefix for the target.
 * @return {boolean} True when any attribute for this prefix has a set value.
 */
function targetHasCustomValues( attributes, prefix ) {
	const keys = typographyAttrKeys( prefix );
	return Object.entries( keys ).some( ( [ keyName, attrKey ] ) => {
		if ( SGS_TYPOGRAPHY_UNIT_COMPANION_KEYS.includes( keyName ) ) {
			return false;
		}
		const val = attributes[ attrKey ];
		if ( val === undefined || val === null || '' === val ) {
			return false;
		}
		if ( Array.isArray( val ) && 0 === val.length ) {
			return false;
		}
		if ( isTieredValue( val ) ) {
			return Object.values( val ).some(
				( tierVal ) => undefined !== tierVal && null !== tierVal && '' !== tierVal
			);
		}
		return true;
	} );
}

/**
 * Multi-target switcher (Bean-approved design, 2026-09-05). Wraps
 * `TypographyControlsFields` with a target picker so a block with MULTIPLE
 * typography-holding elements (testimonial's quote/summary/name, card-grid's
 * title/subtitle, icon-list's heading/item, …) shows ONE full control set at
 * a time instead of stacking one full set per element — the bloat problem
 * this component was built to solve.
 *
 * Renders `ToggleGroupControl` (segmented buttons) at ≤3 targets, a
 * `SelectControl` dropdown beyond that (a segmented control gets cramped).
 * The threshold is a DATA-DRIVEN condition on `targets.length` — never a
 * per-block override prop (Rule 3, universal/no-carve-outs).
 *
 * Selection is local component state (`useState`), NOT a persisted
 * attribute — which element is currently being edited in the sidebar isn't
 * something that needs to survive a page reload, only the underlying
 * attribute VALUES for every target do (those are read straight off
 * `attributes`, unaffected by which target is selected).
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes (shared across all targets).
 * @param {Function} props.setAttributes Block setter (shared across all targets).
 * @param {Array}    props.targets       `[{ key, label, prefix, ...fieldProps }]` —
 *   `fieldProps` are any of `TypographyControlsFields`' own props (`showWeight`,
 *   `showStyle`, `showLineHeight`, `showResponsive`, `fontSizePresets`,
 *   `showFontFamily`, `showDecoration`, `showTransform`, `showLetterSpacing`,
 *   `showTextAlign`, `showTextWrap`, `showHover`) — each target can expose a
 *   different subset, exactly as
 *   today's separate per-element mounts do.
 * @return {JSX.Element} Switcher + the active target's full control set.
 */
function TypographyTargetSwitcher( { attributes, setAttributes, targets } ) {
	const [ selectedKey, setSelectedKey ] = useState( targets[ 0 ].key );
	const current = targets.find( ( t ) => t.key === selectedKey ) || targets[ 0 ];
	const { key: _currentKey, label: _currentLabel, prefix: currentPrefix, ...fieldProps } = current;
	const useDropdown = targets.length > SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED;

	/**
	 * @param {Object} target One entry from `targets`.
	 * @return {string} The target's label, suffixed when it carries a custom value.
	 */
	function switcherOptionLabel( target ) {
		return targetHasCustomValues( attributes, target.prefix )
			? target.label + SGS_TYPOGRAPHY_MODIFIED_SUFFIX
			: target.label;
	}

	return (
		<>
			{ useDropdown ? (
				<SelectControl
					label={ __( 'Editing', 'sgs-blocks' ) }
					value={ selectedKey }
					options={ targets.map( ( t ) => ( {
						label: switcherOptionLabel( t ),
						value: t.key,
					} ) ) }
					onChange={ setSelectedKey }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) : (
				<ToggleGroupControl
					label={ __( 'Editing', 'sgs-blocks' ) }
					value={ selectedKey }
					isBlock
					onChange={ setSelectedKey }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				>
					{ targets.map( ( t ) => (
						<ToggleGroupControlOption
							key={ t.key }
							value={ t.key }
							label={ switcherOptionLabel( t ) }
						/>
					) ) }
				</ToggleGroupControl>
			) }
			<TypographyControlsFields
				{ ...fieldProps }
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix={ currentPrefix }
			/>
		</>
	);
}

/**
 * Uniform typography controls — public entry point.
 *
 * Backward compatible by construction: every EXISTING call site passes a
 * `prefix` (or nothing, defaulting to '') and no `targets` — those render
 * through `TypographyControlsFields` exactly as before, zero behaviour
 * change (Bean's back-compat requirement, 2026-09-05).
 *
 * Multi-target mode is OPT-IN via the new `targets` prop. A `targets` array
 * of length 1 renders the same as no `targets` at all — the switcher only
 * appears at 2+ targets, per the approved design ("1 target: no switcher").
 *
 * @param {Object} props
 * @param {Array}  [props.targets] Optional multi-target descriptor array —
 *   see `TypographyTargetSwitcher`'s own docblock for the shape. Omit for the
 *   single-target path (identical to every pre-existing call site).
 * @return {JSX.Element} Controls fragment.
 */
export default function TypographyControls( props ) {
	const { targets, ...singleProps } = props;

	if ( ! Array.isArray( targets ) || targets.length <= 1 ) {
		return (
			<TypographyControlsFields
				{ ...singleProps }
				{ ...( 1 === targets?.length ? targets[ 0 ] : {} ) }
			/>
		);
	}

	return (
		<TypographyTargetSwitcher
			attributes={ props.attributes }
			setAttributes={ props.setAttributes }
			targets={ targets }
		/>
	);
}
