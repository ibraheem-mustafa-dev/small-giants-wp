/**
 * GradientOverlayControl
 *
 * Shared "background overlay" picker used by container / cta-section / hero
 * (all three render through the same `BackgroundPanel` in
 * `blocks/container/components/ContainerWrapperControls.js`).
 *
 * Spec 35 T3.2 (setting-registry.json ~:964-991): the overlay setting needs a
 * real GradientPicker (custom builder + per-stop alpha + clearable) with a
 * solid-colour fallback, not the old bare boolean toggle + two flat
 * DesignTokenPicker fields.
 *
 * CRITICAL CONSTRAINT — the stored attrs do NOT change. The wrapper
 * (`includes/class-sgs-container-wrapper.php`, read-only) renders exactly:
 *   overlayGradient (bool) / overlayGradientAngle (deg) /
 *   overlayGradientFrom / overlayGradientTo  — for the gradient path, and
 *   backgroundOverlayColour / backgroundOverlayOpacity — for the solid path,
 * as `linear-gradient(${angle}deg,${from},${to || 'transparent'})`.
 * That is a LINEAR, TWO-STOP gradient — angle + start colour + end colour.
 * WP's native GradientPicker can express far more (radial gradients, N
 * stops), so this control MAPS the picker's free-form CSS gradient string
 * down onto those four attrs: the first colour stop becomes "from", the
 * last becomes "to", the angle is read off a linear gradient (a radial
 * gradient has no angle to store, so it falls back to the previous/default
 * angle). Anything the two-stop-linear shape can't express is explained in
 * the control's help text — never reshaped into new attributes, never
 * pushed into the wrapper.
 */
import { __ } from '@wordpress/i18n';
import {
	GradientPicker,
} from '@wordpress/components';
import DesignTokenPicker from './DesignTokenPicker';
import { ToggleGroupControl, ToggleGroupControlOption } from './primitives';

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

export default function GradientOverlayControl( {
	attributes,
	setAttributes,
} ) {
	const {
		overlayGradient = false,
		overlayGradientAngle = 180,
		overlayGradientFrom = '',
		overlayGradientTo = '',
		backgroundOverlayColour,
	} = attributes;

	const gradientValue = buildGradientCss(
		overlayGradientAngle,
		overlayGradientFrom,
		overlayGradientTo
	);

	return (
		<>
			<ToggleGroupControl
				label={ __( 'Overlay type', 'sgs-blocks' ) }
				value={ overlayGradient ? 'gradient' : 'solid' }
				onChange={ ( val ) =>
					setAttributes( { overlayGradient: val === 'gradient' } )
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

			{ overlayGradient ? (
				<>
					<GradientPicker
						value={ gradientValue }
						onChange={ ( newGradient ) => {
							if ( ! newGradient ) {
								setAttributes( {
									overlayGradientFrom: '',
									overlayGradientTo: '',
								} );
								return;
							}
							const parsed = parseLinearGradient(
								newGradient,
								overlayGradientAngle
							);
							setAttributes( {
								overlayGradientAngle: parsed.angle,
								overlayGradientFrom: parsed.from,
								overlayGradientTo: parsed.to,
							} );
						} }
						clearable
						disableCustomGradients={ false }
						__nextHasNoMargin
					/>
					<p className="components-base-control__help">
						{ __(
							'Only a linear, two-stop gradient is saved (angle + start/end colour). A radial gradient or extra stops are collapsed to their first and last colour.',
							'sgs-blocks'
						) }
					</p>
				</>
			) : (
				<DesignTokenPicker
					label={ __( 'Overlay colour', 'sgs-blocks' ) }
					value={ backgroundOverlayColour }
					onChange={ ( val ) =>
						setAttributes( { backgroundOverlayColour: val } )
					}
				/>
			) }
		</>
	);
}
