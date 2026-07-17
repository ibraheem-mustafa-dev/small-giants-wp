#!/usr/bin/env node
/**
 * extract-css-diff.js — empirical CSS extract-and-diff for clone fidelity.
 *
 * THE STANDARD first step for matching a clone section to its reference
 * (Bean-locked 2026-07-17): dump every element's *computed* box-model + hover
 * rules from BOTH sites and diff them, instead of eyeballing screenshots. It
 * surfaces exact transfer values (padding, margin, gap, border, radius,
 * object-fit, colour, typography) for every element, keyed by text content.
 *
 * Why this exists: getComputedStyle() returns the browser's FINAL resolved
 * values — the real numbers being painted — so a diff is authoritative, not a
 * guess. Screenshot-eyeballing repeatedly missed real diffs (hover border,
 * exact gap, bottom padding); this does not.
 *
 * MODES
 *   (default)  extract + diff a named section, original vs clone, per breakpoint
 *   --why      provenance: which CSS RULE (selector/stylesheet) sets a property
 *              on an element — via a raw CDP session (CSS.getMatchedStylesForNode),
 *              the one thing neither the Playwright nor chrome-devtools MCP/CLI
 *              exposes. Answers "where does this value come from?" in one call
 *              (e.g. the WP `[style*="border-width"]` phantom-border hunt).
 *
 * USAGE
 *   node extract-css-diff.js \
 *     --original https://reference.example/ \
 *     --clone    https://clone.example/ \
 *     --section  "Our Brands" \
 *     [--breakpoints 1440,768,375] [--out report.md] [--json]
 *
 *   node extract-css-diff.js --clone https://clone.example/ \
 *     --why ".sgs-brand-strip" --prop border-top-style
 *
 * Requires Playwright (global on this machine, or `npm i -D playwright`).
 */

'use strict';

let chromium;
try {
	( { chromium } = require( 'playwright' ) );
} catch ( e ) {
	try {
		( { chromium } = require( '@playwright/test' ) );
	} catch ( e2 ) {
		console.error( 'Playwright not found. Install it: npm i -D playwright  (or use the global install).' );
		process.exit( 2 );
	}
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

function parseArgs( argv ) {
	const a = { breakpoints: [ 1440, 768, 375 ], json: false };
	for ( let i = 2; i < argv.length; i++ ) {
		const k = argv[ i ];
		const next = () => argv[ ++i ];
		if ( k === '--original' ) a.original = next();
		else if ( k === '--clone' ) a.clone = next();
		else if ( k === '--section' ) a.section = next();
		else if ( k === '--breakpoints' ) a.breakpoints = next().split( ',' ).map( ( n ) => parseInt( n, 10 ) ).filter( Boolean );
		else if ( k === '--out' ) a.out = next();
		else if ( k === '--json' ) a.json = true;
		else if ( k === '--why' ) a.why = next();
		else if ( k === '--prop' ) a.prop = next();
	}
	return a;
}

// ---------------------------------------------------------------------------
// The computed-style set captured per element. Deliberately broad — this is the
// extended measurement set (measurement-vs-eye rule): the full background
// family, box model per-side, borders per-side, typography, layout, and visual
// transforms — so a diff catches inherited + explicit + hover-only differences.
// ---------------------------------------------------------------------------

const CAPTURE_PROPS = [
	// box
	'width', 'height', 'boxSizing',
	'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
	'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
	'borderTopWidth', 'borderTopStyle', 'borderTopColor',
	'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
	'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
	// background family
	'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
	// typography
	'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
	'textAlign', 'textTransform', 'color',
	// layout
	'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap', 'columnGap', 'rowGap', 'gridTemplateColumns',
	// visual
	'opacity', 'filter', 'mixBlendMode', 'boxShadow', 'objectFit',
	'position',
];

// ---------------------------------------------------------------------------
// In-page extraction. Runs in the browser. Returns a flat list of "meaningful"
// element records for the named section, keyed by normalised text (or tag#n).
// ---------------------------------------------------------------------------

function pageExtract( { sectionText, props } ) {
	const norm = ( s ) => ( s || '' ).replace( /\s+/g, ' ' ).trim().toLowerCase().slice( 0, 60 );

	// Find the section: a heading whose text matches, then walk up to the LARGEST
	// ancestor that still contains ONLY this heading (no other section's heading).
	// This bounds the section to its own band instead of the whole page.
	const all = [ ...document.querySelectorAll( 'h1,h2,h3,h4' ) ];
	const heading = all.find( ( e ) => norm( e.textContent ).includes( norm( sectionText ) ) );
	if ( !heading ) return { error: 'section heading not found: ' + sectionText };
	let section = heading;
	while ( section.parentElement && section.parentElement !== document.documentElement ) {
		const parent = section.parentElement;
		const bringsOtherHeading = [ ...parent.querySelectorAll( 'h1,h2,h3,h4' ) ].some(
			( x ) => x !== heading && !section.contains( x )
		);
		if ( bringsOtherHeading ) break; // stepping up would swallow another section
		section = parent;
		if ( parent === document.body ) break;
	}

	const sectionRect = section.getBoundingClientRect();

	// Collect meaningful descendants: containers, headings, text, images, hr,
	// buttons/links, and list/card tiles. Skip pure wrappers with no own box.
	const MEANINGFUL = 'section,div,h1,h2,h3,h4,h5,h6,p,span,a,button,img,hr,figure,ul,li';
	const nodes = [ section, ...section.querySelectorAll( MEANINGFUL ) ];
	const seenKey = {};
	const records = [];

	for ( const el of nodes ) {
		const r = el.getBoundingClientRect();
		if ( r.width < 2 || r.height < 2 ) continue; // invisible
		const cs = getComputedStyle( el );
		const text = norm( el.childElementCount === 0 ? el.textContent : '' );
		const tag = el.tagName.toLowerCase();
		// Keep only visually-meaningful nodes: text-bearing, media, dividers, or
		// "boxes" (own background / border / radius). Skip bare layout wrappers —
		// they add ordinal noise and don't carry transferable design values.
		const isBox = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat( cs.borderTopWidth ) > 0 || parseFloat( cs.borderTopLeftRadius ) > 0;
		if ( el !== section && !text && tag !== 'img' && tag !== 'hr' && !isBox ) continue;
		// key: text if present (reliable across DOMs); else a SHAPE ROLE so like
		// matches like across two different implementations — a divider matches a
		// divider, a tile a tile, the band the band — instead of raw tag-ordinal
		// which mis-pairs unrelated elements (e.g. original separator vs clone tile).
		let key;
		if ( text ) {
			key = 'txt:' + text;
		} else {
			let role;
			const aspect = r.width / Math.max( r.height, 1 );
			if ( tag === 'img' ) role = 'media';
			else if ( tag === 'hr' || ( r.height <= 8 && r.width > 40 ) ) role = 'divider';
			else if ( r.width >= sectionRect.width * 0.85 ) role = 'band';
			else if ( aspect > 0.7 && aspect < 1.4 && r.width < 320 ) role = 'tile';
			else role = tag;
			seenKey[ role ] = ( seenKey[ role ] || 0 ) + 1;
			key = role + '#' + seenKey[ role ];
		}
		if ( records.find( ( x ) => x.key === key ) ) continue; // first wins

		const styles = {};
		for ( const p of props ) styles[ p ] = cs[ p ];

		records.push( {
			key,
			tag,
			text: text || undefined,
			rect: { w: Math.round( r.width ), h: Math.round( r.height ), x: Math.round( r.left - sectionRect.left ), y: Math.round( r.top - sectionRect.top ) },
			styles,
		} );
	}

	// Hover rules: scan stylesheets for :hover declarations that touch border/
	// background/color/transform — surfaces hover-only design (e.g. gold border).
	const hoverRules = [];
	for ( const ss of document.styleSheets ) {
		let rules;
		try { rules = ss.cssRules; } catch ( e ) { continue; }
		if ( !rules ) continue;
		for ( const rule of rules ) {
			if ( rule.selectorText && /:hover/.test( rule.selectorText ) && /(border|background|color|transform|box-shadow)/i.test( rule.cssText ) ) {
				hoverRules.push( { sel: rule.selectorText.slice( 0, 100 ), css: ( rule.style ? rule.style.cssText : '' ).slice( 0, 160 ) } );
			}
		}
	}

	return {
		section: { tag: section.tagName.toLowerCase(), cls: ( section.className || '' ).toString().slice( 0, 60 ), rect: { w: Math.round( sectionRect.width ), h: Math.round( sectionRect.height ) } },
		records,
		hoverRules: hoverRules.slice( 0, 40 ),
	};
}

// ---------------------------------------------------------------------------
// Diff two record lists (original vs clone) → per-key property mismatches.
// ---------------------------------------------------------------------------

function diff( orig, clone ) {
	const cloneByKey = {};
	clone.records.forEach( ( r ) => ( cloneByKey[ r.key ] = r ) );
	const origByKey = {};
	orig.records.forEach( ( r ) => ( origByKey[ r.key ] = r ) );

	const mismatches = [];
	const onlyOriginal = [];
	const onlyClone = [];

	for ( const o of orig.records ) {
		const c = cloneByKey[ o.key ];
		if ( !c ) { onlyOriginal.push( o.key ); continue; }
		const props = [];
		for ( const p of CAPTURE_PROPS ) {
			const ov = o.styles[ p ];
			const cv = c.styles[ p ];
			// ignore font-family stack noise + identical values (STOP-49: font stacks over-count)
			if ( p === 'fontFamily' ) continue;
			if ( ov !== cv ) props.push( { prop: p, original: ov, clone: cv } );
		}
		// also flag rect deltas > 2px (size/position drift)
		const rectDeltas = [];
		for ( const d of [ 'w', 'h' ] ) {
			if ( Math.abs( o.rect[ d ] - c.rect[ d ] ) > 2 ) rectDeltas.push( { prop: 'rect.' + d, original: o.rect[ d ], clone: c.rect[ d ] } );
		}
		if ( props.length || rectDeltas.length ) mismatches.push( { key: o.key, text: o.text, props: [ ...rectDeltas, ...props ] } );
	}
	for ( const c of clone.records ) if ( !origByKey[ c.key ] ) onlyClone.push( c.key );

	return { mismatches, onlyOriginal, onlyClone };
}

// ---------------------------------------------------------------------------
// --why: matched-rule provenance via a raw CDP session. This is the capability
// neither the Playwright MCP nor chrome-devtools MCP/CLI exposes.
// ---------------------------------------------------------------------------

async function whyMode( page, selector, prop ) {
	const client = await page.context().newCDPSession( page );
	await client.send( 'DOM.enable' );
	await client.send( 'CSS.enable' );
	const { root } = await client.send( 'DOM.getDocument', { depth: -1 } );
	const { nodeId } = await client.send( 'DOM.querySelector', { nodeId: root.nodeId, selector } );
	if ( !nodeId ) return { error: 'selector not found: ' + selector };
	const matched = await client.send( 'CSS.getMatchedStylesForNode', { nodeId } );
	const out = [];
	const scan = ( entries, origin ) => {
		for ( const m of entries || [] ) {
			const rule = m.rule || m;
			const style = rule.style;
			if ( !style ) continue;
			const decl = style.cssProperties.find( ( cp ) => !prop || cp.name === prop || cp.name.startsWith( prop ) );
			if ( decl && ( !prop || style.cssProperties.some( ( cp ) => cp.name === prop || cp.name.startsWith( prop ) ) ) ) {
				const sel = rule.selectorList ? rule.selectorList.text : '(inline)';
				const sheet = rule.styleSheetId || origin || '';
				const hit = style.cssProperties.filter( ( cp ) => !prop || cp.name === prop || cp.name.startsWith( prop ) ).map( ( cp ) => cp.name + ':' + cp.value + ( cp.important ? ' !important' : '' ) );
				if ( hit.length ) out.push( { selector: sel, origin, declarations: hit } );
			}
		}
	};
	scan( matched.matchedCSSRules, 'author' );
	if ( matched.inlineStyle ) scan( [ { rule: { style: matched.inlineStyle, selectorList: { text: '(element inline style)' } } } ], 'inline' );
	( matched.inherited || [] ).forEach( ( inh ) => scan( inh.matchedCSSRules, 'inherited' ) );
	return { selector, prop: prop || '(all)', rules: out };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function toMarkdown( section, byBreakpoint ) {
	const lines = [];
	lines.push( `# CSS extract-and-diff — "${ section }"`, '' );
	for ( const bp of byBreakpoint ) {
		lines.push( `## ${ bp.width }px`, '' );
		if ( bp.error ) { lines.push( '> ' + bp.error, '' ); continue; }
		lines.push( `Section: original ${ bp.origSection.rect.w }×${ bp.origSection.rect.h } vs clone ${ bp.cloneSection.rect.w }×${ bp.cloneSection.rect.h }`, '' );
		if ( !bp.diff.mismatches.length ) lines.push( '✅ No property mismatches.', '' );
		for ( const m of bp.diff.mismatches ) {
			lines.push( `### ${ m.text ? '“' + m.text + '”' : m.key }` );
			lines.push( '| property | original | clone |', '|---|---|---|' );
			for ( const p of m.props ) lines.push( `| ${ p.prop } | \`${ p.original }\` | \`${ p.clone }\` |` );
			lines.push( '' );
		}
		if ( bp.diff.onlyOriginal.length ) lines.push( `_Only in original:_ ${ bp.diff.onlyOriginal.join( ', ' ) }`, '' );
		if ( bp.diff.onlyClone.length ) lines.push( `_Only in clone:_ ${ bp.diff.onlyClone.join( ', ' ) }`, '' );
		if ( bp.hoverNote ) lines.push( bp.hoverNote, '' );
	}
	return lines.join( '\n' );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

( async () => {
	const args = parseArgs( process.argv );
	const browser = await chromium.launch();
	const ctx = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
	const page = await ctx.newPage();

	try {
		// --why provenance mode (clone by default; original if only that is given)
		if ( args.why ) {
			const url = args.clone || args.original;
			if ( !url ) throw new Error( '--why needs --clone (or --original) URL' );
			await page.goto( url, { waitUntil: 'networkidle' } );
			const res = await whyMode( page, args.why, args.prop );
			console.log( JSON.stringify( res, null, 2 ) );
			return;
		}

		if ( !args.original || !args.clone || !args.section ) {
			console.error( 'Required: --original <url> --clone <url> --section "<heading>"' );
			process.exit( 1 );
		}

		const byBreakpoint = [];
		for ( const width of args.breakpoints ) {
			await page.setViewportSize( { width, height: 1000 } );

			await page.goto( args.original, { waitUntil: 'networkidle' } );
			const orig = await page.evaluate( pageExtract, { sectionText: args.section, props: CAPTURE_PROPS } );
			await page.goto( args.clone, { waitUntil: 'networkidle' } );
			const clone = await page.evaluate( pageExtract, { sectionText: args.section, props: CAPTURE_PROPS } );

			if ( orig.error || clone.error ) {
				byBreakpoint.push( { width, error: ( orig.error || '' ) + ' ' + ( clone.error || '' ) } );
				continue;
			}
			const d = diff( orig, clone );
			// hover note: list original hover rules the clone lacks (by decl signature)
			const cloneHover = new Set( clone.hoverRules.map( ( h ) => h.css ) );
			const missingHover = orig.hoverRules.filter( ( h ) => ![ ...cloneHover ].some( ( c ) => c && h.css && c.includes( h.css.split( ':' )[ 0 ] ) ) );
			const hoverNote = missingHover.length ? `_Original hover rules to check (${ missingHover.length }):_ ` + missingHover.slice( 0, 5 ).map( ( h ) => '`' + h.sel + ' { ' + h.css + ' }`' ).join( '; ' ) : '';

			byBreakpoint.push( { width, diff: d, origSection: orig.section, cloneSection: clone.section, hoverNote } );
		}

		if ( args.json ) {
			console.log( JSON.stringify( { section: args.section, byBreakpoint }, null, 2 ) );
		} else {
			const md = toMarkdown( args.section, byBreakpoint );
			if ( args.out ) {
				require( 'fs' ).writeFileSync( args.out, md );
				console.log( 'Wrote ' + args.out );
			} else {
				console.log( md );
			}
		}
	} finally {
		await browser.close();
	}
} )().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
