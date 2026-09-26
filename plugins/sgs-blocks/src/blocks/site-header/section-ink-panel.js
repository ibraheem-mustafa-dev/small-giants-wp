/**
 * "Colour over sections" — sgs/site-header's section-adaptive ink panel
 * (Wave 3C U-13 §4.4, `.claude/reports/2026-09-26-u13-header-ink-design.md`).
 *
 * Independent of the "Header behaviour" ToolsPanel (headerSticky/Transparent/
 * Shrink/HideOnScroll/PassThrough/contrastSafe) — sectionInk is its own
 * feature. Render-side twin: `includes/sgs-header-ink-css.php`.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl, Notice } from '@wordpress/components';
import {
	ResponsiveOverride,
	MotionEasingControl,
	resolveColourToken,
} from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { resolveTier } from '../../utils/responsive';
import { calculateRelativeLuminance, calculateContrastRatio, meetsWCAG_AA } from '../../utils/wcag-contrast';

/** Does a `{desktop,tablet,mobile}` object resolve to `value` at ANY tier? */
function isValueAtAnyTier( raw, value ) {
	return [ 'desktop', 'tablet', 'mobile' ].some( ( tier ) => resolveTier( raw, tier, 'off' ).value === value );
}

/**
 * The palette's lightest/darkest resolved colours, by relative luminance —
 * the two grounds the ink-contrast advisory checks against (§4.4).
 */
function paletteExtremes( colourPalette ) {
	if ( ! Array.isArray( colourPalette ) || ! colourPalette.length ) {
		return null;
	}
	let lightest = null;
	let darkest = null;
	let lightestLum = -Infinity;
	let darkestLum = Infinity;
	colourPalette.forEach( ( entry ) => {
		const hex = entry && entry.color;
		const lum = hex ? calculateRelativeLuminance( hex ) : null;
		if ( null === lum || Number.isNaN( lum ) ) {
			return;
		}
		if ( lum > lightestLum ) {
			lightestLum = lum;
			lightest = hex;
		}
		if ( lum < darkestLum ) {
			darkestLum = lum;
			darkest = hex;
		}
	} );
	return lightest && darkest ? { lightest, darkest } : null;
}

/**
 * The ink and fill rows for the header's single Colour panel (Styles tab), so
 * the block keeps one colour home. Headed "Colour over sections"; the switch,
 * timing and notices live in SectionInkPanel on the Settings tab.
 *
 * @param {Object}   attributes    Block attributes.
 * @param {Function} setAttributes Attribute setter.
 * @return {Array} SgsColourPanel rows.
 */
export function sectionInkColourRows( attributes, setAttributes ) {
	const { inkOnLight, inkOnDark, fillOnLight, fillOnDark, fillOnLightGradient, fillOnDarkGradient } = attributes;
	return [
		{
			key: 'ink',
			heading: __( 'Colour over sections', 'sgs-blocks' ),
			label: __( 'Ink', 'sgs-blocks' ),
			states: [
				{ key: 'light', label: __( 'Over a light section', 'sgs-blocks' ), value: inkOnLight, onChange: ( v ) => setAttributes( { inkOnLight: v ?? '' } ), linked: true },
				{ key: 'dark', label: __( 'Over a dark section', 'sgs-blocks' ), value: inkOnDark, onChange: ( v ) => setAttributes( { inkOnDark: v ?? '' } ) },
			],
		},
		{
			key: 'fill',
			label: __( 'Fill (optional)', 'sgs-blocks' ),
			states: [
				{ key: 'light', label: __( 'Over a light section', 'sgs-blocks' ), value: fillOnLight, onChange: ( v ) => setAttributes( { fillOnLight: v ?? '' } ), gradientValue: fillOnLightGradient, onGradientChange: ( v ) => setAttributes( { fillOnLightGradient: v ?? '' } ), linked: true },
				{ key: 'dark', label: __( 'Over a dark section', 'sgs-blocks' ), value: fillOnDark, onChange: ( v ) => setAttributes( { fillOnDark: v ?? '' } ), gradientValue: fillOnDarkGradient, onGradientChange: ( v ) => setAttributes( { fillOnDarkGradient: v ?? '' } ) },
			],
		},
	];
}

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @param {Array}    props.colourPalette useSettings( 'color.palette' ).
 * @return {Element}
 */
export default function SectionInkPanel( { attributes, setAttributes, colourPalette } ) {
	const {
		sectionInk, inkOnLight, inkOnDark, fillOnLight, fillOnDark,
		fillOnLightGradient, fillOnDarkGradient, inkDuration, inkEasing, inkEasingCustom,
		backgroundColour, backgroundColourGradient, headerTransparent,
	} = attributes;

	const anyAdapt = isValueAtAnyTier( sectionInk, 'adapt' );
	const anyBlend = isValueAtAnyTier( sectionInk, 'blend' );

	// "The header has its own fill here…" — a tier resolving `adapt` where the
	// header is opaque (own fill, Transparent off) with no tone fill. Mirrors
	// sgs_header_ink_mode_for_tier()'s 'none' fall-through, so the editor
	// never suggests a control does something render.php declines to paint.
	const hasOwnFill = Boolean( backgroundColour ) || Boolean( backgroundColourGradient );
	const hasToneFill = Boolean( fillOnLight ) || Boolean( fillOnDark );
	const opaqueUnprotectedTiers = hasOwnFill && ! hasToneFill
		? [ 'desktop', 'tablet', 'mobile' ].filter(
				( tier ) => resolveTier( sectionInk, tier, 'off' ).value === 'adapt'
					&& resolveTier( headerTransparent, tier, 'off' ).value !== 'on'
		  )
		: [];

	// Ink-contrast advisory — each ink colour under 4.5:1 against the
	// palette's lightest AND darkest colour.
	const extremes = paletteExtremes( colourPalette );
	const lowContrastInk = [];
	if ( extremes && ( anyAdapt || anyBlend ) ) {
		[
			{ label: __( 'Ink on light', 'sgs-blocks' ), value: inkOnLight, against: extremes.lightest },
			{ label: __( 'Ink on dark', 'sgs-blocks' ), value: inkOnDark, against: extremes.darkest },
		].forEach( ( { label, value, against } ) => {
			if ( ! value ) {
				return;
			}
			const resolved = resolveColourToken( value, colourPalette ) || value;
			const ratio = calculateContrastRatio( calculateRelativeLuminance( resolved ), calculateRelativeLuminance( against ) );
			if ( ! meetsWCAG_AA( ratio, false ) ) {
				lowContrastInk.push( label );
			}
		} );
	}


	return (
		<PanelBody title={ __( 'Colour over sections', 'sgs-blocks' ) } initialOpen={ false }>
			<ResponsiveOverride value={ sectionInk } onChange={ ( value ) => setAttributes( { sectionInk: value } ) }>
				{ ( { ownValue, effectiveValue, setOwnValue, tier } ) => (
					<ToggleGroupControl
						label={ __( 'Colour over sections', 'sgs-blocks' ) }
						help={ __( 'Adapt: the ink (and, once a fill below is set, the fill) follows the section behind the header. Blend: an inverting effect needing no colour choice.', 'sgs-blocks' ) }
						value={ tier === 'desktop' ? ownValue || 'off' : ownValue || effectiveValue || 'off' }
						onChange={ ( value ) => setOwnValue( 'desktop' === tier ? value || 'off' : value ) }
						isBlock
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					>
						<ToggleGroupControlOption value="off" label={ __( 'Off', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="adapt" label={ __( 'Adapt', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="blend" label={ __( 'Blend', 'sgs-blocks' ) } />
					</ToggleGroupControl>
				) }
			</ResponsiveOverride>

			{ anyAdapt && (
				<>
					<RangeControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ inkDuration ?? 400 }
						onChange={ ( value ) => setAttributes( { inkDuration: value ?? 400 } ) }
						min={ 0 }
						max={ 2000 }
						step={ 10 }
						allowReset
						resetFallbackValue={ 400 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<MotionEasingControl
						label={ __( 'Speed curve', 'sgs-blocks' ) }
						value={ inkEasing }
						custom={ inkEasingCustom }
						fallback="ease"
						onChange={ ( value ) => setAttributes( { inkEasing: value } ) }
						onCustomChange={ ( value ) => setAttributes( { inkEasingCustom: value } ) }
					/>
				</>
			) }

			{ ( anyAdapt || anyBlend ) && (
				<Notice status="info" isDismissible={ false }>
					<p style={ { margin: 0 } }>
						{ __( 'While the header follows a section, its menu links take this colour even if the menu sets its own; hover colours still apply.', 'sgs-blocks' ) }
					</p>
				</Notice>
			) }

			{ lowContrastInk.length > 0 && (
				<Notice status="warning" isDismissible={ false }>
					<p style={ { margin: 0 } }>
						{ __( 'These ink colours may be hard to read against the lightest or darkest colour in the palette: ', 'sgs-blocks' ) }
						{ lowContrastInk.join( ', ' ) }
						{ __( '. Nothing has been changed for you.', 'sgs-blocks' ) }
					</p>
				</Notice>
			) }

			{ opaqueUnprotectedTiers.length > 0 && (
				<Notice status="info" isDismissible={ false }>
					<p style={ { margin: 0 } }>
						{ __( 'The header has its own fill here, so its colour stays as set — Adapt has nothing to switch to until a fill is set (Styles tab, Colour, Colour over sections), or Transparent is turned on.', 'sgs-blocks' ) }
					</p>
				</Notice>
			) }
		</PanelBody>
	);
}
