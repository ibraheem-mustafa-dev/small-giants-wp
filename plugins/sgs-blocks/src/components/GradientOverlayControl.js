/**
 * GradientOverlayControl
 *
 * Shared "background colour or gradient" picker. Originally built for the
 * whole-block "background overlay" used by container / cta-section / hero
 * (all three render through the same `BackgroundPanel` in
 * `blocks/container/components/ContainerWrapperControls.js`), and reused as
 * of Phase 4 Item 5 (D561 inspector-standardisation plan) for hero's
 * per-element `mediaBackground`/`contentBackground` colour+gradient controls.
 *
 * Spec 35 T3.2 (setting-registry.json ~:964-991): the overlay setting needs a
 * real GradientPicker (custom builder + per-stop alpha + clearable) with a
 * solid-colour fallback, not the old bare boolean toggle + two flat
 * DesignTokenPicker fields.
 *
 * UX shape (Background panel redesign D1, 2026-08-11): a compact swatch
 * BUTTON that opens a Dropdown popover, matching WP's own native
 * colour/gradient control shape, rather than every sub-control rendered
 * inline in the sidebar. Modelled on `@wordpress/block-editor`'s
 * `ColorGradientSettingsDropdown` (`packages/block-editor/src/components/
 * colors-gradients/dropdown.js`): a `ColorIndicator` swatch + label as the
 * toggle. Built from the STABLE primitives (`Dropdown`, `ColorIndicator`,
 * `Button` — none `__experimental*`) rather than importing WP's own dropdown
 * component, because that component expects the multi-origin theme
 * colour/gradient dataset and ToolsPanel context this control doesn't use —
 * this is the same visual pattern without pulling in machinery this control
 * has no data source for.
 *
 * ⚠ Bean-ruled 2026-08-11: keep WP's NATIVE `GradientPicker` for the actual
 * gradient editing (this popover just relocates it, doesn't replace it).
 * Verified against Gutenberg source that WP's per-stop colour editor
 * (`custom-gradient-picker/gradient-bar/control-points.tsx`) renders a bare
 * `ColorPicker`, never `ColorPalette` — so a gradient stop cannot be set to
 * a theme/global palette colour. That is a known, accepted trade-off, not a
 * bug: building a bespoke palette-aware stop editor was assessed and
 * explicitly decided against as not worth the time.
 *
 * CRITICAL CONSTRAINT — the stored attrs do NOT change per call site. Each
 * consumer's own render.php (`includes/class-sgs-container-wrapper.php` for
 * the whole-block overlay, `blocks/hero/render.php` for media/content
 * background) renders exactly the four attrs named by `attrNames` (gradient
 * bool / angle deg / from / to) for the gradient path, and the `solid` attr
 * for the flat-colour path, as
 * `linear-gradient(${angle}deg,${from},${to || 'transparent'})`.
 * That is a LINEAR, TWO-STOP gradient — angle + start colour + end colour.
 * WP's native GradientPicker can express far more (radial gradients, N
 * stops), so this control MAPS the picker's free-form CSS gradient string
 * down onto those four attrs: the first colour stop becomes "from", the
 * last becomes "to", the angle is read off a linear gradient (a radial
 * gradient has no angle to store, so it falls back to the previous/default
 * angle). Anything the two-stop-linear shape can't express is explained in
 * the control's help text — never reshaped into new attributes, never
 * pushed into the wrapper.
 *
 * `attrNames` — an optional `{ gradient, angle, from, to, solid }` map of
 * attribute names to read/write. Defaults to the original whole-block
 * overlay names (`overlayGradient`/`overlayGradientAngle`/
 * `overlayGradientFrom`/`overlayGradientTo`/`backgroundOverlayColour`) so
 * every existing call site is unaffected by this parameterisation.
 */
import { __ } from '@wordpress/i18n';
import {
	Button,
	ColorIndicator,
	Dropdown,
	GradientPicker,
} from '@wordpress/components';
import DesignTokenPicker from './DesignTokenPicker';
import {
	HStack,
	ToggleGroupControl,
	ToggleGroupControlOption,
} from './primitives';

/**
 * Split a CSS gradient's argument list on top-level commas only (i.e. not the
 * commas inside a `rgb()`/`rgba()`/`hsl()` colour function).
 *
 * @param {string} str Gradient function contents (without the wrapping
 *                     `linear-gradient(` / `)`).
 * @return {string[]} Each comma-separated segment (angle/shape + colour stops).
 */
function splitGradientStops( str ) {
	const parts = [];
	let depth = 0;
	let current = '';
	for ( let i = 0; i < str.length; i++ ) {
		const char = str[ i ];
		if ( char === '(' ) {
			depth++;
		} else if ( char === ')' ) {
			depth--;
		}
		if ( char === ',' && depth === 0 ) {
			parts.push( current );
			current = '';
		} else {
			current += char;
		}
	}
	if ( current.trim() !== '' ) {
		parts.push( current );
	}
	return parts;
}

/**
 * Strip a trailing stop-position token (`0%`, `50%`, `12px`…) off a colour
 * stop segment, leaving just the colour.
 *
 * @param {string} stop A single colour-stop segment, e.g. "rgb(0,0,0) 50%".
 * @return {string} The colour only.
 */
function extractColour( stop ) {
	return stop
		.trim()
		.replace( /\s+[\d.]+(%|px|em|rem)$/i, '' )
		.trim();
}

/**
 * Parse a CSS gradient string down to the linear/two-stop shape our attrs
 * can express. Anything richer (radial, 3+ stops) collapses to its first
 * and last colour; angle is only readable off a linear gradient.
 *
 * @param {string} css           The gradient CSS from GradientPicker's onChange.
 * @param {number} fallbackAngle Angle to keep when the new gradient has none
 *                               (e.g. the operator switched to radial).
 * @return {{angle: number, from: string, to: string}} The attrs to store.
 */
export function parseLinearGradient( css, fallbackAngle = 180 ) {
	if ( ! css || typeof css !== 'string' ) {
		return { angle: fallbackAngle, from: '', to: '' };
	}

	const angleMatch = css.match( /^linear-gradient\(\s*([\d.]+)deg/i );
	const angle = angleMatch
		? Math.round( parseFloat( angleMatch[ 1 ] ) )
		: fallbackAngle;

	const inner = css.replace( /^[a-z-]+\(/i, '' ).replace( /\)\s*$/, '' );
	const segments = splitGradientStops( inner );

	// Drop a leading angle ("135deg") or radial shape/position token
	// ("circle", "circle at center", "to top left") — everything else is a
	// colour stop.
	const colourStops = segments.filter( ( segment ) => {
		const trimmed = segment.trim();
		return (
			trimmed !== '' &&
			! /^[\d.]+deg$/i.test( trimmed ) &&
			! /^(circle|ellipse)\b/i.test( trimmed ) &&
			! /^to\s/i.test( trimmed )
		);
	} );

	const first = colourStops[ 0 ] ? extractColour( colourStops[ 0 ] ) : '';
	const last =
		colourStops.length > 1
			? extractColour( colourStops[ colourStops.length - 1 ] )
			: first;

	return { angle, from: first, to: last };
}

/**
 * Build the CSS gradient string GradientPicker should display for the
 * currently-stored attrs.
 *
 * @param {number} angle Degrees.
 * @param {string} from  Start colour.
 * @param {string} to    End colour (empty = transparent, matches the
 *                       wrapper's own fallback).
 * @return {string|undefined} A `linear-gradient(...)` CSS value, or
 *                             `undefined` when nothing is set yet (so
 *                             GradientPicker shows its empty "add a
 *                             gradient" state rather than a broken value).
 */
export function buildGradientCss( angle, from, to ) {
	if ( ! from && ! to ) {
		return undefined;
	}
	const start = from || 'transparent';
	const end = to || 'transparent';
	return `linear-gradient(${ angle }deg, ${ start } 0%, ${ end } 100%)`;
}

// Default attribute-name map — today's whole-block "overlay" shape. Passing a
// different map lets other elements (e.g. hero's mediaBackground/
// contentBackground, Item 5 of the D561 inspector-standardisation plan) reuse
// this exact control without duplicating it, while every EXISTING call site
// (container / cta-section / hero's own overlay usage) keeps working
// unchanged because it relies on this default.
const DEFAULT_ATTR_NAMES = {
	gradient: 'overlayGradient',
	angle: 'overlayGradientAngle',
	from: 'overlayGradientFrom',
	to: 'overlayGradientTo',
	solid: 'backgroundOverlayColour',
};

export default function GradientOverlayControl( {
	attributes,
	setAttributes,
	attrNames = DEFAULT_ATTR_NAMES,
	solidLabel = __( 'Overlay colour', 'sgs-blocks' ),
} ) {
	const {
		[ attrNames.gradient ]: gradientEnabled = false,
		[ attrNames.angle ]: gradientAngle = 180,
		[ attrNames.from ]: gradientFrom = '',
		[ attrNames.to ]: gradientTo = '',
		[ attrNames.solid ]: solidColour,
	} = attributes;

	const gradientValue = buildGradientCss(
		gradientAngle,
		gradientFrom,
		gradientTo
	);

	// What the swatch preview + Dropdown toggle shows — whichever of the two
	// mutually-exclusive paths (solid / gradient) is active.
	const swatchValue = gradientEnabled ? gradientValue : solidColour;

	return (
		<Dropdown
			className="sgs-gradient-overlay-control"
			contentClassName="sgs-gradient-overlay-control__popover"
			popoverProps={ { placement: 'left-start', offset: 36, shift: true } }
			renderToggle={ ( { isOpen, onToggle } ) => (
				<Button
					__next40pxDefaultSize
					onClick={ onToggle }
					aria-expanded={ isOpen }
					className="sgs-gradient-overlay-control__toggle"
				>
					<HStack justify="flex-start">
						<ColorIndicator colorValue={ swatchValue } />
						<span>{ solidLabel }</span>
					</HStack>
				</Button>
			) }
			renderContent={ () => (
				<div className="sgs-gradient-overlay-control__content">
					<ToggleGroupControl
						label={ __( 'Overlay type', 'sgs-blocks' ) }
						value={ gradientEnabled ? 'gradient' : 'solid' }
						onChange={ ( val ) =>
							setAttributes( {
								[ attrNames.gradient ]: val === 'gradient',
							} )
						}
						isBlock
						__nextHasNoMarginBottom
					>
						<ToggleGroupControlOption
							value="solid"
							label={ __( 'Solid', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="gradient"
							label={ __( 'Gradient', 'sgs-blocks' ) }
						/>
					</ToggleGroupControl>

					{ gradientEnabled ? (
						<>
							<GradientPicker
								value={ gradientValue }
								onChange={ ( newGradient ) => {
									if ( ! newGradient ) {
										setAttributes( {
											[ attrNames.from ]: '',
											[ attrNames.to ]: '',
										} );
										return;
									}
									const parsed = parseLinearGradient(
										newGradient,
										gradientAngle
									);
									setAttributes( {
										[ attrNames.angle ]: parsed.angle,
										[ attrNames.from ]: parsed.from,
										[ attrNames.to ]: parsed.to,
									} );
								} }
								clearable
								disableCustomGradients={ false }
								__nextHasNoMargin
							/>
							<p className="components-base-control__help">
								{ __(
									'Only a linear, two-stop gradient is saved (angle + start/end colour). A radial gradient or extra stops are collapsed to their first and last colour. Gradient stop colours use the native WordPress picker, so global/theme palette colours are not selectable per stop.',
									'sgs-blocks'
								) }
							</p>
						</>
					) : (
						<DesignTokenPicker
							label={ solidLabel }
							value={ solidColour }
							onChange={ ( val ) =>
								setAttributes( { [ attrNames.solid ]: val } )
							}
						/>
					) }
				</div>
			) }
		/>
	);
}
