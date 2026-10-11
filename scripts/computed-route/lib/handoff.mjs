// The Claude Design handoff folder check (Spec 48A): required and allowed files, draft reachability, the manifest,
// the runtime build, the schema copies, the inventories' currency, the README's headings and the asset safety rules.
// Every failure and warning names the file and the rule (FR-48A-n). Nothing here writes into a handoff folder.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REPO = path.resolve( HERE, '../../..' );
export const MASTER_SCHEMAS = path.join( REPO, '.claude', 'claude-design-handoff', 'handoff-schema' );
export const KNOWN_RUNTIMES = path.join( REPO, 'scripts', 'computed-route', 'data', 'known-runtimes.json' );
const AJV_ANCHOR = path.join( REPO, 'plugins', 'sgs-blocks', 'node_modules', 'ajv-formats', 'package.json' );

// FR-48A-2: every file a handoff folder must hold, besides at least one draft `.dc.html` at its root.
export const REQUIRED_FILES = [
	'MANIFEST.json', 'README.md', 'support.js', 'tokens/colors.css', 'tokens/typography.css', 'tokens/spacing.css',
	'animations.json', 'surfaces.json', 'READING-DC-FILES.md', 'handoff-schema/METHOD.md',
	'handoff-schema/animations.schema.json', 'handoff-schema/surfaces.schema.json', 'handoff-schema/manifest.schema.json',
	'handoff-schema/READING-DC-FILES.example.md', 'handoff-schema/README.template.md',
];

// FR-48A-10: the largest file a folder may hold.
export const MAX_BYTES = 20 * 1024 * 1024;

export const sha256 = ( buf ) => crypto.createHash( 'sha256' ).update( buf ).digest( 'hex' );

const isDraft = ( p ) => p.endsWith( '.dc.html' );

// Every file under `root`, relative with forward slashes, sorted; a symlink anywhere is a problem and is not followed.
export function walkFolder( root ) {
	const files = [];
	const problems = [];
	const go = ( dir ) => {
		for ( const f of fs.readdirSync( dir, { withFileTypes: true } ) ) {
			const abs = path.join( dir, f.name );
			const rel = path.relative( root, abs ).split( path.sep ).join( '/' );
			if ( f.isSymbolicLink() ) {
				problems.push( `FR-48A-4 ${ rel }: a symbolic link; a handoff folder holds real files only` );
			} else if ( f.isDirectory() ) {
				go( abs );
			} else if ( f.isFile() ) {
				files.push( rel );
			} else {
				problems.push( `FR-48A-4 ${ rel }: not a regular file` );
			}
		}
	};
	go( root );
	return { files: files.sort(), problems };
}

// One href, src, from or import value from a draft, resolved against the draft's own folder to a folder-relative path:
// query string and fragment removed, URL-decoded, a leading ./ removed. Returns null for a templated value, an absolute
// URL (http:, mailto:, tel:, //host), a bare fragment, or a path leaving the folder.
export function resolveRef( value, fromDraft = '' ) {
	const v = String( value ).trim();
	if ( ! v || v.includes( '{{' ) || /^[a-z][a-z0-9+.-]*:/i.test( v ) || v.startsWith( '//' ) ) {
		return null;
	}
	let p = v.split( /[?#]/ )[ 0 ];
	try {
		p = decodeURIComponent( p );
	} catch {
		return null;
	}
	if ( ! p ) {
		return null;
	}
	p = p.replace( /^(\.\/)+/, '' );
	const base = p.startsWith( '/' ) ? '' : path.posix.dirname( fromDraft );
	const joined = path.posix.normalize( path.posix.join( '.' === base ? '' : base, p.replace( /^\/+/, '' ) ) );
	if ( '.' === joined || joined.startsWith( '../' ) || '..' === joined ) {
		return null;
	}
	return joined;
}

const attrValues = ( text, re ) => [ ...text.matchAll( re ) ].map( ( m ) => m[ 2 ] );

// What one draft's raw text points at, resolved to folder-relative paths: `drafts` mounted through <dc-import name="X">
// (X.dc.html beside the draft) or linked through an href or src value ending in .dc.html, and `scripts` loaded through
// <script src> or x-import from=.
export function draftRefs( text, fromDraft = '' ) {
	const dir = path.posix.dirname( fromDraft );
	const drafts = new Set();
	const scripts = new Set();
	for ( const name of attrValues( text, /<dc-import\b[^>]*?\bname\s*=\s*(["'])(.*?)\1/gis ) ) {
		if ( name && ! name.includes( '{{' ) ) {
			drafts.add( '.' === dir ? `${ name }.dc.html` : `${ dir }/${ name }.dc.html` );
		}
	}
	for ( const v of attrValues( text, /(?<![\w-])(?:href|src)\s*=\s*(["'])(.*?)\1/gis ) ) {
		const p = resolveRef( v, fromDraft );
		if ( p && isDraft( p ) ) {
			drafts.add( p );
		}
	}
	const loads = [
		...attrValues( text, /<script\b[^>]*?(?<![\w-])src\s*=\s*(["'])(.*?)\1/gis ),
		...attrValues( text, /<x-import\b[^>]*?(?<![\w-])from\s*=\s*(["'])(.*?)\1/gis ),
	];
	for ( const v of loads ) {
		const p = resolveRef( v, fromDraft );
		if ( p ) {
			scripts.add( p );
		}
	}
	return { drafts: [ ...drafts ], scripts: [ ...scripts ] };
}

// FR-48A-3: the drafts and project scripts reachable from the entry drafts, reading each draft's raw text from `root`.
export function reachable( root, entries, files ) {
	const onDisk = new Set( files );
	const drafts = new Set();
	const scripts = new Set();
	const queue = entries.filter( ( e ) => onDisk.has( e ) );
	while ( queue.length ) {
		const d = queue.shift();
		if ( drafts.has( d ) ) {
			continue;
		}
		drafts.add( d );
		const refs = draftRefs( fs.readFileSync( path.join( root, d ), 'utf8' ), d );
		for ( const x of refs.drafts ) {
			if ( onDisk.has( x ) && ! drafts.has( x ) ) {
				queue.push( x );
			}
		}
		for ( const s of refs.scripts ) {
			if ( s.endsWith( '.js' ) && onDisk.has( s ) ) {
				scripts.add( s );
			}
		}
	}
	return { drafts, scripts };
}

// Ajv 8 for draft 2020-12 (with ajv-formats when present), resolved from the nested copy under plugins/sgs-blocks.
// Throws a readable error when it cannot be resolved.
export function loadAjv( anchor = AJV_ANCHOR ) {
	let Ajv;
	let addFormats = null;
	try {
		const req = createRequire( anchor );
		const mod = req( 'ajv/dist/2020' );
		Ajv = mod.default || mod;
		try {
			const f = req( 'ajv-formats' );
			addFormats = f.default || f;
		} catch {
			addFormats = null;
		}
	} catch ( e ) {
		throw new Error( `ajv 8 could not be resolved from ${ anchor } (run npm install in plugins/sgs-blocks): ${ e.message }` );
	}
	const ajv = new Ajv( { strict: false, allErrors: true } );
	if ( addFormats ) {
		addFormats( ajv );
	}
	return ajv;
}

// Validates `data` against the schema file; returns readable problems (at most 20), empty when valid.
export function schemaProblems( ajv, schemaFile, data ) {
	const schema = JSON.parse( fs.readFileSync( schemaFile, 'utf8' ) );
	// Compiled without its $id, so one Ajv instance can compile the same schema again.
	delete schema.$id;
	const validate = ajv.compile( schema );
	if ( validate( data ) ) {
		return [];
	}
	const out = validate.errors.slice( 0, 20 ).map( ( e ) => `${ e.instancePath || '/' } ${ e.message }${ e.params?.additionalProperty ? ` (${ e.params.additionalProperty })` : '' }` );
	if ( validate.errors.length > 20 ) {
		out.push( `and ${ validate.errors.length - 20 } more` );
	}
	return out;
}

// The parsed JSON file, or { error } naming why it could not be read.
export function readJson( file ) {
	try {
		return { data: JSON.parse( fs.readFileSync( file, 'utf8' ) ) };
	} catch ( e ) {
		return { error: e.message };
	}
}

// A MANIFEST.json object for the files now in `root` (every file except MANIFEST.json, sorted by path).
export function buildManifest( root, { project, entryDrafts, generated = new Date().toISOString().slice( 0, 10 ) } ) {
	const { files } = walkFolder( root );
	return {
		schema_version: '1.0',
		generated,
		project,
		entry_drafts: entryDrafts,
		runtime_sha256: sha256( fs.readFileSync( path.join( root, 'support.js' ) ) ),
		files: files.filter( ( f ) => 'MANIFEST.json' !== f ).map( ( f ) => {
			const buf = fs.readFileSync( path.join( root, f ) );
			return { path: f, bytes: buf.length, sha256: sha256( buf ) };
		} ),
	};
}

// The known-runtimes list ({ runtimes: [ { sha256, added, source, probe, path? } ] }); a missing file is an empty list.
export function readKnown( file = KNOWN_RUNTIMES ) {
	if ( ! fs.existsSync( file ) ) {
		return { runtimes: [] };
	}
	const data = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	return { runtimes: Array.isArray( data.runtimes ) ? data.runtimes : [] };
}

// The README headings (levels 1 to 3) that map the design to SGS blocks (FR-48A-8).
export function blockMappingHeadings( markdown ) {
	return [ ...markdown.matchAll( /^#{1,3}[ \t]+(.+?)[ \t#]*$/gm ) ].map( ( m ) => m[ 1 ] ).filter( ( h ) => /\bsgs\b|block[\s-]*mapping/i.test( h ) );
}

// Why an SVG's text is unsafe to run (FR-48A-10), or null. A pattern screen, not a parser: it refuses scripts, event
// attributes (after whitespace, a slash or a quote), foreignObject, javascript: URLs, <animate>/<set> that rewrite a
// link, and any href or xlink:href that is not a same-document #fragment or a data:image URI.
export function svgProblem( text ) {
	if ( /<script/i.test( text ) ) {
		return 'holds a <script> element';
	}
	if ( /[\s/"']on[a-z]+\s*=/i.test( text ) ) {
		return 'holds an on…= event attribute';
	}
	if ( /<foreignObject/i.test( text ) ) {
		return 'holds a <foreignObject> element';
	}
	if ( /javascript\s*:/i.test( text ) ) {
		return 'holds a javascript: URL';
	}
	if ( /<(?:animate|set)\b[^>]*attributeName\s*=\s*["'](?:xlink:)?href["']/i.test( text ) ) {
		return 'holds an <animate> or <set> that rewrites a link';
	}
	for ( const m of text.matchAll( /(?:^|[\s/"'])(?:xlink:)?href\s*=\s*(["'])(.*?)\1/gis ) ) {
		const v = m[ 2 ].trim();
		if ( ! v.startsWith( '#' ) && ! /^data:image\//i.test( v ) ) {
			return `holds a link to ${ v.slice( 0, 60 ) }`;
		}
	}
	return null;
}

// The whole check. Returns { errors, warnings, sha } where sha is support.js's SHA-256 (null when it is missing).
// `known` is the known-runtimes object, `schemas` the master schema folder.
export function checkHandoff( root, { known = readKnown(), schemas = MASTER_SCHEMAS, ajv = null } = {} ) {
	const errors = [];
	const warnings = [];
	const { files, problems } = walkFolder( root );
	errors.push( ...problems );
	const has = new Set( files );
	const read = ( f ) => fs.readFileSync( path.join( root, f ) );
	const validator = ajv || loadAjv();

	// FR-48A-2
	for ( const f of REQUIRED_FILES ) {
		if ( ! has.has( f ) ) {
			errors.push( `FR-48A-2 ${ f }: required file is missing` );
		}
	}
	if ( ! files.some( ( f ) => isDraft( f ) && ! f.includes( '/' ) ) ) {
		errors.push( 'FR-48A-2 *.dc.html: the folder holds no draft at its root' );
	}
	const sha = has.has( 'support.js' ) ? sha256( read( 'support.js' ) ) : null;

	// FR-48A-4 (with FR-48A-6: the master schema)
	let manifest = null;
	if ( has.has( 'MANIFEST.json' ) ) {
		const m = readJson( path.join( root, 'MANIFEST.json' ) );
		if ( m.error ) {
			errors.push( `FR-48A-4 MANIFEST.json: not valid JSON (${ m.error })` );
		} else {
			const bad = schemaProblems( validator, path.join( schemas, 'manifest.schema.json' ), m.data );
			errors.push( ...bad.map( ( b ) => `FR-48A-4 MANIFEST.json: ${ b }` ) );
			if ( ! bad.length ) {
				manifest = m.data;
			}
		}
	}
	if ( manifest ) {
		const listed = new Map();
		for ( const e of manifest.files ) {
			if ( listed.has( e.path ) ) {
				errors.push( `FR-48A-4 ${ e.path }: listed twice in MANIFEST.json` );
			}
			if ( e.path !== e.path.normalize( 'NFC' ) ) {
				errors.push( `FR-48A-4 ${ e.path }: path in MANIFEST.json is not NFC` );
			}
			listed.set( e.path, e );
		}
		for ( const [ p, e ] of listed ) {
			if ( 'MANIFEST.json' === p ) {
				errors.push( 'FR-48A-4 MANIFEST.json: lists itself' );
			} else if ( ! has.has( p ) ) {
				errors.push( `FR-48A-4 ${ p }: listed in MANIFEST.json but not in the folder` );
			} else {
				const buf = read( p );
				if ( buf.length !== e.bytes ) {
					errors.push( `FR-48A-4 ${ p }: MANIFEST.json says ${ e.bytes } bytes, the file has ${ buf.length }` );
				}
				if ( sha256( buf ) !== e.sha256 ) {
					errors.push( `FR-48A-4 ${ p }: SHA-256 does not match MANIFEST.json` );
				}
			}
		}
		for ( const f of files ) {
			if ( 'MANIFEST.json' !== f && ! listed.has( f ) ) {
				errors.push( `FR-48A-4 ${ f }: in the folder but not listed in MANIFEST.json` );
			}
		}
		if ( sha && manifest.runtime_sha256 !== sha ) {
			errors.push( `FR-48A-4 MANIFEST.json: runtime_sha256 ${ manifest.runtime_sha256 } is not the SHA-256 of support.js (${ sha })` );
		}
		for ( const e of manifest.entry_drafts ) {
			if ( ! has.has( e ) ) {
				errors.push( `FR-48A-4 ${ e }: entry draft named in MANIFEST.json is not in the folder` );
			}
		}
	}

	// FR-48A-3
	const required = new Set( REQUIRED_FILES );
	const reach = manifest ? reachable( root, manifest.entry_drafts, files ) : null;
	if ( ! manifest ) {
		errors.push( 'FR-48A-3 MANIFEST.json: draft and script reachability is not checked without a valid entry_drafts list' );
	}
	for ( const f of files ) {
		if ( required.has( f ) || f.startsWith( 'assets/' ) ) {
			continue;
		}
		if ( isDraft( f ) ) {
			if ( reach && ! reach.drafts.has( f ) ) {
				errors.push( `FR-48A-3 ${ f }: draft is not reachable from an entry draft (no dc-import or link reaches it); remove it` );
			}
		} else if ( f.endsWith( '.js' ) && ! f.includes( '/' ) && ! reach ) {
			continue;
		} else if ( ! ( f.endsWith( '.js' ) && reach && reach.scripts.has( f ) ) ) {
			errors.push( `FR-48A-3 ${ f }: not an allowed handoff file (required file, assets/, or a script a reachable draft loads); remove it` );
		}
	}

	// FR-48A-5
	if ( sha ) {
		const hit = known.runtimes.find( ( r ) => r.sha256 === sha );
		if ( ! hit ) {
			errors.push( `FR-48A-5 support.js: unknown runtime build ${ sha }; run handoff-check.mjs <folder> --probe-runtime, then --add-runtime when it passes` );
		} else if ( 'pass' !== hit.probe ) {
			errors.push( `FR-48A-5 support.js: runtime build ${ sha } is listed with probe "${ hit.probe }", not "pass"; run --probe-runtime` );
		}
	}

	// FR-48A-6
	for ( const f of files.filter( ( x ) => x.startsWith( 'handoff-schema/' ) ) ) {
		const master = path.join( schemas, f.slice( 'handoff-schema/'.length ) );
		if ( fs.existsSync( master ) && fs.statSync( master ).isFile() && ! read( f ).equals( fs.readFileSync( master ) ) ) {
			warnings.push( `FR-48A-6 ${ f }: differs from the master copy (${ path.relative( REPO, schemas ).split( path.sep ).join( '/' ) }); the check validates with the master` );
		}
	}

	// FR-48A-7
	for ( const [ f, schema ] of [ [ 'animations.json', 'animations.schema.json' ], [ 'surfaces.json', 'surfaces.schema.json' ] ] ) {
		if ( ! has.has( f ) ) {
			continue;
		}
		const j = readJson( path.join( root, f ) );
		if ( j.error ) {
			errors.push( `FR-48A-7 ${ f }: not valid JSON (${ j.error })` );
			continue;
		}
		errors.push( ...schemaProblems( validator, path.join( schemas, schema ), j.data ).map( ( b ) => `FR-48A-7 ${ f }: ${ b }` ) );
		if ( 'animations.json' !== f ) {
			continue;
		}
		if ( sha && j.data.runtime_sha256 !== sha ) {
			errors.push( `FR-48A-7 animations.json: inventory is stale: runtime_sha256 ${ j.data.runtime_sha256 } is not support.js (${ sha })` );
		}
		for ( const d of Array.isArray( j.data.drafts ) ? j.data.drafts : [] ) {
			const p = resolveRef( d?.file ?? '' );
			if ( ! p || ! has.has( p ) ) {
				errors.push( `FR-48A-7 animations.json: inventory is stale: draft ${ JSON.stringify( d?.file ) } is not in the folder` );
			} else if ( sha256( read( p ) ) !== d.sha256 ) {
				errors.push( `FR-48A-7 animations.json: inventory is stale: ${ p } has changed since its sha256 was recorded` );
			}
		}
	}

	// FR-48A-8
	if ( has.has( 'README.md' ) ) {
		for ( const h of blockMappingHeadings( read( 'README.md' ).toString( 'utf8' ) ) ) {
			warnings.push( `FR-48A-8 README.md: heading "${ h }" maps the design to SGS blocks; block choice is ours, not the export's` );
		}
	}

	// FR-48A-10
	for ( const f of files ) {
		const size = fs.statSync( path.join( root, f ) ).size;
		if ( size > MAX_BYTES ) {
			errors.push( `FR-48A-10 ${ f }: ${ size } bytes, over the 20 MB limit` );
		}
		if ( f.startsWith( 'assets/' ) && f.toLowerCase().endsWith( '.svg' ) ) {
			const why = svgProblem( read( f ).toString( 'utf8' ) );
			if ( why ) {
				errors.push( `FR-48A-10 ${ f }: SVG ${ why }` );
			}
		}
	}

	return { errors, warnings, sha };
}
