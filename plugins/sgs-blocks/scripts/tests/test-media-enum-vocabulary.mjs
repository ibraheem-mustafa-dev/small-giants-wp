#!/usr/bin/env node
/**
 * A block that HAND-DECLARES a media-atom attribute with an `enum` must allow every value
 * the atom's registry vocabulary offers.
 *
 * Why: an atom's choices live in src/components/media/atoms/registry.js (`vocabulary`), and
 * the control offers exactly those. A block that also declares the attribute itself in
 * block.json (instead of leaving it to the mediaElements injection) keeps its own copy of
 * the list. When the vocabulary grew a value (box-shape sizing `fill`, 2026-09-29), the
 * hand copies on sgs/media and sgs/hero kept the old three: the control offered "Fill
 * space" and the editor refused to store it. Nothing caught it until a page build failed.
 *
 * Checks every block declaring `supports.sgs.mediaElements`, for each element's atoms with
 * a vocabulary: the declared attr (prefix + base, lcfirst when unprefixed) must list every
 * vocabulary value in its `enum` if it has one. Extra enum values are allowed (hero's
 * object fit carries `custom`, a sizing sentinel).
 *
 * Run: node scripts/tests/test-media-enum-vocabulary.mjs [--self-test]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROOT = path.resolve( HERE, '..', '..' );
// pathToFileURL, not a bare path: on Windows a `C:\\…` path is not a valid import specifier.
const { MEDIA_ATOMS } = await import( pathToFileURL( path.join( ROOT, 'src/components/media/atoms/registry.js' ) ).href );

// Which stored base each vocabulary governs. `backdrop` (object-fit on a CSS background)
// and `ratio` (free text on several blocks, READ not matched) are not enums.
const VOCAB_BASE = { sizing: 'MediaSizing', shape: 'Shape', element: 'ObjectFit' };

function attrName( prefix, base ) {
	return prefix ? prefix + base : base[ 0 ].toLowerCase() + base.slice( 1 );
}

export function findings( blocks ) {
	const out = [];
	for ( const { name, json } of blocks ) {
		const elements = json?.supports?.sgs?.mediaElements;
		if ( ! Array.isArray( elements ) ) {
			continue;
		}
		const attrs = json.attributes || {};
		for ( const el of elements ) {
			const prefix = el?.prefix || '';
			for ( const atomId of el?.atoms?.length ? el.atoms : Object.keys( MEDIA_ATOMS ) ) {
				const vocab = MEDIA_ATOMS[ atomId ]?.vocabulary || {};
				for ( const [ key, base ] of Object.entries( VOCAB_BASE ) ) {
					const allowed = vocab[ key ];
					const attr = attrs[ attrName( prefix, base ) ];
					if ( ! allowed || ! Array.isArray( attr?.enum ) ) {
						continue;
					}
					const missing = allowed.filter( ( v ) => ! attr.enum.includes( v ) );
					if ( missing.length ) {
						out.push( `${ name } ${ attrName( prefix, base ) }: enum lacks ${ missing.join( ', ' ) } (atom ${ atomId } offers ${ allowed.join( ', ' ) })` );
					}
				}
			}
		}
	}
	return out;
}

function selfTest() {
	const block = ( en ) => [ { name: 'test/x', json: { attributes: { mediaSizing: { type: 'string', enum: en } }, supports: { sgs: { mediaElements: [ { prefix: '', atoms: [ 'box-shape' ] } ] } } } } ];
	const cases = [
		[ 'an enum missing a vocabulary value fails', findings( block( [ 'auto', 'height', 'ratio' ] ) ).length === 1 ],
		[ 'the full vocabulary passes', findings( block( [ ...MEDIA_ATOMS[ 'box-shape' ].vocabulary.sizing ] ) ).length === 0 ],
		[ 'extra enum values are allowed', findings( block( [ ...MEDIA_ATOMS[ 'box-shape' ].vocabulary.sizing, 'custom' ] ) ).length === 0 ],
		[ 'no enum (injected attr) is not checked', findings( [ { name: 'test/y', json: { attributes: {}, supports: { sgs: { mediaElements: [ { atoms: [ 'box-shape' ] } ] } } } } ] ).length === 0 ],
	];
	let ok = true;
	for ( const [ label, pass ] of cases ) {
		console.log( `  ${ pass ? 'ok  ' : 'FAIL' } ${ label }` );
		ok = ok && pass;
	}
	return ok;
}

const selfOk = selfTest();
const blocks = fs.readdirSync( path.join( ROOT, 'src/blocks' ) )
	.map( ( dir ) => path.join( ROOT, 'src/blocks', dir, 'block.json' ) )
	.filter( ( f ) => fs.existsSync( f ) )
	.map( ( f ) => { const json = JSON.parse( fs.readFileSync( f, 'utf8' ) ); return { name: json.name, json }; } );
const scanned = blocks.filter( ( b ) => Array.isArray( b.json?.supports?.sgs?.mediaElements ) ).length;
const found = findings( blocks );
found.forEach( ( f ) => console.log( `  FAIL ${ f }` ) );
if ( scanned < 10 ) {
	console.log( `FAIL - only ${ scanned } mediaElements blocks found; the scan is not seeing the tree` );
	process.exit( 1 );
}
console.log( found.length || ! selfOk ? `FAIL - ${ found.length } enum(s) out of step with the media vocabulary` : `PASS - ${ scanned } mediaElements blocks, every hand-declared enum carries its atom's vocabulary` );
process.exit( found.length || ! selfOk ? 1 : 0 );
