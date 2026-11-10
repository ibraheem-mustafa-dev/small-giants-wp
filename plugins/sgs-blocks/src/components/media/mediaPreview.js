/**
 * mediaPreview: the editor's CSS for one media slot (Spec 49 C3, §7.3, §9.7).
 *
 *   mediaPreview( slot, attrs, uid ) -> { css, className, needsHelper }
 *
 * The editor prints the same CSS as the front end. `css` is each atom's CSS logic, collected through the atom
 * registry in registry order: an atom with a `css` function is called as
 * `atom.css( { slot, attrs, attributes, prefix, uid, helper } )` and returns a rule string (or an array of them) whose
 * selectors follow C3 (layout `.{uid}`; surface `.{uid}` or the helper; media `.{uid} .sgs-media-el` with a helper
 * or a wrapper, else `.{uid}`; overlay `::after`; mask `.sgs-media-box__mask`). A string without `{` is a bare list
 * of declarations and is wrapped on `.{uid}`. An atom without `css` contributes nothing.
 *
 * `className` is the layout box's class list: the uid, plus `sgs-media-box` when the helper is printed and
 * `sgs-media-box--fill` when Height is Match its space. `needsHelper` is §7.3 on resolved values: at any device Height
 * is `fill`; an overlay colour or gradient (or its hover form) is set; Shape is a mask (not none, circle, ellipse
 * or pill); or the media part's motion (`options.motion`: `{ hoverScale, effects, entrance }`) has hover scale above 1,
 * Parallax, Ken Burns, a clip entrance or an effect that paints a layer. A caption or link never causes it.
 *
 * @package
 */
import { MEDIA_ATOMS } from './atoms/registry.js';
import { mediaAttrName } from '../MediaElementControls.js';

const MASK_FREE_SHAPES = [ '', 'none', 'circle', 'ellipse', 'pill' ];

/** Effects that paint a layer on, or move, the media part (§7.3). */
export const HELPER_EFFECTS = [ 'parallax', 'ken-burns', 'sheen', 'glare', 'ripple', 'curtain', 'surface-treatment' ];

/**
 * Every device's value of a per-device attribute.
 *
 * @param {*} stored A tier object, or a plain value (the desktop value).
 * @return {Array} The non-blank values, desktop first.
 */
function everyDevice( stored ) {
	const list =
		stored && 'object' === typeof stored && ! Array.isArray( stored ) && ( 'desktop' in stored || 'tablet' in stored || 'mobile' in stored )
			? [ stored.desktop, stored.tablet, stored.mobile ]
			: [ stored ];
	return list.filter( ( v ) => undefined !== v && null !== v && '' !== v );
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
	if ( [ 'OverlayColour', 'OverlayGradient', 'OverlayColourHover', 'OverlayGradientHover' ].some( ( base ) => read( base ).length ) ) {
		return true;
	}
	if ( read( 'Shape' ).some( ( shape ) => ! MASK_FREE_SHAPES.includes( 'object' === typeof shape ? shape?.shape : shape ) ) ) {
		return true;
	}
	const effects = Array.isArray( motion?.effects ) ? motion.effects : [];
	const entrance = String( motion?.entrance || '' );
	return Number( motion?.hoverScale ) > 1 || effects.some( ( e ) => HELPER_EFFECTS.includes( e ) ) || entrance.startsWith( 'clip' );
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
	const atoms = options.atoms || MEDIA_ATOMS;
	const args = { slot, attrs, attributes: attrs, prefix: slot?.prefix || '', uid, helper };
	const css = Object.values( atoms ).flatMap( ( atom ) => atomRules( atom, args ) ).join( '\n' );
	const fill = everyDevice( attrs?.[ mediaAttrName( slot?.prefix || '', 'Height' ) ] ).includes( 'fill' );
	const className = [ uid, helper ? 'sgs-media-box' : '', fill ? 'sgs-media-box--fill' : '' ].filter( Boolean ).join( ' ' );
	return { css, className, needsHelper: helper };
}
