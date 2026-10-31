// Whether a draft region is drawn in a review platform's own look (Spec 48 §3.4, FR-48-83; Bean 2026-10-31). A platform's
// block (`sgs/trustpilot-reviews`, `sgs/google-reviews`) paints the platform's own interface with its brand colours locked,
// so platform evidence (its name, a link to it, an image labelled with it) picks that block only where the draft's cards
// are painted in the platform's colours; cards in the client's own style are the testimonial family, the platform summary
// beside them its own blocks. The look is read from paint, never from a name:
//   - the platform's colours: the brand registry's colour for the brand (lib/brand-registry.mjs::paletteBrands), and every
//     colour each of the platform's blocks (the framework DB's `block_identity_facts` platform rows) locks as a custom property on its own root class in its stylesheet (the block's
//     `style.css`: `.sgs-google-reviews { --sgs-gr-star: #fbbc04 }`, `.wp-block-sgs-trustpilot-reviews { --sgs-tp-green:
//     #00B67A }`), read with the pinned css-tree; only saturated colours count (CIELAB chroma above
//     `rules.platformLook.minChroma`), so the greys, white and black every design uses never stand for a platform;
//   - the draft's paint: every colour literal in the colour properties each element declares (lib/element-facts.mjs
//     `declared`, the record's static longhands; a `var()` fallback counts), matched to a platform colour within
//     `rules.platformLook.maxDeltaE` (CIEDE2000; 1 is the palette's "same colour"), and the look is drawn when the region
//     shows `rules.platformLook.minColours` of the platform's colours (all of them, for a platform with fewer): a gold
//     star alone is many clients' own, Google's star yellow with Google's blue is Google's interface.
// A colour a style hole binds to a script value is the logic's, not a declaration, and is not read.
import fs from 'fs';
import path from 'path';
import * as csstree from 'css-tree';
import { colourHex } from './tokens.mjs';
import { hexToLab, hexDistance } from './intake-palette.mjs';
import { paletteBrands } from './brand-registry.mjs';

const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\([^()]*\)/gi;
const chroma = ( hex ) => {
	const lab = hexToLab( hex );
	return Math.hypot( lab.a, lab.b );
};
// The opaque colour literals a CSS value holds (`var(--x, #fbbc04)` holds one), as #rrggbb.
export function colourLiterals( value ) {
	return [ ...String( value ?? '' ).matchAll( COLOUR_LITERAL ) ].map( ( x ) => colourHex( x[ 0 ] ) ).filter( ( h ) => h && 7 === h.length );
}

const sheetCache = new Map();
// The colours a block locks on its own root class: [ { hex, token } ] from `plugins/sgs-blocks/src/blocks/<name>/style.css`
// (a rule whose selector names `.sgs-<name>` or `.wp-block-sgs-<name>`, modifiers included; `:root` and other classes
// never count). An absent stylesheet locks nothing.
export function lockedColours( block, codeRepo ) {
	const name = String( block || '' ).replace( /^sgs\//, '' );
	const file = path.join( codeRepo, 'plugins/sgs-blocks/src/blocks', name, 'style.css' );
	if ( sheetCache.has( file ) ) {
		return sheetCache.get( file );
	}
	const out = [];
	if ( name && fs.existsSync( file ) ) {
		const own = new RegExp( `\\.(?:wp-block-)?sgs-${ name.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }(?![\\w-]|__)` );
		csstree.walk( csstree.parse( fs.readFileSync( file, 'utf8' ) ), {
			visit: 'Rule',
			enter( rule ) {
				if ( ! own.test( csstree.generate( rule.prelude ) ) ) {
					return;
				}
				rule.block.children.forEach( ( d ) => {
					if ( 'Declaration' === d.type && d.property.startsWith( '--' ) ) {
						colourLiterals( 'Raw' === d.value?.type ? d.value.value : csstree.generate( d.value ) ).forEach( ( hex ) => out.push( { hex, token: d.property } ) );
					}
				} );
			},
		} );
	}
	sheetCache.set( file, out );
	return out;
}

// o: { read (lib/element-facts.mjs), brands (paletteBrands), blocksOf( platform ) (the blocks the framework DB says belong to
// the platform: `block_identity_facts` platform rows at yes), codeRepo, rule (rules.platformLook) }. Returns { reason (the rule's), paintOf( platform ) → [ { hex, from } ],
// drawn( elements, platform ) → null | { platform, colours, at (element keys), why } }, or null with no rule.
export function makePlatformLook( { read, brands = [], blocksOf = () => [], codeRepo, rule } ) {
	if ( ! rule ) {
		return null;
	}
	const paints = new Map();
	const paintOf = ( platform ) => {
		if ( ! paints.has( platform ) ) {
			const brand = brands.find( ( b ) => b.slug === platform );
			const list = [
				...colourLiterals( brand?.colour ).map( ( hex ) => ( { hex, from: `brand-registry.json ${ platform } colour` } ) ),
				...blocksOf( platform ).flatMap( ( b ) => lockedColours( b, codeRepo ).map( ( c ) => ( { hex: c.hex, from: `${ b } style.css ${ c.token }` } ) ) ),
			].filter( ( c ) => chroma( c.hex ) > rule.minChroma );
			paints.set( platform, list.filter( ( c, i ) => list.findIndex( ( x ) => x.hex === c.hex ) === i ) );
		}
		return paints.get( platform );
	};
	const props = new RegExp( rule.properties );
	// The elements among `elements` painted in the platform's colours: the look is drawn when they show as many distinct
	// platform colours as `rule.minColours` (or every colour the platform has, when it has fewer).
	const drawn = ( elements, platform ) => {
		const paint = paintOf( platform );
		if ( ! paint.length ) {
			return null;
		}
		const used = new Map();
		const at = [];
		for ( const e of elements ) {
			const hits = Object.entries( read.declared( e ) ).filter( ( [ p ] ) => props.test( p ) ).flatMap( ( [ , v ] ) => colourLiterals( v ) ).map( ( hex ) => ( { hex, c: paint.find( ( c ) => hexDistance( c.hex, hex ) <= rule.maxDeltaE ) } ) ).filter( ( x ) => x.c );
			hits.forEach( ( x ) => used.has( x.c.hex ) || used.set( x.c.hex, { hex: x.hex, from: x.c.from, key: e.key } ) );
			hits.length && at.push( e.key );
		}
		if ( used.size < Math.min( rule.minColours, paint.length ) ) {
			return null;
		}
		const shown = [ ...used.values() ];
		return { platform, colours: shown.map( ( x ) => x.hex ), at, why: `${ at.length } element${ 1 === at.length ? '' : 's' } painted in ${ platform }'s own colours (${ shown.map( ( x ) => `${ x.key } ${ x.hex }, ${ x.from }` ).join( '; ' ) })` };
	};
	return { paintOf, drawn, reason: rule.reason };
}

// The look reader over a skeleton's facts (lib/skeleton-facts.mjs::loadFacts): the brands lib/brand-registry.mjs::paletteBrands
// derives (the registry's, and one per review-platform block), the platform's blocks from the framework DB. null without
// `rules.platformLook`.
export function platformLookOf( { read, facts } ) {
	const brands = paletteBrands( facts.brands, facts.q( "SELECT slug FROM blocks WHERE slug LIKE 'sgs/%-reviews' ORDER BY slug" ).map( ( r ) => r.slug ) );
	const rows = new Map();
	const blocksOf = ( p ) => rows.get( p ) ?? rows.set( p, facts.q( "SELECT DISTINCT block_slug FROM block_identity_facts WHERE fact = 'platform' AND value = ? AND state = 'yes' ORDER BY block_slug", p ).map( ( r ) => r.block_slug ) ).get( p );
	return makePlatformLook( { read, brands, blocksOf, codeRepo: facts.codeRepo, rule: facts.decisions.rules?.platformLook } );
}
