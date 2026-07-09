/**
 * ResponsiveBoxControl / ResponsiveBorderRadiusControl — shared responsive
 * box-family editor controls (Box-object interface contract, Spec doc
 * `.claude/plans/2026-07-09-box-object-interface-contract.md` §1 + §5).
 *
 * Edits a box family (padding / margin / border-width — 4 SIDES, or
 * border-radius — 4 CORNERS) across base/tablet/mobile tiers using WP's
 * native `BoxControl` (sides) / `BorderRadiusControl` (corners). Follows
 * the project's existing responsive device-switcher pattern (see
 * `ResponsiveControl.js` + `TypographyControls.js`) so every block gets
 * the same device-icon switcher UI.
 *
 * ── Attribute shape (contract §1) ──────────────────────────────────────
 * `values` = { base: <box>, tablet: <box>, mobile: <box> } where <box> is:
 *   - 4-side family  → { top, right, bottom, left }        (BoxControl shape)
 *   - 4-corner family → { topLeft, topRight, bottomLeft, bottomRight }
 *     (BorderRadiusControl shape)
 * Each value is a CSS length string (e.g. "20px") or absent for an unset
 * side/corner. The unit is carried inline in the string — no separate
 * `{attr}Unit` companion attribute is needed (contract §1).
 *
 * ── onChange contract ───────────────────────────────────────────────────
 * `onChange( tier, nextBoxValues )` — TWO arguments: the active tier key
 * ('base'|'tablet'|'mobile') the operator was editing when the change fired,
 * plus the next box object for THAT tier only. This is a deliberate
 * extension of the "writes back the object for the active device tier"
 * requirement: the box object alone doesn't tell the caller WHICH of the
 * three attrs (base/{family}Tablet/{family}Mobile) to write, so the tier
 * key is passed alongside it (mirrors how TypographyControls' internal
 * `fontSizeAttrMap` resolves breakpoint → attr key, except that mapping is
 * pushed out to the caller here since only the caller knows its own attr
 * names). A block's edit.js wires this straight into setAttributes:
 *
 *   <ResponsiveBoxControl
 *       label={ __( 'Padding', 'sgs-blocks' ) }
 *       values={ {
 *           base: attributes.style?.spacing?.padding ?? {},
 *           tablet: attributes.paddingTablet ?? {},
 *           mobile: attributes.paddingMobile ?? {},
 *       } }
 *       onChange={ ( tier, next ) => {
 *           if ( tier === 'base' ) {
 *               setAttributes( { style: { ...attributes.style, spacing: { ...attributes.style?.spacing, padding: next } } } );
 *           } else {
 *               setAttributes( { [ `padding${ tier === 'tablet' ? 'Tablet' : 'Mobile' }` ]: next } );
 *           }
 *       } }
 *   />
 *
 * ── BoxControl export name (researched via /library-docs, Gutenberg docs
 * 2026-07-09) ──────────────────────────────────────────────────────────
 * `BoxControl` has been a STABLE (non-experimental) named export of
 * `@wordpress/components` since Gutenberg 14.5 / WP 6.1 — no
 * `__experimental` prefix needed. `@wordpress/components` is not a local
 * `node_modules` dependency in this plugin (it is externalised to the
 * `wp.components` global by wp-scripts' DependencyExtractionWebpackPlugin,
 * same as every other `@wordpress/*` import in this codebase — see
 * ResponsiveControl.js / TypographyControls.js importing from
 * '@wordpress/components' with no local package installed), so the import
 * resolves at runtime against WordPress core's bundled Gutenberg version,
 * not a pinned npm version.
 *
 * The border-radius equivalent, `__experimentalBorderRadiusControl`, lives
 * in `@wordpress/block-editor` (NOT `@wordpress/components`) and is still
 * under the experimental flag in current Gutenberg — imported here as
 * `BorderRadiusControl` via the standard WP aliasing pattern.
 */
import { BoxControl } from '@wordpress/components';
import { __experimentalBorderRadiusControl as BorderRadiusControl } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import ResponsiveControl from './ResponsiveControl';

/** Map ResponsiveControl's device-switcher breakpoint keys to the contract's tier keys. */
const TIER_BY_BREAKPOINT = {
	desktop: 'base',
	tablet: 'tablet',
	mobile: 'mobile',
};

/** Units offered in the BoxControl side inputs (mirrors SpacingControl's free-input set). */
const BOX_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: '%', label: '%', default: 0 },
	{ value: 'vw', label: 'vw', default: 0 },
];

/**
 * ResponsiveBoxControl — 4-SIDE family (padding / margin / border-width) editor.
 *
 * @param {Object}   props
 * @param {string}   props.label   Heading label for the control group.
 * @param {Object}   props.values  { base, tablet, mobile } — each a
 *                                 { top, right, bottom, left } box object.
 * @param {Function} props.onChange( tier, nextBoxValues ) — see file header.
 * @param {ReadonlyArray<string>} [props.sides] Passed through to BoxControl's
 *                                 `sides` prop (restrict to a subset of sides).
 * @param {boolean}  [props.showResponsive=true] Show the device-icon switcher.
 *                                 When false, only the base tier is editable.
 * @return {JSX.Element} Controls fragment.
 */
export default function ResponsiveBoxControl( {
	label,
	values = {},
	onChange,
	sides,
	showResponsive = true,
} ) {
	const tierValues = {
		base: values.base ?? {},
		tablet: values.tablet ?? {},
		mobile: values.mobile ?? {},
	};

	if ( ! showResponsive ) {
		return (
			<BoxControl
				label={ label }
				values={ tierValues.base }
				sides={ sides }
				units={ BOX_UNITS }
				onChange={ ( next ) => onChange( 'base', next ) }
			/>
		);
	}

	return (
		<ResponsiveControl label={ label }>
			{ ( breakpoint ) => {
				const tier = TIER_BY_BREAKPOINT[ breakpoint ];
				return (
					<BoxControl
						label={ label }
						hideLabelFromVision
						values={ tierValues[ tier ] }
						sides={ sides }
						units={ BOX_UNITS }
						onChange={ ( next ) => onChange( tier, next ) }
					/>
				);
			} }
		</ResponsiveControl>
	);
}

/**
 * ResponsiveBorderRadiusControl — 4-CORNER family (border-radius) editor.
 *
 * @param {Object}   props
 * @param {string}   props.label   Heading label for the control group.
 * @param {Object}   props.values  { base, tablet, mobile } — each a
 *                                 { topLeft, topRight, bottomLeft, bottomRight }
 *                                 corner object.
 * @param {Function} props.onChange( tier, nextCornerValues ) — see file header.
 * @param {boolean}  [props.showResponsive=true] Show the device-icon switcher.
 *                                 When false, only the base tier is editable.
 * @return {JSX.Element} Controls fragment.
 */
export function ResponsiveBorderRadiusControl( {
	label = __( 'Border radius', 'sgs-blocks' ),
	values = {},
	onChange,
	showResponsive = true,
} ) {
	const tierValues = {
		base: values.base ?? {},
		tablet: values.tablet ?? {},
		mobile: values.mobile ?? {},
	};

	if ( ! showResponsive ) {
		return (
			<BorderRadiusControl
				values={ tierValues.base }
				onChange={ ( next ) => onChange( 'base', next ) }
			/>
		);
	}

	return (
		<ResponsiveControl label={ label }>
			{ ( breakpoint ) => {
				const tier = TIER_BY_BREAKPOINT[ breakpoint ];
				return (
					<BorderRadiusControl
						values={ tierValues[ tier ] }
						onChange={ ( next ) => onChange( tier, next ) }
					/>
				);
			} }
		</ResponsiveControl>
	);
}
