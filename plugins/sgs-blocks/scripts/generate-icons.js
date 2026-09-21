/**
 * Generates includes/lucide-icons.php from lucide-static SVG files, plus the SGS
 * icon library (assets/icons/sgs-icons.json) merged into the same PHP map so
 * sgs_get_lucide_icon( 'slug' ) resolves library icons with no call-site change.
 *
 * Run: node scripts/generate-icons.js
 * Hooked into: npm run build (via prebuild script)
 *
 * Flags (all optional; used by tests and scripts/promote-icon.py):
 *   --out-dir <dir>   write the PHP map + editor assets under <dir>, touching nothing tracked.
 *   --library <file>  read the SGS library from <file> instead of assets/icons/sgs-icons.json.
 *   --check           validate the library only; exit non-zero with a clear message; write nothing.
 *
 * The SGS library is a SOURCE file (hand-promoted, never overwritten here). The editor
 * picker fetches it directly, so there is no second mirror to drift.
 */

const fs = require( 'fs' );
const path = require( 'path' );

const ICONS_DIR = path.resolve(
	__dirname,
	'../node_modules/lucide-static/icons'
);
const argv = process.argv.slice( 2 );
const argVal = ( flag ) => ( argv.includes( flag ) && argv[ argv.indexOf( flag ) + 1 ] ? path.resolve( argv[ argv.indexOf( flag ) + 1 ] ) : null );
const OUT_DIR = argVal( '--out-dir' );
const CHECK_ONLY = argv.includes( '--check' );
const LIBRARY_FILE =
	argVal( '--library' ) || path.resolve( __dirname, '../assets/icons/sgs-icons.json' );
const OUTPUT_FILE = OUT_DIR
	? path.join( OUT_DIR, 'lucide-icons.php' )
	: path.resolve( __dirname, '../includes/lucide-icons.php' );
// Backwards-compatible slug aliases emitted into the PHP map (single source: here).
const ALIASES = {
	'star-filled': 'star', 'user-group': 'users', shipping: 'truck', people: 'users',
	'map-marker': 'map-pin', payment: 'credit-card', inbox: 'mail', megaphone: 'megaphone',
};

if ( ! fs.existsSync( ICONS_DIR ) ) {
	console.error( 'lucide-static icons directory not found. Run npm install.' );
	process.exit( 1 );
}

const files = fs.readdirSync( ICONS_DIR ).filter( ( f ) => f.endsWith( '.svg' ) );
const icons = {};

for ( const file of files ) {
	const name = file.replace( '.svg', '' );
	let svg = fs.readFileSync( path.join( ICONS_DIR, file ), 'utf8' ).trim();

	// Strip newlines and normalise whitespace for compact PHP output.
	svg = svg.replace( /\n/g, '' ).replace( /\s{2,}/g, ' ' );

	icons[ name ] = svg;
}

// WordPress-icon map { slug: svgMarkup } parsed from the canonical server-side map in
// includes/wp-icons.php (also the source for the editor's wp-icons.json below).
const WP_ICONS_PHP = path.resolve( __dirname, '../includes/wp-icons.php' );
const wpIcons = {};
if ( fs.existsSync( WP_ICONS_PHP ) ) {
	const wpPhp = fs.readFileSync( WP_ICONS_PHP, 'utf8' );
	// Match array entries:  'slug' => '<svg …</svg>',
	const re = /'([a-z0-9-]+)'\s*=>\s*'(<svg[\s\S]*?<\/svg>)'/g;
	let m;
	while ( ( m = re.exec( wpPhp ) ) !== null ) {
		wpIcons[ m[ 1 ] ] = m[ 2 ];
	}
}

// SGS library: { slug: svgMarkup }. Validated hard, because it lands in a PHP map that
// blocks echo. Lucide, WordPress and alias names are reserved.
const has = ( obj, key ) => Object.prototype.hasOwnProperty.call( obj, key );

// Pictogram allowlist: ONE definition shared with scripts/promote-icon.py (read from the
// same JSON), so the generator and the promote step cannot drift apart.
const ALLOWLIST_FILE = path.resolve( __dirname, '../assets/icons/svg-allowlist.json' );
const ALLOW = JSON.parse( fs.readFileSync( ALLOWLIST_FILE, 'utf8' ) );
const toRegexes = ( list ) => list.map( ( source ) => new RegExp( source, 'i' ) );
const DRAWING = new Set( ALLOW.drawingElements );
const FORBID_ATTR_NAMES = new Set( ALLOW.forbiddenAttributeNames );
const FORBID_MARKUP = toRegexes( ALLOW.forbiddenMarkupPatterns );
const PAINT_ATTRS = new Set( ALLOW.paintAttributes );
const FORBID_PAINT = toRegexes( ALLOW.forbiddenPaintValuePatterns );
const RAW_FORBID_ATTR_NAMES = new Set( ALLOW.refuseInRawLibrary.attributeNames );
const RAW_FORBID_VALUES = toRegexes( ALLOW.refuseInRawLibrary.valuePatterns );
// Slugs that are Object.prototype members: `slug in map` (the editor picker's old test)
// walks the prototype chain, so these render on the frontend but vanish from the picker.
const PROTOTYPE_SLUGS = new Set( Object.getOwnPropertyNames( Object.prototype ) );

// One tag: `<name attrs>`, `</name>` or `<name attrs/>`; quoted values may contain `>`.
const TAG_RE = /<(\/?)([^\s>/!?<]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTR_RE = /([^\s=/"'<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

/**
 * Validate one raw library SVG against the shared allowlist.
 *
 * @param {string} svg Raw library markup.
 * @return {string} '' when clean, otherwise the reason it is refused.
 */
function svgProblem( svg ) {
	const text = svg.trim();
	if ( ! /^<svg[\s>][\s\S]*<\/svg>$/.test( text ) ) {
		return 'value must be one <svg>…</svg> string';
	}
	for ( const re of FORBID_MARKUP ) {
		if ( re.test( text ) ) {
			return `markup matches a forbidden pattern (${ re.source })`;
		}
	}
	// Comments, CDATA, processing instructions and any stray `<` are refused outright:
	// everything must be a tag the tokeniser below can see and check.
	if ( /<[!?]/.test( text ) || text.replace( TAG_RE, '' ).includes( '<' ) ) {
		return 'comments, CDATA, processing instructions and malformed tags are not allowed';
	}
	for ( const [ , , name, attrs ] of text.matchAll( TAG_RE ) ) {
		const tag = name.toLowerCase();
		if ( tag.includes( ':' ) || ! DRAWING.has( tag ) ) {
			return `element <${ tag }> is not allowed (drawing elements only: ${ [ ...DRAWING ].join( ', ' ) })`;
		}
		for ( const [ , rawName, dq, sq, bare ] of attrs.matchAll( ATTR_RE ) ) {
			const full = rawName.toLowerCase();
			const local = full.split( ':' ).pop();
			const value = dq ?? sq ?? bare ?? '';
			if ( ALLOW.forbiddenAttributePrefixes.some( ( p ) => local.startsWith( p ) ) ) {
				return `event-handler attribute "${ full }" is not allowed`;
			}
			if ( FORBID_ATTR_NAMES.has( full ) || FORBID_ATTR_NAMES.has( local ) ) {
				return `attribute "${ full }" (external reference) is not allowed`;
			}
			if ( RAW_FORBID_ATTR_NAMES.has( local ) ) {
				return `attribute "${ full }" is not allowed in the raw library`;
			}
			if ( RAW_FORBID_VALUES.some( ( re ) => re.test( value ) ) ) {
				return `attribute "${ full }" carries a forbidden character sequence`;
			}
			if ( PAINT_ATTRS.has( local ) && FORBID_PAINT.some( ( re ) => re.test( value ) ) ) {
				return `${ full } references a gradient, pattern or url(...) (not allowed)`;
			}
		}
	}
	return '';
}
const sgsIcons = {};
if ( fs.existsSync( LIBRARY_FILE ) ) {
	let lib;
	try {
		lib = JSON.parse( fs.readFileSync( LIBRARY_FILE, 'utf8' ) );
	} catch ( err ) {
		console.error( `SGS icon library ${ LIBRARY_FILE } is not valid JSON: ${ err.message }` );
		process.exit( 1 );
	}
	if ( ! lib || 'object' !== typeof lib || Array.isArray( lib ) ) {
		console.error( `SGS icon library ${ LIBRARY_FILE } must be a JSON object { slug: svg }.` );
		process.exit( 1 );
	}
	const problems = [];
	for ( const slug of Object.keys( lib ).sort() ) {
		const svg = lib[ slug ];
		if ( ! /^[a-z][a-z0-9-]*$/.test( slug ) ) {
			problems.push( `"${ slug }": slug must match ^[a-z][a-z0-9-]*$` );
		} else if ( has( icons, slug ) ) {
			problems.push( `"${ slug }": collides with a Lucide icon name (Lucide names are reserved)` );
		} else if ( has( wpIcons, slug ) ) {
			problems.push( `"${ slug }": collides with a WordPress icon name (reserved)` );
		} else if ( has( ALIASES, slug ) ) {
			problems.push( `"${ slug }": collides with a built-in icon alias (reserved)` );
		} else if ( PROTOTYPE_SLUGS.has( slug ) ) {
			problems.push( `"${ slug }": is an Object.prototype member name (reserved: it would pass a prototype-walking lookup and desync the picker from the frontend)` );
		} else if ( 'string' !== typeof svg ) {
			problems.push( `"${ slug }": value must be one <svg>…</svg> string` );
		} else if ( svgProblem( svg ) ) {
			problems.push( `"${ slug }": ${ svgProblem( svg ) }` );
		} else {
			sgsIcons[ slug ] = svg.replace( /\n/g, '' ).replace( /\s{2,}/g, ' ' ).trim();
		}
	}
	if ( problems.length ) {
		console.error( `SGS icon library ${ LIBRARY_FILE } refused:\n  ${ problems.join( '\n  ' ) }` );
		process.exit( 1 );
	}
}
if ( CHECK_ONLY ) {
	console.log( `SGS icon library OK (${ Object.keys( sgsIcons ).length } icons).` );
	process.exit( 0 );
}
const sgsCount = Object.keys( sgsIcons ).length;

// Build PHP output.
const phpLines = [
	'<?php',
	'/**',
	' * Auto-generated Lucide icon map — DO NOT EDIT.',
	` * Generated from lucide-static (${ files.length } icons).`,
	...( sgsCount ? [ ` * Plus ${ sgsCount } SGS library icons (assets/icons/sgs-icons.json).` ] : [] ),
	` * Last generated: ${ new Date().toISOString() }`,
	' *',
	' * Auto-generated — exempt from 300-line limit. See scripts/generate-icons.js.',
	' *',
	' * @package SGS\\Blocks',
	' */',
	'',
	"defined( 'ABSPATH' ) || exit;",
	'',
	'/**',
	' * Return the full Lucide icon SVG map.',
	' *',
	' * Uses a static variable so the array is only built once per request.',
	' *',
	' * @param string $name Icon name (e.g. "clock", "shield-check").',
	' * @return string SVG markup or empty string if not found.',
	' */',
	'function sgs_get_lucide_icon( $name ) {',
	'	static $icons = null;',
	'	if ( null === $icons ) {',
	'		$icons = array(',
];

// Lucide first (order unchanged), then the SGS library sorted by slug.
for ( const [ name, svg ] of [ ...Object.entries( icons ), ...Object.entries( sgsIcons ) ] ) {
	// Escape backslashes, then single quotes, in SVG content for PHP.
	const escaped = svg.replace( /\\/g, '\\\\' ).replace( /'/g, "\\'" );
	phpLines.push( `			'${ name }' => '${ escaped }',` );
}

phpLines.push(
	'		);',
	'	}',
	'',
	'	// Aliases for backwards-compatible icon names (e.g. @wordpress/icons slugs).',
	"	static $aliases = array(",
	...Object.entries( ALIASES ).map( ( [ k, v ] ) => `		${ `'${ k }'`.padEnd( 13 ) }  => '${ v }',` ),
	"	);",
	'',
	"	if ( isset( $icons[ $name ] ) ) {",
	"		return $icons[ $name ];",
	'	}',
	"	if ( isset( $aliases[ $name ] ) && isset( $icons[ $aliases[ $name ] ] ) ) {",
	"		return $icons[ $aliases[ $name ] ];",
	'	}',
	"	return '';",
	'}',
	''
);

// Ensure includes/ directory exists.
const includesDir = path.dirname( OUTPUT_FILE );
if ( ! fs.existsSync( includesDir ) ) {
	fs.mkdirSync( includesDir, { recursive: true } );
}

// Skip the write when only the `Last generated` timestamp would change. This
// file is TRACKED, and stamping a new timestamp on every prebuild left it
// permanently dirty for identical icon content — noise that made the working
// tree never clean (2026-08-08). Compare everything except the timestamp line.
const nextPhp = phpLines.join( '\n' );
const stripStamp = ( s ) => s.replace( /^ \* Last generated: .*$/m, '' );
const prevPhp = fs.existsSync( OUTPUT_FILE ) ? fs.readFileSync( OUTPUT_FILE, 'utf8' ) : '';
if ( stripStamp( prevPhp ) === stripStamp( nextPhp ) ) {
	console.log( `Unchanged ${ OUTPUT_FILE } (${ Object.keys( icons ).length } lucide + ${ sgsCount } sgs icons) — timestamp-only diff skipped.` );
} else {
	fs.writeFileSync( OUTPUT_FILE, nextPhp, 'utf8' );
	console.log( `Generated ${ OUTPUT_FILE } with ${ Object.keys( icons ).length } lucide + ${ sgsCount } sgs icons.` );
}

// ── Editor-side assets for the in-editor IconPicker ─────────────────────────────
// Static JSON fetched on demand by the IconPicker modal (editor only, never the
// frontend, never inlined into the JS bundle). The frontend renders from
// lucide-icons.php (single source of truth). Each file is rewritten only when its
// bytes change, so an unchanged build leaves the tracked files (and their mtimes,
// which are the editor's cache-bust `?ver`) untouched. sgs-icons.json is a source,
// fetched by the picker as-is, so it is not mirrored here.
const ASSETS_DIR = OUT_DIR ? path.join( OUT_DIR, 'assets' ) : path.resolve( __dirname, '../assets/icons' );
fs.mkdirSync( ASSETS_DIR, { recursive: true } );
const writeIfChanged = ( name, data ) => {
	const target = path.join( ASSETS_DIR, name );
	if ( fs.existsSync( target ) && Buffer.compare( fs.readFileSync( target ), Buffer.from( data ) ) === 0 ) {
		return;
	}
	fs.writeFileSync( target, data );
};

// 1. Lucide SVG map { name: svgMarkup } — byte-identical to lucide-static, no SGS icons in it.
writeIfChanged( 'lucide-icons.json', JSON.stringify( icons ) );

// 2. Lucide search aliases { name: [tag, …] } — copied from lucide-static.
const tagsSrc = path.resolve( __dirname, '../node_modules/lucide-static/tags.json' );
if ( fs.existsSync( tagsSrc ) ) {
	writeIfChanged( 'lucide-tags.json', fs.readFileSync( tagsSrc ) );
}

// 2b. WordPress-icon SVG map — parsed above from includes/wp-icons.php so the editor
//     preview is byte-identical to the frontend render (never hand-duplicated).
if ( fs.existsSync( WP_ICONS_PHP ) ) {
	writeIfChanged( 'wp-icons.json', JSON.stringify( wpIcons ) );
}

// 3. Emoji dataset — flattened from unicode-emoji-json into a compact searchable
//    list [{ c: char, n: name, g: group, k: searchString }].
try {
	const byGroup = require( 'unicode-emoji-json/data-by-group.json' );
	const emoji = [];
	for ( const group of Object.values( byGroup ) ) {
		const groupName = group.name || '';
		for ( const item of group.emojis || [] ) {
			const search = `${ item.name } ${ item.slug || '' } ${ groupName }`
				.toLowerCase()
				.replace( /_/g, ' ' );
			emoji.push( { c: item.emoji, n: item.name, g: groupName, k: search } );
		}
	}
	writeIfChanged( 'emoji.json', JSON.stringify( emoji ) );
	console.log(
		`Generated editor icon assets in ${ ASSETS_DIR } (${ Object.keys( icons ).length } lucide + ${ emoji.length } emoji).`
	);
} catch ( err ) {
	console.warn( 'unicode-emoji-json not found — emoji.json not generated. Run npm install.', err.message );
}
