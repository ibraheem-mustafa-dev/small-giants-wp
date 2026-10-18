#!/usr/bin/env node
// Derives data/presentational-hints.json from the WHATWG HTML Rendering section (clone coverage plan step 1.6): every
// HTML attribute the browser turns into a CSS property when it renders (a "presentational hint", or an attribute rule
// of the user agent style sheet), with that property.
// A draft that writes `<td align="center">` gets centred text, so such an attribute is a design value, not a dead one.
//   node scripts/computed-route/tools/presentational-hints.mjs <rendering.html> [--write]
// <rendering.html> is a saved copy of https://html.spec.whatwg.org/multipage/rendering.html (the spec is read as given,
// never fetched here). The hints come from the four forms the section writes them in:
//   1. the section's CSS blocks (`td[valign=top i] { vertical-align: top }`, `legend[align=left i]`), parsed with
//      css-tree: each attribute selector, the element of its own compound selector, and the declared properties;
//   2. "<element>'s <attribute> attribute maps to the … property 'p'" sentences (`respectively` pairs by order);
//   3. "When a <element> element has a <attribute> attribute … presentational hint setting … 'p' property" paragraphs;
//   4. the body element's margin table (`marginheight`, `topmargin`, … → the margin properties).
// Prints the entries; with --write saves them. Exit 2 on a usage error.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { htmlTagNames } from 'html-tag-names';

const require = createRequire( import.meta.url );
const csstree = require( 'css-tree' );
const MDN = require( 'mdn-data/css' );
const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
export const HINTS_FILE = path.join( ROUTE, 'data', 'presentational-hints.json' );
export const SOURCE = 'https://html.spec.whatwg.org/multipage/rendering.html';
const TAGS = new Set( htmlTagNames );
const isProperty = ( p ) => Boolean( MDN.properties[ p ] );

const textOf = ( html ) => html.replace( /<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '' ).replace( /<[^>]+>/g, '' ).replace( /&lt;/g, '<' ).replace( /&gt;/g, '>' ).replace( /&quot;/g, '"' ).replace( /&#39;|&apos;/g, "'" ).replace( /&amp;/g, '&' ).replace( /\s+/g, ' ' );

// Form 1: every CSS block of the section: the blocks it introduces as presentational hints and the user agent style
// sheet's own attribute rules (`legend[align=left i]`, `abbr[title]`, `[hidden]`), which render an attribute just the
// same. Returns [ { attribute, element, css } ].
export function cssBlockHints( html ) {
	const out = [];
	for ( const m of html.matchAll( /<pre>([\s\S]*?)<\/pre>/g ) ) {
		const ast = csstree.parse( textOf( m[ 1 ] ), { onParseError: () => {} } );
		csstree.walk( ast, { visit: 'Rule', enter( rule ) {
			const props = [];
			csstree.walk( rule.block, { visit: 'Declaration', enter: ( d ) => props.push( d.property.toLowerCase() ) } );
			csstree.walk( rule.prelude, { visit: 'Selector', enter( sel ) {
				// One compound selector at a time: the elements it names (`:is()` lists included) and its attributes.
				let compound = { types: [], attrs: [] };
				const flush = () => {
					// `type` beside another attribute only picks the kind of input (`input[type=image i][align=…]`).
					if ( compound.attrs.length > 1 ) {
						compound.attrs = compound.attrs.filter( ( a ) => 'type' !== a );
					}
					compound.attrs.forEach( ( a ) => ( compound.types.length ? compound.types : [ '*' ] ).forEach( ( el ) => out.push( { attribute: a, element: el, css: props } ) ) );
					compound = { types: [], attrs: [] };
				};
				sel.children.forEach( ( n ) => {
					if ( 'Combinator' === n.type ) {
						flush();
					} else if ( 'TypeSelector' === n.type ) {
						compound.types.push( n.name.toLowerCase() );
					} else if ( 'AttributeSelector' === n.type ) {
						compound.attrs.push( n.name.name.toLowerCase() );
					} else if ( 'PseudoClassSelector' === n.type && n.children ) {
						csstree.walk( n, { visit: 'TypeSelector', enter: ( t ) => compound.types.push( t.name.toLowerCase() ) } );
					}
				} );
				flush();
			} } );
		} } );
	}
	return out;
}

// The section's text with every <code> name the spec marks kept as ⟦name⟧ (an attribute or element name is always
// marked; "the following steps" or "dimension attribute source" never is), split into sentences and at section numbers.
const markedSentences = ( html ) => textOf( html.replace( /<code[^>]*>([\s\S]*?)<\/code>/g, ( m, inner ) => `⟦${ inner.replace( /<[^>]+>/g, '' ) }⟧` ) ).split( /(?<=[.:])\s+(?=[A-Z0-9⟦])|\s+(?=\d+\.\d+(?:\.\d+)*\s+[A-Z])/ );

// The elements a phrase names: each marked list ending in "element" or "elements" ("⟦embed⟧, ⟦img⟧, or ⟦object⟧
// elements"), kept to real HTML tag names.
const ELEMENT_LIST = /((?:⟦[a-z0-9]+⟧(?:,\s*(?:and\s+|or\s+)?|\s+(?:and|or)\s+))*⟦[a-z0-9]+⟧)\s+elements?\b/g;
const elementsIn = ( text ) => [ ...new Set( [ ...text.matchAll( ELEMENT_LIST ) ].flatMap( ( m ) => [ ...m[ 1 ].matchAll( /⟦([a-z0-9]+)⟧/g ) ].map( ( x ) => x[ 1 ] ) ).filter( ( w ) => TAGS.has( w ) ) ) ];

// Forms 2 and 3: the sentences that name an attribute and the quoted properties it becomes. The attributes are the
// marked "⟦name⟧ attribute(s)" before the verb, except a condition ("with a ⟦type⟧ attribute in the … state"); the
// elements come from the words before the verb, else from the whole sentence (so "of any ⟦td⟧ and ⟦th⟧ elements", the
// cells a table's cellpadding reaches, never claims the attribute), else from the sentence before ("the element"). A
// quirks-mode exception is no hint of its own.
export function proseHints( html ) {
	const out = [];
	let previous = '';
	for ( const s of markedSentences( html ) ) {
		const before = previous;
		previous = s;
		if ( ! /presentational hint|\bmaps? to the\b/.test( s ) || /^When the text below says|^In quirks mode/.test( s ) ) {
			continue;
		}
		const verb = s.search( /\bmaps? to the\b|presentational hint/ );
		const attrs = [ ...s.slice( 0, verb ).matchAll( /(with an? )?⟦([a-z-]+)⟧(?: and ⟦([a-z-]+)⟧)? attributes?\b/g ) ].filter( ( m ) => ! m[ 1 ] ).flatMap( ( m ) => [ m[ 2 ], m[ 3 ] ].filter( Boolean ) );
		if ( ! attrs.length ) {
			continue;
		}
		// "…if the element has a ⟦wrap⟧ attribute" names its element in the sentence before.
		const elements = [ s.slice( 0, verb ), s, before ].map( elementsIn ).find( ( e ) => e.length ) || [];
		// A quoted property, never a quoted value ("its 'text-align' property set to 'left'").
		const props = [ ...new Set( [ ...s.matchAll( /(set to |to the value )?'([a-z-]+)'/g ) ].filter( ( x ) => ! x[ 1 ] ).map( ( x ) => x[ 2 ] ).filter( isProperty ) ) ];
		if ( /aspect-ratio property/.test( s ) && ! props.includes( 'aspect-ratio' ) ) {
			props.push( 'aspect-ratio' );
		}
		if ( ! elements.length || ! props.length ) {
			continue;
		}
		const paired = /respectively/.test( s ) && attrs.length === props.length;
		attrs.forEach( ( a, i ) => elements.forEach( ( el ) => out.push( { attribute: a, element: el, css: paired ? [ props[ i ] ] : props } ) ) );
	}
	return out;
}

// Form 4: the body element's margin table ("Property | Source" rows).
export function bodyMarginHints( html ) {
	const text = textOf( html );
	const at = text.indexOf( 'maps to the pixel length property on the body element' );
	if ( at < 0 ) {
		return [];
	}
	const table = text.slice( at, at + 900 );
	const out = [];
	for ( const row of table.matchAll( /((?:'[a-z-]+',? ?(?:and )?)+)((?:The body element's (?:container frame element's )?[a-z]+ attribute ?)+)/g ) ) {
		const props = [ ...row[ 1 ].matchAll( /'([a-z-]+)'/g ) ].map( ( x ) => x[ 1 ] ).filter( isProperty );
		[ ...row[ 2 ].matchAll( /The body element's ([a-z]+) attribute/g ) ].forEach( ( x ) => out.push( { attribute: x[ 1 ], element: 'body', css: props } ) );
	}
	return out;
}

// Every hint, one entry per attribute and element, its properties merged and sorted.
export function presentationalHints( html ) {
	const merged = new Map();
	for ( const h of [ ...cssBlockHints( html ), ...proseHints( html ), ...bodyMarginHints( html ) ] ) {
		const k = `${ h.element }.${ h.attribute }`;
		merged.set( k, { attribute: h.attribute, element: h.element, css: [ ...new Set( [ ...( merged.get( k )?.css || [] ), ...h.css ] ) ].sort() } );
	}
	return [ ...merged.values() ].sort( ( a, b ) => ( `${ a.element }.${ a.attribute }` < `${ b.element }.${ b.attribute }` ? -1 : 1 ) );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const [ file, flag ] = process.argv.slice( 2 );
	if ( ! file || ! fs.existsSync( file ) ) {
		console.error( 'usage: node tools/presentational-hints.mjs <saved rendering.html> [--write]' );
		process.exit( 2 );
	}
	const entries = presentationalHints( fs.readFileSync( file, 'utf8' ) );
	entries.forEach( ( e ) => console.log( `${ e.element }[${ e.attribute }] → ${ e.css.join( ', ' ) }` ) );
	if ( '--write' === flag ) {
		fs.writeFileSync( HINTS_FILE, `${ JSON.stringify( { source: SOURCE, read: new Date().toISOString().slice( 0, 10 ), entries }, null, '\t' ) }\n` );
		console.log( `wrote ${ entries.length } entries to ${ HINTS_FILE }` );
	}
}
