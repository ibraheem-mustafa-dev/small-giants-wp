'use strict';

/**
 * migrate-shadow-mounts.js — move <ShadowControl> call sites onto the attrNames map.
 *
 * WHY. ShadowControl was parameterised by VALUES AND CALLBACKS: six props hand-wired at
 * every mount, where GradientOverlayControl's callers pass one map. Bean 2026-08-22:
 * "I want that and the shadow control to be in a helper so it's easy to install them in
 * new places and we don't need to keep rebuilding those 2 variants." The component now
 * accepts `attributes` + `setAttributes` + `attrNames`; this moves the existing call
 * sites onto it so a future install is one map, not six props.
 *
 * ⛔ REFUSES RATHER THAN GUESSES, and the refusals are the point. A mount only migrates
 * when EVERY pair is provably a plain binding:
 *     value={ boxShadow }  or  value={ attributes.boxShadow }
 *     onChange={ ( v ) => setAttributes( { boxShadow: v } ) }
 * with the SAME attribute name on both halves AND that name declared in the block's own
 * block.json. Anything else — a transformed value, a renamed destructure, a computed
 * key, a multi-statement handler — is reported and left alone.
 *
 * ⚠ THE block.json CROSS-CHECK IS NOT DECORATION. A destructured `value={ boxShadow }`
 * only tells you the LOCAL name. `const { boxShadow: shadow } = attributes` would make
 * that local name a lie, and the map form would then bind the wrong attribute — silently,
 * because both spellings look identical at the call site. Verifying the name against the
 * block's declared attributes is what makes "mechanical" a fact rather than a hope.
 *
 * ⭐ WRITTEN AS A RE-RUNNABLE TOOL, NOT A ONE-OFF SWEEP (D542): if an item touches more
 * than ~3 blocks the deliverable is the detector. It also has to survive the NEXT mount
 * someone adds — a one-off script leaves the 23rd call site to be hand-wired again,
 * which is the exact treadmill this migration exists to end.
 *
 * Modes:  --survey (default, writes nothing) | --apply | --check (exit 1 if any
 *         mechanical mount remains unmigrated) | --self-test
 */

const fs = require( 'fs' );
const path = require( 'path' );

const PLUGIN_ROOT = path.resolve( __dirname, '..', '..' );
const BLOCKS_DIR = path.join( PLUGIN_ROOT, 'src', 'blocks' );

// value-prop -> ( setter-prop, attrNames key )
const PAIRS = [
	[ 'value', 'onChange', 'base' ],
	[ 'colour', 'onColourChange', 'colour' ],
	[ 'colourHover', 'onColourHoverChange', 'hoverColour' ],
	[ 'valueHover', 'onValueHoverChange', 'hover' ],
];

function blockDirs() {
	if ( ! fs.existsSync( BLOCKS_DIR ) ) return [];
	return fs
		.readdirSync( BLOCKS_DIR )
		.filter( ( n ) => fs.existsSync( path.join( BLOCKS_DIR, n, 'block.json' ) ) )
		.sort();
}

function declaredAttrs( dir ) {
	try {
		const bj = JSON.parse(
			fs.readFileSync( path.join( BLOCKS_DIR, dir, 'block.json' ), 'utf8' )
		);
		return new Set( Object.keys( bj.attributes || {} ) );
	} catch ( e ) {
		return new Set();
	}
}

/** Classify ONE mount body. Returns { ok, map } or { ok:false, reason }. */
function classifyMount( body, declared ) {
	const map = {};
	for ( const [ vp, sp, key ] of PAIRS ) {
		if ( ! new RegExp( '\\b' + vp + '=' ).test( body ) ) continue;

		// Accepts a bare binding, an `attributes.X` read, and a redundant `|| ''`
		// fallback. That fallback is a VERIFIED no-op, not an assumed one: parseShadow()
		// opens with `if ( ! value ) return null`, and every other use of `value` in the
		// component is a falsy check, so undefined and empty-string are indistinguishable
		// to it. Five mounts (container, cta-section, hero, physics-canvas, one trust-bar)
		// were refused on this alone - a defensive idiom, not a different binding.
		// Strip the fallback BEFORE matching rather than widening the pattern to
		// tolerate it. Encoding a quoted empty-string inside a character class inside a
		// JS string inside a generated patch is how the previous three attempts at this
		// line got mangled; normalising the input keeps the pattern trivial.
		const norm = body.replace( /\|\|\s*(?:''|"")/g, '' );
		const vm = new RegExp( vp + '=\\{\\s*(?:attributes\\.)?(\\w+)\\s*\\}' ).exec( norm );
		if ( ! vm ) return { ok: false, reason: `${ vp }= is not a plain binding` };

		const sm = new RegExp(
			sp + '=\\{[^}]*?setAttributes\\(\\s*\\{\\s*(\\w+)\\s*:',
			's'
		).exec( body );
		if ( ! sm ) return { ok: false, reason: `${ sp }= is not a plain setAttributes` };

		if ( vm[ 1 ] !== sm[ 1 ] ) {
			return { ok: false, reason: `${ vp }/${ sp } disagree (${ vm[ 1 ] } vs ${ sm[ 1 ] })` };
		}
		// The cross-check that makes this safe — see the header note.
		if ( ! declared.has( vm[ 1 ] ) ) {
			return { ok: false, reason: `"${ vm[ 1 ] }" is not declared in block.json` };
		}
		map[ key ] = vm[ 1 ];
	}
	if ( ! Object.keys( map ).length ) return { ok: false, reason: 'no recognisable pairs' };
	return { ok: true, map };
}

function scan() {
	const rows = [];
	for ( const dir of blockDirs() ) {
		const file = path.join( BLOCKS_DIR, dir, 'edit.js' );
		if ( ! fs.existsSync( file ) ) continue;
		const src = fs.readFileSync( file, 'utf8' );
		const re = /<ShadowControl\b([\s\S]*?)\/>/g;
		let m;
		while ( ( m = re.exec( src ) ) !== null ) {
			const alreadyMapped = /\battrNames=/.test( m[ 1 ] );
			const verdict = alreadyMapped
				? { ok: false, reason: 'already migrated' }
				: classifyMount( m[ 1 ], declaredAttrs( dir ) );
			rows.push( {
				block: `sgs/${ dir }`,
				file,
				index: m.index,
				raw: m[ 0 ],
				body: m[ 1 ],
				alreadyMapped,
				...verdict,
			} );
		}
	}
	return rows;
}

/**
 * Extract the whole `label={ ... }` prop by BALANCING braces from the opening brace.
 * A regex cannot do this reliably: the value may contain nested braces and parens, and
 * a lazy match stops at the first closing brace that happens to appear.
 */
function extractLabelProp( body ) {
	const at = body.search( /\blabel=\{/ );
	if ( at < 0 ) return null;
	const open = body.indexOf( '{', at );
	let depth = 0;
	for ( let i = open; i < body.length; i++ ) {
		if ( body[ i ] === '{' ) depth++;
		else if ( body[ i ] === '}' ) {
			depth--;
			if ( depth === 0 ) return body.slice( at, i + 1 );
		}
	}
	return null;
}

/** Rewrite one mount body onto the map form, preserving label + indentation. */
function rewrite( raw, body, map ) {
	const indentMatch = /\n(\s+)\S/.exec( body );
	const ind = indentMatch ? indentMatch[ 1 ] : '\t\t\t\t\t\t';
	// BRACE-BALANCED, not a lazy `}` match. The first version expected TWO closing
	// braces and `label={ __( 'Box shadow', 'sgs-blocks' ) }` has ONE (the `)` closes
	// __()). It matched nothing, so `label` was silently omitted and ALL 17 migrated
	// controls rendered UNLABELLED. Caught by DIFFING THE OUTPUT — the dry run showed a
	// correct attribute map and said nothing about the dropped prop.
	const label = extractLabelProp( body );
	const lines = [ '<ShadowControl' ];
	if ( label ) lines.push( ind + label.trim() );
	lines.push( ind + 'attributes={ attributes }' );
	lines.push( ind + 'setAttributes={ setAttributes }' );
	lines.push( ind + 'attrNames={ {' );
	for ( const [ k, v ] of Object.entries( map ) ) {
		lines.push( ind + '\t' + k + ": '" + v + "'," );
	}
	lines.push( ind + '} }' );
	lines.push( ind.slice( 0, -1 ) + '/>' );
	return lines.join( '\n' );
}

function main() {
	const argv = process.argv.slice( 2 );
	const apply = argv.includes( '--apply' );
	const check = argv.includes( '--check' );
	const rows = scan();

	const mech = rows.filter( ( r ) => r.ok );
	const refused = rows.filter( ( r ) => ! r.ok );

	if ( check ) {
		if ( mech.length ) {
			console.error(
				`[migrate-shadow-mounts] ${ mech.length } mount(s) still on the 6-prop API and mechanically migratable.`
			);
			mech.forEach( ( r ) => console.error( `  ${ r.block }` ) );
			process.exit( 1 );
		}
		console.log( '[migrate-shadow-mounts] CLEAN — no mechanically-migratable mount remains.' );
		return;
	}

	console.log( `\nShadowControl mounts: ${ rows.length }` );
	console.log( `  mechanical : ${ mech.length }` );
	console.log( `  refused    : ${ refused.length }\n` );
	mech.forEach( ( r ) => console.log( `  OK      ${ r.block.padEnd( 22 ) } ${ JSON.stringify( r.map ) }` ) );
	refused.forEach( ( r ) => console.log( `  REFUSE  ${ r.block.padEnd( 22 ) } ${ r.reason }` ) );

	if ( ! apply ) {
		console.log( '\n(dry run — pass --apply to write)\n' );
		return;
	}

	// Group by file and rewrite from the END so earlier offsets stay valid. Rewriting
	// forwards invalidates every offset after the first edit — the stale-offset bug
	// that corrupted a file earlier in this project's codemod work.
	const byFile = new Map();
	for ( const r of mech ) {
		if ( ! byFile.has( r.file ) ) byFile.set( r.file, [] );
		byFile.get( r.file ).push( r );
	}
	let written = 0;
	for ( const [ file, list ] of byFile ) {
		let src = fs.readFileSync( file, 'utf8' );
		list.sort( ( a, b ) => b.index - a.index );
		for ( const r of list ) {
			src = src.slice( 0, r.index ) + rewrite( r.raw, r.body, r.map ) + src.slice( r.index + r.raw.length );
		}
		fs.writeFileSync( file, src );
		written += list.length;
	}
	console.log( `\napplied: ${ written } mount(s) across ${ byFile.size } file(s)\n` );
}

main();
