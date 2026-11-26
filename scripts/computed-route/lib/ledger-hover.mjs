// The clone difference ledger's hover rows (tools/clone-ledger.mjs). The page at rest is read by lib/ledger-page.mjs; here
// each paired element a node's hover settings paint is hovered with the real mouse (as the calibration does,
// calibration's trigger read: scrolled into view, moved to the middle of the viewport when a fixed or sticky box
// covers it, then hovered) on both sides, and its hover look is compared.
//   - Which elements: a target whose block's slot map records a hover setting (`state: hover`) painting the target's own
//     part, or a ::before / ::after layer of it; the properties read are those settings' properties (longhands).
//   - Hovered only where either side has a :hover rule reaching the element (a rule whose selector, :hover removed, matches
//     it), so an element nothing changes on is not hovered.
//   - A row (`state: hover`) where the two hover looks differ and at least one side changes from its rest look (a difference
//     already there at rest is the rest row's).
// Page views only: the mouse moves, nothing is clicked, typed or written.
import { covered } from './ledger-paint.mjs';
import { paintedProps } from './css-families.mjs';

const PSEUDO = /(::(?:before|after))$/;

// Map target position n -> { props: [ property ], pseudo: { '::after': [ property ] } } for the targets a node's hover
// settings paint. targets: lib/ledger-pairs.mjs::ledgerTargets; slotMapOf: block -> its cache/<block>.json or null.
export function hoverPlan( targets, slotMapOf ) {
	const plan = new Map();
	targets.forEach( ( t, n ) => {
		if ( ! t.draftFinder ) {
			return;
		}
		const settings = slotMapOf( t.block )?.settings || {};
		const props = new Set();
		const pseudo = {};
		for ( const rec of Object.values( settings ) ) {
			if ( 'hover' !== rec?.state ) {
				continue;
			}
			const list = [ ...covered( paintedProps( rec ).join( ',' ) ) ];
			for ( const s of ( Array.isArray( rec.slots ) && rec.slots.length ? rec.slots : [ rec.slot ] ) ) {
				const m = String( s ).match( PSEUDO );
				const part = m ? String( s ).slice( 0, -m[ 1 ].length ) : String( s );
				if ( part !== ( t.slot || '' ) ) {
					continue;
				}
				for ( const p of longhandsOnly( list ) ) {
					if ( m ) {
						( pseudo[ m[ 1 ] ] ||= new Set() ).add( p );
					} else {
						props.add( p );
					}
				}
			}
		}
		if ( props.size || Object.keys( pseudo ).length ) {
			plan.set( n, { props: [ ...props ], pseudo: Object.fromEntries( Object.entries( pseudo ).map( ( [ k, v ] ) => [ k, [ ...v ] ] ) ) } );
		}
	} );
	return plan;
}

// A shorthand's longhands stand for it (a computed shorthand reads as one string that hides which part moved).
function longhandsOnly( list ) {
	const all = new Set( list );
	return list.filter( ( p ) => ! [ ...covered( p ) ].some( ( x ) => x !== p && all.has( x ) ) );
}

// In-page: for each item ({ n, props, pseudo }) on the element stamped data-ledger-n~=n, its look now and whether a :hover
// rule reaches it (the element or an ancestor matches a :hover selector with :hover removed). Returns { [n]: { found, look,
// ruled } }.
export function hoverLookInPage( [ items, withRules ] ) {
	const hoverSels = [];
	if ( withRules ) {
		const walk = ( rules ) => {
			for ( const r of rules ) {
				if ( r.cssRules && ! r.selectorText ) {
					try {
						walk( r.cssRules );
					} catch {}
				}
				if ( r.selectorText && r.selectorText.includes( ':hover' ) ) {
					r.selectorText.split( ',' ).filter( ( s ) => s.includes( ':hover' ) ).forEach( ( s ) => hoverSels.push( s.replace( /:hover/g, '' ).replace( /::?(before|after)\b/g, '' ).trim() || '*' ) );
				}
			}
		};
		for ( const sh of document.styleSheets ) {
			try {
				walk( sh.cssRules );
			} catch {}
		}
	}
	const out = {};
	for ( const it of items ) {
		const el = document.querySelector( `[data-ledger-n~="${ it.n }"]` );
		if ( ! el ) {
			out[ it.n ] = { found: false };
			continue;
		}
		const cs = getComputedStyle( el );
		const look = Object.fromEntries( it.props.map( ( p ) => [ p, cs.getPropertyValue( p ).trim() ] ) );
		for ( const [ ps, list ] of Object.entries( it.pseudo || {} ) ) {
			const pcs = getComputedStyle( el, ps );
			list.forEach( ( p ) => ( look[ `${ ps } ${ p }` ] = pcs.getPropertyValue( p ).trim() ) );
		}
		const ruled = withRules ? hoverSels.some( ( s ) => {
			try {
				return el.matches( s ) || !! el.closest( s );
			} catch {
				return false;
			}
		} ) : null;
		out[ it.n ] = { found: true, look, ruled };
	}
	return out;
}

// Reads each item at rest and under the mouse on an open page whose elements lib/ledger-page.mjs::readBatchInPage stamped.
// Returns { [n]: { rest, hover?, why? } } for every item found (`rest` and `hover` keyed by property, a pseudo layer's as
// '::after <property>'); `hover` only where a :hover rule reaches the element (else its hover look is its rest look), null
// when the hover failed.
// Transitions are switched off for the hover reads (after the rest look is read), so the look under the mouse is its end
// state at once.
export async function readHover( page, items ) {
	const rest = await page.evaluate( hoverLookInPage, [ items, true ] );
	await page.addStyleTag( { content: '*, *::before, *::after { transition: none !important; }' } );
	const out = {};
	for ( const it of items ) {
		const r = rest[ it.n ];
		if ( ! r?.found ) {
			continue;
		}
		if ( ! r.ruled ) {
			out[ it.n ] = { rest: r.look };
			continue;
		}
		const loc = page.locator( `[data-ledger-n~="${ it.n }"]` ).first();
		try {
			await loc.scrollIntoViewIfNeeded( { timeout: 3000 } );
			await loc.evaluate( ( el ) => {
				const b = el.getBoundingClientRect();
				const top = document.elementFromPoint( b.left + ( b.width / 2 ), b.top + ( b.height / 2 ) );
				if ( ! top || ! ( el === top || el.contains( top ) ) ) {
					el.scrollIntoView( { block: 'center', inline: 'center', behavior: 'instant' } );
				}
			} );
			const before = ( await page.evaluate( hoverLookInPage, [ [ it ], false ] ) )[ it.n ];
			await loc.hover( { force: true, timeout: 3000 } );
			await page.waitForTimeout( 40 );
			const under = ( await page.evaluate( hoverLookInPage, [ [ it ], false ] ) )[ it.n ];
			out[ it.n ] = { rest: before?.look || r.look, hover: under?.look || null };
		} catch ( e ) {
			out[ it.n ] = { rest: r.look, hover: null, why: String( e.message || e ).split( '\n' )[ 0 ].slice( 0, 160 ) };
		}
		await page.mouse.move( 0, 0 );
	}
	return out;
}

// Hover rows of one target at one width: [ { key, pseudo?, kind: 'style', state: 'hover', draft, live } ]. d, l: readHover
// records of the draft and live sides (no `hover` on a side no :hover rule reaches: its hover look is its rest look).
// same: (prop, a, b) => boolean (the walker's sameValue).
export function hoverDiffs( d, l, same ) {
	const rows = [];
	if ( ! d?.rest || ! l?.rest ) {
		return rows;
	}
	const under = ( x, k ) => ( undefined === x.hover ? x.rest[ k ] : ( x.hover?.[ k ] ?? null ) );
	for ( const k of Object.keys( d.rest ) ) {
		const [ ps, p ] = k.includes( ' ' ) ? k.split( ' ' ) : [ null, k ];
		const dR = d.rest[ k ];
		const lR = l.rest[ k ];
		const dH = under( d, k );
		const lH = under( l, k );
		if ( undefined === dR || undefined === lR || null === dH || null === lH ) {
			continue;
		}
		const moves = ! same( p, dR, dH ) || ! same( p, lR, lH );
		if ( moves && ! same( p, dH, lH ) ) {
			rows.push( { kind: 'style', key: p, ...( ps ? { pseudo: ps } : {} ), state: 'hover', draft: dH, live: lH } );
		}
	}
	return rows;
}
