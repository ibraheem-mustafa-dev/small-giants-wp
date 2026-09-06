/**
 * WidthPanel — shared wrapper panel.
 *
 * Split out of ContainerWrapperControls.js on 2026-08-17 (Bean-requested). That file held six
 * independently-mountable shared panels in one module, which repeatedly read as a "monolith" — an
 * audit in this repo measured the decomposition by its LINE COUNT, concluded no split had happened,
 * and had to retract it. One panel per file removes the ambiguity: the split is visible in `ls`.
 *
 * Blocks may import this directly, or via ContainerWrapperControls.js which re-exports it for the
 * existing ~30 call sites.
 */

import { __ } from '@wordpress/i18n';
import { ResponsiveControl, ResponsiveOverride, SgsLengthControl } from '../../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../../components/primitives';
import { LENGTH_UNITS } from './_shared';

/**
 * Content-band token options (v0.5 model).
 *   normal → var(--wp--style--global--content-size) (~1200px on this theme)
 *   wide   → var(--wp--style--global--wide-size) (~1400px on this theme)
 *   full   → no inner cap
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
 *   DEFAULT IS 'normal' (~1200px band), changed from 'full' on 2026-08-21 by D706's
 *   fix commit 2d291992. Every container that does not say 'full' therefore RENDERS a
 *   .sgs-container__inner band AND takes core's .has-global-padding gutter. This
 *   docblock said 'full' for the whole of that day; do not trust it over block.json.
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
					<SgsLengthControl
						presets={ false }
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
								<SgsLengthControl
									presets={ false }
									label={ __( 'Custom content band width', 'sgs-blocks' ) }
									value={ literal }
									units={ LENGTH_UNITS }
									onChange={ ( val ) => setOwnValue( val ?? '' ) }
									help={ __( 'Exact CSS length, e.g. 900px or 60rem.', 'sgs-blocks' ) }
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
				{ __( 'Caps the inner content band. Normal ≈ 1200px (content-size) is the default, Wide ≈ 1400px (wide-size), Full = no cap.', 'sgs-blocks' ) }
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
