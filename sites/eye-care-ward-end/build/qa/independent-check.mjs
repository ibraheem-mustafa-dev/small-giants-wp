#!/usr/bin/env node
// Independent check of a surface against its draft (Spec 47 pilot, plan .claude/plans/2026-10-04-spec47-full-coverage.md).
//   node sites/eye-care-ward-end/build/qa/independent-check.mjs --surface about [--widths 375,768,1440] [--out <file.json>]
// A second opinion on Solve that shares none of its measuring: it never uses the cr-ref classes, the walker's word
// matcher or the pairing report. Every block of the surface's tree is found on both pages by its own text (the text
// its attributes carry; a container by the texts inside it that the page holds), and form fields by
// their name or id. It then compares painted values at each width:
//   - each block's box (width, height) and its position relative to the first block found on both pages;
//   - text blocks: font size, weight, line height, letter spacing, colour, text transform;
//   - every block: the painted inset of its "unit" (the element holding its text, and every wrapper around it that
//     holds no other text): how far its rendered text sits from the outer box's edges, wherever the padding sits; the
//     unit's gap, its ground colour and its border (the first painted one in the unit).
// Navigation (the draft url and the click that opens the surface's view) comes from the surface's hand walker config.
// Differences a divergence-ledger entry for the surface covers (sites/<client>/build/qa/divergences.json, matched on the
// entry's node and property by scripts/computed-route/lib/ledger.mjs::judgeIndependent) are reported as accepted, unless
// live has drifted from a value entry's decided value. Exit 1 when any other difference remains.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const BUILD = path.resolve( HERE, '..' );
const REPO = path.resolve( BUILD, '../../..' );
const [ PX_TOL, FONT_TOL ] = [ 2, 0.5 ]; // px: boxes and insets; font sizes and line heights

// In-page: finds each item and reads its painted values.
export function readPage( list ) {
	const N = ( t ) => String( t ).toLowerCase().replace( /[^\p{L}\p{N}]+/gu, ' ' ).trim();
	// Page chrome only: a <header> or <nav> inside <main> is part of the content (a card's or section's heading).
	const skip = ( el ) => {
		const c = el.closest( 'header, nav, footer, [role="navigation"], [role="banner"], [role="contentinfo"], script, style, noscript, template' );
		return !! c && ( /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test( c.tagName ) || ! c.closest( 'main' ) );
	};
	// Hidden for everyone: a screen-reader-only box (1px or clipped to nothing; the same rule as scripts/parity/lib/
	// auto-collect.mjs::srOnly, which the walker's collector applies), or a box parked wholly off the page's top or left
	// edge (a skip link at left:-9999px), which no scroll can bring into view.
	const srOnly = ( el ) => {
		for ( let a = el, i = 0; a && i < 4; a = a.parentElement, i++ ) {
			const r = a.getBoundingClientRect();
			const cs = getComputedStyle( a );
			if ( ( 'absolute' === cs.position && r.width <= 2 && r.height <= 2 ) || /rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test( cs.clip ) || /inset\(50%\)/.test( cs.clipPath ) ) {
				return true;
			}
		}
		const b = el.getBoundingClientRect();
		return b.right + scrollX <= 0 || b.bottom + scrollY <= 0;
	};
	const visible = ( el ) => {
		const r = el.getBoundingClientRect();
		const c = getComputedStyle( el );
		return r.width > 0 && r.height > 0 && 'hidden' !== c.visibility && 'none' !== c.display && ! srOnly( el );
	};
	const all = [ ...document.body.querySelectorAll( '*' ) ].filter( ( el ) => ! skip( el ) );
	// The words an element paints: its text nodes and those of its descendants that are rendered and not hidden for
	// everyone (srOnly), so an ancestor never "holds" a screen-reader-only or off-page word. Block-level children are
	// separated by a space (as innerText separates neighbouring blocks; textContent runs a heading into the paragraph after
	// it); inline children join without one.
	const painted = ( el ) => {
		let t = '';
		for ( const n of el.childNodes ) {
			if ( 3 === n.nodeType ) {
				t += n.textContent;
			} else if ( 1 === n.nodeType && ! /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test( n.tagName ) ) {
				const c = getComputedStyle( n );
				if ( 'none' !== c.display && 'hidden' !== c.visibility && ! srOnly( n ) ) {
					t += /^inline/.test( c.display ) ? painted( n ) : ` ${ painted( n ) } `;
				}
			}
		}
		return t;
	};
	const textOf = new Map( all.map( ( el ) => [ el, N( painted( el ) ) ] ) );
	const has = ( el, t ) => ( ' ' + textOf.get( el ) + ' ' ).includes( ' ' + t + ' ' );
	// The deepest visible elements holding every given text, in document order.
	const deepest = ( texts ) => all.filter( ( el ) => texts.every( ( t ) => has( el, t ) ) && visible( el ) && ! [ ...el.children ].some( ( c ) => textOf.has( c ) && texts.every( ( t ) => has( c, t ) ) && visible( c ) ) );
	// The unit: the element and every ancestor holding exactly the same text.
	// The unit: the element and every ancestor that holds exactly the same text and wraps its children tightly (its
	// content box spans them: padding around them, no free space). A wider wrapper (a centred page container's
	// full-width parent) is layout around the block, not part of it.
	const tight = ( a, c = getComputedStyle( a ) ) => {
		const sides = [ 'paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth' ].reduce( ( t, k ) => t + parseFloat( c[ k ] ), 0 );
		const kids = [ ...a.children ].map( ( k ) => k.getBoundingClientRect() ).filter( ( r ) => r.width );
		const span = kids.reduce( ( m, r ) => Math.max( m, r.right ), -Infinity ) - kids.reduce( ( m, r ) => Math.min( m, r.left ), Infinity );
		return Math.abs( a.getBoundingClientRect().width - sides - span ) <= 2;
	};
	const unitOf = ( el ) => {
		const out = [ el ];
		for ( let a = el.parentElement; a && a !== document.body && textOf.get( a ) === textOf.get( el ) && tight( a ); a = a.parentElement ) {
			out.push( a );
		}
		return out;
	};
	const used = new Set();
	const px = ( v ) => parseFloat( v ) || 0;
	const out = [];
	for ( const it of list ) {
		let el = null;
		if ( it.field ) {
			el = [ ...document.querySelectorAll( `[name="${ it.field }"], #${ CSS.escape( it.field ) }` ) ].find( ( e ) => ! skip( e ) ) || null;
		}
		if ( ! el ) {
			// A container by every text inside it that the page holds (a wording difference elsewhere is a text row, not a lost block).
			const texts = it.own ? [ it.own ] : it.texts.filter( ( t ) => all.some( ( e ) => has( e, t ) ) );
			el = texts.length ? deepest( texts ).find( ( e ) => ! used.has( e ) ) || null : null;
		}
		if ( ! el ) {
			out.push( { ref: it.ref, found: false } );
			continue;
		}
		used.add( el );
		const unit = unitOf( el );
		const outer = unit.at( -1 );
		const r = outer.getBoundingClientRect();
		// Painted inset: from the outer box's edges to where its text paints (the rendered text's own rectangle), so the
		// padding counts wherever it sits in the unit and an icon or label wrapper before the text counts as it paints.
		// The union of the element's rendered text nodes (an icon beside the text is not text).
		const tw = document.createTreeWalker( el, NodeFilter.SHOW_TEXT );
		let tr = null;
		for ( let n = tw.nextNode(); n; n = tw.nextNode() ) {
			if ( ! n.textContent.trim() ) {
				continue;
			}
			const rg = document.createRange();
			rg.selectNodeContents( n );
			const b = rg.getBoundingClientRect();
			if ( b.width && b.height ) {
				tr = tr ? { left: Math.min( tr.left, b.left ), top: Math.min( tr.top, b.top ), right: Math.max( tr.right, b.right ), bottom: Math.max( tr.bottom, b.bottom ) } : { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
			}
		}
		const inset = tr
			? { top: Math.round( tr.top - r.top ), right: Math.round( r.right - tr.right ), bottom: Math.round( r.bottom - tr.bottom ), left: Math.round( tr.left - r.left ) }
			: { top: 0, right: 0, bottom: 0, left: 0 };
		const ic = getComputedStyle( el );
		const firstOf = ( fn ) => unit.map( ( u ) => fn( getComputedStyle( u ) ) ).find( ( v ) => null !== v ) ?? null;
		const ground = firstOf( ( c ) => ( /rgba\(.*,\s*0\)$|transparent/.test( c.backgroundColor ) ? null : c.backgroundColor ) );
		const border = firstOf( ( c ) => ( [ 'Top', 'Right', 'Bottom', 'Left' ].some( ( sd ) => 'none' !== c[ `border${ sd }Style` ] && px( c[ `border${ sd }Width` ] ) > 0 ) ? [ 'Top', 'Right', 'Bottom', 'Left' ].map( ( sd ) => ( 'none' === c[ `border${ sd }Style` ] || 0 === px( c[ `border${ sd }Width` ] ) ? '0' : `${ c[ `border${ sd }Width` ] } ${ c[ `border${ sd }Style` ] } ${ c[ `border${ sd }Color` ] }` ) ).join( ' | ' ) : null ) );
		const gap = firstOf( ( c ) => ( /flex|grid/.test( c.display ) && ( 'normal' !== c.rowGap || 'normal' !== c.columnGap ) ? `${ c.rowGap } ${ c.columnGap }` : null ) );
		const row = {
			ref: it.ref,
			found: true,
			box: { x: Math.round( r.left + scrollX ), y: Math.round( r.top + scrollY ), w: Math.round( r.width ), h: Math.round( r.height ) },
			inset,
			ground,
			border,
			gap,
		};
		if ( it.own || it.field ) {
			row.font = { size: px( ic.fontSize ), weight: ic.fontWeight, lineHeight: 'normal' === ic.lineHeight ? 'normal' : px( ic.lineHeight ), letterSpacing: ic.letterSpacing, color: ic.color, transform: ic.textTransform };
		}
		out.push( row );
	}
	return out;
}

export function compare( d, l, width ) {
	const diffs = [];
	const add = ( prop, dv, lv ) => diffs.push( { ref: d.ref, width, prop, draft: dv, live: lv } );
	if ( ! d.found || ! l.found ) {
		return d.found !== l.found ? [ { ref: d.ref, width, prop: 'found', draft: d.found, live: l.found } ] : diffs;
	}
	for ( const k of [ 'x', 'y', 'w', 'h' ] ) {
		Math.abs( d.box[ k ] - l.box[ k ] ) > PX_TOL && add( `box.${ k }`, d.box[ k ], l.box[ k ] );
	}
	for ( const k of [ 'top', 'right', 'bottom', 'left' ] ) {
		Math.abs( d.inset[ k ] - l.inset[ k ] ) > PX_TOL && add( `padding.${ k }`, d.inset[ k ], l.inset[ k ] );
	}
	for ( const k of [ 'ground', 'border', 'gap' ] ) {
		d[ k ] !== l[ k ] && add( k, d[ k ], l[ k ] );
	}
	if ( d.font && l.font ) {
		Math.abs( d.font.size - l.font.size ) > FONT_TOL && add( 'font-size', d.font.size, l.font.size );
		const lh = ( f ) => ( 'normal' === f.lineHeight ? 'normal' : Math.round( f.lineHeight ) );
		lh( d.font ) !== lh( l.font ) && Math.abs( ( d.font.lineHeight || 0 ) - ( l.font.lineHeight || 0 ) ) > FONT_TOL && add( 'line-height', d.font.lineHeight, l.font.lineHeight );
		for ( const k of [ 'weight', 'letterSpacing', 'color', 'transform' ] ) {
			d.font[ k ] !== l.font[ k ] && add( k, d.font[ k ], l.font[ k ] );
		}
	}
	return diffs;
}

// The script's main body runs only when this file is the entry point, so the tests can import readPage and compare.
async function main() {
	const argv = process.argv.slice( 2 );
	const flag = ( n, d = null ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : d );
	const surface = flag( '--surface' );
	const WIDTHS = flag( '--widths', '375,768,1440' ).split( ',' ).map( Number );
	const TEXT_KEYS = [ 'content', 'text', 'label', 'heading', 'title', 'buttonText', 'triggerText', 'subtitle', 'description', 'placeholder' ];
	if ( ! surface ) {
		console.error( 'Usage: independent-check.mjs --surface <surface> [--widths 375,768,1440] [--out file.json]' );
		process.exit( 2 );
	}
	const s = JSON.parse( fs.readFileSync( path.join( BUILD, 'surfaces.json' ), 'utf8' ) )[ surface ];
	const tree = JSON.parse( fs.readFileSync( path.join( BUILD, s.tree ), 'utf8' ) );
	const cfg = ( await import( pathToFileURL( path.join( BUILD, s.walker ) ).href ) ).default;
	const ledgerFile = path.join( BUILD, 'qa', 'divergences.json' );
	const ledgerRaw = fs.existsSync( ledgerFile ) ? JSON.parse( fs.readFileSync( ledgerFile, 'utf8' ) ) : [];
	const ledger = ( Array.isArray( ledgerRaw ) ? ledgerRaw : Object.values( ledgerRaw ).flat() ).filter( ( e ) => e && ( ! e.scope || e.scope === surface ) );

	// The words of a string, lower-cased, letters and digits only.
	const norm = ( t ) => String( t ).replace( /<[^>]+>/g, ' ' ).replace( /&[a-z#0-9]+;/gi, ' ' ).toLowerCase().replace( /[^\p{L}\p{N}]+/gu, ' ' ).trim();
	const snippet = ( t ) => norm( t ).split( ' ' ).slice( 0, 6 ).join( ' ' );
	const ownText = ( { attributes: a = {} } ) => {
		const k = TEXT_KEYS.find( ( key ) => 'string' === typeof a[ key ] && norm( a[ key ] ) );
		return k ? snippet( a[ k ] ) : null;
	};
	const refOf = ( n ) => ( ( n.attributes?.className || '' ).match( /\bcr-ref-\S+/ ) || [] )[ 0 ] || null;

	// Items: one per block (the ref only labels the result). texts: the snippets of every text-bearing block inside it;
	// field: a form field's name or id.
	const items = [];
	const walk = ( nodes ) => nodes.forEach( ( n ) => {
		const texts = [];
		const collect = ( m ) => {
			const t = ownText( m );
			t && texts.push( t );
			( m.innerBlocks || [] ).forEach( collect );
		};
		collect( n );
		const a = n.attributes || {};
		const field = a.fieldName || a.name || a.fieldId || null;
		const own = ownText( n );
		if ( own || texts.length || field ) {
			items.push( { ref: refOf( n ) || n.name, block: n.name, own, texts, field: 'string' === typeof field && /^[\w-]+$/.test( field ) ? field : null } );
		}
		walk( n.innerBlocks || [] );
	} );
	walk( Array.isArray( tree ) ? tree : tree.blocks || [] );

	// Ledger entries match on their node (lib/ledger.mjs::judgeIndependent), in the walker state the page opens in. A value
	// entry live has drifted from stays open, named by its id.
	const { judgeIndependent } = await import( pathToFileURL( path.join( REPO, 'scripts/computed-route/lib/ledger.mjs' ) ).href );
	const judge = ( df ) => judgeIndependent( ledger, df, { state: cfg.states?.[ 0 ]?.name || '*' } );
	const accepted = ( df ) => judge( df )?.accepted;

	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const { makeHelpers, waitOutHostCheck } = await import( pathToFileURL( path.join( REPO, 'scripts/parity/lib/helpers.mjs' ) ).href );
	const { resolveFinder } = await import( pathToFileURL( path.join( REPO, 'scripts/parity/lib/collect.mjs' ) ).href );
	// SGS_HEADED=1 runs headed (Hostinger's edge challenges a headless browser under load).
	const browser = await chromium.launch( { headless: ! process.env.SGS_HEADED, args: [ '--hide-scrollbars' ] } );
	// Fires every scroll reveal and lets entrance animations finish before reading.
	const settle = async ( page ) => {
		await page.evaluate( async () => {
			for ( let y = 0; y < document.body.scrollHeight; y += 500 ) {
				window.scrollTo( 0, y ) || await new Promise( ( r ) => setTimeout( r, 120 ) );
			}
			window.scrollTo( 0, 0 );
		} );
		await page.waitForTimeout( 2000 );
	};
	const cb = ( u ) => u.replace( '{cb}', String( Date.now() ) );
	const diffs = [];
	try {
		await Promise.all( WIDTHS.map( async ( width ) => {
			const ctx = await browser.newContext( { viewport: { width, height: 900 } } );
			const draft = await ctx.newPage();
			await draft.goto( cb( cfg.draft.url ), { waitUntil: 'networkidle', timeout: 90000 } ).catch( () => {} );
			await draft.waitForTimeout( 1500 );
			await waitOutHostCheck( draft );
			if ( cfg.draft.open ) {
				const h = makeHelpers( draft, 'draft', { cb, RESOLVE: resolveFinder.toString(), onAction: null } );
				h.log = [];
				await cfg.draft.open( h );
			}
			await settle( draft );
			const live = await ctx.newPage();
			await live.goto( cb( cfg.live.url ), { waitUntil: 'networkidle', timeout: 90000 } ).catch( () => {} );
			await waitOutHostCheck( live );
			await settle( live );
			const d = await draft.evaluate( readPage, items );
			const l = await live.evaluate( readPage, items );
			// Positions from the first block found on both pages, so the header above and a block missed on one side shift nothing.
			const o = d.findIndex( ( row, i ) => row.found && l[ i ].found );
			for ( const [ side, ref ] of [ [ d, d[ o ] ], [ l, l[ o ] ] ] ) {
				const base = ref ? { x: ref.box.x, y: ref.box.y } : { x: 0, y: 0 };
				side.filter( ( row ) => row.found ).forEach( ( row ) => ( row.box = { ...row.box, x: row.box.x - base.x, y: row.box.y - base.y } ) );
			}
			d.forEach( ( row, i ) => diffs.push( ...compare( row, l[ i ], width ) ) );
			await ctx.close();
		} ) );
	} finally {
		await browser.close();
	}
	diffs.sort( ( a, b ) => a.ref.localeCompare( b.ref, undefined, { numeric: true } ) || a.width - b.width );
	const open = diffs.filter( ( df ) => ! accepted( df ) );
	const out = flag( '--out' );
	out && fs.writeFileSync( path.resolve( out ), JSON.stringify( { surface, widths: WIDTHS, items: items.length, diffs, open: open.length }, null, 1 ) );
	open.forEach( ( df ) => console.log( `${ df.width } ${ df.ref } ${ df.prop }: draft ${ JSON.stringify( df.draft ) } live ${ JSON.stringify( df.live ) }${ judge( df )?.drift ? ` (drifted from ledger ${ judge( df ).drift })` : '' }` ) );
	console.log( JSON.stringify( { surface, items: items.length, differences: diffs.length, accepted: diffs.length - open.length, open: open.length } ) );
	process.exit( open.length ? 1 : 0 );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	await main();
}
