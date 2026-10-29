// Skeleton writer, fixed controls and floating surfaces that are not blocks (Spec 48 FR-48-6, Spec 18): an element the draft
// fixes to the viewport is either a self-floating block (lib/skeleton-recognise.mjs), or one of the Customiser's Floating UI
// settings (a back-to-top button, a reading progress bar: `sgs_floating_ui_*` site options read from the element's own look),
// or a feature the framework does not have (a persistent bottom bar, Spec 18 section 1.1; a cookie consent banner; a popup
// that opens on a timer), which is a missing-features row (lib/intake-missing.mjs). The option names and the patterns are the
// decisions data (`rules.backToTop.floating`, `rules.readingProgress.options`, `rules.persistentBar`, `rules.cookieConsent`,
// `rules.timedPopup`); this file holds the readings.
import { specHit } from './skeleton-facts.mjs';

const px = ( v ) => {
	const n = /^(-?[\d.]+)(?:px)?$/.exec( String( v ?? '' ).trim() );
	return n ? Number( n[ 1 ] ) : null;
};

// Whether the element is fixed to the viewport: declared fixed (`st`, the record's declarations, lib/element-facts.mjs), or
// computed fixed at a width where it renders.
export function fixedAt( e, st ) {
	return 'fixed' === st.position || Object.keys( e.box || {} ).some( ( w ) => e.box[ w ]?.w > 0 && false !== e.visible?.[ w ] && 'fixed' === e.position?.[ w ] );
}

// A CSS colour as a #rrggbb hex (the Customiser's colour pickers), or null when it is not a plain opaque colour.
export function hexOf( css ) {
	const t = String( css ?? '' ).trim().toLowerCase();
	const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec( t );
	if ( short ) {
		return `#${ short[ 1 ] }${ short[ 1 ] }${ short[ 2 ] }${ short[ 2 ] }${ short[ 3 ] }${ short[ 3 ] }`;
	}
	if ( /^#[0-9a-f]{6}$/.test( t ) ) {
		return t;
	}
	const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/.exec( t );
	if ( ! rgb || ( null != rgb[ 4 ] && 1 !== Number.parseFloat( rgb[ 4 ] ) / ( rgb[ 4 ].endsWith( '%' ) ? 100 : 1 ) ) ) {
		return null;
	}
	return `#${ [ rgb[ 1 ], rgb[ 2 ], rgb[ 3 ] ].map( ( n ) => Number( n ).toString( 16 ).padStart( 2, '0' ) ).join( '' ) }`;
}

// The Floating UI back-to-top options the draft's fixed control sets: enabled, the side it sits on (declared left or right), its
// background and its icon colour. spec: rules.backToTop.floating.options ({ enabled, position, background, icon } option names).
export function backToTopOptions( e, st, spec ) {
	const o = spec.options;
	const out = { [ o.enabled ]: true };
	out[ o.position ] = st.left && ! st.right ? 'left' : 'right';
	const bg = hexOf( st[ 'background-color' ] || st.background );
	const icon = hexOf( st.color );
	bg && ( out[ o.background ] = bg );
	icon && ( out[ o.icon ] = icon );
	return out;
}

// The Floating UI reading progress options the draft's fixed bar sets: enabled, its fill colour or gradient and its height.
// `heights` are its resolved heights at the widths it holds at (the first is written; its declared height when none).
// spec: rules.readingProgress.options ({ enabled, colour, gradient, height }); the height is held to the setting's range.
export function readingProgressOptions( e, st, spec, heights = [] ) {
	const o = spec.options;
	const out = { [ o.enabled ]: true };
	const paint = st[ 'background-image' ] || st.background || '';
	if ( /gradient\(/i.test( paint ) ) {
		out[ o.gradient ] = paint.trim();
	} else {
		const hex = hexOf( st[ 'background-color' ] || st.background );
		hex && ( out[ o.colour ] = hex );
	}
	const h = heights.find( ( x ) => null != x ) ?? px( st.height );
	null != h && ( out[ o.height ] = Math.min( spec.range[ 1 ], Math.max( spec.range[ 0 ], Math.round( h ) ) ) );
	return out;
}

// The feature a fixed element is that the framework lacks, as { rule, line, why }, or null: a cookie consent banner (words or
// names matching rules.cookieConsent) or a persistent bar across the bottom of the viewport holding a link or a button
// (rules.persistentBar: fixed, drawn across the width at every width it renders, anchored to the bottom edge, no taller than
// maxHeightPx).
export function missingFixedFeature( { e, st, text, R, m } ) {
	if ( ! fixedAt( e, st ) ) {
		return null;
	}
	const words = `${ text } ${ e.attrs?.class || '' } ${ e.attrs?.id || '' } ${ e.attrs?.[ 'aria-label' ] || '' }`;
	if ( R.cookieConsent && specHit( R.cookieConsent, words ) ) {
		return { rule: 'cookieConsent', line: `cookie consent banner "${ String( text ).slice( 0, 60 ) }"`, why: R.cookieConsent.why };
	}
	const P = R.persistentBar;
	if ( ! P ) {
		return null;
	}
	const rendered = Object.keys( e.box || {} ).filter( ( w ) => e.box[ w ]?.w > 0 && false !== e.visible?.[ w ] );
	const across = rendered.length > 0 && rendered.every( ( w ) => e.box[ w ].w / Number( w ) >= P.minShare && e.box[ w ].h <= P.maxHeightPx );
	const bottom = null != px( st.bottom ) && px( st.bottom ) <= 0 && ! st.top;
	const acts = [ e, ...( function walk( x ) {
		return m.blockKids( x ).flatMap( ( k ) => [ k, ...walk( k ) ] );
	}( e ) ) ].some( ( x ) => [ 'a', 'button' ].includes( x.tag ) );
	return across && bottom && acts ? { rule: 'persistentBar', line: `persistent bottom bar "${ String( text ).slice( 0, 60 ) }"`, why: P.why } : null;
}

// The missing-features entry for a popup surface that opens on a timer or on exit intent (rules.timedPopup), from the way
// the surface record says it opens, or null.
export function timedPopupMissing( { openedBy, R } ) {
	return R.timedPopup && openedBy && specHit( R.timedPopup, openedBy ) ? { line: `timed popup: ${ String( openedBy ).slice( 0, 80 ) }`, why: R.timedPopup.why } : null;
}
