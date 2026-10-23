#!/usr/bin/env node
// Calibration fixture completeness: a setting calibration marks `dead` is often a fixture gap, because the calibration
// fixture never renders the element the setting's CSS rule needs (sgs/icon's hover settings were dead until its fixture
// had a linkUrl, because every hover rule hangs off `.sgs-icon__link`).
//   node tools/fixture-completeness.mjs [--json] [--all] [--blocks a,b] [--cache <dir>] [--src <blocks dir>]
// For each block's dead settings (hover ones; --all for every one) it finds the CSS selectors that consume the setting's
// custom property (render.php names the variable; style.css files across the blocks consume it), compares the classes
// those selectors need with the classes the calibration cache's rendered `elements` hold (the default paint of every
// site, unioned), and classifies the setting:
//   fixture-gap    a required element class was never rendered; the proposal names it and the render.php condition
//   variant-gated  only a modifier class or attribute selector is missing (another attribute value is needed)
//   unexplained    every required class was rendered (or no consumer rule was found): the cause is not a missing element
// Read-only; it changes no fixture and writes nothing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
export const DEFAULT_CACHE = 'C:/Users/Bean/Projects/small-giants-wp/scripts/computed-route/cache';
export const DEFAULT_SRC = path.resolve( ROUTE, '..', '..', 'plugins', 'sgs-blocks', 'src', 'blocks' );

const slugOf = ( block ) => String( block ).replace( /^sgs\//, '' );
const kebab = ( s ) => String( s ).replace( /([a-z0-9])([A-Z])/g, '$1-$2' ).toLowerCase();
const MODIFIER = /--|^has-|^is-|^wp-|^no-/;

// Every { selector, body } rule of a stylesheet, at-rule wrappers descended into, comments removed.
export function cssRules( css ) {
	const text = String( css ).replace( /\/\*[\s\S]*?\*\//g, '' );
	const rules = [];
	let start = 0;
	let i = 0;
	while ( i < text.length ) {
		const c = text[ i ];
		if ( '}' === c || ';' === c ) {
			start = i + 1;
		} else if ( '{' === c ) {
			const prelude = text.slice( start, i ).trim();
			if ( prelude.startsWith( '@' ) ) {
				start = i + 1;
			} else {
				const end = text.indexOf( '}', i );
				if ( end < 0 ) break;
				rules.push( { selector: prelude, body: text.slice( i + 1, end ) } );
				start = end + 1;
				i = end;
			}
		}
		i++;
	}
	return rules;
}

// The classes one selector part needs, with :not( ) arguments removed.
const classesOf = ( part ) => [ ...part.replace( /:not\([^)]*\)/g, '' ).matchAll( /\.(-?[A-Za-z_][\w-]*)/g ) ].map( ( m ) => m[ 1 ] );

// The custom properties render.php ties to a setting: `'attr' => '--var'` maps, and any --var on a line that reads the attribute.
export function varsOf( php, attr ) {
	const vars = new Set();
	for ( const m of php.matchAll( new RegExp( `['"]${ attr }['"]\\s*=>\\s*['"](--[\\w-]+)['"]`, 'g' ) ) ) vars.add( m[ 1 ] );
	for ( const line of php.split( /\r?\n/ ) ) {
		if ( line.includes( `['${ attr }']` ) || line.includes( `["${ attr }"]` ) ) for ( const m of line.matchAll( /--[a-z][\w-]*/g ) ) vars.add( m[ 0 ] );
	}
	return [ ...vars ];
}

// The rules of every style.css under `src` that consume a custom property (`var(--x`), with the block that owns the file.
export function consumers( rulesByBlock, vars ) {
	const out = [];
	for ( const [ block, rules ] of rulesByBlock ) {
		for ( const r of rules ) {
			if ( vars.some( ( v ) => r.body.includes( `var(${ v }` ) ) ) out.push( { block, selector: r.selector } );
		}
	}
	return out;
}

// The rendered class set of a block: every class in an `elements` key of any site's default paint, plus the block's root.
export function renderedClasses( cacheDir, block ) {
	const set = new Set( [ `sgs-${ slugOf( block ) }` ] );
	if ( ! fs.existsSync( cacheDir ) ) return set;
	for ( const d of fs.readdirSync( cacheDir, { withFileTypes: true } ) ) {
		const file = path.join( cacheDir, d.name, `${ slugOf( block ) }.paint.json` );
		if ( ! d.isDirectory() || ! fs.existsSync( file ) ) continue;
		const paint = JSON.parse( fs.readFileSync( file, 'utf8' ) );
		for ( const key of Object.keys( paint.elements || {} ) ) for ( const c of classesOf( key ) ) set.add( c );
	}
	return set;
}

// The render.php condition guarding the line that emits a class: the attribute names of the nearest `if (` above it.
export function emitCondition( php, cls ) {
	const lines = php.split( /\r?\n/ );
	const at = lines.findIndex( ( l ) => l.includes( cls ) );
	if ( at < 0 ) return null;
	for ( let i = at; i >= Math.max( 0, at - 40 ); i-- ) {
		if ( /^\s*(\}\s*)?(else)?if\s*\(/.test( lines[ i ] ) ) return { line: lines[ i ].trim(), attrs: [ ...lines[ i ].matchAll( /\$attributes\[\s*['"](\w+)['"]\s*\]/g ) ].map( ( m ) => m[ 1 ] ) };
	}
	return { line: null, attrs: [] };
}

// One dead setting's verdict.
export function judge( { block, attr, php, rulesByBlock, rendered, phpByBlock = new Map() } ) {
	let vars = varsOf( php, attr );
	// A setting a child block's render.php reads (an accordion's header colours live in accordion-item): that block's
	// variables and stylesheet count as the setting's own.
	const via = new Set();
	if ( ! vars.length ) {
		for ( const [ b, p ] of phpByBlock ) {
			if ( b === block || ! p.includes( `'${ attr }'` ) ) continue;
			const v = varsOf( p, attr );
			if ( v.length ) {
				vars.push( ...v );
				via.add( b );
			}
		}
	}
	if ( ! vars.length ) {
		const k = kebab( attr );
		const names = new Set();
		for ( const rules of rulesByBlock.values() ) for ( const r of rules ) for ( const m of r.body.matchAll( /var\((--[\w-]+)/g ) ) if ( m[ 1 ].endsWith( `-${ k }` ) ) names.add( m[ 1 ] );
		vars = [ ...names ];
	}
	// The block's own stylesheet first; a stylesheet of another block only when render.php names that block (a parent
	// whose settings paint its child blocks, such as social-icons and icon).
	const own = new Map( [ ...rulesByBlock ].filter( ( [ b ] ) => b === block || via.has( b ) ) );
	let hits = consumers( own, vars );
	if ( ! hits.length ) {
		const named = new Map( [ ...rulesByBlock ].filter( ( [ b ] ) => b !== block && ( php.includes( `'${ b }'` ) || php.includes( `"${ b }"` ) || php.includes( `sgs-${ slugOf( b ) }` ) ) ) );
		hits = consumers( named, vars );
	}
	if ( ! hits.length ) return { block, attr, class: 'unexplained', vars, why: 'no style.css rule consumes a custom property of this setting' };
	let best = null;
	for ( const h of hits ) {
		for ( const part of h.selector.split( ',' ) ) {
			const need = [ ...new Set( classesOf( part ) ) ];
			const missing = need.filter( ( c ) => ! rendered.has( c ) );
			const brackets = /\[[^\]]+\]/.test( part.replace( /:not\([^)]*\)/g, '' ) );
			if ( ! missing.length && ! brackets ) return { block, attr, class: 'unexplained', vars, selector: part.trim(), why: `every class of a consuming selector (${ need.map( ( c ) => '.' + c ).join( ' ' ) }) is rendered by the fixture` };
			if ( ! best || missing.length < best.missing.length ) best = { selector: part.trim(), missing, brackets, owner: h.block };
		}
	}
	const elements = best.missing.filter( ( c ) => ! MODIFIER.test( c ) );
	if ( elements.length ) {
		const cond = emitCondition( php, elements[ 0 ] );
		return { block, attr, class: 'fixture-gap', vars, selector: best.selector, missing: elements, proposal: { block, render: elements, whenCondition: cond?.line ?? null, setAttributes: cond?.attrs ?? [] } };
	}
	return { block, attr, class: 'variant-gated', vars, selector: best.selector, missing: best.missing, why: best.brackets && ! best.missing.length ? 'the selector needs an attribute value' : 'the selector needs a modifier class set by another attribute value' };
}

// Runs the check over a cache and a blocks source folder. Options: { cacheDir, srcDir, blocks, all }.
export function check( { cacheDir = DEFAULT_CACHE, srcDir = DEFAULT_SRC, blocks = null, all = false } = {} ) {
	const rulesByBlock = new Map();
	for ( const d of fs.readdirSync( srcDir, { withFileTypes: true } ) ) {
		const css = path.join( srcDir, d.name, 'style.css' );
		if ( d.isDirectory() && fs.existsSync( css ) ) rulesByBlock.set( `sgs/${ d.name }`, cssRules( fs.readFileSync( css, 'utf8' ) ) );
	}
	const phpByBlock = new Map();
	for ( const d of fs.readdirSync( srcDir, { withFileTypes: true } ) ) {
		const p = path.join( srcDir, d.name, 'render.php' );
		if ( d.isDirectory() && fs.existsSync( p ) ) phpByBlock.set( `sgs/${ d.name }`, fs.readFileSync( p, 'utf8' ) );
	}
	const rows = [];
	for ( const f of fs.readdirSync( cacheDir ).filter( ( n ) => n.endsWith( '.json' ) && ! /\.(tree|refused|paint)\.json$/.test( n ) ) ) {
		const cal = JSON.parse( fs.readFileSync( path.join( cacheDir, f ), 'utf8' ) );
		if ( ! Array.isArray( cal.dead ) || ( blocks && ! blocks.includes( cal.block ) ) ) continue;
		const dead = cal.dead.filter( ( a ) => all || /hover/i.test( a ) );
		if ( ! dead.length ) continue;
		const php = phpByBlock.get( cal.block ) || '';
		const rendered = renderedClasses( cacheDir, cal.block );
		for ( const attr of dead ) rows.push( judge( { block: cal.block, attr, php, rulesByBlock, rendered, phpByBlock } ) );
	}
	return rows;
}

// Proposed fixture additions as data: one entry per block and missing class, with the settings it would revive.
export function proposals( rows ) {
	const by = new Map();
	for ( const r of rows.filter( ( x ) => 'fixture-gap' === x.class ) ) {
		const key = `${ r.block }|${ r.proposal.render.join( ' ' ) }|${ r.proposal.setAttributes.join( ',' ) }`;
		if ( ! by.has( key ) ) by.set( key, { block: r.block, render: r.proposal.render, setAttributes: r.proposal.setAttributes, whenCondition: r.proposal.whenCondition, revives: [] } );
		by.get( key ).revives.push( r.attr );
	}
	return [ ...by.values() ];
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const args = process.argv.slice( 2 );
	const val = ( n ) => args[ args.indexOf( n ) + 1 ];
	const rows = check( { cacheDir: args.includes( '--cache' ) ? val( '--cache' ) : DEFAULT_CACHE, srcDir: args.includes( '--src' ) ? val( '--src' ) : DEFAULT_SRC, blocks: args.includes( '--blocks' ) ? val( '--blocks' ).split( ',' ).map( ( b ) => ( b.startsWith( 'sgs/' ) ? b : `sgs/${ b }` ) ) : null, all: args.includes( '--all' ) } );
	if ( args.includes( '--json' ) ) {
		console.log( JSON.stringify( { rows, proposals: proposals( rows ) }, null, 2 ) );
	} else {
		const tally = {};
		for ( const r of rows ) tally[ r.class ] = ( tally[ r.class ] || 0 ) + 1;
		console.log( `${ rows.length } dead settings: ${ Object.entries( tally ).map( ( [ k, n ] ) => `${ n } ${ k }` ).join( ', ' ) }` );
		for ( const r of rows ) console.log( `${ r.class.padEnd( 13 ) } ${ r.block } ${ r.attr }  ${ r.missing ? 'missing ' + r.missing.map( ( c ) => '.' + c ).join( ' ' ) : ( r.why || '' ) }` );
		for ( const p of proposals( rows ) ) console.log( `PROPOSE ${ p.block}: render ${ p.render.map( ( c ) => '.' + c ).join( ' ' ) }${ p.setAttributes.length ? ' by setting ' + p.setAttributes.join( ', ' ) : '' } (revives ${ p.revives.join( ', ' ) })` );
	}
}
