// Spec 49 §11 "Absorption" and the placement rows: which draft wrapper merges into the media, and where a media element goes.
// Pure; not wired until Stage B.
//
// Wrapper read (`w`): { children: [{ tag, absolute: boolean, hasText: boolean }], ownText: boolean,
//   computed: { overflow, aspectRatio, borderRadius, borderWidth, boxShadow, backgroundColor }, repeatsImage: string[] }
// `repeatsImage` lists the computed properties the wrapped image already carries itself (a radius the image repeats).
const MEDIA_TAGS = [ 'img', 'video', 'picture', 'iframe', 'svg', 'image-slot' ];
const NONE = [ '', 'none', 'auto', '0', '0px', 'transparent', 'rgba(0, 0, 0, 0)', 'visible', 'normal' ];
const tagOf = ( k ) => String( k.tag ).toLowerCase();

/** @param {string} tag Tag name. @return {boolean} Whether the tag is a draft media element. */
export const isMediaTag = ( tag ) => MEDIA_TAGS.includes( String( tag ).toLowerCase() );

/**
 * Whether a wrapper is merged into its media (the box's own settings then belong to the media).
 *
 * @param {Object} w Wrapper read.
 * @return {{absorb:boolean, reason:string}} Verdict.
 */
export function absorbs( w ) {
	const kids = w?.children || [];
	const media = kids.filter( ( k ) => [ 'img', 'video', 'picture' ].includes( tagOf( k ) ) );
	if ( 1 !== media.length ) {
		return { absorb: false, reason: `${ media.length } image, video or picture children, not one` };
	}
	if ( w.ownText ) {
		return { absorb: false, reason: 'the wrapper has text of its own' };
	}
	const others = kids.filter( ( k ) => k !== media[ 0 ] );
	const captions = others.filter( ( k ) => 'figcaption' === tagOf( k ) );
	const overlays = others.filter( ( k ) => 'figcaption' !== tagOf( k ) );
	const overlayOk = 0 === overlays.length || ( 1 === overlays.length && overlays[ 0 ].absolute && ! overlays[ 0 ].hasText );
	if ( ! overlayOk || captions.length > 1 || others.length > 1 ) {
		return { absorb: false, reason: 'more than one extra child, or an extra child that is not an absolutely positioned overlay without text or one figcaption' };
	}
	const c = w.computed || {};
	const repeated = w.repeatsImage || [];
	const clips = [ 'hidden', 'clip' ].includes( c.overflow );
	const declares = [ [ 'aspectRatio', c.aspectRatio ], [ 'borderRadius', c.borderRadius ], [ 'borderWidth', c.borderWidth ], [ 'boxShadow', c.boxShadow ], [ 'backgroundColor', c.backgroundColor ] ]
		.filter( ( [ name, v ] ) => ! NONE.includes( String( v ?? '' ).trim() ) && ! repeated.includes( name ) );
	if ( clips || declares.length ) {
		return { absorb: true, reason: clips ? 'the wrapper clips its overflow' : `the wrapper declares ${ declares.map( ( d ) => d[ 0 ] ).join( ', ' ) } the image does not repeat` };
	}
	return { absorb: false, reason: 'the wrapper clips nothing and declares nothing the image lacks' };
}

/**
 * Where a draft media element goes (§11's first row and the decorative row).
 *
 * @param {Object} e Element read: { computed: { position, inset: boolean (all four offsets 0) }, fullBox, behindSiblings,
 *                   hasSiblingContent, hasText, offsets: boolean }.
 * @return {'background'|'decorative-image'|'media'} Target.
 */
export function placement( e ) {
	const absolute = 'absolute' === e?.computed?.position;
	if ( absolute && ( e.computed.inset || e.fullBox ) && e.behindSiblings && e.hasSiblingContent ) {
		return 'background';
	}
	if ( absolute && e.offsets && ! e.behindSiblings && ! e.hasText ) {
		return 'decorative-image';
	}
	return 'media';
}
