/**
 * The automatic hover shadow — the JS twin of `includes/helpers-shadow-hover.php`.
 *
 * Design: `.claude/reports/2026-09-23-shadow-hover-lift-design.md` (H1/H2). A preset slug looks
 * up `settings.custom.shadowHover` (passed in as `map`, since this module has no WordPress
 * settings access of its own): another preset slug becomes a preset variable reference; a
 * literal is validated through `composeShadow()` before being trusted, then referenced by the
 * custom property WordPress generates for it. A custom layered shape (not a preset slug) lifts
 * procedurally: each OUTER layer's y offset and blur x1.25, rounded to the nearest whole pixel;
 * spread, colour and inset layers unchanged.
 *
 * Both halves are pinned to `tests/shared/shadow-hover-cases.json`, the same precedent the
 * composer's shared cases already use.
 *
 * Logic only, no React and no WordPress imports, so plain Node can load it.
 *
 * @package SGS\Blocks
 */

import { MAX_LAYERS, splitTop, parseLayer, formatLength, composeShadow } from './shadow-layers.js';

export const LIFT_FACTOR = 1.25;

/**
 * Is `text` a bare preset-slug reference — the same rule `composeShadow()` uses to recognise
 * one, minus `none` (which never resolves to a hover).
 *
 * @param {string} text Candidate text.
 * @return {boolean} True when it reads as a slug, not a layered shape.
 */
export function isSlug( text ) {
	return /^[a-z][a-z0-9-]*$/i.test( text ) && 'inset' !== text.toLowerCase() && 'none' !== text.toLowerCase();
}

/**
 * Lift a custom layered shape (not a preset slug): each OUTER layer's y offset and blur x1.25,
 * rounded to the nearest whole pixel; x, spread, colour and inset layers unchanged.
 *
 * @param {string} shape Layers separated by top-level commas (never a bare slug or `none`).
 * @return {string|null} The lifted shape text, ready for `composeShadow()`, or null when any
 *                       layer does not parse.
 */
export function liftShape( shape ) {
	const layers = splitTop( shape, ',' );
	if ( layers.length > MAX_LAYERS ) {
		return null;
	}
	const out = [];
	for ( const layerText of layers ) {
		const fields = parseLayer( layerText );
		if ( ! fields ) {
			return null;
		}
		if ( fields.inset ) {
			out.push( layerText.trim() );
			continue;
		}
		let text = `${ formatLength( fields.x ) } ${ formatLength( Math.round( fields.y * LIFT_FACTOR ) ) } ${ formatLength( Math.round( fields.blur * LIFT_FACTOR ) ) } ${ formatLength( fields.spread ) }`;
		if ( null !== fields.colour ) {
			text += ` ${ fields.colour }`;
		}
		out.push( text );
	}
	return out.join( ', ' );
}

/**
 * The hover shadow value for a resting shadow (`box-shadow`-ready CSS, or '' for none).
 *
 * @param {string|null|undefined} shape  Stored resting shape: a preset slug, a layered shape, or `none`.
 * @param {string|null|undefined} colour Stored resting colour text (used only for a custom layered shape).
 * @param {Object<string,string>} map    `settings.custom.shadowHover`: preset slug -> hover text.
 * @return {string} CSS `box-shadow` value, or '' when there is no hover to draw.
 */
export function shadowHoverValue( shape, colour, map ) {
	const text = 'string' === typeof shape ? shape.trim() : '';
	if ( '' === text || 'none' === text.toLowerCase() ) {
		return '';
	}
	if ( isSlug( text ) ) {
		const slug = text.toLowerCase();
		const entry = map && 'string' === typeof map[ slug ] ? map[ slug ] : '';
		if ( '' === entry ) {
			return '';
		}
		if ( isSlug( entry ) ) {
			return `var(--wp--preset--shadow--${ entry.toLowerCase() })`;
		}
		if ( '' === composeShadow( entry, null ) ) {
			return '';
		}
		return `var(--wp--custom--shadow-hover--${ slug })`;
	}
	const layers = splitTop( text, ',' );
	if ( layers.length > MAX_LAYERS ) {
		return '';
	}
	const lifted = liftShape( text );
	if ( null === lifted ) {
		return '';
	}
	return composeShadow( lifted, colour );
}
