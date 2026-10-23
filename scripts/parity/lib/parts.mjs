// Inner interactive parts and effect layers (GAP-CHECKLIST.md section 29). The hover pass reads each pair's own element;
// the links, buttons and toggles inside a pair (a nav bar's items, a burger, an icon list's links) and what they paint on
// hover (a colour, an underline drawn by a ::before/::after or an empty positioned child) were never read, and neither
// were the effect layers a draft adds under the pointer (a sheen band appended on pointer enter, a ripple circle on
// press). partsPass reads, within each pair, every interactive part no other pair measures: at rest and at its hover end
// state under a real pointer, plus the layers that appear or animate while it is hovered and while it is pressed. Parts
// pair across the two sides by name, else by destination, else by kind, place and size (pairParts). Read on a desktop
// width of a ref-traced walk.
import { HOVER_PROPS, hoverPointOf, hoverStyles } from './collect.mjs';
import { PAINT_SRC } from './paint.mjs';
import { sameValue } from './compare.mjs';
import { TRANSFORM_PARTS, sameTransform, effectiveText } from './transform.mjs';

// A part's destination as both sides can name it alike: tel: digits, a mailto: address, or another site's host, path and
// query, lower-case, without www. or a trailing slash. null for '#', javascript: and the page's own site (a draft's own
// files and a live site's slugs never name each other). Self-contained: listParts runs it in the page. in: the href
// attribute, the resolved address and the page's origin.
export function hrefKey( raw, url, origin ) {
	const v = String( raw || '' ).trim();
	if ( /^tel:/i.test( v ) ) {
		return 'tel:' + v.replace( /[^\d+]/g, '' );
	}
	if ( /^mailto:/i.test( v ) ) {
		return v.toLowerCase();
	}
	try {
		const u = new URL( url || v );
		return /^https?:$/.test( u.protocol ) && u.origin !== origin ? ( u.host.replace( /^www\./, '' ) + u.pathname.replace( /\/$/, '' ) + u.search ).toLowerCase() : null;
	} catch {
		return null;
	}
}

// The interactive parts of a pair element: itself when interactive, and every shown interactive descendant that is not
// inside an element another pair measures (`others`, that pair reads it). Stored on window.__crParts for the reads that
// follow. Named by their words, else aria-label or title, lower-case (`worded` when the name is painted words); `dup` is a
// repeated name's copy index (0 for the first, 1, 2 for the next), kept apart from the name so a real "#1" in a name stays
// part of it. Each carries `pos`, its centre as fractions of the pair element's box, `box`, its size, `kind` (`link` for
// a[href], else `button`), `href`, its destination as hrefKey names it, and `site`, a same-site link's path and query
// (lower-case, no trailing slash; never a bare `#` or a fragment of the page itself). in: [ finder, resolveSrc, others, hrefKeySrc ].
export function listParts( [ finder, resolveSrc, others, hrefKeySrc ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	// eslint-disable-next-line no-new-func
	const keyOf = new Function( `return (${ hrefKeySrc });` )();
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
	const root = el.getBoundingClientRect();
	return parts.map( ( p, i ) => {
		const r = p.getBoundingClientRect();
		const pos = { x: root.width ? ( r.left + r.width / 2 - root.left ) / root.width : 0.5, y: root.height ? ( r.top + r.height / 2 - root.top ) / root.height : 0.5 };
		const words = ( p.innerText || '' ).replace( /\s+/g, ' ' ).trim().toLowerCase();
		const base = words || ( p.getAttribute( 'aria-label' ) || p.getAttribute( 'title' ) || '' ).replace( /\s+/g, ' ' ).trim().toLowerCase() || `(unnamed ${ p.tagName.toLowerCase() })`;
		const k = seen.get( base ) || 0;
		seen.set( base, k + 1 );
		const link = p.matches( 'a[href]' );
		const raw = link ? ( p.getAttribute( 'href' ) || '' ).trim() : '';
		let site = null;
		if ( link && raw && ! raw.startsWith( '#' ) && ! /^(javascript|tel|mailto):/i.test( raw ) ) {
			try {
				const u = new URL( p.href );
				site = u.origin === location.origin ? ( u.pathname.replace( /\/$/, '' ) + u.search ).toLowerCase() || '/' : null;
			} catch {
				site = null;
			}
		}
		return { i, name: base, dup: k, worded: !! words, root: p === el, kind: link ? 'link' : 'button', href: link ? keyOf( raw, p.href, location.origin ) : null, site, pos, box: { w: Math.round( r.width ), h: Math.round( r.height ) } };
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

// The hover properties and the point a part's pose turns about.
const PART_PROPS = [ ...HOVER_PROPS, 'transform-origin' ];

// One pair's parts on one side: [{ name, root, pos, box, rest, hover, layers: { rest, hover }, effects: { hover, press } }]. Each part
// is hovered with a real pointer (collect.mjs::hoverPointOf), held `wait` ms, read, then pressed (mouse down, read, the
// pointer moved off before release so nothing is clicked).
export async function readParts( page, finder, others, RESOLVE, wait = 800 ) {
	await page.evaluate( partsSave, [ finder, RESOLVE ] ).catch( () => 0 );
	const list = await page.evaluate( listParts, [ finder, RESOLVE, others, hrefKey.toString() ] ).catch( () => [] );
	const out = [];
	for ( const part of list ) {
		const pf = { js: `() => window.__crParts[${ part.i }]` };
		const styles = () => page.evaluate( hoverStyles, [ pf, PART_PROPS, RESOLVE, PAINT_SRC, { paintPart: true } ] ).catch( () => null );
		const at = await page.evaluate( hoverPointOf, [ pf, RESOLVE ] ).catch( () => null );
		if ( ! at || at.unreached ) {
			continue;
		}
		const rec = { name: part.name, dup: part.dup, worded: part.worded, root: part.root, kind: part.kind, href: part.href, site: part.site, pos: part.pos, box: part.box, rest: await styles(), layers: { rest: await page.evaluate( partLayers, [ part.i ] ) }, effects: {} };
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

// A part paired by place sits within this share of the pair's box of the other's centre, and each side's width and height
// is at least SIZE of the other's.
const PLACE = 0.15;
const SIZE = 0.75;
// A part's label on rows and in effects: its name, with `#<dup>` for a repeated name's later copies.
export const partLabel = ( x ) => ( x.dup ? `${ x.name }#${ x.dup }` : x.name );
// A part's destination: another site's address, tel: or mailto: (hrefKey), else a same-site path (`site`), else null.
const destOf = ( x ) => x.href || ( x.site ? `site:${ x.site }` : null );
// Two parts whose destinations are both known and differ are never each other, whatever their names or places.
const differ = ( a, b ) => !! ( destOf( a ) && destOf( b ) && destOf( a ) !== destOf( b ) );
// A part with no painted words (an icon link): named by its aria-label or title, or `(unnamed <tag>)`.
const wordless = ( x ) => false === x.worded || /^\(unnamed /.test( x.name );

// The parts of the two sides paired, in rounds, each over the parts the rounds before left: unnamed parts by destination
// (an icon link's only identity); then by name (`dup` aside); then by destination; then by kind, place and size (within
// PLACE and SIZE). No round pairs two parts whose destinations are both known and differ (`differ`). Within a round the
// nearest pair (`pos`; within one name, list order where either lacks it) is taken first. Returns { pairs: [[d, l]] in
// draft order, draftOnly, liveOnly }.
export function pairParts( d, l ) {
	const base = ( x ) => x.name;
	const rank = ( list, x ) => list.filter( ( y ) => base( y ) === base( x ) ).indexOf( x );
	const dist = ( a, b ) => ( a.pos && b.pos ? Math.hypot( a.pos.x - b.pos.x, a.pos.y - b.pos.y ) : Math.abs( rank( d, a ) - rank( l, b ) ) );
	const mate = new Map();
	const taken = new Set();
	const round = ( fits ) => {
		const cand = d.flatMap( ( a, i ) => l.flatMap( ( b, j ) => ( ! differ( a, b ) && fits( a, b ) ? [ [ dist( a, b ), i, j ] ] : [] ) ) );
		cand.sort( ( x, y ) => x[ 0 ] - y[ 0 ] || x[ 1 ] - y[ 1 ] || x[ 2 ] - y[ 2 ] );
		for ( const [ , i, j ] of cand ) {
			if ( ! mate.has( i ) && ! taken.has( j ) ) {
				mate.set( i, j );
				taken.add( j );
			}
		}
	};
	const sameKind = ( a, b ) => a.kind === b.kind;
	const near = ( x, y ) => Math.min( x, y ) >= SIZE * Math.max( x, y );
	const placed = ( a, b ) => !! ( a.pos && b.pos && a.box && b.box ) && Math.hypot( a.pos.x - b.pos.x, a.pos.y - b.pos.y ) <= PLACE && near( a.box.w, b.box.w ) && near( a.box.h, b.box.h );
	const unnamed = ( x ) => /^\(unnamed /.test( x.name );
	round( ( a, b ) => unnamed( a ) && unnamed( b ) && !! destOf( a ) && destOf( a ) === destOf( b ) );
	round( ( a, b ) => base( a ) === base( b ) );
	round( ( a, b ) => !! destOf( a ) && destOf( a ) === destOf( b ) );
	round( ( a, b ) => sameKind( a, b ) && placed( a, b ) );
	return {
		pairs: d.map( ( a, i ) => ( mate.has( i ) ? [ a, l[ mate.get( i ) ] ] : null ) ).filter( Boolean ),
		draftOnly: d.filter( ( a, i ) => ! mate.has( i ) ),
		liveOnly: l.filter( ( b, j ) => ! taken.has( j ) ),
	};
}

// Each part's effect layers on one side, matched or not: { '<part name>': { hover: [...], press: [...] } } for every part
// that showed a layer in either state (effectRead's `added <shape>` / `animated <shape>`), or null with no parts read.
export function partEffects( parts ) {
	if ( ! parts ) {
		return null;
	}
	return Object.fromEntries( parts.filter( ( x ) => x.effects?.hover?.length || x.effects?.press?.length ).map( ( x ) => [ partLabel( x ), { hover: x.effects.hover || [], press: x.effects.press || [] } ] ) );
}

const POSE_KEYS = [ ...TRANSFORM_PARTS, 'transform-origin' ];

// Rows for the parts paired across the two sides (pairParts). `part` rows: `<name> presence` for a part on one side only,
// `<name> label` for a pair named differently on the two sides (its draft and live names),
// `<name> rest:<prop>` where the resting looks differ, `<name> hover:<prop>` where hovering moves the property on either
// side and the end states differ (the part's own element; the pair's root is the hover pass's, so its looks are not
// compared here), `<name> rest:transform` / `<name> hover:transform` for the composed pose (lib/transform.mjs, about each
// part's transform-origin), `<name> rest:layers` where the painted layers differ at rest, `<name> hover:layers` where
// hovering changes them on either side and they differ. `effect` rows: `<name> hover` / `<name> press` where one side
// shows an effect layer and the other none (partEffects puts every layer seen on the report).
export function compareParts( d, l, tol ) {
	const rows = [];
	if ( ! d || ! l ) {
		return rows;
	}
	const { pairs, draftOnly, liveOnly } = pairParts( d, l );
	for ( const [ pa, b ] of pairs ) {
		const a = { ...pa, name: partLabel( pa ) };
		if ( ! a.root && a.rest && a.hover && b.rest && b.hover ) {
			const side = ( x ) => ( { box: x.box, origin: x.rest[ 'transform-origin' ] } );
			const opts = { sides: [ side( a ), side( b ) ], boxTol: tol.box };
			const own = ( x ) => ( { sides: [ side( x ), side( x ) ], boxTol: tol.box } );
			// A border colour is compared only where the draft part draws that edge in that state (a width above 0 and a
			// style not none or hidden), a border style where either side has a width (compare.mjs::borderColourIrrelevant);
			// a property not read counts as drawing.
			const wide = ( x, st ) => undefined === x[ st ][ 'border-top-width' ] || parseFloat( x[ st ][ 'border-top-width' ] ) > 0;
			const draws = ( x, st ) => wide( x, st ) && ! /^(none|hidden)$/.test( x[ st ][ 'border-top-style' ] ?? '' );
			const unbordered = ( p, st ) => ( 'border-top-color' === p && ! draws( a, st ) ) || ( 'border-top-style' === p && ! [ a, b ].some( ( x ) => wide( x, st ) ) );
			for ( const p of Object.keys( a.rest ).filter( ( k ) => ! POSE_KEYS.includes( k ) ) ) {
				if ( ! unbordered( p, 'rest' ) && ! sameValue( p, a.rest[ p ], b.rest[ p ], tol.px ) ) {
					rows.push( { kind: 'part', key: `${ a.name } rest:${ p }`, part: a.name, draft: a.rest[ p ], live: b.rest[ p ] } );
				}
			}
			if ( ! sameTransform( a.rest, b.rest, tol.px, opts ) ) {
				rows.push( { kind: 'part', key: `${ a.name } rest:transform`, part: a.name, draft: effectiveText( a.rest, side( a ) ), live: effectiveText( b.rest, side( b ) ) } );
			}
			for ( const p of Object.keys( a.hover ).filter( ( k ) => ! POSE_KEYS.includes( k ) ) ) {
				const moves = ( x ) => ! sameValue( p, x.rest[ p ], x.hover[ p ], tol.px );
				if ( ! unbordered( p, 'hover' ) && ( moves( a ) || moves( b ) ) && ! sameValue( p, a.hover[ p ], b.hover[ p ], tol.px ) ) {
					rows.push( { kind: 'part', key: `${ a.name } hover:${ p }`, part: a.name, draft: a.hover[ p ], live: b.hover[ p ] } );
				}
			}
			const posed = ( x ) => ! sameTransform( x.rest, x.hover, tol.px, own( x ) );
			if ( ( posed( a ) || posed( b ) ) && ! sameTransform( a.hover, b.hover, tol.px, opts ) ) {
				rows.push( { kind: 'part', key: `${ a.name } hover:transform`, part: a.name, draft: effectiveText( a.hover, side( a ) ), live: effectiveText( b.hover, side( b ) ) } );
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
		if ( pa.name !== b.name ) {
			rows.push( { kind: 'part', key: `${ a.name } label`, part: a.name, draft: pa.name, live: b.name } );
		}
	}
	// Wordless parts (icon links) paired across the sides keep their reading order: one at another place in the order than
	// its mate (two social icons swapped) is an `order` row, its place among the paired wordless parts on each side.
	const icons = pairs.filter( ( [ a, b ] ) => wordless( a ) && wordless( b ) && a.pos && b.pos );
	const before = ( p, q ) => ( Math.abs( p.y - q.y ) > 0.25 ? p.y - q.y : p.x - q.x );
	const draftOrder = icons.map( ( [ a ] ) => a ).sort( ( p, q ) => before( p.pos, q.pos ) );
	const liveOrder = icons.map( ( [ , b ] ) => b ).sort( ( p, q ) => before( p.pos, q.pos ) );
	for ( const [ a, b ] of icons ) {
		const [ i, j ] = [ draftOrder.indexOf( a ), liveOrder.indexOf( b ) ];
		if ( i !== j ) {
			rows.push( { kind: 'part', key: `${ partLabel( a ) } order`, part: partLabel( a ), draft: `${ i + 1 } of ${ icons.length }`, live: `${ j + 1 } of ${ icons.length }` } );
		}
	}
	rows.push( ...draftOnly.map( ( a ) => ( { kind: 'part', key: `${ partLabel( a ) } presence`, part: partLabel( a ), draft: 'present', live: 'missing' } ) ) );
	rows.push( ...liveOnly.map( ( b ) => ( { kind: 'part', key: `${ partLabel( b ) } presence`, part: partLabel( b ), draft: 'missing', live: 'present' } ) ) );
	return rows;
}
