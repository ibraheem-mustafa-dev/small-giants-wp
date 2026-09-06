/**
 * Renders a single icon by { source, name } — used for the picker trigger chip,
 * grid cells, and block editor canvas previews. Lucide / wp-icon SVGs are pulled
 * from the lazily-loaded JSON maps; emoji + dashicons need no async load.
 *
 * @package SGS\Blocks
 */

import { useState, useEffect } from '@wordpress/element';
import { useInstanceId } from '@wordpress/compose';
import { loadLucide, loadWpIcons } from './icon-data';
import { sanitiseSvg, withSvgStrokeGradient } from '../../utils';

/**
 * Every icon in `lucide-icons.json`/`wp-icons.json` carries its own explicit
 * `fill`/`stroke` presentation attributes on the root `<svg>` tag — the
 * library is NOT uniformly stroke-based: 1,965 of 1,966 icons are
 * `fill="none" stroke="currentColor"`, but `wp-icons.json`'s `star-filled`
 * is deliberately the opposite, `fill="currentColor" stroke="none"`
 * (confirmed 2026-08-19 via a full scan of both JSON files, not a sample).
 *
 * WordPress core's own `.components-button svg { fill: currentColor }` rule
 * overrides these presentation attributes whenever the icon sits inside a
 * button (which it always does here). Re-declaring `fill`/`stroke` as an
 * inline STYLE (not just leaving the attribute) restores each icon's own
 * value, because an inline `style` attribute outranks any external
 * stylesheet rule that isn't `!important` — unlike a bare presentation
 * attribute, which core's rule always beats. Per-icon, not a blanket
 * `fill:none` — that would make `star-filled` invisible.
 *
 * Exported so `IconPicker.js`'s grid-cell rendering can apply the same fix —
 * it renders the raw SVG maps directly, a second code path this component
 * does not cover on its own.
 *
 * @param {string} svgString Raw SVG markup with `fill="..."`/`stroke="..."`
 *   attributes on its root element.
 * @return {string} The same markup with those two values also present as an
 *   inline `style`, so they survive being mounted inside a Button.
 */
export function withInlineFillStroke( svgString ) {
	const fillMatch = svgString.match( /<svg[^>]*\bfill="([^"]*)"/ );
	const strokeMatch = svgString.match( /<svg[^>]*\bstroke="([^"]*)"/ );
	if ( ! fillMatch && ! strokeMatch ) {
		return svgString;
	}
	const declarations = [
		fillMatch ? `fill:${ fillMatch[ 1 ] }` : null,
		strokeMatch ? `stroke:${ strokeMatch[ 1 ] }` : null,
	].filter( Boolean ).join( ';' );
	return svgString.replace( /<svg/, `<svg style="${ declarations }"` );
}

/**
 * @param {Object} props
 * @param {string} props.source   One of lucide | emoji | wp-icon | dashicon.
 * @param {string} props.name     Icon identifier (lucide/wp slug, dashicon slug, or emoji char).
 * @param {number} [props.size]   Pixel size of the preview box. Default 24.
 * @param {string} [props.gradient] Optional `iconColourGradient`-style CSS
 *   gradient function (`linear-gradient(...)`/`radial-gradient(...)`). SVG
 *   icons are STROKE-based, so a gradient can't ride `color`/`currentColor`
 *   the way a flat colour does (D636/D644) — when set, this mirrors the
 *   frontend's `sgs_svg_stroke_gradient()` (`helpers-svg-gradient.php`) by
 *   injecting a real SVG `<linearGradient>`/`<radialGradient>` def and
 *   painting the icon's `stroke` with it, via `withSvgStrokeGradient()`
 *   (`utils/svg-gradient-preview.js`). Only applies to lucide/wp-icon (the
 *   only stroke-based sources); emoji/dashicon ignore it, matching the
 *   frontend's `$icon_svg` scoping.
 */
export default function IconPreview( { source, name, size = 24, gradient = '' } ) {
	const [ svg, setSvg ] = useState( '' );
	const gradientId = useInstanceId( IconPreview, 'sgs-icon-preview-grad' );

	useEffect( () => {
		let active = true;
		setSvg( '' );
		if ( 'lucide' === source && name ) {
			loadLucide()
				.then( ( { map } ) => active && setSvg( withInlineFillStroke( map[ name ] || '' ) ) )
				.catch( () => {} );
		} else if ( 'wp-icon' === source && name ) {
			loadWpIcons()
				.then( ( map ) => active && setSvg( withInlineFillStroke( map[ name ] || '' ) ) )
				.catch( () => {} );
		}
		return () => {
			active = false;
		};
	}, [ source, name ] );

	const box = {
		width: size,
		height: size,
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		flex: '0 0 auto',
	};

	if ( 'emoji' === source ) {
		return (
			<span
				style={ { ...box, fontSize: Math.round( size * 0.9 ), lineHeight: 1 } }
				aria-hidden="true"
			>
				{ name || '⭐' }
			</span>
		);
	}

	if ( 'dashicon' === source ) {
		return (
			<span
				className={ `dashicons dashicons-${ name || 'star-filled' }` }
				style={ { ...box, fontSize: size, width: size, height: size } }
				aria-hidden="true"
			/>
		);
	}

	// lucide + wp-icon → inline SVG string.
	if ( svg ) {
		const gradedSvg = gradient
			? withSvgStrokeGradient( svg, gradient, `${ gradientId }` )
			: svg;
		return (
			<span
				className="sgs-icon-preview__svg"
				style={ box }
				aria-hidden="true"
				// eslint-disable-next-line react/no-danger
				dangerouslySetInnerHTML={ { __html: sanitiseSvg( gradedSvg ) } }
			/>
		);
	}

	// Loading / unknown — neutral placeholder dot.
	return (
		<span style={ box } aria-hidden="true">
			▢
		</span>
	);
}
