// Names the CSS rule that wins for a row whose setting already holds the draft value (Hardcode rows the tree holds):
// the rule that paints the live value, and the rule that carries the draft's value but loses. Chrome DevTools'
// matched-rules read (the same one parity/lib/devtools.mjs::cascadeWinner uses), once per distinct element and width.
// Read-only: nothing on the page is changed. A row that cannot be read keeps its own reason and gains a `note`.
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDevtools } from '../../parity/lib/devtools.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const SIDES = { top: 'block-start', bottom: 'block-end', left: 'inline-start', right: 'inline-end' };

// Every property name that can set `prop`: itself, the logical longhand, and the shorthands covering it.
export function propertyFamily( prop ) {
	const m = /^(margin|padding)-(top|right|bottom|left)$/.exec( prop );
	if ( m ) {
		const [ , box, side ] = m;
		const logical = side in SIDES && ( 'top' === side || 'bottom' === side ) ? `${ box }-block` : `${ box }-inline`;
		return [ prop, `${ box }-${ SIDES[ side ] }`, logical, box ];
	}
	const b = /^border-(top|right|bottom|left)-(width|color|style)$/.exec( prop );
	if ( b ) {
		return [ prop, `border-${ b[ 1 ] }`, `border-${ b[ 2 ] }`, 'border' ];
	}
	if ( /^border-(width|color|style)$/.test( prop ) ) {
		return [ prop, 'border' ];
	}
	// A longhand set through its shorthand: the rule that wins may name only the shorthand.
	const shorthand = [ [ /^transition-/, 'transition' ], [ /^animation-/, 'animation' ], [ /^background-/, 'background' ], [ /^(font-(size|weight|family|style)|line-height)$/, 'font' ],
		[ /^(row|column)-gap$/, 'gap' ], [ /^text-decoration-/, 'text-decoration' ], [ /^flex-(grow|shrink|basis)$/, 'flex' ], [ /^overflow-(x|y)$/, 'overflow' ] ].find( ( [ re ] ) => re.test( prop ) );
	return shorthand ? [ prop, shorthand[ 1 ] ] : [ prop ];
}

const clean = ( v ) => String( v ).replace( /\s*!important\s*$/, '' ).trim();
const sameLength = ( a, b ) => clean( a ) === clean( b ) || ( parseFloat( a ) === parseFloat( b ) && String( a ).replace( /[\d.\s-]/g, '' ) === String( b ).replace( /[\d.\s-]/g, '' ) );

// Pure: the declarations in `matched` (a CDP CSS.getMatchedStylesForNode result) that set `prop`, in cascade order
// (CDP lists later and stronger rules last, as cascadeWinner relies on), with their selector, specificity, source and value.
// `sources` maps a styleSheetId to its file name. Returns { winner, carrier } where carrier is the weaker declaration
// whose value is `draft`, or null when no rule carries the draft's value.
export function explainCascade( matched, prop, draft, sources = {} ) {
	const names = propertyFamily( prop );
	const decls = [];
	for ( const m of matched.matchedCSSRules || [] ) {
		const rule = m.rule;
		const picked = ( m.matchingSelectors || [] ).map( ( i ) => rule.selectorList?.selectors?.[ i ] ).filter( Boolean );
		const sel = picked[ 0 ] || rule.selectorList?.selectors?.[ 0 ];
		for ( const p of rule.style?.cssProperties || [] ) {
			if ( names.includes( p.name ) && ! p.disabled && false !== p.parsedOk && '' !== String( p.value ).trim() ) {
				const sp = sel?.specificity;
				decls.push( { selector: ( rule.selectorList?.text || sel?.text || '' ).slice( 0, 120 ), specificity: sp ? `${ sp.a },${ sp.b },${ sp.c }` : null, property: p.name, value: clean( p.value ), important: !! p.important || /!important/.test( p.value ), source: sources[ rule.style?.styleSheetId ] || 'inline <style>', media: ( rule.media || [] ).map( ( x ) => x.text ).filter( Boolean ).join( ' and ' ) || null } );
			}
		}
	}
	const important = decls.filter( ( d ) => d.important );
	const winner = ( important.length ? important : decls ).at( -1 ) || null;
	const carrier = [ ...decls ].reverse().find( ( d ) => d !== winner && sameLength( d.value, draft ) ) || null;
	return { winner, carrier, considered: decls.length };
}

export const describeCascade = ( ex, prop ) => {
	if ( ! ex?.winner ) {
		return `no matched rule sets ${ prop } (inherited, or the browser's own default)`;
	}
	const at = ( d ) => `\`${ d.selector }\`${ d.specificity ? ` (${ d.specificity })` : '' } in ${ d.source }${ d.media ? ` @media ${ d.media }` : '' } sets ${ d.property }: ${ d.value }${ d.important ? ' !important' : '' }`;
	return ex.carrier ? `winning rule ${ at( ex.winner ) }; losing rule ${ at( ex.carrier ) }` : `winning rule ${ at( ex.winner ) }; no rule sets ${ prop } to the draft's value`;
};

// Node side: the element's own selector from a row's ref and element path (the path is the BEM steps below the ref element).
export const rowSelector = ( row ) => ( row.path ? `.${ row.ref } > ${ row.path }` : `.${ row.ref }` );

// Reads the winning rule of every given row (rows: Hardcode rows the tree holds) on the live page. `liveUrl` may hold {cb}.
// Only the walker's default load state is read (a row needing a scripted state keeps no winning rule and says why).
// Returns a Map: row -> { text, winner, carrier } or { note }.
export async function readWinningRules( rows, { liveUrl, restState = 'opening', headless = process.argv.includes( '--headless' ) } ) {
	const out = new Map();
	const todo = rows.filter( ( r ) => {
		if ( r.state !== restState ) {
			out.set( r, { note: `winning rule not read: walker state "${ r.state }" needs a scripted state` } );
			return false;
		}
		return true;
	} );
	if ( ! todo.length || ! liveUrl ) {
		todo.forEach( ( r ) => out.set( r, { note: 'winning rule not read: no live URL' } ) );
		return out;
	}
	const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch( { headless, args: [ '--hide-scrollbars' ] } );
	try {
		for ( const width of [ ...new Set( todo.map( ( r ) => r.width ) ) ].sort( ( a, b ) => a - b ) ) {
			const page = await browser.newPage( { viewport: { width, height: width < 500 ? 812 : 900 } } );
			try {
				await page.goto( liveUrl.replace( '{cb}', String( Date.now() ) ), { waitUntil: 'networkidle' } );
				const sources = {};
				const cdp = await openDevtools( page );
				cdp.on( 'CSS.styleSheetAdded', ( e ) => ( sources[ e.header.styleSheetId ] = ( e.header.sourceURL || '' ).split( '/' ).pop().split( '?' )[ 0 ] || 'inline <style>' ) );
				await cdp.send( 'CSS.disable' );
				await cdp.send( 'CSS.enable' );
				const { root } = await cdp.send( 'DOM.getDocument', { depth: 0 } );
				for ( const r of todo.filter( ( x ) => x.width === width ) ) {
					try {
						const { nodeId } = await cdp.send( 'DOM.querySelector', { nodeId: root.nodeId, selector: rowSelector( r ) } );
						if ( ! nodeId ) {
							out.set( r, { note: `winning rule not read: ${ rowSelector( r ) } not found on the live page at ${ width }` } );
							continue;
						}
						const ex = explainCascade( await cdp.send( 'CSS.getMatchedStylesForNode', { nodeId } ), r.key, r.draft, sources );
						out.set( r, { ...ex, text: describeCascade( ex, r.key ) } );
					} catch ( e ) {
						out.set( r, { note: `winning rule not read: ${ String( e.message || e ).slice( 0, 120 ) }` } );
					}
				}
			} finally {
				await page.close();
			}
			await new Promise( ( res ) => setTimeout( res, 1500 ) );
		}
	} finally {
		await browser.close();
	}
	return out;
}
