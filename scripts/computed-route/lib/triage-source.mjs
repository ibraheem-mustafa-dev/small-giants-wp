// Triage's source pass (B1), string search only (no PHP or CSS parsing): what a block's own render.php and style.css say
// about a row's property and settings, and the PHP helpers that render.php reaches (sgs_* functions, classes it calls
// statically or constructs, includes/ files it requires, then the same from those helpers, two hops deep), so CSS a
// shared helper emits (a container's gap from helpers-container.php::sgs_container_gap_value) is found where it lives.
import { splitProperty } from './resolve.mjs';
import { cssProp } from './solve-rows.mjs';

const camel = ( s ) => s.replace( /-([a-z])/g, ( m, c ) => c.toUpperCase() );
// The subject (last compound) of each selector in a list.
const subjects = ( sel ) => sel.replace( /\([^()]*\)/g, '' ).replace( /\([^()]*\)/g, '' ).split( ',' ).map( ( x ) => x.trim().split( /\s*[\s>+~]\s*/ ).pop() );

// The text from the first "{" at or after `from` to its matching "}" (strings and comments are not skipped: a string
// search, good enough to bound a function body).
function braceBody( text, from ) {
	const open = text.indexOf( '{', from );
	if ( -1 === open ) {
		return '';
	}
	for ( let i = open, depth = 0; i < text.length; i++ ) {
		depth += '{' === text[ i ] ? 1 : ( '}' === text[ i ] ? -1 : 0 );
		if ( 0 === depth ) {
			return text.slice( open, i + 1 );
		}
	}
	return text.slice( open );
}

// The symbols one PHP file defines: { functions: { name: { file, text } }, classes: { name: { file, text } } }. A
// function's text is its body; a class's is the whole file (its methods call each other).
export function phpSymbols( text, file ) {
	const out = { functions: {}, classes: {} };
	for ( const m of text.matchAll( /\bfunction\s+(sgs_\w+)\s*\(/g ) ) {
		out.functions[ m[ 1 ] ] = { file, text: braceBody( text, m.index ) };
	}
	for ( const m of text.matchAll( /^\s*(?:final\s+|abstract\s+)?class\s+([A-Za-z_]\w*)/gm ) ) {
		out.classes[ m[ 1 ] ] = { file, text };
	}
	return out;
}

// Merges the symbols of many files into one index (the first definition of a name wins, as PHP's function_exists
// guards make it).
export function helperIndex( files ) {
	const index = { functions: {}, classes: {}, files: {} };
	for ( const { file, text } of files ) {
		const s = phpSymbols( text, file );
		index.files[ file ] = text;
		Object.entries( s.functions ).forEach( ( [ k, v ] ) => ( index.functions[ k ] ??= v ) );
		Object.entries( s.classes ).forEach( ( [ k, v ] ) => ( index.classes[ k ] ??= v ) );
	}
	return index;
}

// What a PHP text calls: sgs_* functions, classes used as Name:: or new Name, and includes/ files it requires.
export function callsIn( text ) {
	const uniq = ( a ) => [ ...new Set( a ) ];
	return {
		functions: uniq( [ ...text.matchAll( /\b(sgs_\w+)\s*\(/g ) ].map( ( m ) => m[ 1 ] ) ),
		classes: uniq( [ ...text.matchAll( /\b(?:new\s+\\?)?([A-Z][A-Za-z0-9_]*(?:\\[A-Z][A-Za-z0-9_]*)*)(?:::|\s*\()/g ) ].filter( ( m ) => m[ 0 ].includes( '::' ) || /^new/.test( m[ 0 ] ) ).map( ( m ) => m[ 1 ].split( '\\' ).pop() ) ),
		requires: uniq( [ ...text.matchAll( /require(?:_once)?[^;]*?['"]\/?includes\/([\w./-]+\.php)['"]/g ) ].map( ( m ) => `includes/${ m[ 1 ] }` ) ),
	};
}

// The helper sources a block's PHP reaches, nearest first: [{ file, symbol, text }] (symbol: a function or class name,
// or the file for a required file). depth 2 follows the helpers' own calls once more.
export function helperSources( entries, index, depth = 2 ) {
	const seen = new Set();
	const out = [];
	let frontier = entries;
	for ( let hop = 0; hop < depth && frontier.length; hop++ ) {
		const next = [];
		for ( const text of frontier ) {
			const c = callsIn( text );
			const found = [
				...c.functions.map( ( n ) => index.functions[ n ] && { ...index.functions[ n ], symbol: n } ),
				...c.classes.map( ( n ) => index.classes[ n ] && { ...index.classes[ n ], symbol: n } ),
				...c.requires.map( ( f ) => undefined !== index.files[ f ] && { file: f, symbol: f, text: index.files[ f ] } ),
			].filter( Boolean );
			for ( const h of found ) {
				const key = `${ h.file }::${ h.symbol }`;
				if ( ! seen.has( key ) ) {
					seen.add( key );
					out.push( h );
					next.push( h.text );
				}
			}
		}
		frontier = next;
	}
	return out;
}

// Source evidence for one issue: for each block involved (the row's own and its enclosing blocks), whether render.php
// mentions each setting name; which style.css rules name the element's class (the last .sgs- class of its path, else
// the block root) and declare the property or its shorthand; and each helper render.php reaches that mentions a setting
// name or emits the property ("gap:" in a string), cited as file::symbol. ctx: { nodeFor(ref), readSource(slug, file),
// blockPhp?(slug) → the block folder's other PHP texts, helpers?: helperIndex(...) }.
export function sourcePass( issue, names, ctx ) {
	const r = issue.rows[ 0 ];
	const prop = cssProp( r.key );
	const { short } = splitProperty( prop );
	const blocks = [ ...new Set( [ r.ref && ctx.nodeFor( r.ref )?.name, ...( r.owners || [] ).map( ( o ) => ctx.nodeFor( o.ref )?.name ) ].filter( Boolean ) ) ];
	const terms = [ ...new Set( [ ...names, camel( prop ), camel( short ) ] ) ];
	const props = [ ...new Set( [ prop, short ] ) ];
	const emits = new RegExp( `['"{;\\s](${ props.map( ( p ) => p.replace( /-/g, '\\-' ) ).join( '|' ) })\\s*:`, 'g' );
	const out = { render: [], rules: [], helpers: [] };
	const cited = new Set();
	for ( const block of blocks ) {
		const slug = block.replace( /^[^/]+\//, '' );
		const php = ctx.readSource( slug, 'render.php' );
		if ( null !== php ) {
			out.render.push( { file: `${ slug }/render.php`, mentions: terms.filter( ( t ) => php.includes( t ) ), absent: terms.filter( ( t ) => ! php.includes( t ) ) } );
			// A helper counts when it reads one of the row's settings (its name as a quoted key, 'gap') or emits the
			// property; each helper is cited once per issue, and a file reached both as a class and as a required file is
			// cited by its class.
			for ( const h of ctx.helpers ? helperSources( [ php, ...( ctx.blockPhp?.( slug ) || [] ) ], ctx.helpers ) : [] ) {
				const mentions = [ ...new Set( names ) ].filter( ( t ) => h.text.includes( `'${ t }'` ) || h.text.includes( `"${ t }"` ) );
				const declares = [ ...h.text.matchAll( emits ) ].slice( 0, 3 ).map( ( m ) => h.text.slice( Math.max( 0, m.index - 40 ), m.index + 60 ).replace( /\s+/g, ' ' ).trim() );
				if ( ( mentions.length || declares.length ) && ! cited.has( `${ h.file }::${ h.symbol }` ) && ! ( h.symbol === h.file && cited.has( h.file ) ) ) {
					cited.add( h.file ).add( `${ h.file }::${ h.symbol }` );
					out.helpers.push( { block: slug, cite: `${ h.file }::${ h.symbol }`, mentions, declares } );
				}
			}
		}
		const css = ctx.readSource( slug, 'style.css' );
		if ( null === css ) {
			continue;
		}
		const cls = ( String( r.path || '' ).match( /\.sgs-[\w-]+/g ) || [] ).pop() || `.sgs-${ slug }`;
		const named = new RegExp( `${ cls.replace( /[.-]/g, '\\$&' ) }(?![\\w-])` );
		const declares = new RegExp( `(?:^|;)\\s*(${ props.map( ( p ) => p.replace( /-/g, '\\-' ) ).join( '|' ) })\\s*:([^;]*)` );
		for ( const m of css.replace( /\/\*[\s\S]*?\*\//g, '' ).matchAll( /([^{}]+)\{([^{}]*)\}/g ) ) {
			const d = declares.exec( m[ 2 ] );
			if ( d && subjects( m[ 1 ] ).some( ( c ) => named.test( c ) && ( !! r.pseudo || ! c.includes( '::' ) ) ) ) {
				out.rules.push( { file: `${ slug }/style.css`, selector: m[ 1 ].trim().replace( /\s+/g, ' ' ), declaration: `${ d[ 1 ] }:${ d[ 2 ].trim() }` } );
			}
		}
	}
	return out;
}
