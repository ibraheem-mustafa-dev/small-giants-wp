// Inner interactive parts and effect layers (GAP-CHECKLIST.md section 29). The hover pass reads each pair's own element;
// the links, buttons and toggles inside a pair (a nav bar's items, a burger, an icon list's links) and what they paint on
// hover (a colour, an underline drawn by a ::before/::after or an empty positioned child) were never read, and neither
// were the effect layers a draft adds under the pointer (a sheen band appended on pointer enter, a ripple circle on
// press). partsPass reads, within each pair, every interactive part no other pair measures: at rest and at its hover end
// state under a real pointer, plus the layers that appear or animate while it is hovered and while it is pressed. Parts
// pair across the two sides by their accessible name (compareParts). Read on a desktop width of a ref-traced walk.
import { HOVER_PROPS, hoverPointOf, hoverStyles } from './collect.mjs';
import { PAINT_SRC } from './paint.mjs';
import { sameValue } from './compare.mjs';

// The interactive parts of a pair element: itself when interactive, and every shown interactive descendant that is not
// inside an element another pair measures (`others`, that pair reads it). Stored on window.__crParts for the reads that
// follow. Named by their words, else aria-label or title, lower-case; a repeated name gets #1, #2. in: [ finder,
// resolveSrc, others ].
export function listParts( [ finder, resolveSrc, others ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const el = resolve( finder );
	window.__crParts = [];
	if ( ! el ) {
		return [];
	}
	const owned = ( others || [] ).map( ( f ) => resolve( f ) || ( 'string' === typeof f ? document.querySelector( f ) : null ) ).filter( ( o ) => o && o !== el && el.contains( o ) );
	const SEL = 'a[href], button, [role="button"], summary, input[type="button"], input[type="submit"]';
	const shown = ( e ) => {
		const r = e.getBoundingClientRect();
		const cs = getComputedStyle( e );
		return r.width > 2 && r.height > 2 && 'hidden' !== cs.visibility && 'none' !== cs.display && parseFloat( cs.opacity ) > 0.05;
	};
	const parts = [ ...( el.matches( SEL ) ? [ el ] : [] ), ...el.querySelectorAll( SEL ) ].filter( ( p ) => shown( p ) && ! owned.some( ( o ) => o.contains( p ) ) );
	window.__crParts = parts;
	// The elements present now: one a script adds later is an effect layer (effectArm), never a painted layer.
	window.__crKnown = new WeakSet( parts.flatMap( ( p ) => [ ...p.querySelectorAll( '*' ) ] ) );
	const seen = new Map();
	return parts.map( ( p, i ) => {
		const words = ( p.innerText || '' ).replace( /\s+/g, ' ' ).trim().toLowerCase();
		const base = words || ( p.getAttribute( 'aria-label' ) || p.getAttribute( 'title' ) || '' ).replace( /\s+/g, ' ' ).trim().toLowerCase() || `(unnamed ${ p.tagName.toLowerCase() })`;
		const k = seen.get( base ) || 0;
		seen.set( base, k + 1 );
		return { i, name: k ? `${ base }#${ k }` : base, root: p === el };
	} );
}

// The layers a part paints besides its box: its painting ::before and ::after, and each empty absolutely positioned
// descendant present when the parts were listed that paints (a draft's underline span). Each is `<w>x<h>@<dx>,<dy> <colour or gradient>`, measured against
// the part's box, sorted. in: [ i ].
export function partLayers( [ i ] ) {
	const el = window.__crParts?.[ i ];
	if ( ! el ) {
		return null;
	}
	const r = el.getBoundingClientRect();
	const clear = ( c ) => ! c || 'transparent' === c || /rgba\([^)]*,\s*0\)$/.test( c );
	const paintOf = ( s ) => ( 'none' !== s.backgroundImage ? s.backgroundImage.slice( 0, 60 ) : ( clear( s.backgroundColor ) ? null : s.backgroundColor ) );
	const out = [];
	for ( const ps of [ '::before', '::after' ] ) {
		const s = getComputedStyle( el, ps );
		const w = parseFloat( s.width );
		const h = parseFloat( s.height );
		if ( [ 'none', 'normal' ].includes( s.content ) || 'none' === s.display || ! ( w > 0 && h > 0 ) || parseFloat( s.opacity ) <= 0.05 || ! paintOf( s ) ) {
			continue;
		}
		// A positioned layer sits by its offsets; the left and bottom ones place an underline.
		out.push( `${ Math.round( w ) }x${ Math.round( h ) }@${ Math.round( parseFloat( s.left ) || 0 ) },${ Math.round( parseFloat( s.bottom ) || 0 ) } ${ paintOf( s ) }` );
	}
	for ( const k of el.querySelectorAll( '*' ) ) {
		if ( ! window.__crKnown?.has( k ) ) {
			continue;
		}
		const s = getComputedStyle( k );
		const b = k.getBoundingClientRect();
		if ( ! /absolute|fixed/.test( s.position ) || ( k.textContent || '' ).trim() || k.closest( 'svg' ) || ! ( b.width > 0 && b.height > 0 ) || parseFloat( s.opacity ) <= 0.05 || 'hidden' === s.visibility || ! paintOf( s ) ) {
			continue;
		}
		out.push( `${ Math.round( b.width ) }x${ Math.round( b.height ) }@${ Math.round( b.left - r.left ) },${ Math.round( r.bottom - b.bottom ) } ${ paintOf( s ) }` );
	}
	return out.sort();
}

// Starts recording the effect layers of part i: every element added inside it, and every animation running on a layer
// inside it (a ::before or ::after of the part or of a descendant, or an empty positioned descendant), sampled every
// 40ms until effectRead. Only animations that start after arming count (a hover's sweep still running when the press
// starts is the hover's). Animations of the part's own properties and of words inside it are its hover look, not a layer;
// endless loops are no effect. in: [ i ].
export function effectArm( [ i ] ) {
	const el = window.__crParts?.[ i ];
	if ( ! el ) {
		return false;
	}
	const shapeOf = ( s, w ) => ( /50%|9999|999px/.test( s.borderRadius ) ? 'circle' : ( parseFloat( s.width ) < 0.8 * w ? 'band' : 'cover' ) );
	const r = el.getBoundingClientRect();
	const seen = new Set();
	const rec = { layers: [] };
	const add = ( key, label ) => {
		if ( ! seen.has( key ) ) {
			seen.add( key );
			rec.layers.push( label );
		}
	};
	rec.mo = new MutationObserver( ( ms ) => ms.forEach( ( m ) => m.addedNodes.forEach( ( n ) => {
		if ( 1 === n.nodeType && ! ( n.textContent || '' ).trim() ) {
			add( n, `added ${ shapeOf( getComputedStyle( n ), r.width ) }` );
		}
	} ) ) );
	rec.mo.observe( el, { childList: true, subtree: true } );
	const before = new Set( el.getAnimations( { subtree: true } ) );
	const sample = () => {
		for ( const a of el.getAnimations( { subtree: true } ) ) {
			if ( before.has( a ) ) {
				continue;
			}
			const t = a.effect?.target;
			const ps = a.effect?.pseudoElement || null;
			if ( ! t || Infinity === a.effect.getTiming?.().iterations || ( t === el && ! ps ) ) {
				continue;
			}
			const s = getComputedStyle( t, ps );
			if ( ! ps && ( ! /absolute|fixed/.test( s.position ) || ( t.textContent || '' ).trim() ) ) {
				continue;
			}
			add( `${ a.id || '' }|${ ps }|${ [ ...el.querySelectorAll( '*' ) ].indexOf( t ) }`, `animated ${ shapeOf( s, r.width ) }` );
		}
	};
	sample();
	rec.timer = setInterval( sample, 40 );
	window.__crEffect = rec;
	return true;
}

// Stops recording and returns the layers seen, as `added <shape>` / `animated <shape>` (circle, band, cover), sorted.
export function effectRead() {
	const rec = window.__crEffect;
	if ( ! rec ) {
		return [];
	}
	clearInterval( rec.timer );
	rec.mo.disconnect();
	window.__crEffect = null;
	return [ ...new Set( rec.layers ) ].sort();
}

// A draft's pointer scripts leave marks once the pointer has gone (a magnet's inline transform and transition, an appended
// sheen span), which the next state would read as the element's own. The pair's elements' style attributes and its element
// list are kept before its parts are read (partsSave) and put back after (partsRestore): attributes restored, added
// elements removed. in: [ finder, resolveSrc ].
export function partsSave( [ finder, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const root = new Function( `return (${ resolveSrc });` )()( finder );
	const els = root ? [ root, ...root.querySelectorAll( '*' ) ] : [];
	window.__crSaved = { root, styles: els.map( ( e ) => [ e, e.getAttribute( 'style' ) ] ), known: new Set( els ) };
	return els.length;
}

export function partsRestore() {
	const saved = window.__crSaved;
	if ( ! saved?.root ) {
		return 0;
	}
	saved.styles.forEach( ( [ e, st ] ) => ( null === st ? e.removeAttribute( 'style' ) : e.setAttribute( 'style', st ) ) );
	const added = [ ...saved.root.querySelectorAll( '*' ) ].filter( ( e ) => ! saved.known.has( e ) );
	added.forEach( ( e ) => e.remove() );
	window.__crSaved = null;
	return added.length;
}

const PART_PROPS = HOVER_PROPS.filter( ( p ) => ! [ 'filter' ].includes( p ) );

// One pair's parts on one side: [{ name, root, rest, hover, layers: { rest, hover }, effects: { hover, press } }]. Each part
// is hovered with a real pointer (collect.mjs::hoverPointOf), held `wait` ms, read, then pressed (mouse down, read, the
// pointer moved off before release so nothing is clicked).
export async function readParts( page, finder, others, RESOLVE, wait = 800 ) {
	await page.evaluate( partsSave, [ finder, RESOLVE ] ).catch( () => 0 );
	const list = await page.evaluate( listParts, [ finder, RESOLVE, others ] ).catch( () => [] );
	const out = [];
	for ( const part of list ) {
		const pf = { js: `() => window.__crParts[${ part.i }]` };
		const styles = () => page.evaluate( hoverStyles, [ pf, PART_PROPS, RESOLVE, PAINT_SRC, { paintPart: true } ] ).catch( () => null );
		const at = await page.evaluate( hoverPointOf, [ pf, RESOLVE ] ).catch( () => null );
		if ( ! at || at.unreached ) {
			continue;
		}
		const rec = { name: part.name, root: part.root, rest: await styles(), layers: { rest: await page.evaluate( partLayers, [ part.i ] ) }, effects: {} };
		await page.evaluate( effectArm, [ part.i ] );
		await page.mouse.move( at.x, at.y );
		await page.waitForTimeout( wait );
		rec.effects.hover = await page.evaluate( effectRead );
		rec.hover = await styles();
		rec.layers.hover = await page.evaluate( partLayers, [ part.i ] );
		await page.evaluate( effectArm, [ part.i ] );
		await page.mouse.down();
		await page.waitForTimeout( 400 );
		rec.effects.press = await page.evaluate( effectRead );
		await page.mouse.move( 1, 1 );
		await page.mouse.up();
		await page.waitForTimeout( 400 );
		out.push( rec );
	}
	await page.evaluate( partsRestore ).catch( () => 0 );
	if ( list.length ) {
		await page.waitForTimeout( 300 );
	}
	return out;
}

// Every pair's parts in a state, onto snap[name].parts. A phone has no pointer to hover with and is skipped.
export async function partsPass( page, pairs, side, snap, RESOLVE, phone ) {
	if ( phone ) {
		return;
	}
	for ( const p of pairs.filter( ( q ) => ! snap[ q.name ].missing && ! q[ side ]?.textRun && ! q[ side ]?.group ) ) {
		const others = pairs.filter( ( q ) => q !== p ).map( ( q ) => q[ side ] ).filter( Boolean );
		snap[ p.name ].parts = await readParts( page, p[ side ], others, RESOLVE );
	}
}

// Whether two layer lists paint the same: the same number, each the same size within `tol` px and the same paint.
const sameLayers = ( a = [], b = [], tol = 2 ) => a.length === b.length && a.every( ( x, i ) => {
	const pa = /^(\d+)x(\d+)@(-?\d+),(-?\d+) (.*)$/.exec( x );
	const pb = /^(\d+)x(\d+)@(-?\d+),(-?\d+) (.*)$/.exec( b[ i ] );
	return pa && pb && [ 1, 2, 3, 4 ].every( ( k ) => Math.abs( Number( pa[ k ] ) - Number( pb[ k ] ) ) <= tol ) && sameValue( 'background-color', pa[ 5 ], pb[ 5 ], 0 );
} );

// Rows for the parts both sides have by name. `part` rows: `<name> hover:<prop>` where hovering moves the property on either
// side and the end states differ (the part's own element; the pair's root is the hover pass's), `<name> rest:layers` where
// the painted layers differ at rest, `<name> hover:layers` where hovering changes them on either side and they differ.
// `effect` rows: `<name> hover` / `<name> press` where one side shows an effect layer and the other none. A part on one side
// only is no row here (the inventory and the links check report a missing control).
export function compareParts( d, l, tol ) {
	const rows = [];
	if ( ! d || ! l ) {
		return rows;
	}
	const byName = new Map( l.map( ( x ) => [ x.name, x ] ) );
	for ( const a of d ) {
		const b = byName.get( a.name );
		if ( ! b ) {
			continue;
		}
		if ( ! a.root && a.rest && a.hover && b.rest && b.hover ) {
			for ( const p of Object.keys( a.hover ) ) {
				const moves = ( x ) => ! sameValue( p, x.rest[ p ], x.hover[ p ], tol.px );
				// A border colour paints only where that state has a border.
				const unbordered = /^border-top-(color|style)$/.test( p ) && [ a, b ].every( ( x ) => 0 === parseFloat( x.hover[ 'border-top-width' ] ?? '0' ) );
				if ( ! unbordered && ( moves( a ) || moves( b ) ) && ! sameValue( p, a.hover[ p ], b.hover[ p ], tol.px ) ) {
					rows.push( { kind: 'part', key: `${ a.name } hover:${ p }`, part: a.name, draft: a.hover[ p ], live: b.hover[ p ] } );
				}
			}
		}
		if ( ! sameLayers( a.layers?.rest, b.layers?.rest, tol.box ) ) {
			rows.push( { kind: 'part', key: `${ a.name } rest:layers`, part: a.name, draft: ( a.layers?.rest || [] ).join( ' | ' ) || 'none', live: ( b.layers?.rest || [] ).join( ' | ' ) || 'none' } );
		}
		const changes = ( x ) => ! sameLayers( x.layers?.rest, x.layers?.hover, tol.box );
		if ( ( changes( a ) || changes( b ) ) && ! sameLayers( a.layers?.hover, b.layers?.hover, tol.box ) ) {
			rows.push( { kind: 'part', key: `${ a.name } hover:layers`, part: a.name, draft: ( a.layers?.hover || [] ).join( ' | ' ) || 'none', live: ( b.layers?.hover || [] ).join( ' | ' ) || 'none' } );
		}
		for ( const st of [ 'hover', 'press' ] ) {
			const da = a.effects?.[ st ] || [];
			const lb = b.effects?.[ st ] || [];
			if ( !! da.length !== !! lb.length ) {
				rows.push( { kind: 'effect', key: `${ a.name } ${ st }`, part: a.name, draft: da.join( ', ' ) || 'none', live: lb.join( ', ' ) || 'none' } );
			}
		}
	}
	return rows;
}
