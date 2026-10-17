'use strict';

/**
 * migrate-easing-option-lists.js — one easing master list, every other easing option list a derived view
 * (Spec 38A FR-38A-54, unit M1.9).
 *
 * TARGET SHAPE (settled, no client-visible change): `src/components/motion/easing-master-list.js` names each curve once,
 * tagged by vocabulary, and exports the derived views. A consumer that used to define its own `{ label, value }` list now
 * imports the matching view under its old local name, so its call sites and its saved values do not change.
 *
 *   --survey [--json]  every easing option list defined as a const array under src/, with file and entry count, and
 *                      the files that still hold an inline literal easing list
 *   --fix [--apply]    for each registered consumer: prove its literal list equals the view it moves to (labels, values
 *                      and order), then swap the const for an import. Prints the plan; writes with --apply. A file with
 *                      uncommitted changes is skipped and named.
 *   --check            exit 1 if an easing list const is defined outside the master module, a registered consumer does
 *                      not import its view, the master repeats a value inside a vocabulary, or a derived view differs
 *                      from the block.json enum it feeds
 *   --self-test        plants a stray list and a mismatched view in temp copies and proves --check catches both
 *   --root <dir>       run against another plugin root (a temp copy), used by the negative control
 */

const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const vm = require( 'vm' );
const { spawnSync } = require( 'child_process' );
const { parse } = require( '@babel/parser' );

const PLUGIN = path.resolve( __dirname, '..' );
const MASTER = 'src/components/motion/easing-master-list.js';
const NAME_RE = /(EASE|EASING)/;

const NAV_BLOCK_ENUMS = [
	[ 'nav-bar-menu', [ 'submenuCaretTurnEasing', 'itemMotionEasing' ] ],
		[ 'nav-drawer-menu', [ 'itemMotionEasing', 'submenuCaretTurnEasing', 'submenuAnimationEasing' ] ],
	[ 'icon-list', [ 'itemMotionEasing' ] ],
	[ 'site-header', [ 'inkEasing' ] ],
];

// Every consumer that used to define its own list: the file, the local name it keeps, and the master view it imports.
const CONSUMERS = [
	[ 'src/blocks/extensions/fx.js', 'GSAP_EASING_OPTIONS', 'GSAP_EASING_OPTIONS' ],
	[ 'src/blocks/extensions/hover-effects/constants.js', 'EASING_OPTIONS', 'THEME_EASING_OPTIONS' ],
	[ 'src/components/AnimationControl.js', 'EASINGS', 'ANIMATION_EASING_OPTIONS' ],
	[ 'src/blocks/card-grid/components/card-grid-options.js', 'EASING_OPTIONS', 'CSS_EASING_OPTIONS_IN_OUT_FIRST' ],
	[ 'src/blocks/info-box/edit.js', 'EASING_OPTIONS', 'CSS_EASING_OPTIONS_IN_OUT_FIRST' ],
	[ 'src/blocks/team-member/edit.js', 'EASING_OPTIONS', 'CSS_EASING_OPTIONS_IN_OUT_FIRST' ],
	[ 'src/blocks/gallery/components/gallery-options.js', 'EASING_OPTIONS', 'CSS_EASING_OPTIONS' ],
	[ 'src/blocks/heading/edit.js', 'EASING_OPTIONS', 'CSS_EASING_OPTIONS' ],
	[ 'src/blocks/text/edit.js', 'EASING_OPTIONS', 'CSS_EASING_OPTIONS' ],
	[ 'src/blocks/decorative-image/edit.js', 'PATH_DRAW_EASING_OPTIONS', 'PATH_DRAW_EASING_OPTIONS' ],
].map( ( [ file, local, view ] ) => ( { file, local, view } ) );

// A view must equal the enum of every block.json attribute it feeds (as a set; `extra` are values the attribute adds).
const ENUM_PROOFS = [
	...NAV_BLOCK_ENUMS.flatMap( ( [ block, attrs ] ) =>
		attrs.map( ( attr ) => ( {
			view: 'NAV_EASING_OPTIONS',
			file: `src/blocks/${ block }/block.json`,
			attr,
			extra: attr === 'submenuCaretTurnEasing' ? [ '' ] : [],
		} ) )
	),
	{ view: 'CSS_EASING_OPTIONS', file: 'src/blocks/heading/block.json', attr: 'transitionEasing', extra: [] },
	{ view: 'CSS_EASING_OPTIONS', file: 'src/blocks/text/block.json', attr: 'transitionEasing', extra: [] },
];

// Easing enums that no view feeds yet, each with the reason. A new easing enum not listed here or above fails --check.
const NO_VIEW = {
	'src/blocks/cart/block.json::freeDeliveryFillEasing':
		'its list is an inline literal in cart/PanelContentControls.js, not a const definition',
};

const read = ( file ) => fs.readFileSync( file, 'utf8' );
const posix = ( p ) => p.split( path.sep ).join( '/' );

function walk( dir, out = [] ) {
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			if ( entry.name !== 'node_modules' && entry.name !== 'build' ) {
				walk( full, out );
			}
		} else if ( /\.js$/.test( entry.name ) ) {
			out.push( full );
		}
	}
	return out;
}

const parseSource = ( src ) =>
	parse( src, { sourceType: 'module', plugins: [ 'jsx' ], errorRecovery: true } );

const stringOf = ( node ) => {
	if ( ! node ) {
		return null;
	}
	if ( node.type === 'StringLiteral' ) {
		return node.value;
	}
	if ( node.type === 'CallExpression' && node.callee.name === '__' && node.arguments[ 0 ]?.type === 'StringLiteral' ) {
		return node.arguments[ 0 ].value;
	}
	return null;
};

/** Top-level `const NAME = [ ... ]` whose name mentions EASE or EASING. */
function findLists( src ) {
	const ast = parseSource( src );
	const found = [];
	for ( const stmt of ast.program.body ) {
		const exported = stmt.type === 'ExportNamedDeclaration';
		const decl = exported ? stmt.declaration : stmt;
		if ( ! decl || decl.type !== 'VariableDeclaration' ) {
			continue;
		}
		for ( const d of decl.declarations ) {
			if ( d.id.type !== 'Identifier' || ! NAME_RE.test( d.id.name ) || d.init?.type !== 'ArrayExpression' ) {
				continue;
			}
			const entries = d.init.elements.map( ( el ) => {
				if ( el?.type !== 'ObjectExpression' ) {
					return null;
				}
				const get = ( key ) => el.properties.find( ( p ) => p.key?.name === key )?.value;
				const label = stringOf( get( 'label' ) );
				const value = stringOf( get( 'value' ) );
				return label === null || value === null ? null : { label, value };
			} );
			found.push( {
				name: d.id.name,
				exported,
				stmt,
				count: entries.length,
				entries: entries.every( Boolean ) ? entries : null,
				comments: stmt.leadingComments || [],
			} );
		}
	}
	return { ast, lists: found };
}

/** Evaluate the master module outside the editor: it imports only `__`. */
function loadMaster( root ) {
	const src = read( path.join( root, MASTER ) );
	const names = [ ...src.matchAll( /^export (?:const|function) (\w+)/gm ) ].map( ( m ) => m[ 1 ] );
	const body = src.replace( /^import .*;$/gm, '' ).replace( /^export (const|function)/gm, '$1' );
	return vm.runInNewContext( `${ body }\n({ ${ names.join( ', ' ) } });`, { __: ( text ) => text } );
}

const dirty = ( root, rel ) =>
	spawnSync( 'git', [ 'diff', '--quiet', '--', rel ], { cwd: root }).status !== 0;

function importPath( root, rel ) {
	const target = path.join( root, MASTER ).replace( /\.js$/, '' );
	const relative = posix( path.relative( path.dirname( path.join( root, rel ) ), target ) );
	return relative.startsWith( '.' ) ? relative : `./${ relative }`;
}

function survey( root ) {
	const rows = [];
	const inline = [];
	for ( const file of walk( path.join( root, 'src' ) ) ) {
		const rel = posix( path.relative( root, file ) );
		const src = read( file );
		if ( ! NAME_RE.test( src ) && ! /value:\s*'ease-in-out'/.test( src ) ) {
			continue;
		}
		const { lists } = findLists( src );
		for ( const list of lists ) {
			rows.push( { file: rel, name: list.name, count: list.count, master: rel === MASTER } );
		}
		if ( rel !== MASTER && lists.length === 0 && /value:\s*'ease-in-out'/.test( src ) ) {
			inline.push( rel );
		}
	}
	return { rows, inline };
}

function check( root, consumers = CONSUMERS ) {
	const problems = [];
	const { rows } = survey( root );
	for ( const row of rows.filter( ( r ) => ! r.master ) ) {
		problems.push( `stray easing list ${ row.name } (${ row.count } entries) defined in ${ row.file }` );
	}
	let master;
	try {
		master = loadMaster( root );
	} catch ( error ) {
		return [ ...problems, `master module does not evaluate: ${ error.message }` ];
	}
	const seen = new Map();
	for ( const entry of master.MOTION_EASING_OPTIONS ) {
		for ( const [ vocab, value ] of Object.entries( entry.values ) ) {
			const key = `${ vocab }\u0000${ value }`;
			if ( seen.has( key ) ) {
				problems.push( `master repeats ${ vocab } value "${ value }" (${ seen.get( key ) } and ${ entry.id })` );
			}
			seen.set( key, entry.id );
		}
	}
	for ( const { file, local, view } of consumers ) {
		if ( ! Array.isArray( master[ view ] ) ) {
			problems.push( `${ file }: master exports no view ${ view }` );
			continue;
		}
		const src = read( path.join( root, file ) );
		// The consumer keeps its local name: `view as local` when they differ, the bare view with no alias when they match.
		const binding = view === local ? `\\b${ view }\\b(?!\\s+as\\b)` : `\\b${ view }\\s+as\\s+${ local }\\b`;
		const wired = new RegExp( `import\\s*\\{[^}]*${ binding }[^}]*\\}\\s*from\\s*'[^']*easing-master-list'` );
		if ( ! wired.test( src ) ) {
			problems.push( `${ file }: does not import ${ view } from the master module${ view === local ? ' unaliased' : ` as ${ local }` }` );
		}
	}
	for ( const proof of ENUM_PROOFS ) {
		const view = master[ proof.view ];
		const json = JSON.parse( read( path.join( root, proof.file ) ) );
		const declared = json.attributes?.[ proof.attr ]?.enum;
		if ( ! declared ) {
			problems.push( `${ proof.file }::${ proof.attr } declares no enum` );
			continue;
		}
		const want = [ ...view.map( ( o ) => o.value ), ...proof.extra ].sort();
		const have = [ ...declared ].sort();
		if ( JSON.stringify( want ) !== JSON.stringify( have ) ) {
			problems.push( `${ proof.view } differs from ${ proof.file }::${ proof.attr } enum: view [${ want }] vs enum [${ have }]` );
		}
	}
	const proven = new Set( ENUM_PROOFS.map( ( p ) => `${ p.file }::${ p.attr }` ) );
	for ( const file of walk( path.join( root, 'src/blocks' ) ).filter( ( f ) => f.endsWith( 'block.json' ) ) ) {
		const rel = posix( path.relative( root, file ) );
		for ( const [ attr, def ] of Object.entries( JSON.parse( read( file ) ).attributes || {} ) ) {
			const id = `${ rel }::${ attr }`;
			if ( /easing/i.test( attr ) && Array.isArray( def.enum ) && ! proven.has( id ) && ! NO_VIEW[ id ] ) {
				problems.push( `${ id } is an easing enum that no view is proven against` );
			}
		}
	}
	return problems;
}

function planFix( root, consumer ) {
	const { file, local, view } = consumer;
	const full = path.join( root, file );
	const src = read( full );
	const { ast, lists } = findLists( src );
	const list = lists.find( ( l ) => l.name === local );
	if ( ! list ) {
		return { file, status: 'done' };
	}
	if ( ! list.entries ) {
		return { file, status: 'refused', why: `${ local } has an entry that is not a literal { label, value }` };
	}
	const master = loadMaster( root );
	const want = JSON.stringify( master[ view ] );
	if ( JSON.stringify( list.entries ) !== want ) {
		return { file, status: 'refused', why: `${ local } differs from ${ view }: ${ JSON.stringify( list.entries ) } vs ${ want }` };
	}
	if ( dirty( root, file ) ) {
		return { file, status: 'skipped-dirty' };
	}
	const imports = ast.program.body.filter( ( s ) => s.type === 'ImportDeclaration' );
	const lastImport = imports[ imports.length - 1 ];
	const doc = list.comments.filter( ( c ) => c.type === 'CommentBlock' && c.value.startsWith( '*' ) ).pop();
	let cutStart = list.stmt.start;
	if ( doc && /^\s*$/.test( src.slice( doc.end, list.stmt.start ).replace( /\n/, '' ) ) ) {
		cutStart = doc.start;
	}
	let cutEnd = list.stmt.end;
	while ( src[ cutEnd ] === '\r' || src[ cutEnd ] === '\n' ) {
		cutEnd += 1;
		if ( src.slice( cutEnd - 2, cutEnd ) === '\n\n' || src.slice( cutEnd - 4, cutEnd ) === '\r\n\r\n' ) {
			break;
		}
	}
	const nl = src.includes( '\r\n' ) ? '\r\n' : '\n';
	const from = importPath( root, file );
	const added = `${ nl }import { ${ view === local ? view : `${ view } as ${ local }` } } from '${ from }';${ list.exported ? `${ nl }export { ${ local } };` : '' }`;
	const out = src.slice( 0, lastImport.end ) + added + src.slice( lastImport.end, cutStart ) + src.slice( cutEnd );
	return { file, status: 'ready', out, full, view };
}

function main() {
	const args = process.argv.slice( 2 );
	const rootIdx = args.indexOf( '--root' );
	const root = rootIdx >= 0 ? path.resolve( args[ rootIdx + 1 ] ) : PLUGIN;
	if ( args.includes( '--survey' ) ) {
		const { rows, inline } = survey( root );
		if ( args.includes( '--json' ) ) {
			console.log( JSON.stringify( { rows, inline }, null, 2 ) );
			return 0;
		}
		rows.forEach( ( r ) => console.log( `${ r.master ? 'MASTER ' : 'LIST   ' } ${ r.file }  ${ r.name }  ${ r.count } entries` ) );
		console.log( `definitions outside the master: ${ rows.filter( ( r ) => ! r.master ).length }` );
		console.log( `files with an inline literal easing list (not const definitions, not migrated here): ${ inline.length }` );
		inline.forEach( ( f ) => console.log( `  inline ${ f }` ) );
		return 0;
	}
	if ( args.includes( '--fix' ) ) {
		const apply = args.includes( '--apply' );
		let skipped = 0;
		for ( const consumer of CONSUMERS ) {
			const plan = planFix( root, consumer );
			if ( plan.status === 'ready' ) {
				console.log( `${ apply ? 'fixing ' : 'would fix' } ${ plan.file } -> ${ plan.view }` );
				if ( apply ) {
					const tmp = `${ plan.full }.tmp`;
					fs.writeFileSync( tmp, plan.out );
					fs.renameSync( tmp, plan.full );
				}
			} else {
				console.log( `${ plan.status } ${ plan.file }${ plan.why ? `: ${ plan.why }` : '' }` );
				skipped += plan.status === 'skipped-dirty' || plan.status === 'refused' ? 1 : 0;
			}
		}
		return skipped ? 1 : 0;
	}
	if ( args.includes( '--check' ) ) {
		const problems = check( root );
		problems.forEach( ( p ) => console.log( `FAIL ${ p }` ) );
		console.log( problems.length ? `${ problems.length } problem(s)` : 'easing option lists: clean' );
		return problems.length ? 1 : 0;
	}
	if ( args.includes( '--self-test' ) ) {
		return selfTest();
	}
	console.log( 'usage: --survey [--json] | --fix [--apply] | --check | --self-test  [--root <dir>]' );
	return 2;
}

function selfTest() {
	const tmp = fs.mkdtempSync( path.join( os.tmpdir(), 'easing-selftest-' ) );
	const copy = ( rel ) => {
		fs.mkdirSync( path.dirname( path.join( tmp, rel ) ), { recursive: true } );
		fs.copyFileSync( path.join( PLUGIN, rel ), path.join( tmp, rel ) );
	};
	[ MASTER, ...ENUM_PROOFS.map( ( p ) => p.file ), ...Object.keys( NO_VIEW ).map( ( k ) => k.split( '::' )[ 0 ] ) ].forEach( copy );
	const consumer = { file: 'src/blocks/heading/edit.js', local: 'EASING_OPTIONS', view: 'CSS_EASING_OPTIONS' };
	const clean = "import { CSS_EASING_OPTIONS as EASING_OPTIONS } from '../../components/motion/easing-master-list';\n";
	const consumerPath = path.join( tmp, consumer.file );
	fs.mkdirSync( path.dirname( consumerPath ), { recursive: true } );
	const results = [];
	const expect = ( name, got, wantClean, needle ) => {
		const ok = wantClean ? got.length === 0 : got.some( ( p ) => p.includes( needle ) );
		results.push( ok );
		console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ name }${ ok ? '' : `: ${ JSON.stringify( got ) }` }` );
	};
	fs.writeFileSync( consumerPath, clean );
	expect( 'positive control: a clean copy passes', check( tmp, [ consumer ] ), true );
	fs.writeFileSync( consumerPath, `${ clean }const STRAY_EASING_OPTIONS = [ { label: 'Ease', value: 'ease' } ];\n` );
	expect( 'plant 1: a stray list is caught', check( tmp, [ consumer ] ), false, 'stray easing list STRAY_EASING_OPTIONS' );
	fs.writeFileSync( consumerPath, clean );
	const masterPath = path.join( tmp, MASTER );
	const original = read( masterPath );
	fs.writeFileSync( masterPath, original.replace( "css: 'ease-in-out'", "css: 'ease-in-outt'" ) );
	expect( 'plant 2: a mismatched view is caught', check( tmp, [ consumer ] ), false, 'differs from' );
	fs.writeFileSync( masterPath, original );
	fs.writeFileSync( consumerPath, 'export const nothing = 1;\n' );
	expect( 'plant 3: an unwired consumer is caught', check( tmp, [ consumer ] ), false, 'does not import' );
	fs.writeFileSync( consumerPath, clean.replace( 'as EASING_OPTIONS', 'as OTHER_EASING_OPTIONS' ) );
	expect( 'plant 4: a consumer importing under the wrong local name is caught', check( tmp, [ consumer ] ), false, 'as EASING_OPTIONS' );
	const same = { ...consumer, local: 'CSS_EASING_OPTIONS' };
	fs.writeFileSync( consumerPath, clean.replace( ' as EASING_OPTIONS', '' ) );
	expect( 'positive control: an unaliased consumer keeping the view name passes', check( tmp, [ same ] ), true );
	fs.writeFileSync( consumerPath, clean );
	expect( 'plant 5: a consumer that should keep the view name but aliases it is caught', check( tmp, [ same ] ), false, 'unaliased' );
	fs.rmSync( tmp, { recursive: true, force: true } );
	return results.every( Boolean ) ? 0 : 1;
}

process.exitCode = main();
