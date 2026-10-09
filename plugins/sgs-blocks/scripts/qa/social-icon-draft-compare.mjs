#!/usr/bin/env node
// Measures the footer social icons of two design drafts and the SGS QA rows that reproduce them, at rest, with :hover forced
// and with :focus-visible forced, at 1440 and 375, and prints every property side by side.
//
//   node scripts/qa/social-icon-draft-compare.mjs --live-url <page url> [--out <file.json>] [--widths 1440,375]
//   node scripts/qa/social-icon-draft-compare.mjs --local-html <file.html> ...   (a locally rendered page)
//
// The drafts are served by `python -m http.server <port>` inside each draft folder (tests/fixtures/social-icon-drafts.json
// names the ports). Exit code 1 when a property differs and is not in EXPLAINED below.
import fs from 'fs';
import { chromium } from 'playwright';
import { measureAll } from './lib/social-icon-measure.mjs';
import { DRAFTS, draftTargets, liveTargets, openDraft } from './lib/social-icon-targets.mjs';

const args = process.argv.slice( 2 );
const arg = ( name ) => ( args.includes( name ) ? args[ args.indexOf( name ) + 1 ] : null );
const liveUrl = arg( '--live-url' );
const localHtml = arg( '--local-html' );
const outFile = arg( '--out' );
const widths = ( arg( '--widths' ) || '1440,375' ).split( ',' ).map( Number );
if ( ! liveUrl && ! localHtml ) {
	console.error( 'Give --live-url <url> or --local-html <file>.' );
	process.exit( 2 );
}

// Differences that stay by design, matched on the comparison key (property path), with the reason.
const EXPLAINED = [
	[ /^(rest|hover|focus)\.glyph\.(fill|stroke|strokeWidth)$/, 'glyph artwork: SGS draws its registry/Lucide glyph, the draft its own path; paste the draft SVG as a custom glyph to match it' ],
	[ /^focus\.link\.outline/, 'focus ring: SGS paints one visible, token-coloured ring for every icon (accessibility); the draft uses its own ring or the browser default' ],
	[ /^focus\.(paint\.(width|height|boxShadow|transform)|glyph\.width)$/, 'keyboard focus gets the hover treatment (move, growth, shadow), as every SGS hover rule does; the draft shows only a ring on focus' ],
	[ /^(rest|hover|focus)\.paint\.transition\.extra/, 'SGS also transitions colour and border colour; they never change on hover in this style' ],
];

const rgba = ( css ) => {
	const m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec( css.trim() );
	if ( m ) {
		const a = m[ 4 ] === undefined ? 1 : m[ 4 ].endsWith( '%' ) ? parseFloat( m[ 4 ] ) / 100 : parseFloat( m[ 4 ] );
		return [ Math.round( +m[ 1 ] ), Math.round( +m[ 2 ] ), Math.round( +m[ 3 ] ), Math.round( a * 100 ) / 100 ];
	}
	const c = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/.exec( css.trim() );
	if ( c ) {
		return [ Math.round( c[ 1 ] * 255 ), Math.round( c[ 2 ] * 255 ), Math.round( c[ 3 ] * 255 ), c[ 4 ] === undefined ? 1 : Math.round( c[ 4 ] * 100 ) / 100 ];
	}
	return null;
};
const colourKey = ( css ) => {
	const v = rgba( css );
	return v ? `rgba(${ v.join( ',' ) })` : css;
};
/** Every colour function in a value (a box-shadow, a gradient) as rgba(r,g,b,a), whitespace collapsed. */
const normaliseValue = ( value ) =>
	String( value )
		.replace( /(?:rgba?|color)\([^()]*\)/g, ( m ) => colourKey( m ) )
		.replace( /\s+/g, ' ' )
		.trim();
const matrix = ( css ) => {
	if ( ! css || 'none' === css ) {
		return [ 1, 0, 0, 1, 0, 0 ];
	}
	const m = /^matrix\(([^)]+)\)$/.exec( css );
	return m ? m[ 1 ].split( ',' ).map( Number ) : null;
};
const close = ( a, b, tol ) => Math.abs( a - b ) <= tol;
const fullRound = ( radius, size ) => '50%' === radius || parseFloat( radius ) >= size / 2 - 0.01;

/** [key, draftValue, liveValue, equal] rows for one state of one icon. */
function compareState( state, d, l ) {
	const rows = [];
	const add = ( key, dv, lv, equal ) => rows.push( { key: `${ state }.${ key }`, draft: dv, live: lv, equal } );
	const dp = d.paint;
	const lp = l.paint;
	add( 'paint.width', dp.rect.width.toFixed( 2 ), lp.rect.width.toFixed( 2 ), close( dp.rect.width, lp.rect.width, 0.05 ) );
	add( 'paint.height', dp.rect.height.toFixed( 2 ), lp.rect.height.toFixed( 2 ), close( dp.rect.height, lp.rect.height, 0.05 ) );
	add( 'paint.borderTopWidth', dp.borderTopWidth, lp.borderTopWidth, dp.borderTopWidth === lp.borderTopWidth );
	if ( parseFloat( dp.borderTopWidth ) > 0 ) {
		add( 'paint.borderTopStyle', dp.borderTopStyle, lp.borderTopStyle, dp.borderTopStyle === lp.borderTopStyle );
		add( 'paint.borderTopColor', colourKey( dp.borderTopColor ), colourKey( lp.borderTopColor ), colourKey( dp.borderTopColor ) === colourKey( lp.borderTopColor ) );
	}
	add( 'paint.round', fullRound( dp.borderTopLeftRadius, 44 ) ? 'circle' : dp.borderTopLeftRadius, fullRound( lp.borderTopLeftRadius, 44 ) ? 'circle' : lp.borderTopLeftRadius, fullRound( dp.borderTopLeftRadius, 44 ) === fullRound( lp.borderTopLeftRadius, 44 ) );
	// Under an opaque gradient ground the flat colour is never seen (SGS keeps the brand colour there as the fallback).
	const gradientGround = dp.backgroundImage.includes( 'gradient' ) && normaliseValue( dp.backgroundImage ) === normaliseValue( lp.backgroundImage );
	add( 'paint.backgroundColor', colourKey( dp.backgroundColor ), gradientGround ? `${ colourKey( dp.backgroundColor ) } (under the gradient: ${ colourKey( lp.backgroundColor ) })` : colourKey( lp.backgroundColor ), gradientGround || colourKey( dp.backgroundColor ) === colourKey( lp.backgroundColor ) );
	add( 'paint.backgroundImage', normaliseValue( dp.backgroundImage ), normaliseValue( lp.backgroundImage ), normaliseValue( dp.backgroundImage ) === normaliseValue( lp.backgroundImage ) );
	add( 'paint.color', colourKey( dp.color ), colourKey( lp.color ), colourKey( dp.color ) === colourKey( lp.color ) );
	add( 'paint.boxShadow', normaliseValue( dp.boxShadow ), normaliseValue( lp.boxShadow ), normaliseValue( dp.boxShadow ) === normaliseValue( lp.boxShadow ) );
	const dm = matrix( dp.transform );
	const lm = matrix( lp.transform );
	add( 'paint.transform', dm ? dm.map( ( n ) => +n.toFixed( 3 ) ).join( ',' ) : dp.transform, lm ? lm.map( ( n ) => +n.toFixed( 3 ) ).join( ',' ) : lp.transform, !! dm && !! lm && dm.every( ( n, i ) => close( n, lm[ i ], 0.01 ) ) );
	add( 'paint.opacity', dp.opacity, lp.opacity, dp.opacity === lp.opacity );
	add( 'paint.cursor', dp.cursor, lp.cursor, dp.cursor === lp.cursor );
	// Transition: every property the draft transitions must match in duration and easing; SGS may transition more.
	const split = ( t ) => {
		const props = t.property.split( ',' ).map( ( s ) => s.trim() );
		const dur = t.duration.split( ',' ).map( ( s ) => s.trim() );
		const timing = t.timing.split( /,(?![^(]*\))/ ).map( ( s ) => s.trim() );
		const map = {};
		props.forEach( ( p, i ) => {
			map[ p ] = `${ dur[ i % dur.length ] } ${ timing[ i % timing.length ] }`;
		} );
		return map;
	};
	const dt = split( dp.transition );
	const lt = split( lp.transition );
	for ( const [ prop, value ] of Object.entries( dt ) ) {
		const ours = lt[ prop ] || ( 'background' === prop ? lt[ 'background-color' ] : undefined ) || ( 'all' === lt.all ? lt.all : undefined );
		add( `paint.transition.${ prop }`, value, ours || 'none', value === ours );
	}
	const extra = Object.keys( lt ).filter( ( p ) => ! ( p in dt ) && ! ( 'background-color' === p && 'background' in dt ) );
	if ( extra.length ) {
		add( 'paint.transition.extra', 'none', extra.join( '+' ), false );
	}
	const dg = d.glyph;
	const lg = l.glyph;
	add( 'glyph.width', dg.rect.width.toFixed( 2 ), lg.rect.width.toFixed( 2 ), close( dg.rect.width, lg.rect.width, 0.05 ) );
	add( 'glyph.fill', colourKey( dg.fill ), colourKey( lg.fill ), colourKey( dg.fill ) === colourKey( lg.fill ) );
	add( 'glyph.stroke', colourKey( dg.stroke ), colourKey( lg.stroke ), colourKey( dg.stroke ) === colourKey( lg.stroke ) );
	add( 'glyph.strokeWidth', dg.strokeWidth, lg.strokeWidth, dg.strokeWidth === lg.strokeWidth );
	if ( 'rest' === state ) {
		// The draft's link IS the circle; SGS's link wraps it with a 44px minimum, so only the resting size is comparable.
		add( 'link.width', d.link.rect.width.toFixed( 2 ), l.link.rect.width.toFixed( 2 ), close( d.link.rect.width, l.link.rect.width, 0.05 ) );
		add( 'link.height', d.link.rect.height.toFixed( 2 ), l.link.rect.height.toFixed( 2 ), close( d.link.rect.height, l.link.rect.height, 0.05 ) );
	}
	if ( 'focus' === state ) {
		add( 'link.outlineStyle', `${ d.link.outlineStyle } ${ d.link.outlineWidth } ${ colourKey( d.link.outlineColor ) } +${ d.link.outlineOffset }`, `${ l.link.outlineStyle } ${ l.link.outlineWidth } ${ colourKey( l.link.outlineColor ) } +${ l.link.outlineOffset }`, `${ d.link.outlineStyle } ${ d.link.outlineWidth } ${ colourKey( d.link.outlineColor ) } ${ d.link.outlineOffset }` === `${ l.link.outlineStyle } ${ l.link.outlineWidth } ${ colourKey( l.link.outlineColor ) } ${ l.link.outlineOffset }` );
	}
	add( 'link.cursor', d.link.cursor, l.link.cursor, d.link.cursor === l.link.cursor );
	return rows;
}

const explainedBy = ( key ) => EXPLAINED.find( ( [ re ] ) => re.test( key ) )?.[ 1 ];

const browser = await chromium.launch( { channel: 'chrome' } );
const report = [];
let unexplained = 0;
for ( const key of Object.keys( DRAFTS ) ) {
	for ( const width of widths ) {
		const dPage = await openDraft( browser, key, width );
		const draft = await measureAll( dPage, draftTargets( key ) );
		await dPage.close();
		const lPage = await browser.newPage( { viewport: { width, height: 900 } } );
		if ( localHtml ) {
			await lPage.goto( `file:///${ localHtml.replace( /\\/g, '/' ) }`, { waitUntil: 'load' } );
		} else {
			await lPage.goto( liveUrl, { waitUntil: 'networkidle' } );
		}
		await lPage.waitForTimeout( 800 );
		const live = await measureAll( lPage, liveTargets( key ) );
		await lPage.close();
		const names = DRAFTS[ key ].icons;
		const gap = ( set ) => names.slice( 1 ).map( ( n, i ) => +( set[ n ].rest.paint.rect.left - set[ names[ i ] ].rest.paint.rect.left - set[ names[ i ] ].rest.paint.rect.width ).toFixed( 2 ) );
		const entry = { draft: key, width, icons: {}, gap: { draft: null, live: null } };
		if ( names.every( ( n ) => draft[ n ] && live[ n ] ) ) {
			entry.gap = { draft: gap( draft ), live: gap( live ) };
		}
		for ( const n of names ) {
			if ( ! draft[ n ] || ! live[ n ] ) {
				entry.icons[ n ] = { missing: ! draft[ n ] ? 'draft' : 'live' };
				unexplained++;
				continue;
			}
			entry.icons[ n ] = [];
			for ( const state of [ 'rest', 'hover', 'focus' ] ) {
				for ( const row of compareState( state, draft[ n ][ state ], live[ n ][ state ] ) ) {
					const reason = row.equal ? '' : explainedBy( row.key ) || '';
					if ( ! row.equal && ! reason ) {
						unexplained++;
					}
					entry.icons[ n ].push( { ...row, reason } );
				}
			}
		}
		report.push( entry );
	}
}
await browser.close();

for ( const entry of report ) {
	console.log( `\n== ${ DRAFTS[ entry.draft ].label } @ ${ entry.width }px  gap draft ${ JSON.stringify( entry.gap.draft ) } live ${ JSON.stringify( entry.gap.live ) }` );
	for ( const [ name, rows ] of Object.entries( entry.icons ) ) {
		if ( ! Array.isArray( rows ) ) {
			console.log( `  ${ name }: MISSING on ${ rows.missing }` );
			continue;
		}
		const same = rows.filter( ( r ) => r.equal ).length;
		console.log( `  ${ name }: ${ same }/${ rows.length } properties identical` );
		for ( const r of rows.filter( ( x ) => ! x.equal ) ) {
			console.log( `    ${ r.reason ? 'explained' : 'DIFFERENT ' }  ${ r.key.padEnd( 38 ) } draft: ${ r.draft }  |  live: ${ r.live }${ r.reason ? `   [${ r.reason }]` : '' }` );
		}
	}
	if ( entry.gap.draft && JSON.stringify( entry.gap.draft ) !== JSON.stringify( entry.gap.live ) ) {
		console.log( '    DIFFERENT  gap between icons' );
		unexplained++;
	}
}
if ( outFile ) {
	fs.writeFileSync( outFile, JSON.stringify( report, null, 1 ) );
}
console.log( `\n${ unexplained } unexplained difference(s).` );
process.exit( unexplained ? 1 : 0 );
