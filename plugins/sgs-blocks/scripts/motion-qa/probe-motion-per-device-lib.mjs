/**
 * Shared helpers for probe-motion-per-device.mjs (Spec 38A unit M3.9): the expectations read from the fixture tree, and
 * the pure judges. The live checks and `--self-test` run the same judges, so a judge that cannot fail is caught offline,
 * and each live check's negative control feeds its judge a deliberately wrong expected value that must come out red.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { FIXTURE_DIR, near, parseTranslate, isRest } from './probe-motion-model-lib.mjs';

export const FIXTURE_FILE = path.join( FIXTURE_DIR, 'motion-per-device.json' );

/** Every block in a tree whose className contains the given token. */
function findBlock( blocks, token ) {
	for ( const b of blocks ) {
		const cls = ( b.attributes && b.attributes.className ) || '';
		if ( cls.split( /\s+/ ).includes( token ) ) return b;
		const inner = findBlock( b.innerBlocks || [], token );
		if ( inner ) return inner;
	}
	return null;
}

const num = ( v ) => ( typeof v === 'number' ? v : parseFloat( String( v ) ) );

/**
 * The values the fixture stores, so the probe never restates them. Entrance distances are the Desktop, Tablet and Mobile
 * `translateY` of the two `m39-dev-*` headings (a cleared Mobile is null); tilt angles are each card's `restRotate`.
 */
export function loadExpectations( file = FIXTURE_FILE ) {
	const tree = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	const entrance = ( token ) => {
		const base = findBlock( tree, token ).attributes.sgsMotion.elements.root.entrance.base;
		const dev = base.devices || {};
		return { desktop: num( base.values.from.translateY ), tablet: dev.tablet?.from ? num( dev.tablet.from.translateY ) : null, mobile: dev.mobile?.from ? num( dev.mobile.from.translateY ) : null };
	};
	const hover = ( token ) => findBlock( tree, token ).attributes.sgsMotion.elements.root.hover.state.values;
	const easing = ( token ) => hover( token ).easing;
	const tilt = ( token ) => {
		const v = hover( token );
		return { rest: num( v.restRotate ), hover: num( v.rotate ), x: num( v.translateX ), y: num( v.translateY ), easing: v.easing };
	};
	const part = Object.values( findBlock( tree, 'm39-media' ).attributes.sgsMotion.elements )[ 0 ];
	const media = part.hover.state.values;
	return {
		all: entrance( 'm39-dev-all' ),
		cleared: entrance( 'm39-dev-cleared' ),
		bezier: easing( 'm39-ease-bezier' ),
		linear: easing( 'm39-ease-linear' ),
		media: { y: num( media.translateY ), scale: num( media.scale ) },
		cards: [ 'a', 'b', 'c' ].map( ( k ) => ( { sel: `.m39-tilt-${ k }`, ...tilt( `m39-tilt-${ k }` ) } ) ),
		polaroid: { sel: '.m39-polaroid', ...tilt( 'm39-polaroid' ) },
	};
}

/** The expected from-translate at a width: Desktop above 1023px, Tablet to 768, Mobile at 767 and below; a blank tier inherits the wider one. */
export function expectedDistance( set, width ) {
	if ( width <= 767 ) return set.mobile ?? set.tablet ?? set.desktop;
	if ( width <= 1023 ) return set.tablet ?? set.desktop;
	return set.desktop;
}

/** True when a computed custom property (`24px`) equals the expected pixel number. */
export const judgeDistance = ( measured, expected ) => /px$/.test( String( measured ).trim() ) && near( parseFloat( measured ), expected, 0.5 );

/** The numbers in a timing function text, in order (percentages included), so `cubic-bezier(.3,1.4,.5,1)` equals `cubic-bezier(0.3, 1.4, 0.5, 1)`. */
export const easeNumbers = ( text ) => ( String( text ).match( /-?\d*\.?\d+/g ) || [] ).map( Number );

/** The stops of a `linear()` text as [value, position] pairs with every position filled in, so `linear(0, .25 40%, 1)` equals the engine's `linear(0 0%, 0.25 40%, 1 100%)`. */
export function linearStops( text ) {
	const body = /linear\(([^)]*)\)/.exec( text );
	if ( ! body ) return [];
	const stops = [];
	for ( const part of body[ 1 ].split( ',' ) ) {
		const tokens = part.trim().split( /\s+/ );
		const value = parseFloat( tokens[ 0 ] );
		const positions = tokens.slice( 1 ).map( parseFloat );
		if ( positions.length === 0 ) stops.push( [ value, null ] );
		else positions.forEach( ( pos ) => stops.push( [ value, pos ] ) );
	}
	if ( stops.length === 0 ) return [];
	if ( stops[ 0 ][ 1 ] === null ) stops[ 0 ][ 1 ] = 0;
	if ( stops[ stops.length - 1 ][ 1 ] === null ) stops[ stops.length - 1 ][ 1 ] = 100;
	for ( let i = 1; i < stops.length - 1; i++ ) {
		if ( stops[ i ][ 1 ] !== null ) continue;
		let j = i;
		while ( stops[ j ][ 1 ] === null ) j++;
		const from = stops[ i - 1 ][ 1 ];
		const step = ( stops[ j ][ 1 ] - from ) / ( j - i + 1 );
		for ( let k = i; k < j; k++ ) stops[ k ][ 1 ] = from + step * ( k - i + 1 );
	}
	return stops;
}

/** True when every `cubic-bezier()` / `linear()` in a computed transition-timing-function list carries the expected curve, and at least one is present. */
export function judgeEase( computed, expected ) {
	const kind = /^\s*(cubic-bezier|linear)\(/.exec( expected );
	if ( ! kind ) return false;
	const found = String( computed ).match( kind[ 1 ] === 'linear' ? /linear\([^)]*\)/g : /cubic-bezier\([^)]*\)/g ) || [];
	if ( found.length === 0 ) return false;
	if ( kind[ 1 ] === 'linear' ) {
		const want = linearStops( expected );
		return found.every( ( f ) => {
			const got = linearStops( f );
			return got.length === want.length && got.every( ( s, i ) => near( s[ 0 ], want[ i ][ 0 ], 0.001 ) && near( s[ 1 ], want[ i ][ 1 ], 0.01 ) );
		} );
	}
	const want = easeNumbers( expected );
	return found.every( ( f ) => {
		const got = easeNumbers( f );
		return got.length === want.length && got.every( ( v, i ) => near( v, want[ i ], 0.001 ) );
	} );
}

/** Computed `rotate` ("none", "-3deg", "0 0 1 -3deg") in degrees. */
export function parseRotate( value ) {
	if ( ! value || value === 'none' ) return 0;
	const last = String( value ).trim().split( /\s+/ ).pop();
	const n = parseFloat( last );
	if ( /rad$/.test( last ) ) return ( n * 180 ) / Math.PI;
	if ( /turn$/.test( last ) ) return n * 360;
	return n;
}

/** True when a computed rotate is the given angle within half a degree. */
export const judgeRotate = ( value, degrees ) => near( parseRotate( value ), degrees, 0.5 );

/** True when a computed translate is the given x and y within half a pixel. */
export function judgeTranslate( value, x, y ) {
	const t = parseTranslate( value );
	return near( t.x, x, 0.5 ) && near( t.y, y, 0.5 );
}

/** The transform-family reading of one element changed between two readings. */
export const changed = ( before, after ) => [ 'translate', 'scale', 'rotate', 'transform' ].some( ( k ) => before[ k ] !== after[ k ] );

/** True when the media part moved (translate y and scale as stored) and no other part or the root changed. */
export function judgeMediaOnly( reading, expected ) {
	const m = reading.media;
	const lifted = near( parseTranslate( m.after.translate ).y, expected.y, 0.5 ) && near( parseFloat( m.after.scale ), expected.scale, 0.01 );
	return lifted && ! changed( reading.root.before, reading.root.after ) && ! changed( reading.other.before, reading.other.after ) && isRest( m.before.translate );
}

/** True when a list of style-attribute offenders is empty. */
export const judgeNoStyle = ( offenders ) => offenders.length === 0;

/** Pull the per-tier values of one custom property out of the stylesheets' media rules for a scope class; the page-context function. */
export const READ_MEDIA_RULES = ( { classes, property } ) => {
	const buckets = { base: [], tablet: [], mobile: [], other: [] };
	let skipped = 0;
	const visit = ( rules, bucket ) => {
		for ( const rule of rules ) {
			if ( rule.cssRules && rule.media ) {
				const cond = rule.conditionText.replace( /\s+/g, '' );
				visit( rule.cssRules, cond === '(max-width:1023px)' ? 'tablet' : cond === '(max-width:767px)' ? 'mobile' : 'other' );
			} else if ( rule.selectorText && classes.some( ( c ) => rule.selectorText.includes( `.${ c }` ) ) ) {
				const v = rule.style.getPropertyValue( property ).trim();
				if ( v ) buckets[ bucket ].push( v );
			}
		}
	};
	for ( const sheet of document.styleSheets ) {
		try {
			visit( sheet.cssRules, 'base' );
		} catch ( e ) {
			skipped++;
		}
	}
	return { ...buckets, skipped };
};

/** True when the Tablet bucket holds the expected value, the Mobile bucket holds its value (or nothing, when null), and the base holds the Desktop value. */
export function judgeMediaRules( buckets, set ) {
	const has = ( list, v ) => list.some( ( x ) => judgeDistance( x, v ) );
	const mobileOk = set.mobile === null ? buckets.mobile.length === 0 : has( buckets.mobile, set.mobile );
	return has( buckets.base, set.desktop ) && has( buckets.tablet, set.tablet ) && mobileOk;
}

/** The offline self-test: every judge must accept a good measurement and reject a planted bad one. Returns failures. */
export function selfTest() {
	const failures = [];
	const t = ( name, v ) => { if ( v !== true ) failures.push( `${ name }: expected true` ); };
	const f = ( name, v ) => { if ( v !== false ) failures.push( `${ name }: expected false` ); };
	const ex = loadExpectations();
	t( 'fixture all 24/16/8', ex.all.desktop === 24 && ex.all.tablet === 16 && ex.all.mobile === 8 );
	t( 'fixture cleared mobile blank', ex.cleared.mobile === null && ex.cleared.tablet === 16 );
	t( 'cleared 375 inherits tablet', expectedDistance( ex.cleared, 375 ) === 16 && expectedDistance( ex.all, 375 ) === 8 && expectedDistance( ex.all, 768 ) === 16 && expectedDistance( ex.all, 1440 ) === 24 );
	t( 'distance good', judgeDistance( '24px', 24 ) );
	f( 'distance wrong', judgeDistance( '16px', 24 ) );
	t( 'ease normalised', judgeEase( 'cubic-bezier(0.3, 1.4, 0.5, 1), cubic-bezier(0.3, 1.4, 0.5, 1)', 'cubic-bezier(.3,1.4,.5,1)' ) );
	f( 'ease wrong curve', judgeEase( 'cubic-bezier(0.2, 0.9, 0.3, 1.2)', 'cubic-bezier(.3,1.4,.5,1)' ) );
	f( 'ease keyword', judgeEase( 'ease', 'cubic-bezier(.3,1.4,.5,1)' ) );
	t( 'linear()', judgeEase( 'linear(0, 0.25 40%, 1)', 'linear(0, 0.25 40%, 1)' ) );
	t( 'linear() engine form', judgeEase( 'linear(0 0%, 0.25 40%, 1 100%), linear(0 0%, 0.25 40%, 1 100%)', 'linear(0, 0.25 40%, 1)' ) );
	f( 'linear() other position', judgeEase( 'linear(0 0%, 0.25 50%, 1 100%)', 'linear(0, 0.25 40%, 1)' ) );
	f( 'linear() differs', judgeEase( 'linear(0, 0.5 40%, 1)', 'linear(0, 0.25 40%, 1)' ) );
	t( 'rotate parse', judgeRotate( '-3deg', -3 ) && judgeRotate( 'none', 0 ) && judgeRotate( '0 0 1 2deg', 2 ) );
	f( 'rotate wrong', judgeRotate( '-3deg', 2 ) );
	t( 'translate', judgeTranslate( '-4px -6px', -4, -6 ) );
	f( 'translate wrong', judgeTranslate( '-4px -6px', 4, -6 ) );
	const rest = { translate: 'none', scale: 'none', rotate: 'none', transform: 'none' };
	const moved = { ...rest, translate: '0px -8px', scale: '1.06' };
	t( 'media only', judgeMediaOnly( { media: { before: rest, after: moved }, root: { before: rest, after: rest }, other: { before: rest, after: rest } }, ex.media ) );
	f( 'media plus root', judgeMediaOnly( { media: { before: rest, after: moved }, root: { before: rest, after: moved }, other: { before: rest, after: rest } }, ex.media ) );
	f( 'media not moved', judgeMediaOnly( { media: { before: rest, after: rest }, root: { before: rest, after: rest }, other: { before: rest, after: rest } }, ex.media ) );
	t( 'no style', judgeNoStyle( [] ) );
	f( 'style found', judgeNoStyle( [ 'div.x' ] ) );
	const buckets = { base: [ '24px' ], tablet: [ '16px' ], mobile: [ '8px' ] };
	t( 'media rules', judgeMediaRules( buckets, ex.all ) );
	f( 'media rules missing mobile', judgeMediaRules( { ...buckets, mobile: [] }, ex.all ) );
	t( 'cleared has no mobile rule', judgeMediaRules( { ...buckets, mobile: [] }, ex.cleared ) );
	f( 'cleared with a mobile rule', judgeMediaRules( buckets, ex.cleared ) );
	return failures;
}
