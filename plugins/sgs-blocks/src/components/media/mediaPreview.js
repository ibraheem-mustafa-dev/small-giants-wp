/**
 * mediaPreview: the editor's CSS for one media slot (Spec 49 C3, §7.3, §9.7).
 *
 *   mediaPreview( slot, attrs, uid ) -> { css, className, needsHelper }
 *
 * The editor prints the same CSS as the front end. `css` is every atom's C3 emitter output, collected by
 * `emit/emitters.js::emitSlot` (the JS twins of the PHP emitters the renderer collects), with selectors per C3
 * (layout `.{uid}`; surface `.{uid}` or the helper; media `.{uid} .sgs-media-el` with a helper or a wrapper, else
 * `.{uid}`; overlay `::after`; mask `.sgs-media-box__mask`). Tests may pass `options.atoms`, each with a `css`
 * function returning a rule string (or an array of them); a string without `{` is wrapped on `.{uid}`.
 *
 * `className` is the layout box's class list: the uid, plus `sgs-media-box` when the helper is printed and
 * `sgs-media-box--fill` when Height is Match its space. `needsHelper` is §7.3 on resolved values: at any device Height
 * is `fill`; an overlay colour or gradient (or its hover form) is set; Shape is a mask (not none, circle, ellipse
 * or pill); or the media part's motion (`options.motion`: `{ hoverScale, effects, entrance }`) has hover scale above 1,
 * Parallax, Ken Burns, a clip entrance or an effect that paints a layer. A caption or link never causes it.
 *
 * @package
 */
import { emitSlot } from './emit/emitters.js';
import { mediaAttrName } from '../MediaElementControls.js';
import helperEffects from '../../../includes/media/helper-effects.json';

const MASK_FREE_SHAPES = [ '', 'none', 'circle', 'ellipse', 'pill' ];

/**
 * Effects that paint a layer on, or move, the media part (§7.3). The list is `includes/media/helper-effects.json`, the
 * file `render-chrome.php::sgs_media_effect_paints_layer` reads, so the editor and the page decide alike.
 */
export const HELPER_EFFECTS = helperEffects.effects;

/**
 * Whether an effect paints a layer: a registry id (`fx-surface-treatment`) and a listed alias (`surface`) count.
 *
 * @param {string} effect The effect name the motion layer reports.
 * @return {boolean} True when the helper is needed.
 */
export function effectPaintsLayer( effect ) {
	const bare = String( effect ).replace( /^fx-/, '' );
	return HELPER_EFFECTS.includes( helperEffects.aliases[ bare ] ?? bare );
}

/**
 * The same test the PHP helper uses for a stored value: a string needs a character that is not a space; anything else
 * must be non-empty (no `0`, `false`, `null`, `[]` or `{}`).
 *
 * @param {*} value A stored value.
 * @return {boolean} True when the value is set.
 */
function isFilled( value ) {
	if ( 'string' === typeof value ) {
		return '' !== value.trim();
	}
	if ( value && 'object' === typeof value ) {
		return Object.keys( value ).length > 0;
	}
	return !! value;
}

/**
 * Every device's value of a per-device attribute, as `sgs_media_device_values` reads it: a blank, `'inherit'` or empty
 * array means the device inherits, so it is not a value.
 *
 * @param {*} stored A tier object, or a plain value (the desktop value).
 * @return {Array} The values that are set, desktop first.
 */
function everyDevice( stored ) {
	const list =
		stored && 'object' === typeof stored && ! Array.isArray( stored ) && ( 'desktop' in stored || 'tablet' in stored || 'mobile' in stored )
			? [ stored.desktop, stored.tablet, stored.mobile ]
			: [ stored ];
	return list.filter( ( v ) => undefined !== v && null !== v && '' !== v && 'inherit' !== v && ! ( Array.isArray( v ) && ! v.length ) );
}

/**
 * @param {Object} slot   `{ prefix, kinds, context }`.
 * @param {Object} attrs  Block attributes.
 * @param {Object} motion `{ hoverScale, effects, entrance }` of the media part.
 * @return {boolean} Whether the helper element is printed (§7.3).
 */
export function needsHelper( slot, attrs, motion = {} ) {
	const read = ( base ) => everyDevice( attrs?.[ mediaAttrName( slot?.prefix || '', base ) ] );
	if ( read( 'Height' ).includes( 'fill' ) ) {
		return true;
	}
	if ( [ 'OverlayColour', 'OverlayGradient' ].some( ( base ) => read( base ).some( isFilled ) ) ) {
		return true;
	}
	// Any stored `{prefix}Overlay…Hover…` setting is an overlay hover form.
	const overlayKey = mediaAttrName( slot?.prefix || '', 'Overlay' );
	if ( Object.entries( attrs || {} ).some( ( [ key, value ] ) => key.startsWith( overlayKey ) && key.includes( 'Hover' ) && isFilled( value ) ) ) {
		return true;
	}
	if ( read( 'Shape' ).some( ( shape ) => ! MASK_FREE_SHAPES.includes( String( ( 'object' === typeof shape ? shape?.shape : shape ) ?? '' ) ) ) ) {
		return true;
	}
	const effects = Array.isArray( motion?.effects ) ? motion.effects : [];
	const entrance = String( motion?.entrance || '' );
	return Number( motion?.hoverScale ) > 1 || effects.some( effectPaintsLayer ) || entrance.includes( 'clip' );
}

/** The rule text one atom contributes. */
function atomRules( atom, args ) {
	if ( 'function' !== typeof atom?.css ) {
		return [];
	}
	const out = atom.css( args );
	return ( Array.isArray( out ) ? out : [ out ] )
		.filter( ( rule ) => 'string' === typeof rule && rule.trim() )
		.map( ( rule ) => ( rule.includes( '{' ) ? rule : `.${ args.uid }{${ rule }}` ) );
}

/**
 * @param {Object} slot    `{ prefix, kinds, context }`.
 * @param {Object} attrs   Block attributes.
 * @param {string} uid     The slot's scope class, without the dot.
 * @param {Object} options `{ motion, atoms }`; `atoms` overrides the registry (tests).
 * @return {{css: string, className: string, needsHelper: boolean}} The editor's CSS and layout-box classes.
 */
export default function mediaPreview( slot, attrs, uid, options = {} ) {
	const helper = needsHelper( slot, attrs, options.motion );
	const args = { slot, attrs, attributes: attrs, prefix: slot?.prefix || '', uid, helper };
	const css = options.atoms
		? Object.values( options.atoms ).flatMap( ( atom ) => atomRules( atom, args ) ).join( '\n' )
		: emitSlot( slot, attrs, uid, helper );
	const fill = everyDevice( attrs?.[ mediaAttrName( slot?.prefix || '', 'Height' ) ] ).includes( 'fill' );
	const className = [ uid, helper ? 'sgs-media-box' : '', fill ? 'sgs-media-box--fill' : '' ].filter( Boolean ).join( ' ' );
	return { css, className, needsHelper: helper };
}
