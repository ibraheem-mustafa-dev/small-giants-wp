// Reading the draft for Fill (FR-47-4 step 1): the draft rendered in a real browser, every target's computed styles
// read through the walker's own collectors (scripts/parity/lib/collect.mjs::collectPair, ::resolveFinder), so Fill sees
// exactly what a later walk of the built page will compare against.
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { DEFAULT_PROPS, PSEUDO_PROPS, resolveFinder, collectPair } from '../../parity/lib/collect.mjs';
import { REF_PROPS } from '../../parity/lib/ref-trace.mjs';
import { PAINT_SRC } from '../../parity/lib/paint.mjs';
import { openDevtools, settleAnimations, declaredValues } from '../../parity/lib/devtools.mjs';
import { makeHelpers } from '../../parity/lib/helpers.mjs';
import { SCOPE_ATTR, scopeFinder, scopeSelector } from './fill-skeleton.mjs';
import { contentType } from './draft.mjs';
import { FLUID_WIDTHS, SWEEP_WIDTHS, LENGTH_PROPS } from './fill-values.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const RESOLVE = resolveFinder.toString();
const COLLECT = collectPair.toString();

// The widths every property is read at, and the widths only lengths are (the fluid samples).
export const READ_WIDTHS = [ 375, 768, 1440 ];
// The properties whose computed value is a used size: the width, and the side margins that `auto` resolves to px.
export const DECLARED = [ 'width', 'margin-left', 'margin-right' ];
// The sweep series that records whether the element rendered at all at each width.
export const PRESENT = '(rendered)';
// The properties Fill resolves. Motion timings of an entrance are Fill's entrance step; icon sizes belong to a slot
// naming the svg; the `gap` shorthand is the row-gap and column-gap reads.
// The walker's list reads only the top border's style; a border on any other side needs its own, or a width written
// without a style would paint nothing.
const SIDE_STYLES = [ 'border-right-style', 'border-bottom-style', 'border-left-style' ];
export const PROPS = [ ...new Set( [ ...DEFAULT_PROPS, ...REF_PROPS, ...SIDE_STYLES ] ) ].filter( ( p ) => ! /^(animation-|icon-)/.test( p ) && 'gap' !== p );

// Playwright, loaded the way the route's other browser code loads it: by path, so a worktree and the main checkout
// behave the same (plugins/sgs-blocks/node_modules is the one installation).
export async function loadChromium() {
	const f = path.resolve( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' );
	if ( ! fs.existsSync( f ) ) {
		throw new Error( `playwright is not installed at ${ f } (run npm install in plugins/sgs-blocks, or link its node_modules into this worktree)` );
	}
	return import( pathToFileURL( f ).href );
}

// Whether the draft page may load a URL: its own origin, inline data, or anything when `external` is set. Blocking the rest
// keeps a read the same offline and keeps a local draft on this machine (its web fonts fall back to system fonts).
export const requestAllowed = ( url, origin, external ) => external || url.startsWith( `${ origin }/` ) || url === origin || /^(data|blob):/.test( url );

// Routes a browser context's requests for a draft read: a URL in `mirror` ({ url: local file }) is answered from that file
// (a draft's CDN script served from a local copy, so the draft renders without leaving the machine), a URL
// requestAllowed accepts goes through, everything else is aborted.
export async function routeDraft( ctx, { origin, external = false, mirror = {} } ) {
	await ctx.route( '**/*', ( route ) => {
		const u = route.request().url();
		const file = mirror[ u ] || mirror[ u.split( '#' )[ 0 ] ];
		if ( file ) {
			return route.fulfill( { status: 200, body: fs.readFileSync( file ), contentType: contentType( file ) } );
		}
		return requestAllowed( u, origin, external ) ? route.continue() : route.abort();
	} );
}

// In-page. Collects every job's pair snapshot with the walker's collectPair, plus what Fill adds: the exact border box,
// whether it takes part in flow, the element's own words and link, and (a block holding other blocks) its own text
// styles. jobs: [{ id, finder, mark (a number: stamp the element so slot finders scope to it), own }].
function collectMany( [ jobs, collectSrc, resolveSrc, paintSrc, props, pseudoProps, scopeAttr ] ) {
	// eslint-disable-next-line no-new-func
	const collect = new Function( `return (${ collectSrc });` )();
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const ctx = document.createElement( 'canvas' ).getContext( '2d' );
	const srgb = ( v ) => {
		if ( ! /^(oklab|oklch|lab|lch|color)\(/.test( v ) ) {
			return v;
		}
		ctx.fillStyle = '#000';
		ctx.fillStyle = v;
		const f = ctx.fillStyle;
		if ( ! f.startsWith( '#' ) ) {
			return f;
		}
		const n = parseInt( f.slice( 1 ), 16 );
		return `rgb(${ ( n >> 16 ) & 255 }, ${ ( n >> 8 ) & 255 }, ${ n & 255 })`;
	};
	const out = {};
	for ( const j of jobs ) {
		const el = resolve( j.finder );
		if ( el && null !== j.mark ) {
			el.setAttribute( scopeAttr, String( j.mark ) );
		}
		const snap = collect( [ j.finder, props, resolveSrc, null, null, null, paintSrc, pseudoProps ] );
		if ( ! el || snap.missing ) {
			out[ j.id ] = { missing: true };
			continue;
		}
		const r = el.getBoundingClientRect();
		snap.rect = { x: Math.round( r.x * 1000 ) / 1000, y: Math.round( ( r.y + window.scrollY ) * 1000 ) / 1000, w: Math.round( r.width * 1000 ) / 1000, h: Math.round( r.height * 1000 ) / 1000 };
		snap.inFlow = ! [ 'absolute', 'fixed' ].includes( getComputedStyle( el ).position );
		snap.words = ( el.textContent || '' ).replace( /\s+/g, ' ' ).trim();
		const anchors = el.matches( 'a[href]' ) ? [ el ] : [ ...el.querySelectorAll( 'a[href]' ) ];
		const sole = 1 === anchors.length && ( el === anchors[ 0 ] || anchors[ 0 ].textContent.replace( /\s+/g, ' ' ).trim() === snap.words );
		snap.href = sole ? anchors[ 0 ].getAttribute( 'href' ) : null;
		if ( j.own ) {
			const cs = getComputedStyle( el );
			for ( const p of props.filter( ( x ) => [ 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'color', 'text-shadow' ].includes( x ) ) ) {
				const v = cs.getPropertyValue( p ).trim();
				snap.styles[ p ] = /color$/.test( p ) ? srgb( v ) : v;
			}
		}
		out[ j.id ] = snap;
	}
	return out;
}

// Node side: the jobs for one read of every target: roots first so their slots can scope to them.
export function jobsFor( nodes ) {
	return nodes.flatMap( ( n ) => n.targets.map( ( t ) => ( {
		id: t.id,
		finder: t.scoped ? scopeFinder( t.finder, scopeSelector( n.index ) ) : t.finder,
		mark: t.scoped ? null : n.index,
		own: ! t.scoped && n.children.length > 0,
	} ) ) );
}

// Opens one page on the draft at a width (a phone at 375, as the walker reads it), runs the draft's open step (a click
// on the text of a navigation link in a single-page draft) and waits for its animations to finish.
async function openPage( browser, devices, { url, open, width, origin, external, mirror } ) {
	const phone = width < 500 ? devices[ 'iPhone 13' ] : {};
	const ctx = await browser.newContext( { ...phone, viewport: { width, height: width < 500 ? 812 : 900 } } );
	await routeDraft( ctx, { origin, external, mirror } );
	const page = await ctx.newPage();
	const h = makeHelpers( page, 'draft', { cb: ( u ) => u, RESOLVE, onAction: null } );
	await h.goto( url );
	if ( open ) {
		await h.clickText( open, { wait: 900 } );
	}
	await settleAnimations( page, { floor: 900 } );
	return { ctx, page, h };
}

// What every read of the draft returns:
//   widths[w][targetId]   the collectPair snapshot (plus rect, inFlow, words, href); { missing: true } when the finder
//                         found nothing visible. READ_WIDTHS carry every property, the other fluid widths only lengths.
//   declared[w][targetId] the values the draft's matched rules declare for DECLARED (the used-size rule), at READ_WIDTHS.
//   sweep[targetId][prop] [{ width, value }] every 16px from 320 to 1920 (lengths and keywords as read).
// nodes: lib/fill-skeleton.mjs::skeletonNodes. open: the regex source of the text to click first. external: allow the
// draft to load anything beyond its own origin (off by default, so a read is the same offline).
export async function readDraft( { url, nodes, open = null, headless = true, sweep = true, external = false, mirror = {}, log = () => {} } ) {
	const { chromium, devices } = await loadChromium();
	const origin = new URL( url ).origin;
	const jobs = jobsFor( nodes );
	const browser = await chromium.launch( { headless, args: [ '--hide-scrollbars' ] } );
	const result = { origin, widths: {}, declared: {}, sweep: {} };
	try {
		for ( const width of [ ...new Set( [ ...READ_WIDTHS, ...FLUID_WIDTHS ] ) ] ) {
			const { ctx, page } = await openPage( browser, devices, { url, open, width, origin, external, mirror } );
			const full = READ_WIDTHS.includes( width );
			result.widths[ width ] = await page.evaluate( collectMany, [ jobs, COLLECT, RESOLVE, PAINT_SRC, full ? PROPS : LENGTH_PROPS, full ? PSEUDO_PROPS : null, SCOPE_ATTR ] );
			if ( full ) {
				const cdp = await openDevtools( page );
				result.declared[ width ] = {};
				for ( const j of jobs.filter( ( x ) => ! result.widths[ width ][ x.id ]?.missing ) ) {
					result.declared[ width ][ j.id ] = await declaredValues( cdp, j.finder, RESOLVE, DECLARED ).catch( () => null );
				}
			}
			log( `read ${ width }px: ${ Object.values( result.widths[ width ] ).filter( ( s ) => ! s.missing ).length } of ${ jobs.length } targets` );
			await ctx.close();
		}
		if ( sweep ) {
			const { ctx, page } = await openPage( browser, devices, { url, open, width: 1440, origin, external, mirror } );
			for ( const width of SWEEP_WIDTHS ) {
				await page.setViewportSize( { width, height: 900 } );
				await page.waitForTimeout( 80 );
				const snaps = await page.evaluate( collectMany, [ jobs, COLLECT, RESOLVE, PAINT_SRC, PROPS, null, SCOPE_ATTR ] );
				for ( const [ id, s ] of Object.entries( snaps ) ) {
					const series = ( result.sweep[ id ] ??= {} );
					( series[ PRESENT ] ??= [] ).push( { width, value: s.missing ? 'absent' : 'present' } );
					for ( const prop of PROPS ) {
						( series[ prop ] ??= [] ).push( { width, value: s.styles?.[ prop ] } );
					}
				}
			}
			log( `swept ${ SWEEP_WIDTHS.length } widths` );
			await ctx.close();
		}
	} finally {
		await browser.close();
	}
	return result;
}
