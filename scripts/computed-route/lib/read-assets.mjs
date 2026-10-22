// The assets reader (Spec 48 FR-48-7, Spec 48A §3): the files under the handoff's `assets/` (intrinsic ratio, sha256, whether
// an SVG animates, its group ids) and, for each template element, the assets it uses. An element names an asset in its own
// record: an attribute value (`src`, `href`, `xlink:href`, `srcset`, a slot attribute), a `url(...)` in a static declaration
// (`background-image` and any other property), or, for a custom element whose project script (`<tag>.js` at the folder root)
// maps attribute values to asset paths (`SRC = { horizontal: './assets/x.svg' }`), the path the script maps its value to.
// Paths are matched to files by handoff-relative path; a value holding a `{{ }}` hole is dynamic and names no file. The
// `.dc.html` is never read here: the element records the template reader built are the input. An `<image-slot>` keeps its
// placeholder text as alt evidence on the element.
import fs from 'fs';
import path from 'path';
import { sha256, walkFolder } from './handoff.mjs';

const RASTER = { png: 'png', jpg: 'jpeg', jpeg: 'jpeg', webp: 'webp', gif: 'gif' };

// Intrinsic pixel size from a raster file's header: { width, height } or null.
export function rasterSize( buf, kind ) {
	if ( 'png' === kind && buf.length >= 24 && 'PNG' === buf.toString( 'latin1', 1, 4 ) ) {
		return { width: buf.readUInt32BE( 16 ), height: buf.readUInt32BE( 20 ) };
	}
	if ( 'gif' === kind && buf.length >= 10 && 'GIF' === buf.toString( 'latin1', 0, 3 ) ) {
		return { width: buf.readUInt16LE( 6 ), height: buf.readUInt16LE( 8 ) };
	}
	if ( 'jpeg' === kind && 0xff === buf[ 0 ] && 0xd8 === buf[ 1 ] ) {
		let i = 2;
		while ( i + 9 < buf.length ) {
			if ( 0xff !== buf[ i ] ) {
				i++;
				continue;
			}
			const m = buf[ i + 1 ];
			if ( 0xff === m ) {
				i++;
				continue;
			}
			if ( m >= 0xc0 && m <= 0xcf && ! [ 0xc4, 0xc8, 0xcc ].includes( m ) ) {
				return { width: buf.readUInt16BE( i + 7 ), height: buf.readUInt16BE( i + 5 ) };
			}
			i += 2 + ( m >= 0xd0 && m <= 0xd9 || 0x01 === m ? 0 : buf.readUInt16BE( i + 2 ) );
		}
		return null;
	}
	if ( 'webp' === kind && buf.length >= 30 && 'RIFF' === buf.toString( 'latin1', 0, 4 ) && 'WEBP' === buf.toString( 'latin1', 8, 12 ) ) {
		const fmt = buf.toString( 'latin1', 12, 16 );
		if ( 'VP8X' === fmt ) {
			return { width: 1 + buf.readUIntLE( 24, 3 ), height: 1 + buf.readUIntLE( 27, 3 ) };
		}
		if ( 'VP8L' === fmt ) {
			const b = buf.readUInt32LE( 21 );
			return { width: 1 + ( b & 0x3fff ), height: 1 + ( ( b >> 14 ) & 0x3fff ) };
		}
		if ( 'VP8 ' === fmt ) {
			return { width: buf.readUInt16LE( 26 ) & 0x3fff, height: buf.readUInt16LE( 28 ) & 0x3fff };
		}
	}
	return null;
}

const num = ( s ) => ( /^\s*\d+(\.\d+)?(px)?\s*$/.test( s ?? '' ) ? parseFloat( s ) : null );
const attrOf = ( tag, name ) => {
	const m = new RegExp( `\\s${ name }\\s*=\\s*("([^"]*)"|'([^']*)')` ).exec( tag );
	return m ? m[ 2 ] ?? m[ 3 ] : null;
};

// What an SVG file states: ratio from the root `viewBox` (else its `width` and `height`), whether it animates (`<animate*>`,
// `<set>`, or a `<style>` holding `@keyframes`) and the `id` of each `<g>`.
export function svgFacts( text ) {
	const root = /<svg\b[^>]*>/i.exec( text )?.[ 0 ] ?? '';
	const vb = ( attrOf( root, 'viewBox' ) ?? '' ).trim().split( /[\s,]+/ ).map( Number );
	let width = null;
	let height = null;
	if ( 4 === vb.length && vb.every( Number.isFinite ) && vb[ 2 ] > 0 && vb[ 3 ] > 0 ) {
		[ width, height ] = [ vb[ 2 ], vb[ 3 ] ];
	} else {
		[ width, height ] = [ num( attrOf( root, 'width' ) ), num( attrOf( root, 'height' ) ) ];
	}
	const styles = [ ...text.matchAll( /<style\b[^>]*>([\s\S]*?)<\/style>/gi ) ].map( ( m ) => m[ 1 ] );
	return {
		width, height,
		animated: /<(animate|animateTransform|animateMotion|set)\b/i.test( text ) || styles.some( ( s ) => /@keyframes/i.test( s ) ),
		groups: [ ...text.matchAll( /<g\b[^>]*>/gi ) ].map( ( m ) => attrOf( m[ 0 ], 'id' ) ).filter( Boolean ),
	};
}

// One asset file's record: { path, kind, bytes, width, height, ratio, sha256, animated, groups }.
export function fileFacts( folder, rel ) {
	const buf = fs.readFileSync( path.join( folder, rel ) );
	const ext = path.extname( rel ).slice( 1 ).toLowerCase();
	const kind = 'svg' === ext ? 'svg' : RASTER[ ext ] || ext || 'file';
	let size = { width: null, height: null };
	let animated = false;
	let groups = [];
	if ( 'svg' === kind ) {
		const s = svgFacts( buf.toString( 'utf8' ) );
		size = { width: s.width, height: s.height };
		animated = s.animated;
		groups = s.groups;
	} else if ( RASTER[ ext ] ) {
		size = rasterSize( buf, kind ) ?? size;
		animated = 'gif' === kind && buf.includes( Buffer.from( 'NETSCAPE2.0' ) );
	}
	const { width, height } = size;
	return { path: rel, kind, bytes: buf.length, width, height, ratio: width && height ? width / height : null, sha256: sha256( buf ), animated, groups };
}

// The handoff-relative path a reference value names, or null when it names none (empty, a URL, a data URI, a fragment, a hole).
export function refPath( value ) {
	let v = String( value ?? '' ).trim().replace( /^url\(\s*|\s*\)$/g, '' ).replace( /^["']|["']$/g, '' );
	if ( ! v || v.includes( '{{' ) || /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test( v ) ) {
		return null;
	}
	v = v.replace( /[?#].*$/, '' ).replace( /^(\.\/)+/, '' );
	try {
		v = decodeURIComponent( v );
	} catch { /* kept as written */ }
	return v.startsWith( '/' ) ? null : path.posix.normalize( v );
}

// The values of an element that can name a file, as [ via, value ]: every attribute (`srcset` split into its URLs) and every
// `url(...)` in a static declaration of the element or one of its pseudo/state style attributes.
function candidates( rec ) {
	const out = [];
	for ( const [ name, value ] of Object.entries( rec.attrs || {} ) ) {
		if ( 'srcset' === name ) {
			value.split( ',' ).forEach( ( part ) => out.push( [ `attr:${ name }`, part.trim().split( /\s+/ )[ 0 ] ] ) );
		} else {
			out.push( [ `attr:${ name }`, value ] );
		}
	}
	const decls = [ ...( rec.style?.static || [] ), ...Object.values( rec.pseudo || {} ).flatMap( ( p ) => p.static || [] ) ];
	for ( const [ prop, value ] of decls ) {
		for ( const m of String( value ).matchAll( /url\(\s*("[^"]*"|'[^']*'|[^)]*?)\s*\)/g ) ) {
			out.push( [ `style:${ prop }`, m[ 1 ] ] );
		}
	}
	return out;
}

// The attributes a project script reads its value from: those its `observedAttributes` returns, else those it names in a
// `getAttribute('<name>')` call. A script that names none maps no attribute.
export function scriptAttrs( text ) {
	const observed = /observedAttributes\s*(?:\(\s*\))?\s*\{\s*return\s*\[([^\]]*)\]/.exec( text );
	const names = observed ? [ ...observed[ 1 ].matchAll( /["']([\w:-]+)["']/g ) ].map( ( m ) => m[ 1 ] ) : [ ...text.matchAll( /getAttribute\(\s*["']([\w:-]+)["']\s*\)/g ) ].map( ( m ) => m[ 1 ] );
	return new Set( names );
}

// { <script file>: { byValue: Map( <value> → <asset path> ), attrs: Set( attribute names ), paths } } for each project script at
// the folder root: the `key: './assets/...'` pairs it holds, the attributes it reads and every `assets/` literal. A Map, so a
// value such as `constructor` finds no inherited property.
export function scriptMaps( folder, files ) {
	const maps = {};
	for ( const rel of files.filter( ( f ) => /^[^/]+\.js$/.test( f ) && 'support.js' !== f ) ) {
		const text = fs.readFileSync( path.join( folder, rel ), 'utf8' );
		const pairs = [ ...text.matchAll( /["']?([\w-]+)["']?\s*:\s*["'](\.?\/?assets\/[^"']+)["']/g ) ];
		const literals = [ ...text.matchAll( /["'](\.?\/?assets\/[^"'\s]+)["']/g ) ].map( ( m ) => refPath( m[ 1 ] ) );
		( pairs.length || literals.length ) && ( maps[ rel ] = { byValue: new Map( pairs.map( ( m ) => [ m[ 1 ], refPath( m[ 2 ] ) ] ) ), attrs: scriptAttrs( text ), paths: [ ...new Set( literals ) ] } );
	}
	return maps;
}

// { files: { <path>: file record }, byElement: { <template key>: [ asset ] }, alt: { <template key>: { source, placeholder, hole,
// id } }, assets: { files, unused, missing }, gaps } from the folder and lib/read-template.mjs's result. An element's `assets`
// entry is { path, ratio, kind, sha256, animated, via }. `unused`: files no element and no project script names. `missing`:
// a referenced path under `assets/` (or a script's asset literal) that has no file, with the element or script that names it.
// `logicPaths`: [ { path, by, key?, hole? } ] (lib/read-logic-statics.mjs::logicAssetPaths) the logic's hole values and statics
// name. A path a hole names makes the hole's element a user (`via: 'logic:<hole id>'`); a path with no element (a static) is
// listed in `assets.logicRefs` with what names it. The file is used either way, and a path with no file is missing.
export function readAssets( { folder, template, logicPaths = [] } ) {
	const all = walkFolder( folder ).files;
	const names = all.filter( ( f ) => f.startsWith( 'assets/' ) );
	const gaps = [];
	const files = Object.create( null );
	for ( const rel of names ) {
		try {
			files[ rel ] = fileFacts( folder, rel );
		} catch ( e ) {
			gaps.push( { construct: 'assets', draftId: rel, error: `the asset could not be read: ${ e.message }` } );
		}
	}
	const scripts = scriptMaps( folder, all );
	const used = new Set();
	const scriptNamed = new Set();
	const missing = [];
	const byElement = {};
	const alt = {};
	for ( const [ script, m ] of Object.entries( scripts ) ) {
		for ( const p of m.paths ) {
			files[ p ] ? scriptNamed.add( p ) : missing.push( { path: p, by: script } );
		}
	}
	// A path the draft's logic builds by string (a hole's value, a static: lib/read-logic-statics.mjs::logicAssetPaths) names its file.
	const byLogic = new Map();
	const logicRefs = [];
	for ( const { path: p, by, key, hole } of logicPaths ) {
		if ( key ) {
			byLogic.has( key ) || byLogic.set( key, [] );
			byLogic.get( key ).push( [ `logic:${ hole }`, p ] );
			continue;
		}
		logicRefs.push( { path: p, by } );
		files[ p ] ? scriptNamed.add( p ) : missing.push( { path: p, by, via: 'logic' } );
	}
	for ( const key of template.order ) {
		const rec = template.elements[ key ];
		const found = [];
		const put = ( p, via ) => {
			if ( ! files[ p ] ) {
				p.startsWith( 'assets/' ) && ! missing.some( ( x ) => x.path === p && x.by === key ) && missing.push( { path: p, by: key, via } );
				return;
			}
			if ( ! found.some( ( a ) => a.path === p && a.via === via ) ) {
				const f = files[ p ];
				found.push( { path: p, ratio: f.ratio, kind: f.kind, sha256: f.sha256, animated: f.animated, via } );
				used.add( p );
			}
		};
		for ( const [ via, value ] of candidates( rec ) ) {
			const p = refPath( value );
			p && put( p, via );
		}
		const map = scripts[ `${ rec.realTag || rec.tag }.js` ];
		if ( map ) {
			for ( const [ name, value ] of Object.entries( rec.attrs || {} ) ) {
				'string' === typeof value && map.attrs.has( name ) && map.byValue.has( value ) && put( map.byValue.get( value ), `script:${ rec.realTag || rec.tag }.js` );
			}
		}
		for ( const [ via, p ] of byLogic.get( key ) || [] ) {
			put( p, via );
		}
		found.length && ( byElement[ key ] = found );
		if ( 'image-slot' === ( rec.realTag || rec.tag ) && null != rec.attrs?.placeholder ) {
			alt[ key ] = { source: 'image-slot', placeholder: rec.attrs.placeholder, hole: rec.attrs.placeholder.includes( '{{' ), id: rec.attrs.id ?? null };
		}
	}
	return {
		files, byElement, alt, gaps,
		assets: { files: Object.keys( files ).length, unused: Object.keys( files ).filter( ( p ) => ! used.has( p ) && ! scriptNamed.has( p ) ), missing, logicRefs },
	};
}
