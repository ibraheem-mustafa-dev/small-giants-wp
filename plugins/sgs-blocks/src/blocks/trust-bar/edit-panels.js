/**
 * Trust bar: inspector panels and canvas preview for the bare-icon variant,
 * stroke width, badge spacing and the marquee options.
 *
 * Kept out of edit.js (already far past the file-length cap). Every control here
 * writes one block.json attribute and is mirrored by render.php / view.js:
 *
 *   iconBareSize      -> --sgs-trust-badge-icon-size          (icon-bare variant)
 *   iconStrokeWidth   -> --sgs-trust-badge-icon-stroke-width  (icon-circle + icon-bare)
 *   itemGap           -> gap on each badge item               (tier object)
 *   itemPadding       -> padding on each badge item           (tier box object)
 *   autoScrollBelow   -> data-auto-scroll-below + media query (0 / 768 / 1024)
 *   autoScrollDuration-> animation-duration on the track      (seconds, 0 = preset)
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';
import {
	IconPreview,
	ResponsiveOverride,
	SgsBoxControl,
	SgsLengthControl,
	BOX_UNITS,
	normaliseResponsiveBox,
} from '../../components';

/**
 * Numeric limits. These MIRROR the server clamps in includes/helpers-trust-bar-item.php
 * (SGS_TRUST_BAR_STROKE_WIDTH_MIN/MAX, SGS_TRUST_BAR_BARE_ICON_SIZE_MIN/MAX,
 * SGS_TRUST_BAR_SCROLL_DURATION_MIN/MAX) and the ranges in block.json's descriptions;
 * TrustBarRenderTest::test_editor_ranges_mirror_the_server_clamps fails if they drift.
 * An editor range narrower than the server clamp would hide values the frontend accepts.
 */
export const TRUST_BAR_LIMITS = {
	strokeWidth: { min: 0.25, max: 4, fallback: 1.8 },
	bareSize: { min: 8, max: 96, fallback: 20 },
	// 0 means "use the slow / medium / fast preset"; a non-zero value clamps to min..max.
	scrollDuration: { off: 0, min: 2, max: 300 },
};

/** Marquee breakpoint choices: the two device-tier standards (768 / 1024), or off. */
export const AUTO_SCROLL_BELOW_OPTIONS = [
	{ label: __( 'At every screen size', 'sgs-blocks' ), value: '0' },
	{ label: __( 'Phones only (below 768px)', 'sgs-blocks' ), value: '768' },
	{ label: __( 'Phones and tablets (below 1024px)', 'sgs-blocks' ), value: '1024' },
];

/**
 * Bare icon (no circle) for the editor canvas. The CSS custom properties that size
 * and colour it are set on the block root by edit.js, and style.css (loaded in the
 * canvas) does the rest, so the preview matches the frontend.
 *
 * @param {Object}  props
 * @param {number}  props.size       Icon size in px.
 * @param {string}  props.iconSlug   Lucide icon slug.
 * @param {string}  props.gradient   Optional icon gradient.
 * @param {boolean} props.filled     Render as a solid glyph.
 * @param {string}  props.fillColour Custom fill colour (CSS value).
 * @return {JSX.Element} The icon.
 */
export function EditorIconBare( { size, iconSlug, gradient, filled, fillColour } ) {
	const style = filled && fillColour ? { '--sgs-trust-badge-icon-fill': fillColour } : undefined;
	return (
		<span
			className={ 'sgs-trust-bar__icon' + ( filled ? ' sgs-trust-bar__icon--filled' : '' ) }
			aria-hidden="true"
			style={ style }
		>
			<IconPreview source="lucide" name={ iconSlug || 'check' } size={ size } gradient={ gradient } />
		</span>
	);
}

/**
 * Icon size (bare variant) and stroke width (both icon variants).
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {string}   props.badgeStyle    Active variant.
 * @return {JSX.Element} The panel.
 */
export function TrustBarIconPanel( { attributes, setAttributes, badgeStyle } ) {
	return (
		<PanelBody title={ __( 'Icon', 'sgs-blocks' ) } initialOpen={ false }>
			{ 'icon-bare' === badgeStyle && (
				<RangeControl
					label={ __( 'Icon size (px)', 'sgs-blocks' ) }
					help={ __( 'The icon on its own, with no circle behind it.', 'sgs-blocks' ) }
					value={ attributes.iconBareSize ?? TRUST_BAR_LIMITS.bareSize.fallback }
					onChange={ ( val ) => setAttributes( { iconBareSize: val ?? TRUST_BAR_LIMITS.bareSize.fallback } ) }
					min={ TRUST_BAR_LIMITS.bareSize.min }
					max={ TRUST_BAR_LIMITS.bareSize.max }
					step={ 1 }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
			<RangeControl
				label={ __( 'Line thickness', 'sgs-blocks' ) }
				help={ __( 'How thick the icon lines are. 1.8 is the standard; lower is finer, higher is bolder.', 'sgs-blocks' ) }
				value={ attributes.iconStrokeWidth ?? TRUST_BAR_LIMITS.strokeWidth.fallback }
				onChange={ ( val ) => setAttributes( { iconStrokeWidth: val ?? TRUST_BAR_LIMITS.strokeWidth.fallback } ) }
				min={ TRUST_BAR_LIMITS.strokeWidth.min }
				max={ TRUST_BAR_LIMITS.strokeWidth.max }
				step={ 0.05 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</PanelBody>
	);
}

/**
 * Gap and padding on each badge item, per device.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The panel.
 */
export function TrustBarItemSpacingPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Badge spacing', 'sgs-blocks' ) } initialOpen={ false }>
			<ResponsiveOverride
				label={ __( 'Gap between icon and label', 'sgs-blocks' ) }
				value={ attributes.itemGap }
				onChange={ ( obj ) => setAttributes( { itemGap: obj } ) }
			>
				{ ( { ownValue, effectiveValue, setOwnValue } ) => (
					<SgsLengthControl
						label={ __( 'Gap between icon and label', 'sgs-blocks' ) }
						hideLabelFromVision
						value={ ownValue || '' }
						placeholder={ effectiveValue ? String( effectiveValue ) : undefined }
						onChange={ ( val ) => setOwnValue( val || '' ) }
						presets={ false }
					/>
				) }
			</ResponsiveOverride>
			<hr style={ { margin: '16px 0' } } />
			<ResponsiveOverride
				value={ attributes.itemPadding }
				onChange={ ( obj ) => setAttributes( { itemPadding: obj } ) }
			>
				{ ( { ownValue, setOwnValue } ) => (
					<SgsBoxControl
						label={ __( 'Badge padding', 'sgs-blocks' ) }
						values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
						units={ BOX_UNITS }
						presets
						onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
					/>
				) }
			</ResponsiveOverride>
		</PanelBody>
	);
}

/**
 * Marquee options that sit under "Enable auto-scroll": where it runs, and how fast.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The controls.
 */
export function TrustBarMarqueeControls( { attributes, setAttributes } ) {
	return (
		<>
			<SelectControl
				label={ __( 'Scroll only on', 'sgs-blocks' ) }
				help={ __( 'Above the chosen width the badges show as a normal static row.', 'sgs-blocks' ) }
				value={ String( attributes.autoScrollBelow ?? 0 ) }
				options={ AUTO_SCROLL_BELOW_OPTIONS }
				onChange={ ( val ) => setAttributes( { autoScrollBelow: parseInt( val, 10 ) || 0 } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<RangeControl
				label={ __( 'Custom scroll time (seconds)', 'sgs-blocks' ) }
				help={ __( 'Seconds for one full loop. 0 uses the Slow / Medium / Fast choice above; anything higher overrides it.', 'sgs-blocks' ) }
				value={ attributes.autoScrollDuration ?? TRUST_BAR_LIMITS.scrollDuration.off }
				onChange={ ( val ) => setAttributes( { autoScrollDuration: val ?? TRUST_BAR_LIMITS.scrollDuration.off } ) }
				min={ TRUST_BAR_LIMITS.scrollDuration.off }
				max={ TRUST_BAR_LIMITS.scrollDuration.max }
				step={ 1 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</>
	);
}
