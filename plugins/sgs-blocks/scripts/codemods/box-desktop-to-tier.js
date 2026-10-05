#!/usr/bin/env node
/**
 * Moves the editor canvas's box previews (padding, margin, border-radius and other
 * `{desktop,tablet,mobile}` box objects) from the desktop tier only to the tier the
 * editor is previewing.
 *
 * Rewrites `boxShorthand( X?.desktop[, keys] )` to
 * `tierBoxShorthand( X, previewTier[, keys] )`, adds `tierBoxShorthand` and
 * `usePreviewTier` to the file's `../../utils` import, declares
 * `const previewTier = usePreviewTier();` at the top of the block's `Edit`
 * component, and threads `previewTier` into any top-level helper function that
 * holds a rewritten call (a trailing `previewTier = 'desktop'` parameter, passed
 * at every call site).
 *
 * Blocks whose render.php emits each tier as one whole shorthand (unset sides 0,
 * via sgs_box_object_shorthand / sgs_corner_object_shorthand) get the
 * `wholeBox` flag, so the preview resolves the tier the same way.
 *
 * Usage: node scripts/codemods/box-desktop-to-tier.js [--check]
 *   --check  list every remaining desktop-only box preview in the covered blocks
 *            and exit 1 (no writes).
 */
const fs = require( 'fs' );
const path = require( 'path' );

const BLOCKS = [ 'button', 'countdown-timer', 'heading', 'hero', 'icon', 'icon-list', 'mega-aside', 'timeline' ];
const WHOLE_BOX = [ 'button', 'heading', 'hero', 'icon', 'icon-list', 'timeline' ];
const TIER_CALL_RE = /\btierBoxShorthand\(\s*([A-Za-z_$][\w$.]*),\s*previewTier,\s*(\[[^\]]*\])\s*\)/g;
const BLOCKS_DIR = path.join( __dirname, '..', '..', 'src', 'blocks' );
const CALL_RE = /\bboxShorthand\(\s*([A-Za-z_$][\w$.]*)\?\.desktop\s*(?:,\s*(\[[^\]]*\]))?\s*\)/g;

/** Index just past the parenthesis that closes the one opened at `open`. */
function closeParen( src, open ) {
	let depth = 0;
	for ( let i = open; i < src.length; i++ ) {
		if ( '(' === src[ i ] ) {
			depth++;
		} else if ( ')' === src[ i ] ) {
			depth--;
			if ( 0 === depth ) {
				return i;
			}
		}
	}
	return -1;
}

/** Top-level `function name( … ) {` declarations with their body ranges. */
function topLevelFunctions( src ) {
	const out = [];
	const re = /^(?:export\s+(?:default\s+)?)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
	let m;
	while ( ( m = re.exec( src ) ) ) {
		const open = m.index + m[ 0 ].length - 1;
		const close = closeParen( src, open );
		const bodyOpen = src.indexOf( '{', close );
		let depth = 0;
		let end = bodyOpen;
		for ( let i = bodyOpen; i < src.length; i++ ) {
			if ( '{' === src[ i ] ) {
				depth++;
			} else if ( '}' === src[ i ] ) {
				depth--;
				if ( 0 === depth ) {
					end = i;
					break;
				}
			}
		}
		out.push( { name: m[ 1 ], start: m.index, paramsClose: close, bodyOpen, end } );
	}
	return out;
}

function addUtilsImports( src, names ) {
	const re = /import\s*\{([^}]*)\}\s*from\s*(['"])\.\.\/\.\.\/utils\2;/;
	const m = src.match( re );
	if ( m ) {
		const have = m[ 1 ].split( ',' ).map( ( s ) => s.trim() ).filter( Boolean );
		const missing = names.filter( ( n ) => ! have.includes( n ) );
		if ( ! missing.length ) {
			return src;
		}
		const multiline = m[ 1 ].includes( '\n' );
		const inner = multiline
			? m[ 1 ].replace( /\s*$/, '' ) + ( m[ 1 ].trim().endsWith( ',' ) ? '' : ',' ) + missing.map( ( n ) => `\n\t${ n },` ).join( '' ) + '\n'
			: ` ${ [ ...have, ...missing ].join( ', ' ) } `;
		return src.replace( re, `import {${ inner }} from ${ m[ 2 ] }../../utils${ m[ 2 ] };` );
	}
	const lastImport = [ ...src.matchAll( /^import[\s\S]*?from\s*['"][^'"]+['"];\s*$/gm ) ].pop();
	const at = lastImport ? lastImport.index + lastImport[ 0 ].length : 0;
	return src.slice( 0, at ) + `\nimport { ${ names.join( ', ' ) } } from '../../utils';` + src.slice( at );
}

/** Whole-box blocks: add the wholeBox flag to every rewritten call that lacks it. */
function markWholeBox( src ) {
	return src.replace( TIER_CALL_RE, ( _m, expr, keys ) => `tierBoxShorthand( ${ expr }, previewTier, ${ keys }, true )` );
}

function transform( src ) {
	if ( ! CALL_RE.test( src ) ) {
		return src;
	}
	CALL_RE.lastIndex = 0;
	// Helpers (not Edit) that hold a call get a previewTier parameter.
	const fns = topLevelFunctions( src );
	const helpers = fns.filter( ( f ) => 'Edit' !== f.name && ( () => {
		const body = src.slice( f.bodyOpen, f.end );
		CALL_RE.lastIndex = 0;
		return CALL_RE.test( body );
	} )() );
	CALL_RE.lastIndex = 0;

	let out = src.replace( CALL_RE, ( _m, expr, keys ) => `tierBoxShorthand( ${ expr }, previewTier, ${ keys || "[ 'top', 'right', 'bottom', 'left' ]" } )` );

	for ( const h of helpers ) {
		// Parameter.
		const decl = new RegExp( `(function\\s+${ h.name }\\s*\\()` );
		const dm = out.match( decl );
		const open = dm.index + dm[ 0 ].length - 1;
		const close = closeParen( out, open );
		const params = out.slice( open + 1, close );
		if ( ! /\bpreviewTier\b/.test( params ) ) {
			const trimmed = params.replace( /\s*$/, '' );
			out = out.slice( 0, open + 1 ) + `${ trimmed }, previewTier = 'desktop' ` + out.slice( close );
		}
		// Call sites.
		const callRe = new RegExp( `(?<!function\\s)\\b${ h.name }\\(`, 'g' );
		let cm;
		const sites = [];
		while ( ( cm = callRe.exec( out ) ) ) {
			sites.push( cm.index + cm[ 0 ].length - 1 );
		}
		for ( const o of sites.reverse() ) {
			const c = closeParen( out, o );
			const args = out.slice( o + 1, c );
			if ( /\bpreviewTier\b/.test( args ) ) {
				continue;
			}
			out = out.slice( 0, o + 1 ) + `${ args.replace( /\s*$/, '' ) }, previewTier ` + out.slice( c );
		}
	}

	if ( ! /\bconst\s+previewTier\s*=\s*usePreviewTier\(\)/.test( out ) ) {
		const edit = out.match( /^export default function Edit\s*\([^)]*\)\s*\{\s*$/m );
		if ( ! edit ) {
			throw new Error( 'no Edit component found' );
		}
		const at = edit.index + edit[ 0 ].length;
		out = out.slice( 0, at ) + '\n\tconst previewTier = usePreviewTier();' + out.slice( at );
	}
	return addUtilsImports( out, [ 'tierBoxShorthand', 'usePreviewTier' ] );
}

const check = process.argv.includes( '--check' );
const remaining = [];
for ( const slug of BLOCKS ) {
	const file = path.join( BLOCKS_DIR, slug, 'edit.js' );
	const src = fs.readFileSync( file, 'utf8' );
	if ( check ) {
		CALL_RE.lastIndex = 0;
		let m;
		while ( ( m = CALL_RE.exec( src ) ) ) {
			remaining.push( `${ path.relative( process.cwd(), file ) }: ${ m[ 0 ] }` );
		}
		if ( WHOLE_BOX.includes( slug ) ) {
			TIER_CALL_RE.lastIndex = 0;
			while ( ( m = TIER_CALL_RE.exec( src ) ) ) {
				remaining.push( `${ path.relative( process.cwd(), file ) }: ${ m[ 0 ] } (needs the wholeBox flag)` );
			}
		}
		continue;
	}
	const eol = src.includes( '\r\n' ) ? '\r\n' : '\n';
	const transformed = transform( src );
	const next = ( WHOLE_BOX.includes( slug ) ? markWholeBox( transformed ) : transformed ).replace( /\r?\n/g, eol );
	if ( next !== src ) {
		fs.writeFileSync( file, next );
		console.log( `rewrote ${ path.relative( process.cwd(), file ) }` );
	}
}
if ( check ) {
	if ( remaining.length ) {
		console.log( remaining.join( '\n' ) );
		console.log( `${ remaining.length } desktop-only box preview(s) remain` );
		process.exit( 1 );
	}
	console.log( 'no desktop-only box previews remain' );
}
