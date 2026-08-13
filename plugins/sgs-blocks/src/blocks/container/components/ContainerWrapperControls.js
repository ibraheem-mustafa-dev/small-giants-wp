/**
 * ContainerWrapperControls
 *
 * Reusable InspectorControls component that exposes the canonical sgs/container
 * wrapper attributes as editor panels, scoped by `kind`.
 *
 * WS-4 (composite-mirror): drop this into any composite block's edit.js so its
 * wrapper controls stay in sync with sgs/container without duplicating logic.
 *
 * KIND GATING
 * -----------
 *  section  — full surface: outer maxWidth (literal), contentWidth (token or
 *             literal), gap (responsive), layout (grid/flex), background
 *             (image/video/overlay/svg/animation), shape dividers, min-height,
 *             grid-item defaults, shadow. Breakout (alignwide/alignfull) via
 *             WP-native align toolbar — no custom control needed.
 *  layout   — grid/flex + width (maxWidth/contentWidth) + gap only.
 *  content  — width (maxWidth/contentWidth) + padding/spacing only.
 *
 * IMPORT LINE (adjust relative depth as needed)
 * ---------------------------------------------
 *  import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
 *
 * USAGE
 * -----
 *  <ContainerWrapperControls
 *    attributes={ attributes }
 *    setAttributes={ setAttributes }
 *    kind="section"           // 'section' | 'layout' | 'content'  (default: 'section')
 *  />
 *
 * The component renders inside any existing <>…</> fragment alongside the
 * block's own markup — it does NOT wrap children.
 */

import { __, sprintf } from '@wordpress/i18n';
import { Fragment } from '@wordpress/element';
import {
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	Button,
	ToggleControl,
	TextareaControl,
	TextControl,
	TabPanel,
	BoxControl,
} from '@wordpress/components';

import {
	ResponsiveControl,
	ResponsiveOverride,
	SpacingControl,
	DesignTokenPicker,
	ShadowControl,
	GradientOverlayControl,
	ResponsiveBorderRadiusControl,
	normaliseResponsiveBox,
} from '../../../components';
import { ToggleGroupControl, ToggleGroupControlOption, UnitControl } from '../../../components/primitives';

// ---------------------------------------------------------------------------
// gridItemBorder — shorthand <-> parts (P-SPEC35-BORDER-RESIDUALS item 1).
//
// The attribute stays a CSS shorthand STRING ("1px solid #ccc"), exactly as
// stored today, so replacing the raw TextControl with a real builder needs no
// content migration. These two helpers are the only bridge.
// ---------------------------------------------------------------------------

const GRID_ITEM_BORDER_STYLES = [
	{ label: __( '— None —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Solid', 'sgs-blocks' ), value: 'solid' },
	{ label: __( 'Dashed', 'sgs-blocks' ), value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), value: 'dotted' },
	{ label: __( 'Double', 'sgs-blocks' ), value: 'double' },
];

const _GRID_BORDER_STYLE_WORDS = [ 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none' ];

/**
 * Split a CSS border shorthand into { width, style, colour }.
 *
 * Order-tolerant on purpose: CSS permits the three components in any order, and
 * the values already stored were hand-typed into a free-text box, so assuming
 * "width style colour" would silently mis-parse real content.
 *
 * @param {string} value Stored shorthand.
 * @return {{width: string, style: string, colour: string}} Parts.
 */
function _gridBorderParts( value ) {
	const out = { width: '', style: '', colour: '' };
	const tokens = String( value || '' ).trim().split( /\s+/ ).filter( Boolean );
	for ( const token of tokens ) {
		if ( ! out.style && _GRID_BORDER_STYLE_WORDS.includes( token.toLowerCase() ) ) {
			out.style = token.toLowerCase();
		} else if ( ! out.width && /^[\d.]+(px|rem|em|%)?$/.test( token ) ) {
			out.width = token;
		} else if ( ! out.colour ) {
			out.colour = token;
		}
	}
	return out;
}

/**
 * Rebuild the shorthand from parts, dropping empties.
 *
 * Returns '' when nothing is set, so clearing every field clears the attribute
 * rather than leaving a stray "solid" that renders an invisible 0-width border.
 *
 * @param {{width: string, style: string, colour: string}} parts Parts.
 * @return {string} Shorthand.
 */
function _gridBorderJoin( parts ) {
	const ordered = [ parts.width, parts.style, parts.colour ].filter( Boolean );
	return ordered.length ? ordered.join( ' ' ) : '';
}

// ---------------------------------------------------------------------------
// Shared option arrays — kept identical to container/edit.js
// ---------------------------------------------------------------------------

// Units offered in the grid-item BoxControl side inputs — mirrors
// ResponsiveBoxControl.js's BOX_UNITS (no responsive tiers on these attrs,
// so the plain WP-native BoxControl/BorderRadiusControl are used directly).
const GRID_ITEM_BOX_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: '%', label: '%', default: 0 },
	{ value: 'vw', label: 'vw', default: 0 },
];

const BG_SIZE_OPTIONS = [
	{ label: __( 'Cover', 'sgs-blocks' ), value: 'cover' },
	{ label: __( 'Contain', 'sgs-blocks' ), value: 'contain' },
	{ label: __( 'Auto', 'sgs-blocks' ), value: 'auto' },
];

const BG_POSITION_OPTIONS = [
	{ label: __( 'Centre centre', 'sgs-blocks' ), value: 'center center' },
	{ label: __( 'Top centre', 'sgs-blocks' ), value: 'top center' },
	{ label: __( 'Bottom centre', 'sgs-blocks' ), value: 'bottom center' },
	{ label: __( 'Centre left', 'sgs-blocks' ), value: 'center left' },
	{ label: __( 'Centre right', 'sgs-blocks' ), value: 'center right' },
	{ label: __( 'Top left', 'sgs-blocks' ), value: 'top left' },
	{ label: __( 'Top right', 'sgs-blocks' ), value: 'top right' },
	{ label: __( 'Bottom left', 'sgs-blocks' ), value: 'bottom left' },
	{ label: __( 'Bottom right', 'sgs-blocks' ), value: 'bottom right' },
];

const BG_REPEAT_OPTIONS = [
	{ label: __( 'No repeat', 'sgs-blocks' ), value: 'no-repeat' },
	{ label: __( 'Repeat', 'sgs-blocks' ), value: 'repeat' },
	{ label: __( 'Repeat X', 'sgs-blocks' ), value: 'repeat-x' },
	{ label: __( 'Repeat Y', 'sgs-blocks' ), value: 'repeat-y' },
];

const BG_ATTACHMENT_OPTIONS = [
	{ label: __( 'Scroll', 'sgs-blocks' ), value: 'scroll' },
	{ label: __( 'Fixed (parallax)', 'sgs-blocks' ), value: 'fixed' },
];

const SHAPE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Wave', 'sgs-blocks' ), value: 'wave' },
	{ label: __( 'Wave (Smooth)', 'sgs-blocks' ), value: 'wave-smooth' },
	{ label: __( 'Triangle', 'sgs-blocks' ), value: 'triangle' },
	{ label: __( 'Triangle (Asymmetric)', 'sgs-blocks' ), value: 'triangle-asymmetric' },
	{ label: __( 'Curve', 'sgs-blocks' ), value: 'curve' },
	{ label: __( 'Curve (Asymmetric)', 'sgs-blocks' ), value: 'curve-asymmetric' },
	{ label: __( 'Zigzag', 'sgs-blocks' ), value: 'zigzag' },
	{ label: __( 'Cloud', 'sgs-blocks' ), value: 'cloud' },
	{ label: __( 'Slant', 'sgs-blocks' ), value: 'slant' },
	{ label: __( 'Slant (Gentle)', 'sgs-blocks' ), value: 'slant-gentle' },
	{ label: __( 'Mountains', 'sgs-blocks' ), value: 'mountains' },
	{ label: __( 'Drops', 'sgs-blocks' ), value: 'drops' },
	{ label: __( 'Tilt', 'sgs-blocks' ), value: 'tilt' },
	{ label: __( 'Arrow', 'sgs-blocks' ), value: 'arrow' },
	{ label: __( 'Split', 'sgs-blocks' ), value: 'split' },
];

const LAYOUT_OPTIONS = [
	{ label: __( 'Stack', 'sgs-blocks' ), value: 'stack' },
	{ label: __( 'Flex', 'sgs-blocks' ), value: 'flex' },
	{ label: __( 'Grid', 'sgs-blocks' ), value: 'grid' },
];

const ALIGN_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Bottom', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
];

const JUSTIFY_ITEMS_OPTIONS = [
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
	{ label: __( 'Start', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'end' },
];

const ALIGN_CONTENT_OPTIONS = [
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
	{ label: __( 'Start', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Space between', 'sgs-blocks' ), value: 'space-between' },
	{ label: __( 'Space around', 'sgs-blocks' ), value: 'space-around' },
	{ label: __( 'Space evenly', 'sgs-blocks' ), value: 'space-evenly' },
];

export const MIN_HEIGHT_OPTIONS = [
	{ label: __( 'Auto', 'sgs-blocks' ), value: '' },
	{ label: '50vh', value: '50vh' },
	{ label: '75vh', value: '75vh' },
	{ label: '100vh', value: '100vh' },
	{ label: '200px', value: '200px' },
	{ label: '400px', value: '400px' },
	{ label: '600px', value: '600px' },
];

export const SHADOW_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Subtle', 'sgs-blocks' ), value: 'subtle' },
	{ label: __( 'Raised', 'sgs-blocks' ), value: 'raised' },
	{ label: __( 'Floating', 'sgs-blocks' ), value: 'floating' },
	{ label: __( 'Brand glow', 'sgs-blocks' ), value: 'glow' },
];

// ---------------------------------------------------------------------------
// Sub-panels (named functions for reuse across kinds)
// ---------------------------------------------------------------------------

/**
 * Units list for UnitControl inputs (maxWidth / contentWidth custom literal).
 */
const LENGTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
	{ value: '%', label: '%' },
	{ value: 'vw', label: 'vw' },
];

/**
 * Content-band token options (v0.5 model).
 *   normal → var(--wp--style--global--content-size) (~1200px on this theme)
 *   wide   → var(--wp--style--global--wide-size) (~1400px on this theme)
 *   full   → no inner cap (default)
 *   custom → reveals a UnitControl for a literal value
 */
const CONTENT_WIDTH_PRESET_OPTIONS = [
	{ label: __( 'Normal', 'sgs-blocks' ), value: 'normal' },
	{ label: __( 'Wide', 'sgs-blocks' ), value: 'wide' },
	{ label: __( 'Full (no cap)', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Custom…', 'sgs-blocks' ), value: 'custom' },
];

/**
 * Returns true when the given contentWidth value is a named token rather than
 * a literal CSS length.
 *
 * @param {string} v The contentWidth attribute value.
 * @returns {boolean}
 */
function isToken( v ) {
	return [ 'normal', 'wide', 'full' ].includes( v );
}

/**
 * Derive the preset selector value from a raw contentWidth attribute value.
 * Returns 'normal' | 'wide' | 'full' when value is a token, or 'custom'
 * when value is a literal CSS length (contains at least one digit).
 *
 * @param {string} v
 * @returns {string}
 */
function contentWidthPreset( v ) {
	if ( isToken( v ) ) {
		return v;
	}
	// A non-token non-empty value is a literal (e.g. "800px") → custom.
	if ( v && /\d/.test( v ) ) {
		return 'custom';
	}
	// Empty / unrecognised → treat as full (no band cap).
	return 'full';
}

/**
 * Width + contentWidth controls (v0.5 model — widthMode retired).
 *
 * TWO controls, each covering all three tiers through ONE <ResponsiveOverride>
 * driven by the global device toggle:
 *
 * OUTER layer: maxWidth UnitControl (literal CSS length or empty → full-width).
 *   Tiers: the single object attr `maxWidth` = {desktop,tablet,mobile}.
 *
 * CONTENT BAND: ToggleGroupControl with tokens normal / wide / full / custom.
 *   Default is 'full' (no band cap — content fills outer maxWidth).
 *   When custom is selected a UnitControl for the literal value is revealed.
 *   Tiers: the single object attr `contentWidth` = {desktop,tablet,mobile}.
 *
 * ⛔ Do NOT re-add a standalone desktop control beside either wrapper. Until
 * 2026-08-10 each family rendered a desktop control PLUS a "… by viewport"
 * <ResponsiveControl> whose desktop branch returned a <p> reading "set above" —
 * two controls for one property, and a hole where a control belongs. That shape
 * is what `inspector-scan` rule 26 (hollow-tier) exists to catch, with these two
 * exact sites as its `mustFlag` fixtures.
 *
 * Breakout (alignwide / alignfull) is handled by WP-native supports.align
 * toolbar — NO custom control is rendered here.
 *
 * `showContentBand` (default true) suppresses the "Content band width" control
 * for a block that CANNOT render a band, added 2026-08-12. Exact sibling of
 * LayoutPanel's `showLayout` below, and added for the same reason: a shared
 * panel offering a control the consuming block cannot honour is a control that
 * silently does nothing.
 *
 * The measured case is sgs/product-card: it passes `wrap_inner => false` on
 * EVERY render branch, so `.sgs-container__inner` never exists there, and
 * `contentWidth` was DELETED from its block.json at D540 precisely because the
 * attribute was dead. That deletion fixed the storage but left this control
 * still rendering and still writing — WordPress then discarded the write
 * (D338), so the bug simply moved rather than closing. Re-declaring the
 * attribute would have moved it back.
 *
 * ⛔ Do NOT drive this off `kind === 'content'` instead. That was checked and
 * REJECTED on evidence 2026-08-12: accordion-item, form-step, multi-button and
 * tab are all content-kind AND declare object-shaped `contentWidth`, with
 * accordion-item and multi-button consuming it in render.php. Suppressing the
 * whole kind would have removed a working control from four blocks. The flag is
 * per-mount because the capability is per-block.
 *
 * Used by all three kinds.
 */
export function WidthPanel( { attributes, setAttributes, showContentBand = true } ) {
	// ── ONE control per property family, all three tiers ──────────────────
	//
	// Both families previously rendered a standalone DESKTOP control plus a
	// <ResponsiveControl> whose desktop branch returned a <p> saying "set
	// above" — a responsive control added ALONGSIDE its non-responsive
	// original rather than replacing it. Two controls for one property, and a
	// hole in the wrapper where a control should be. Flagged by
	// `inspector-scan` rule 26 (hollow-tier) at what were lines :284 and :351.
	//
	// ⛔ BOTH FAMILIES ARE TIER OBJECTS as of Spec 35 pass 2 (2026-08-11):
	// `maxWidth` and `contentWidth` are each ONE attr declared
	// `"type":"object"` holding {desktop,tablet,mobile}, and the
	// `maxWidthTablet` / `maxWidthMobile` / `contentWidthTablet` /
	// `contentWidthMobile` siblings are no longer declared by ANY block.json.
	//
	// They must therefore use ResponsiveOverride, which reads and writes the
	// object, NOT ResponsiveControl, which writes one flat attr per tier. Do
	// NOT revert to an attrMap of
	// `{desktop:'maxWidth', tablet:'maxWidthTablet', mobile:'maxWidthMobile'}`:
	// WordPress SILENTLY DISCARDS an attribute a block does not declare (D338),
	// so both tiers would save nothing, and the desktop branch would write a
	// STRING into an object-typed attr — which coerces to the default and
	// destroys the whole setting. That exact mismatch shipped live on 19 blocks
	// after pass 1 migrated `gap` without its control (D563).
	//
	// ResponsiveOverride owns the inherit semantics itself (a blank non-desktop
	// tier inherits the tier above, desktop always concrete), so the local
	// by-tier maps, isTierInherited() and resolveTierValue() that used to live
	// here are gone rather than duplicated.

	// Mirrors the previous per-tier literal derivation exactly (a non-token
	// value containing a digit is a literal CSS length; anything else is not).
	const literalOf = ( raw ) => ( ! isToken( raw ) && /\d/.test( raw || '' ) ? raw : '' );

	return (
		<>
			{ /* ---- OUTER max-width — one control, all three tiers ---- */ }
			<ResponsiveOverride
				label={ __( 'Outer max-width', 'sgs-blocks' ) }
				value={ attributes.maxWidth }
				onChange={ ( obj ) => setAttributes( { maxWidth: obj } ) }
			>
				{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
					<UnitControl
						value={ ownValue || '' }
						placeholder={
							inherited
								? effectiveValue || __( 'no cap', 'sgs-blocks' )
								: __( 'no cap', 'sgs-blocks' )
						}
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setOwnValue( val ?? '' ) }
						help={ __(
							'Exact CSS length applied as max-width on the outer block (e.g. 800px). Leave blank for no cap — on tablet or mobile, blank inherits the tier above. Breakout (wide / full) is set via the block toolbar.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
			</ResponsiveOverride>

			{ showContentBand && (
				<>
			<hr style={ { margin: '16px 0' } } />

			{ /* ---- CONTENT BAND width — one control, all three tiers ---- */ }
			<ResponsiveOverride
				label={ __( 'Content band width', 'sgs-blocks' ) }
				value={ attributes.contentWidth }
				onChange={ ( obj ) => setAttributes( { contentWidth: obj } ) }
			>
				{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => {
					// An inheriting tier shows the value it actually renders at,
					// not the 'full' that contentWidthPreset('') would report.
					// Without this, an inheriting tablet tier renders as "Full"
					// selected — indistinguishable from an explicit Full override,
					// because SGS_Container_Wrapper treats 'full' and '' identically.
					const shown = inherited ? effectiveValue : ownValue;
					const preset = contentWidthPreset( shown );
					const literal = literalOf( shown );
					return (
						<>
							<ToggleGroupControl
								value={ preset }
								onChange={ ( val ) => {
									if ( val === 'custom' ) {
										// Seed a real starter literal (not '') so
										// contentWidthPreset() reads 'custom' on the next
										// render — otherwise '' maps back to 'full' and the
										// radio snaps back with no input box. 800px rarely
										// equals a preset (content-size ≈ 1200 / wide-size
										// ≈ 1400). Keep any existing literal.
										setOwnValue( literal || '800px' );
									} else {
										setOwnValue( val );
									}
								} }
								isBlock
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							>
								{ CONTENT_WIDTH_PRESET_OPTIONS.map( ( opt ) => (
									<ToggleGroupControlOption
										key={ opt.value }
										value={ opt.value }
										label={ opt.label }
									/>
								) ) }
							</ToggleGroupControl>
							{ preset === 'custom' && (
								<UnitControl
									label={ __( 'Custom content band width', 'sgs-blocks' ) }
									value={ literal }
									units={ LENGTH_UNITS }
									onChange={ ( val ) => setOwnValue( val ?? '' ) }
									help={ __( 'Exact CSS length, e.g. 900px or 60rem.', 'sgs-blocks' ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
						</>
					);
				} }
			</ResponsiveOverride>
			{ /* Kept OUTSIDE the wrapper deliberately: this is the only place a
			     non-technical client is told what the tokens mean, and inside the
			     render prop it would show on one tier at a time. */ }
			<p className="components-base-control__help">
				{ __( 'Caps the inner content band. Normal ≈ 1200px (content-size), Wide ≈ 1400px (wide-size), Full = no cap (default).', 'sgs-blocks' ) }
			</p>
				</>
			) }
		</>
	);
}

/**
 * Gap (responsive) + layout type + columns (grid) + vertical alignment.
 * Used by section and layout kinds.
 */
/**
 * Layout + Columns + Gap for a wrapper.
 *
 * `showLayout` (default true) exists because a block may own its OWN layout and
 * columns controls while still wanting the shared responsive Gap. Rendering both
 * is not merely redundant — it is silent DATA LOSS. Measured on sgs/gallery
 * 2026-08-07: this panel offers Stack/Flex/Grid bound to `layout`, while gallery's
 * block.json enum is Grid/Masonry/Carousel, so writing "flex" is accepted in the
 * editor, stored, and then SILENTLY reverted to "grid" on reload by WordPress's
 * enum coercion. Pass showLayout={false} when the consuming block renders its own.
 */
export function LayoutPanel( { attributes, setAttributes, showLayout = true } ) {
	const {
		layout = 'stack',
		alignItems = 'start',
		justifyItems = 'stretch',
		alignContent = 'stretch',
		// columns, gridTemplateColumns and gridTemplateRows are TIER OBJECTS
		// (columns: pass 4; grid template props: pass 3a/3b) and are read via
		// attributes.columns / attributes.gridTemplateColumns /
		// attributes.gridTemplateRows at their controls below, not destructured
		// with a scalar default — which would mask the object.
		gridAutoRows = '',
	} = attributes;

	return (
		<>
			{ showLayout && (
				<SelectControl
					label={ __( 'Layout type', 'sgs-blocks' ) }
					value={ layout }
					options={ LAYOUT_OPTIONS }
					onChange={ ( val ) => setAttributes( { layout: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }

			{ /*
				  Columns is a TIER OBJECT — ONE attr holding {desktop,tablet,mobile}
				  (Spec 35 pass 4, 2026-08-11). It must therefore use
				  ResponsiveOverride, which reads and writes the object, NOT
				  ResponsiveControl, which writes one flat attr per tier.

				  ⛔ Do NOT revert this to `ResponsiveControl` + an attrMap of
				  `{desktop:'columns', tablet:'columnsTablet', mobile:'columnsMobile'}`.
				  `columnsTablet`/`columnsMobile` are no longer declared by ANY
				  block.json, and WordPress SILENTLY DISCARDS an attribute a
				  block does not declare (D338) — so both tiers would save
				  nothing. The desktop branch is worse: it would write a NUMBER
				  into an attr declared `"type":"object"`, and a flat value on
				  an object-typed attr is coerced to the default, dropping the
				  whole setting (D563's gap regression, same bug class).
				  Mirrors the Gap control above.
			*/ }
			{ showLayout && layout === 'grid' && (
				<ResponsiveOverride
					label={ __( 'Columns', 'sgs-blocks' ) }
					value={ attributes.columns }
					onChange={ ( obj ) => setAttributes( { columns: obj } ) }
				>
					{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => (
						<RangeControl
							value={
								ownValue !== ''
									? ownValue
									: ( effectiveValue !== ''
										? effectiveValue
										: ( tier === 'mobile' ? 1 : 2 ) )
							}
							onChange={ setOwnValue }
							min={ 1 }
							max={ tier === 'mobile' ? 3 : 6 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</ResponsiveOverride>
			) }

			{ /*
				  Gap is a TIER OBJECT — ONE attr holding {desktop,tablet,mobile}
				  (Spec 35 pass 1, 2026-08-10). It must therefore use
				  ResponsiveOverride, which reads and writes the object, NOT
				  ResponsiveControl, which writes one flat attr per tier.

				  ⛔ Do NOT revert this to `ResponsiveControl` + an attrMap of
				  `{desktop:'gap', tablet:'gapTablet', mobile:'gapMobile'}`.
				  `gapTablet`/`gapMobile` are no longer declared by ANY
				  block.json, and WordPress SILENTLY DISCARDS an attribute a
				  block does not declare (D338) — so both tiers saved nothing.
				  The desktop branch was worse: it wrote a STRING into an attr
				  declared `"type":"object"`, and a flat value on an
				  object-typed attr is coerced to the default, dropping the
				  whole setting. Mirrors site-header-row/edit.js:397.
			*/ }
			<ResponsiveOverride
				label={ __( 'Gap', 'sgs-blocks' ) }
				value={ attributes.gap }
				onChange={ ( obj ) => setAttributes( { gap: obj } ) }
			>
				{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
					<SpacingControl
						freeInput
						value={ ownValue }
						placeholder={ inherited ? effectiveValue : '' }
						onChange={ setOwnValue }
					/>
				) }
			</ResponsiveOverride>

			{ ( layout === 'flex' || layout === 'grid' ) && (
				<SelectControl
					label={ __( 'Vertical alignment', 'sgs-blocks' ) }
					value={ alignItems }
					options={ ALIGN_OPTIONS }
					onChange={ ( val ) => setAttributes( { alignItems: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }

			{ layout === 'flex' && (
				<>
					<SelectControl
						label={ __( 'Flex direction', 'sgs-blocks' ) }
						value={ attributes.flexDirection || '' }
						options={ [
							{ label: __( '— default (row) —', 'sgs-blocks' ), value: '' },
							{ label: __( 'Row', 'sgs-blocks' ), value: 'row' },
							{ label: __( 'Row reverse', 'sgs-blocks' ), value: 'row-reverse' },
							{ label: __( 'Column', 'sgs-blocks' ), value: 'column' },
							{ label: __( 'Column reverse', 'sgs-blocks' ), value: 'column-reverse' },
						] }
						onChange={ ( val ) => setAttributes( { flexDirection: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Flex wrap', 'sgs-blocks' ) }
						value={ attributes.flexWrap || '' }
						options={ [
							{ label: __( '— default (wrap) —', 'sgs-blocks' ), value: '' },
							{ label: __( 'Wrap', 'sgs-blocks' ), value: 'wrap' },
							{ label: __( 'No wrap', 'sgs-blocks' ), value: 'nowrap' },
							{ label: __( 'Wrap reverse', 'sgs-blocks' ), value: 'wrap-reverse' },
						] }
						onChange={ ( val ) => setAttributes( { flexWrap: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Justify content', 'sgs-blocks' ) }
						value={ attributes.justifyContent || '' }
						options={ [
							{ label: __( '— default —', 'sgs-blocks' ), value: '' },
							{ label: __( 'Start', 'sgs-blocks' ), value: 'flex-start' },
							{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
							{ label: __( 'End', 'sgs-blocks' ), value: 'flex-end' },
							{ label: __( 'Space between', 'sgs-blocks' ), value: 'space-between' },
							{ label: __( 'Space around', 'sgs-blocks' ), value: 'space-around' },
							{ label: __( 'Space evenly', 'sgs-blocks' ), value: 'space-evenly' },
						] }
						onChange={ ( val ) => setAttributes( { justifyContent: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</>
			) }

			{ layout === 'grid' && (
				<>
					<hr style={ { margin: '16px 0' } } />
					<p
						className="components-base-control__label"
						style={ { fontWeight: 600, marginBottom: '8px' } }
					>
						{ __( 'Advanced grid layout', 'sgs-blocks' ) }
					</p>

					{ /*
						  `gridTemplateColumns` is a TIER OBJECT (Spec 35 pass 3a) — ONE
						  attr holding {desktop,tablet,mobile}, so it uses
						  ResponsiveOverride. The `gridTemplateColumnsTablet` /
						  `…Mobile` siblings are no longer declared by any block.json;
						  writing them through ResponsiveControl would save nothing
						  (D338) while the desktop branch wrote a string into an
						  object-typed attr and destroyed the setting (D563).
						*/ }
					<ResponsiveOverride
						label={ __( 'Custom column template', 'sgs-blocks' ) }
						value={ attributes.gridTemplateColumns }
						onChange={ ( obj ) => setAttributes( { gridTemplateColumns: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<TextControl
								value={ ownValue || '' }
								placeholder={ inherited ? effectiveValue || '' : '' }
								onChange={ ( val ) => setOwnValue( val ) }
								help={ __(
									"CSS grid-template-columns e.g. '5fr 3fr' or 'repeat(3,minmax(0,1fr))'. Leave empty to use the column count above — on tablet or mobile, empty inherits the tier above.",
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>

					{ /*
						  `gridTemplateRows` is a TIER OBJECT (Spec 35 pass 3b) — same
						  shape as `gridTemplateColumns` above, so it uses
						  ResponsiveOverride. The `gridTemplateRowsTablet` /
						  `…Mobile` siblings are no longer declared by any block.json
						  once a block is migrated — writing them through
						  ResponsiveControl would save nothing (D338) while the
						  desktop branch wrote a string into an object-typed attr
						  and destroyed the setting (same class as D563).
						*/ }
					<ResponsiveOverride
						label={ __( 'Row template', 'sgs-blocks' ) }
						value={ attributes.gridTemplateRows }
						onChange={ ( obj ) => setAttributes( { gridTemplateRows: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<TextControl
								value={ ownValue || '' }
								placeholder={ inherited ? effectiveValue || '' : '' }
								onChange={ ( val ) => setOwnValue( val ) }
								help={ __(
									"CSS grid-template-rows e.g. 'auto 1fr'. Leave empty to inherit the tier above, or for browser default on desktop.",
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>

					<TextControl
						label={ __( 'Auto rows', 'sgs-blocks' ) }
						value={ gridAutoRows }
						onChange={ ( val ) => setAttributes( { gridAutoRows: val } ) }
						help={ __(
							"Sets grid-auto-rows e.g. '1fr' for equal-height rows or 'minmax(100px,auto)'.",
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>

					<SelectControl
						label={ __( 'Justify items', 'sgs-blocks' ) }
						value={ justifyItems }
						options={ JUSTIFY_ITEMS_OPTIONS }
						onChange={ ( val ) => setAttributes( { justifyItems: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>

					<SelectControl
						label={ __( 'Align content', 'sgs-blocks' ) }
						value={ alignContent }
						options={ ALIGN_CONTENT_OPTIONS }
						onChange={ ( val ) => setAttributes( { alignContent: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</>
			) }
		</>
	);
}

/**
 * Background panel (image/video/overlay/svg/animation tabs).
 * Section kind only.
 */
export function BackgroundPanel( { attributes, setAttributes } ) {
	const {
		backgroundImage,
		backgroundImageTablet,
		backgroundImageMobile,
		backgroundSize = 'cover',
		backgroundPosition = 'center center',
		backgroundRepeat = 'no-repeat',
		backgroundAttachment = 'scroll',
		bgVideo,
		bgVideoTablet,
		bgVideoMobile,
		bgParallax = false,
		bgKenBurns = false,
		bgAnimationDuration = 20,
		bgSvgContent = '',
		bgSvgPosition = 'background',
		bgSvgAnimation = 'none',
		bgSvgAnimationSpeed = 'medium',
		bgSvgOpacity = 100,
		bgSvgTextShadow = false,
	} = attributes;

	const hasBgImage = !! backgroundImage?.url;

	return (
		<PanelBody title={ __( 'Background', 'sgs-blocks' ) } initialOpen={ false }>
			<p className="components-base-control__help">
				{ __(
					'This colour is the background. With an image or video behind it, lower its alpha to let the media show through — there is no separate overlay to set up.',
					'sgs-blocks'
				) }
			</p>
			<GradientOverlayControl
				attributes={ attributes }
				setAttributes={ setAttributes }
			/>
			<TabPanel
				tabs={ [
					{ name: 'image', title: __( 'Image', 'sgs-blocks' ) },
					{ name: 'video', title: __( 'Video', 'sgs-blocks' ) },
					{ name: 'svg', title: __( 'SVG', 'sgs-blocks' ) },
				] }
			>
				{ ( tab ) => {
					// ---- Image tab ----
					if ( tab.name === 'image' ) {
						return (
							<>
								{ /* The BASE picker stays OUTSIDE the device switcher, always
								     visible. It is the primary control: putting it inside the
								     desktop branch would hide it whenever the global device
								     toggle sits on tablet/mobile, so a client on a narrow
								     preview could not set the main image at all — and the
								     tier gate's "set a desktop image above" would point at
								     nothing. Matches src/blocks/media/edit.js, where the base
								     picker precedes the tier control. */ }
								<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '4px' } }>
									{ __( 'Background image', 'sgs-blocks' ) }
								</p>
								<MediaUploadCheck>
									<MediaUpload
										onSelect={ ( media ) =>
											setAttributes( { backgroundImage: { id: media.id, url: media.url, alt: media.alt } } )
										}
										allowedTypes={ [ 'image' ] }
										value={ backgroundImage?.id }
										render={ ( { open } ) => (
											<div style={ { marginBottom: '8px' } }>
												{ backgroundImage?.url ? (
													<>
														<img src={ backgroundImage.url } alt="" style={ { maxWidth: '100%', marginBottom: '8px' } } />
														<Button variant="secondary" onClick={ () => setAttributes( { backgroundImage: undefined } ) } isDestructive>
															{ __( 'Remove image', 'sgs-blocks' ) }
														</Button>
													</>
												) : (
													<Button variant="secondary" onClick={ open }>
														{ __( 'Select image', 'sgs-blocks' ) }
													</Button>
												) }
											</div>
										) }
									/>
								</MediaUploadCheck>

								{ /* ONE consolidated per-device override (was 2 more always-visible
								     stacked MediaUpload controls). Gated on the base image
								     existing — an override for an image that is not there is a
								     dead control (Spec 35 Part D5). */ }
								{ hasBgImage && (
								<ResponsiveControl label={ __( 'Art direction (optional)', 'sgs-blocks' ) }>
									{ ( bp ) => {
										if ( 'desktop' === bp ) {
											return (
												<p style={ { margin: 0, fontStyle: 'italic' } }>
													{ __(
														'The image above is used on desktop. Switch to tablet or mobile to set a different crop.',
														'sgs-blocks'
													) }
												</p>
											);
										}

										const key = 'tablet' === bp ? 'backgroundImageTablet' : 'backgroundImageMobile';
										const tierImage = attributes[ key ];
										return (
											<>
												<MediaUploadCheck>
													<MediaUpload
														onSelect={ ( media ) =>
															setAttributes( { [ key ]: { id: media.id, url: media.url, alt: media.alt } } )
														}
														allowedTypes={ [ 'image' ] }
														value={ tierImage?.id }
														render={ ( { open } ) => (
															<Button variant="secondary" onClick={ open }>
																{ tierImage?.url
																	? __( 'Replace image', 'sgs-blocks' )
																	: __( 'Set image', 'sgs-blocks' ) }
															</Button>
														) }
													/>
												</MediaUploadCheck>
												{ tierImage?.url && (
													<Button
														variant="link"
														isDestructive
														onClick={ () => setAttributes( { [ key ]: undefined } ) }
														style={ { marginTop: '8px', display: 'block' } }
													>
														{ __( 'Use the main image here', 'sgs-blocks' ) }
													</Button>
												) }
											</>
										);
									} }
								</ResponsiveControl>
								) }

								{ hasBgImage && (
									<>
										<SelectControl
											label={ __( 'Size', 'sgs-blocks' ) }
											value={ backgroundSize }
											options={ BG_SIZE_OPTIONS }
											onChange={ ( val ) => setAttributes( { backgroundSize: val } ) }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
										<SelectControl
											label={ __( 'Position', 'sgs-blocks' ) }
											value={ backgroundPosition }
											options={ BG_POSITION_OPTIONS }
											onChange={ ( val ) => setAttributes( { backgroundPosition: val } ) }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
										<SelectControl
											label={ __( 'Repeat', 'sgs-blocks' ) }
											value={ backgroundRepeat }
											options={ BG_REPEAT_OPTIONS }
											onChange={ ( val ) => setAttributes( { backgroundRepeat: val } ) }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
										<SelectControl
											label={ __( 'Attachment', 'sgs-blocks' ) }
											value={ backgroundAttachment }
											options={ BG_ATTACHMENT_OPTIONS }
											onChange={ ( val ) => setAttributes( { backgroundAttachment: val } ) }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
									</>
								) }
							</>
						);
					}

					// ---- Video tab ----
					if ( tab.name === 'video' ) {
						return (
							<>
								<p className="components-base-control__help">
									{ __( 'Video replaces the background image. Add an image as fallback for browsers that block autoplay.', 'sgs-blocks' ) }
								</p>
								{ /* BASE picker OUTSIDE the device switcher, always visible —
								     same reasoning as the image tab above: the base video is the
								     primary control and must not disappear when the global device
								     toggle sits on tablet/mobile. */ }
								<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '4px' } }>
									{ __( 'Background video', 'sgs-blocks' ) }
								</p>
								<MediaUploadCheck>
									<MediaUpload
										onSelect={ ( media ) => setAttributes( { bgVideo: { id: media.id, url: media.url } } ) }
										allowedTypes={ [ 'video' ] }
										value={ bgVideo?.id }
										render={ ( { open } ) => (
											<div style={ { marginBottom: '8px' } }>
												{ bgVideo?.url ? (
													<>
														<p style={ { fontSize: '12px', marginBottom: '4px' } }>{ bgVideo.url.split( '/' ).pop() }</p>
														<Button variant="secondary" onClick={ () => setAttributes( { bgVideo: undefined } ) } isDestructive>
															{ __( 'Remove video', 'sgs-blocks' ) }
														</Button>
													</>
												) : (
													<Button variant="secondary" onClick={ open }>
														{ __( 'Select video', 'sgs-blocks' ) }
													</Button>
												) }
											</div>
										) }
									/>
								</MediaUploadCheck>

								{ /* ONE consolidated per-device override, gated on the base video
								     existing (Spec 35 Part D5). Mirrors src/blocks/media/edit.js's
								     video art-direction control. */ }
								{ bgVideo?.url && (
								<ResponsiveControl label={ __( 'Art direction (optional)', 'sgs-blocks' ) }>
									{ ( bp ) => {
										if ( 'desktop' === bp ) {
											return (
												<p style={ { margin: 0, fontStyle: 'italic' } }>
													{ __(
														'The video above is used on desktop. Switch to tablet or mobile to set a different one.',
														'sgs-blocks'
													) }
												</p>
											);
										}

										const key = 'tablet' === bp ? 'bgVideoTablet' : 'bgVideoMobile';
										const tierVideo = attributes[ key ];
										return (
											<>
												<MediaUploadCheck>
													<MediaUpload
														onSelect={ ( media ) => setAttributes( { [ key ]: { id: media.id, url: media.url } } ) }
														allowedTypes={ [ 'video' ] }
														value={ tierVideo?.id }
														render={ ( { open } ) => (
															<Button variant="secondary" onClick={ open }>
																{ tierVideo?.url
																	? __( 'Replace video', 'sgs-blocks' )
																	: __( 'Set video', 'sgs-blocks' ) }
															</Button>
														) }
													/>
												</MediaUploadCheck>
												{ tierVideo?.url && (
													<>
														<p style={ { fontSize: '12px', marginTop: '4px', marginBottom: '4px' } }>{ tierVideo.url.split( '/' ).pop() }</p>
														<Button
															variant="link"
															isDestructive
															onClick={ () => setAttributes( { [ key ]: undefined } ) }
															style={ { marginTop: '4px', display: 'block' } }
														>
															{ __( 'Use the main video here', 'sgs-blocks' ) }
														</Button>
													</>
												) }
											</>
										);
									} }
								</ResponsiveControl>
								) }
							</>
						);
					}

					// ---- SVG tab ----
					if ( tab.name === 'svg' ) {
						return (
							<>
								<p className="components-base-control__help">
									{ __( 'Paste SVG markup to render it as an animated background or foreground layer. Animations use pure CSS — no JavaScript required.', 'sgs-blocks' ) }
								</p>
								<TextareaControl
									label={ __( 'SVG code', 'sgs-blocks' ) }
									value={ bgSvgContent }
									onChange={ ( val ) => setAttributes( { bgSvgContent: val } ) }
									help={ __( 'Paste your <svg>…</svg> markup here.', 'sgs-blocks' ) }
									rows={ 8 }
								/>
								{ bgSvgContent && (
									<>
										<SelectControl
											label={ __( 'Position', 'sgs-blocks' ) }
											value={ bgSvgPosition }
											options={ [
												{ label: __( 'Background (behind content)', 'sgs-blocks' ), value: 'background' },
												{ label: __( 'Foreground (above content)', 'sgs-blocks' ), value: 'foreground' },
											] }
											onChange={ ( val ) => setAttributes( { bgSvgPosition: val } ) }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
										<RangeControl
											label={ __( 'Opacity (%)', 'sgs-blocks' ) }
											value={ bgSvgOpacity }
											onChange={ ( val ) => setAttributes( { bgSvgOpacity: val } ) }
											min={ 0 }
											max={ 100 }
											step={ 5 }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
										<SelectControl
											label={ __( 'Animation', 'sgs-blocks' ) }
											value={ bgSvgAnimation }
											options={ [
												{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
												{ label: __( 'Pulse', 'sgs-blocks' ), value: 'pulse' },
												{ label: __( 'Float', 'sgs-blocks' ), value: 'float' },
												{ label: __( 'Wave', 'sgs-blocks' ), value: 'wave' },
											] }
											onChange={ ( val ) => setAttributes( { bgSvgAnimation: val } ) }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
										{ bgSvgAnimation !== 'none' && (
											<SelectControl
												label={ __( 'Animation speed', 'sgs-blocks' ) }
												value={ bgSvgAnimationSpeed }
												options={ [
													{ label: __( 'Slow', 'sgs-blocks' ), value: 'slow' },
													{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
													{ label: __( 'Fast', 'sgs-blocks' ), value: 'fast' },
												] }
												onChange={ ( val ) => setAttributes( { bgSvgAnimationSpeed: val } ) }
												__nextHasNoMarginBottom
												__next40pxDefaultSize
											/>
										) }
										<ToggleControl
											label={ __( 'Text shadow', 'sgs-blocks' ) }
											help={ __( 'Adds a subtle shadow to inner text for readability over busy SVG layers.', 'sgs-blocks' ) }
											checked={ bgSvgTextShadow }
											onChange={ ( val ) => setAttributes( { bgSvgTextShadow: val } ) }
											__nextHasNoMarginBottom
										/>
									</>
								) }
							</>
						);
					}

					return null;
				} }
			</TabPanel>

			{ /* Ken-burns/parallax are MODIFIERS on whichever media source is active
			    above (image/video), not a media source themselves — so they sit
			    below the tabs rather than as a peer "Anim" tab. Same relocation
			    technique as the Overlay colour/gradient row above the tabs. */ }
			<hr style={ { margin: '16px 0' } } />
			<p className="components-base-control__help">
				{ __( 'Requires a background image. Ken-burns and parallax are mutually exclusive — ken-burns takes priority.', 'sgs-blocks' ) }
			</p>
			<ToggleControl
				label={ __( 'Ken-burns zoom', 'sgs-blocks' ) }
				help={ __( 'Slow zoom animation on the background image.', 'sgs-blocks' ) }
				checked={ bgKenBurns }
				onChange={ ( val ) =>
					setAttributes( { bgKenBurns: val, bgParallax: val ? false : bgParallax } )
				}
				__nextHasNoMarginBottom
			/>
			<ToggleControl
				label={ __( 'Parallax scroll', 'sgs-blocks' ) }
				help={ __( 'Fixed background-attachment parallax effect. Disabled on touch devices.', 'sgs-blocks' ) }
				checked={ bgParallax }
				onChange={ ( val ) =>
					setAttributes( { bgParallax: val, bgKenBurns: val ? false : bgKenBurns } )
				}
				__nextHasNoMarginBottom
			/>
			{ bgKenBurns && (
				<RangeControl
					label={ __( 'Animation duration (seconds)', 'sgs-blocks' ) }
					value={ bgAnimationDuration }
					onChange={ ( val ) => setAttributes( { bgAnimationDuration: val } ) }
					min={ 5 }
					max={ 60 }
					step={ 1 }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</PanelBody>
	);
}

/**
 * Shape dividers panel (top + bottom).
 * Section kind only.
 */
export function ShapeDividersPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Shape Dividers', 'sgs-blocks' ) } initialOpen={ false }>
			<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '8px' } }>
				{ __( 'Top Divider', 'sgs-blocks' ) }
			</p>
			<SelectControl
				label={ __( 'Shape', 'sgs-blocks' ) }
				value={ attributes.shapeDividerTop || '' }
				options={ SHAPE_OPTIONS }
				onChange={ ( val ) => setAttributes( { shapeDividerTop: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ attributes.shapeDividerTop && (
				<>
					<DesignTokenPicker
						label={ __( 'Colour', 'sgs-blocks' ) }
						value={ attributes.shapeDividerTopColour }
						onChange={ ( val ) => setAttributes( { shapeDividerTopColour: val } ) }
					/>
					<RangeControl
						label={ __( 'Height (px)', 'sgs-blocks' ) }
						value={ attributes.shapeDividerTopHeight }
						onChange={ ( val ) => setAttributes( { shapeDividerTopHeight: val } ) }
						min={ 20 }
						max={ 300 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Flip horizontally', 'sgs-blocks' ) }
						checked={ attributes.shapeDividerTopFlip }
						onChange={ ( val ) => setAttributes( { shapeDividerTopFlip: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Invert vertically', 'sgs-blocks' ) }
						checked={ attributes.shapeDividerTopInvert }
						onChange={ ( val ) => setAttributes( { shapeDividerTopInvert: val } ) }
						__nextHasNoMarginBottom
					/>
				</>
			) }

			<hr style={ { margin: '16px 0' } } />

			<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '8px' } }>
				{ __( 'Bottom Divider', 'sgs-blocks' ) }
			</p>
			<SelectControl
				label={ __( 'Shape', 'sgs-blocks' ) }
				value={ attributes.shapeDividerBottom || '' }
				options={ SHAPE_OPTIONS }
				onChange={ ( val ) => setAttributes( { shapeDividerBottom: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ attributes.shapeDividerBottom && (
				<>
					<DesignTokenPicker
						label={ __( 'Colour', 'sgs-blocks' ) }
						value={ attributes.shapeDividerBottomColour }
						onChange={ ( val ) => setAttributes( { shapeDividerBottomColour: val } ) }
					/>
					<RangeControl
						label={ __( 'Height (px)', 'sgs-blocks' ) }
						value={ attributes.shapeDividerBottomHeight }
						onChange={ ( val ) => setAttributes( { shapeDividerBottomHeight: val } ) }
						min={ 20 }
						max={ 300 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Flip horizontally', 'sgs-blocks' ) }
						checked={ attributes.shapeDividerBottomFlip }
						onChange={ ( val ) => setAttributes( { shapeDividerBottomFlip: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Invert vertically', 'sgs-blocks' ) }
						checked={ attributes.shapeDividerBottomInvert }
						onChange={ ( val ) => setAttributes( { shapeDividerBottomInvert: val } ) }
						__nextHasNoMarginBottom
					/>
				</>
			) }
		</PanelBody>
	);
}

/**
 * Grid item defaults panel.
 * Section kind only (grid layout).
 */
export function GridItemDefaultsPanel( { attributes, setAttributes } ) {
	const {
		layout = 'stack',
		gridItemPadding = {},
		gridItemBackground = '',
		gridItemBorderRadius = {},
		gridItemBorder = '',
		gridItemShadow = '',
		gridItemTextColour = '',
	} = attributes;

	if ( layout !== 'grid' ) {
		return null;
	}

	return (
		<PanelBody title={ __( 'Grid item defaults', 'sgs-blocks' ) } initialOpen={ false }>
			<p className="components-base-control__help">
				{ __(
					'Values set here become CSS custom properties (--sgs-gi-*) inherited by direct child containers in the grid. Per-child overrides still win via specificity.',
					'sgs-blocks'
				) }
			</p>
			{ /* gridItemPadding is a TIER OBJECT — ONE attr holding
			     {desktop,tablet,mobile}, each tier itself a
			     {top,right,bottom,left} box (brought in line with
			     contentBandPadding's shape, 2026-08-13 — it was the one
			     tiered box-object property in this wrapper with no
			     tablet/mobile variant). It therefore uses ResponsiveOverride,
			     which reads and writes the object, NOT a plain BoxControl
			     writing one flat attr. Do NOT revert to a flat BoxControl —
			     WordPress SILENTLY DISCARDS an attribute a block does not
			     declare (D338), and the block.json default is now
			     {desktop:{}}, not {}. Mirrors container/edit.js's
			     contentBandPadding control exactly. */ }
			<ResponsiveOverride
				label={ __( 'Padding', 'sgs-blocks' ) }
				value={ gridItemPadding }
				onChange={ ( obj ) => setAttributes( { gridItemPadding: obj } ) }
			>
				{ ( { ownValue, setOwnValue } ) => (
					<BoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						hideLabelFromVision
						values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
						splitOnAxis={ false }
						units={ GRID_ITEM_BOX_UNITS }
						onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
						__next40pxDefaultSize
					/>
				) }
			</ResponsiveOverride>
			<DesignTokenPicker
				label={ __( 'Background colour', 'sgs-blocks' ) }
				value={ gridItemBackground }
				onChange={ ( val ) => setAttributes( { gridItemBackground: val } ) }
			/>
			{ /* Canonical per contract §14.1: the wrapper, not the raw primitive.
			     Fixed 2026-08-11 (P-SPEC35-BORDER-RESIDUALS) — this mounted the
			     raw `BorderRadiusControl`, which the survey could not see at all
			     until it learned to search shared component files, so all four
			     blocks using this panel read as "declared + rendered + NO
			     CONTROL". `showResponsive={ false }` because gridItemBorderRadius
			     has no Tablet/Mobile siblings: same base-only shape §14 already
			     uses on heading/quote/text. */ }
			<ResponsiveBorderRadiusControl
				label={ __( 'Border radius', 'sgs-blocks' ) }
				showResponsive={ false }
				values={ { base: gridItemBorderRadius ?? {} } }
				onChange={ ( _tier, next ) => setAttributes( { gridItemBorderRadius: next } ) }
			/>
			{ /* ⛔ WAS a raw <TextControl __next40pxDefaultSize > taking a CSS border shorthand — the
			     exact banned lookalike in contract §14.3 ("a TextControl taking a
			     raw CSS `border` shorthand"). It accepted invalid CSS, offered no
			     unit affordance and no colour picker, and served FOUR blocks
			     through this one panel. Replaced 2026-08-11
			     (P-SPEC35-BORDER-RESIDUALS item 1) with a real builder giving
			     §14 field 2's required props: a width UnitControl with a units
			     array, a style dropdown, and a token-aware colour picker.

			     ⚠ It writes the SAME shorthand STRING to the SAME attribute, so
			     there is no value-domain change and no stored-content migration —
			     which is why this, rather than core's `__experimentalBorderBoxControl`,
			     is the right shape here: that component works in a
			     {color,style,width} OBJECT and adopting it would force a content
			     migration on every stored instance for no user-visible gain. */ }
			<div className="sgs-grid-item-border-builder">
				<UnitControl
					label={ __( 'Border width', 'sgs-blocks' ) }
					value={ _gridBorderParts( gridItemBorder ).width }
					units={ GRID_ITEM_BOX_UNITS }
					onChange={ ( val ) => setAttributes( {
						gridItemBorder: _gridBorderJoin( { ..._gridBorderParts( gridItemBorder ), width: val || '' } ),
					} ) }
					__next40pxDefaultSize
				/>
				<SelectControl
					label={ __( 'Border style', 'sgs-blocks' ) }
					value={ _gridBorderParts( gridItemBorder ).style }
					options={ GRID_ITEM_BORDER_STYLES }
					onChange={ ( val ) => setAttributes( {
						gridItemBorder: _gridBorderJoin( { ..._gridBorderParts( gridItemBorder ), style: val } ),
					} ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<DesignTokenPicker
					label={ __( 'Border colour', 'sgs-blocks' ) }
					value={ _gridBorderParts( gridItemBorder ).colour }
					onChange={ ( val ) => setAttributes( {
						gridItemBorder: _gridBorderJoin( { ..._gridBorderParts( gridItemBorder ), colour: val || '' } ),
					} ) }
				/>
			</div>
			<ShadowControl
				label={ __( 'Shadow', 'sgs-blocks' ) }
				value={ gridItemShadow }
				onChange={ ( val ) => setAttributes( { gridItemShadow: val } ) }
			/>
			<DesignTokenPicker
				label={ __( 'Text colour', 'sgs-blocks' ) }
				value={ gridItemTextColour }
				onChange={ ( val ) => setAttributes( { gridItemTextColour: val } ) }
			/>
		</PanelBody>
	);
}

// ---------------------------------------------------------------------------
// ResponsiveSpacingPanel — DELETED 2026-08-10 (Spec 35 Phase 1.4).
// ---------------------------------------------------------------------------
//
// It rendered 16 tablet/mobile spacing controls writing paddingTopTablet /
// marginLeftMobile / etc. NO block.json anywhere declares those attributes, and
// WordPress SILENTLY DISCARDS an undeclared attribute — so a client could set
// tablet padding, save, and watch it vanish with no error, no warning and no
// failing gate. Verified three ways before deletion: no declaration in any
// block.json, no consumption in any render.php or the shared wrapper, and only
// ONE live mount (sgs/gallery).
//
// Its desktop tier was also structurally hollow — both Padding and Margin
// returned a <p> reading "set in the Dimensions panel above" instead of a
// control, because desktop spacing came from WP native supports.spacing while
// the tiers came from SGS attrs. inspector-scan rule 26 flagged both.
//
// Replaced by ResponsiveBoxControls (Spec 37 FR-37-16), which owns padding,
// margin, max-width and content-width on ONE {desktop,tablet,mobile} object
// model with a real control on every tier. sgs/gallery was migrated onto it in
// the same commit; site-header-row / site-footer-row / nav-menu were already
// there. ⛔ Do not reintroduce a flat per-side tier panel.
// ---------------------------------------------------------------------------
// ContentBandPanel — DELETED 2026-08-12 (Spec 35, check-shared-panel-schema
// triage). EVERY ONE of its 13 controls was dead, on EVERY block that mounted
// it. Measured, not assumed:
//
//  1. Band padding (12 controls) wrote FLAT `contentBandPaddingTop` /
//     `…TopTablet` / `…TopMobile` etc. The D580 box-tier migration moved every
//     block to ONE object-typed `contentBandPadding`, so as of that commit
//     ZERO block.json anywhere declares a single flat key this panel wrote —
//     and WordPress SILENTLY DISCARDS a write to an undeclared attribute
//     (D338). `cta-section/edit.js:20` already carried a comment recording
//     exactly this ("ContentBandPanel sub-panels still write to LEGACY FLAT
//     attrs"), which is WHY that block refused to mount the aggregator. Known,
//     never fixed, invisible to every gate: `check-shared-panel-schema.js`
//     cannot see these keys because they are COMPUTED (`side[breakpoint]`),
//     not literals.
//
//  2. Band background wrote `contentBandBackground`, undeclared on all 12
//     blocks that mounted this panel (it reached the inspector only through
//     KIND_PANELS.layout). The capability itself is now RETIRED framework-wide
//     — Bean-ruled 2026-08-12: a background colour or media fills the max-width
//     of its CONTAINER and is never clipped to the inner content layer, so a
//     band-scoped background was a design error, not a missing declaration.
//     Zero stored instances existed on the canary (verified by DB query before
//     deletion), so nothing to migrate.
//
// The blocks that genuinely HAVE a content band (container, cta-section, hero,
// physics-canvas, site-header, site-footer, trust-bar) never mounted this panel
// — each controls its own `contentBandPadding` locally with the canonical
// <ResponsiveBoxControl> against the object-shaped attr. That is the working
// path and it is untouched.
//
// ⛔ Do not reintroduce a shared band panel writing flat per-side tier keys.
// If band padding is ever wanted on a layout-kind composite, the additive fix
// is a <ResponsiveBoxControl> against a declared object-typed
// `contentBandPadding` — same shape those seven blocks already use.
//
// Same defect class + same remedy as `sgs/gallery`'s mount (D586, `69d1a3d8`)
// and ResponsiveSpacingPanel's tombstone above.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Per-area panel (Grid areas — decision 5)
// ---------------------------------------------------------------------------

/**
 * GridAreaPanel
 *
 * Renders per-area styling controls for one named grid area declared in
 * `supports.sgs.gridAreas`. Generic — derives all attr names from `areaName`
 * at runtime; zero block-specific code here.
 *
 * Attr naming convention (matches hero's existing contentPadding* family):
 *   <areaName>PaddingTop / Right / Bottom / Left
 *   <areaName>PaddingTopTablet / RightTablet / BottomTablet / LeftTablet
 *   <areaName>PaddingTopMobile / RightMobile / BottomMobile / LeftMobile
 *   <areaName>PaddingUnit
 *   <areaName>Background
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @param {string}   props.areaName      e.g. 'content' | 'media'.
 * @param {string}   props.label         Human-readable area label for panel title.
 */
export function GridAreaPanel( { attributes, setAttributes, areaName, label } ) {
	// Capitalise first letter of areaName for the compound key (e.g. 'content' → 'Content').
	const cap = areaName.charAt( 0 ).toUpperCase() + areaName.slice( 1 );

	const SIDES = [
		{ label: __( 'Top', 'sgs-blocks' ), desktop: `${ areaName }PaddingTop`, tablet: `${ areaName }PaddingTopTablet`, mobile: `${ areaName }PaddingTopMobile` },
		{ label: __( 'Right', 'sgs-blocks' ), desktop: `${ areaName }PaddingRight`, tablet: `${ areaName }PaddingRightTablet`, mobile: `${ areaName }PaddingRightMobile` },
		{ label: __( 'Bottom', 'sgs-blocks' ), desktop: `${ areaName }PaddingBottom`, tablet: `${ areaName }PaddingBottomTablet`, mobile: `${ areaName }PaddingBottomMobile` },
		{ label: __( 'Left', 'sgs-blocks' ), desktop: `${ areaName }PaddingLeft`, tablet: `${ areaName }PaddingLeftTablet`, mobile: `${ areaName }PaddingLeftMobile` },
	];

	const unitAttr = `${ areaName }PaddingUnit`;
	const bgAttr = `${ areaName }Background`;
	const currentUnit = attributes[ unitAttr ] || 'px';

	// The area padding attrs are NUMBERS with one shared <area>PaddingUnit
	// companion (the hero family shape). The SpacingControl shows the combined
	// '24px' string; on change the number goes to the side attr and the unit
	// to the shared companion (same composition pattern as TypographyControls).
	const parseAreaValue = ( raw ) => {
		const str = String( raw ?? '' ).trim();
		if ( '' === str ) {
			return { num: null, unit: currentUnit };
		}
		const match = str.match( /^([\d.]+)\s*([a-z%]*)$/i );
		if ( ! match ) {
			return { num: null, unit: currentUnit };
		}
		return {
			num: parseFloat( match[ 1 ] ),
			unit: match[ 2 ] || currentUnit,
		};
	};

	return (
		<PanelBody title={ label || sprintf( __( '%s area', 'sgs-blocks' ), cap ) } initialOpen={ false }>
			<DesignTokenPicker
				label={ __( 'Background colour', 'sgs-blocks' ) }
				value={ attributes[ bgAttr ] || '' }
				onChange={ ( val ) => setAttributes( { [ bgAttr ]: val } ) }
			/>

			<ResponsiveControl label={ __( 'Padding', 'sgs-blocks' ) }>
				{ ( breakpoint ) => (
					<>
						{ SIDES.map( ( side ) => (
							<SpacingControl
								key={ side[ breakpoint ] }
								freeInput
								label={ side.label }
								value={ attributes[ side[ breakpoint ] ] != null ? String( attributes[ side[ breakpoint ] ] ) + currentUnit : '' }
								onChange={ ( val ) => {
									const { num, unit } = parseAreaValue( val );
									setAttributes( {
										[ side[ breakpoint ] ]: num,
										[ unitAttr ]: unit,
									} );
								} }
							/>
						) ) }
					</>
				) }
			</ResponsiveControl>
		</PanelBody>
	);
}

// ---------------------------------------------------------------------------
// KIND → CONTROLS map
// ---------------------------------------------------------------------------
//
// Defines which sub-panels render for each kind value.
// Entries are render functions that receive ({ attributes, setAttributes, gridAreas }).
//
const KIND_PANELS = {
	section: [
		// 1. Section (outer) — layout type, columns, gap, width, contentWidth.
		//
		// ⛔ The three flat min-height SelectControls that sat here were DELETED
		// 2026-08-10 as UNREACHABLE DEAD UI. Measured, not assumed: all 16 live
		// <ContainerWrapperControls> mounts pass `kind` explicitly — 'layout' ×10,
		// 'content' ×6 — and NOT ONE passes 'section'. This array is reached only
		// via the unknown-kind fallback (`KIND_PANELS[kind] ?? KIND_PANELS.section`),
		// so no block ever rendered these three controls.
		//
		// An earlier count of "24 mounts, 19 omitting kind" was WRONG: it counted
		// COMMENT lines in six files whose only mention of this component is prose
		// recording that they STOPPED using it, and it missed that the real mounts
		// declare `kind` a few lines below the opening tag. That error made this
		// panel look like a live UX defect and put it at the top of Phase 1.4.
		// (`a-grep-for-a-class-name-is-not-a-usage-census`.)
		//
		// The `section` entry itself is KEPT as the unknown-kind safety net — only
		// the dead controls are gone. MIN_HEIGHT_OPTIONS stays exported: three
		// blocks that DO show it import it (container/edit.js:19,
		// physics-canvas/edit.js:20, trust-bar/edit.js:30), and removing the export
		// would hand all three `options={undefined}` and a crashed inspector panel
		// with NO build error — lint:js is not in prebuild and webpack does not
		// fail on a missing named export.
		( props ) => (
			<PanelBody title={ __( 'Section (outer)', 'sgs-blocks' ) }>
				<WidthPanel { ...props } />
			</PanelBody>
		),
		// 2. Inner band (content band) — REMOVED 2026-08-12 with ContentBandPanel
		//    itself (see its tombstone above): all 13 of its controls wrote
		//    attributes no block.json declares, so every value a client set was
		//    silently discarded. Band WIDTH survives — it is `contentWidth`,
		//    owned by WidthPanel at entry 1 above, and genuinely declared +
		//    consumed. Only the dead background/padding controls are gone.
		// 3. Responsive spacing — REMOVED 2026-08-11. ResponsiveSpacingPanel was
		//    deleted on 2026-08-10 (see its tombstone above) but these registry
		//    entries still called it, so EVERY section/layout/content-kind block
		//    threw `ReferenceError: ResponsiveSpacingPanel is not defined` and
		//    showed "This block has encountered an error and cannot be
		//    previewed." Found on the LIVE canary editor, not by any gate — the
		//    build, inspector-scan, check-dead-controls and the whole prebuild
		//    chain were all green with this in place.
		// 4. Layout.
		( props ) => (
			<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
				<LayoutPanel { ...props } />
			</PanelBody>
		),
		// 5. Grid items — uniform defaults then one per-area panel per declared area.
		( props ) => (
			<>
				<GridItemDefaultsPanel { ...props } />
				{ Array.isArray( props.gridAreas ) && props.gridAreas.map( ( area ) => (
					<GridAreaPanel
						key={ area }
						attributes={ props.attributes }
						setAttributes={ props.setAttributes }
						areaName={ area }
						label={ `${ area.charAt( 0 ).toUpperCase() + area.slice( 1 ) } ${ __( 'area', 'sgs-blocks' ) }` }
					/>
				) ) }
			</>
		),
		// 6. Background.
		( props ) => <BackgroundPanel { ...props } />,
		// 7. Shadow.
		( props ) => (
			<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
				<SelectControl
					label={ __( 'Shadow', 'sgs-blocks' ) }
					value={ props.attributes.shadow || '' }
					options={ SHADOW_OPTIONS }
					onChange={ ( val ) => props.setAttributes( { shadow: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>
		),
		// 8. Shape dividers.
		( props ) => <ShapeDividersPanel { ...props } />,
	],

	layout: [
		( props ) => (
			<PanelBody title={ __( 'Container / Wrapper', 'sgs-blocks' ) }>
				<LayoutPanel { ...props } />
				<hr style={ { margin: '16px 0' } } />
				<WidthPanel { ...props } />
			</PanelBody>
		),
		// ContentBandPanel mount REMOVED 2026-08-12 — this registry entry was
		// the ONLY route by which the panel reached an inspector, and all 12
		// blocks reaching it through this `layout` kind (accordion, card-grid,
		// feature-grid, form, form-field-tiles, google-reviews, post-grid,
		// pricing-table, site-footer-row, tabs, testimonial-slider,
		// trustpilot-reviews) declared NONE of the attributes it wrote. See the
		// ContentBandPanel tombstone above for the measurement.
	],

	content: [
		( props ) => (
			<PanelBody title={ __( 'Container / Wrapper', 'sgs-blocks' ) }>
				<WidthPanel { ...props } />
			</PanelBody>
		),
		// Base (desktop) padding/margin are handled by WP-native supports.spacing
		// (the Dimensions panel). The deleted ResponsiveSpacingPanel used to add
		// tablet/mobile overrides here; its call was removed 2026-08-11 with the
		// other two (see note above).
	],
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

/**
 * ContainerWrapperControls
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes object.
 * @param {Function} props.setAttributes Block setAttributes function.
 * @param {string}   [props.kind]        'section' | 'layout' | 'content'. Default 'section'.
 * @param {string[]} [props.gridAreas]   Area names from supports.sgs.gridAreas (e.g. ['content','media']).
 *                                       When provided, the section kind renders one GridAreaPanel per entry
 *                                       under the Grid items section. Consumers that pass no areas get
 *                                       behaviour-identical output to before this prop existed.
 * @param {boolean}  [props.showLayout]  Forwarded to LayoutPanel. Pass false when the block owns its OWN
 *                                       layout control — rendering both is silent DATA LOSS, because this
 *                                       panel writes stack/flex/grid into a `layout` attr whose block.json
 *                                       enum may not contain them and WordPress coerces the write back to
 *                                       the default. Previously only reachable via a DIRECT <LayoutPanel>
 *                                       mount (sgs/gallery's fix), so aggregator consumers had no way to
 *                                       opt out; threaded here 2026-08-12 for sgs/post-grid
 *                                       (enum grid|list|masonry|carousel) and sgs/testimonial-slider
 *                                       (enum full|split), both of which own their control and were
 *                                       silently losing writes.
 * @param {boolean}  [props.showContentBand] Forwarded to WidthPanel. Pass false for a block that cannot
 *                                       render a content band (see WidthPanel's docblock).
 */
export default function ContainerWrapperControls( {
	attributes,
	setAttributes,
	kind = 'section',
	gridAreas,
	showLayout,
	showContentBand,
} ) {
	// Guard: fall back gracefully for unknown kind values.
	const panels = KIND_PANELS[ kind ] ?? KIND_PANELS.section;

	return (
		<InspectorControls>
			{ panels.map( ( renderPanel, index ) => (
				// Key the list child on a Fragment rather than passing `key`
				// into the panel render function (which ignores it, leaving the
				// array children unkeyed → React duplicate-key warnings).
				// eslint-disable-next-line react/no-array-index-key
				<Fragment key={ index }>
					{ renderPanel( {
						attributes,
						setAttributes,
						gridAreas,
						// Undefined stays undefined so each panel's own default
						// (both true) applies — passing `false` explicitly is the
						// only way to suppress a control.
						showLayout,
						showContentBand,
					} ) }
				</Fragment>
			) ) }
		</InspectorControls>
	);
}
