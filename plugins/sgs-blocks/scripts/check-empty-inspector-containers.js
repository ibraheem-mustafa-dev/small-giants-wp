/**
 * check-empty-inspector-containers.js
 *
 * STRUCTURAL GUARD — an inspector container rendered with NO children.
 *
 * WHY THIS EXISTS
 * ---------------
 * A `<ToolsPanelItem>` with no children still appears in its ToolsPanel's "+"
 * disclosure menu and still participates in `resetAll`/`onDeselect` — so the
 * client can find it, switch it on, and be shown nothing. A `<PanelBody>` with
 * no children renders a collapsible section that opens onto blank space. Both
 * are dead controls in the Spec 35 Part F sense, and NOTHING in `prebuild`
 * catches them: `check-dead-controls.js` checks attribute wiring (a control
 * exists but nothing renders it), which is the opposite direction — a container
 * whose children were deleted still has perfectly valid attribute wiring.
 *
 * Earned 2026-08-16 (D639). Moving `<BackgroundPanel>` out of `sgs/site-header`
 * into a Styles-tab sibling deleted the mount but left its surrounding
 * `<ToolsPanelItem label="Background" …>` wrapper standing and empty. The full
 * `npm run build` passed all ~50 gates with that defect in the tree.
 *
 * ⛔ WHY THIS IS AN AST WALK AND NOT A REGEX
 * ------------------------------------------
 * Two hand-rolled regexes were tried first and BOTH were wrong, in opposite
 * directions — recorded here because the next person will reach for a regex too:
 *   1. `<(Tag)[^>]*?>\s*</\1>` found ZERO. The `[^>]*` cannot cross the `=>` in
 *      an arrow function inside a prop, and every real container has one.
 *   2. `>\s*\n\s*</(Tag)>` found 471. It matches the closing `>` of the last
 *      CHILD (`<SomeControl … />`) followed by the container's close tag — i.e.
 *      nearly every non-empty container in the tree.
 * A false absence and a false flood from the same question. JSX children are a
 * tree; only a parser can answer "does this element have any".
 *
 * WHAT COUNTS AS EMPTY
 * --------------------
 * Whitespace-only `JSXText` and comment-only `{/* … *\/}` expression containers
 * are NOT children. Anything else is. A self-closing element is skipped
 * entirely — `<PanelBody />` is a different (and rarer) mistake.
 *
 * USAGE
 *   node scripts/check-empty-inspector-containers.js --survey     # census, exit 0
 *   node scripts/check-empty-inspector-containers.js --check      # gate, exit 1 on any finding
 *   node scripts/check-empty-inspector-containers.js --json       # machine-readable
 *   node scripts/check-empty-inspector-containers.js --self-test  # proves it can fail
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const parser = require( '@babel/parser' );

const SRC = path.resolve( __dirname, '..', 'src' );

/** Containers whose emptiness is a client-visible defect. */
const CONTAINERS = new Set( [
	'ToolsPanelItem',
	'PanelBody',
	'ToolsPanel',
	'InspectorControls',
] );

/**
 * Collect every editor-side source file worth scanning.
 *
 * @param {string} srcDir Plugin `src` directory.
 * @return {string[]} Absolute file paths.
 */
function collectFiles( srcDir ) {
	const out = [];
	const blocksDir = path.join( srcDir, 'blocks' );
	if ( fs.existsSync( blocksDir ) ) {
		for ( const dir of fs.readdirSync( blocksDir ) ) {
			const edit = path.join( blocksDir, dir, 'edit.js' );
			if ( fs.existsSync( edit ) ) {
				out.push( edit );
			}
			const comps = path.join( blocksDir, dir, 'components' );
			if ( fs.existsSync( comps ) ) {
				for ( const f of fs.readdirSync( comps ) ) {
					if ( f.endsWith( '.js' ) ) {
						out.push( path.join( comps, f ) );
					}
				}
			}
		}
	}
	const shared = path.join( srcDir, 'components' );
	if ( fs.existsSync( shared ) ) {
		for ( const f of fs.readdirSync( shared ) ) {
			if ( f.endsWith( '.js' ) ) {
				out.push( path.join( shared, f ) );
			}
		}
	}
	return out.sort();
}

/**
 * Does this JSX element have any child that actually renders?
 *
 * @param {Object} node JSXElement node.
 * @return {boolean} True when at least one meaningful child exists.
 */
function hasRenderingChild( node ) {
	return ( node.children || [] ).some( ( c ) => {
		if ( c.type === 'JSXText' ) {
			return c.value.trim() !== '';
		}
		if ( c.type === 'JSXExpressionContainer' ) {
			// `{/* comment *\/}` parses as an empty expression — not a child.
			return c.expression.type !== 'JSXEmptyExpression';
		}
		return true;
	} );
}

/**
 * Scan one file for empty containers.
 *
 * @param {string} file Absolute path.
 * @return {{findings: Array<Object>, parseError: string|null}} Result.
 */
function scanFile( file ) {
	const findings = [];
	let ast;
	try {
		ast = parser.parse( fs.readFileSync( file, 'utf8' ), {
			sourceType: 'module',
			plugins: [ 'jsx' ],
		} );
	} catch ( e ) {
		return { findings, parseError: e.message };
	}

	const seen = new Set();
	const walk = ( node ) => {
		if ( ! node || typeof node !== 'object' ) {
			return;
		}
		if ( Array.isArray( node ) ) {
			node.forEach( walk );
			return;
		}
		if ( seen.has( node ) ) {
			return;
		}
		seen.add( node );

		if ( node.type === 'JSXElement' && ! node.openingElement.selfClosing ) {
			const nameNode = node.openingElement.name;
			const name = nameNode && nameNode.type === 'JSXIdentifier' ? nameNode.name : null;
			if ( name && CONTAINERS.has( name ) && ! hasRenderingChild( node ) ) {
				findings.push( {
					file: path.relative( path.resolve( __dirname, '..' ), file ).replace( /\\/g, '/' ),
					line: node.loc.start.line,
					container: name,
					message:
						`<${ name }> is rendered with no children. It still appears to the client ` +
						`(a ToolsPanelItem in the "+" menu, a PanelBody as a collapsible section) ` +
						`and shows nothing when opened — a dead control (Spec 35 Part F).`,
				} );
			}
		}

		for ( const key of Object.keys( node ) ) {
			if ( key === 'loc' || key === 'start' || key === 'end' || key === 'range' ) {
				continue;
			}
			walk( node[ key ] );
		}
	};
	walk( ast.program.body );
	return { findings, parseError: null };
}

/**
 * Scan a whole source tree.
 *
 * @param {string} [srcDir] Override for --self-test.
 * @return {{findings: Array<Object>, parseErrors: Array<Object>, filesScanned: number}} Result.
 */
function scanTree( srcDir = SRC ) {
	const files = collectFiles( srcDir );
	const findings = [];
	const parseErrors = [];
	for ( const f of files ) {
		const r = scanFile( f );
		findings.push( ...r.findings );
		if ( r.parseError ) {
			parseErrors.push( { file: f, error: r.parseError } );
		}
	}
	return { findings, parseErrors, filesScanned: files.length };
}

/**
 * --self-test: prove the detector CAN fail, and prove it stays quiet on the
 * shapes that must NOT flag — the two regex attempts this replaced got each of
 * these wrong (see the header).
 *
 * @return {void}
 */
function runSelfTest() {
	const os = require( 'os' );
	const failures = [];
	const assert = ( label, cond ) => {
		process.stdout.write( `  ${ cond ? 'PASS' : 'FAIL' }  ${ label }\n` );
		if ( ! cond ) {
			failures.push( label );
		}
	};
	process.stdout.write( '[check-empty-inspector-containers --self-test]\n\n' );

	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'eic-' ) );
	const blocks = path.join( root, 'blocks' );
	const write = ( slug, body ) => {
		fs.mkdirSync( path.join( blocks, slug ), { recursive: true } );
		fs.writeFileSync( path.join( blocks, slug, 'edit.js' ), body, 'utf8' );
	};
	fs.mkdirSync( path.join( root, 'components' ), { recursive: true } );

	// POSITIVE CONTROL — the exact defect this was earned by: an arrow function
	// in a prop (which killed regex attempt 1) plus a genuinely empty body.
	write( 'bad', `export default function Edit(){ return (
		<ToolsPanelItem label="Background" hasValue={ () => !! x } onDeselect={ () => set( {} ) }>
		</ToolsPanelItem> ); }` );

	// NEGATIVE CONTROL — last child is SELF-CLOSING (which produced regex
	// attempt 2's 471 false positives). Must NOT flag.
	write( 'good', `export default function Edit(){ return (
		<PanelBody title="T">
			<SomeControl value={ v } onChange={ () => set( 1 ) } />
		</PanelBody> ); }` );

	// NEGATIVE CONTROL — comment-only body IS empty, and must flag.
	write( 'commentonly', `export default function Edit(){ return (
		<PanelBody title="T">
			{ /* nothing here yet */ }
		</PanelBody> ); }` );

	// NEGATIVE CONTROL — self-closing container is a different shape, skipped.
	write( 'selfclosing', `export default function Edit(){ return ( <PanelBody /> ); }` );

	const { findings, parseErrors, filesScanned } = scanTree( root );
	const at = ( slug ) => findings.filter( ( f ) => f.file.includes( `/${ slug }/` ) );

	assert( 'scans every fixture', filesScanned === 4 );
	assert( 'no parse errors on valid JSX', parseErrors.length === 0 );
	assert( 'CATCHES an empty ToolsPanelItem whose props contain arrow functions', at( 'bad' ).length === 1 );
	assert( 'does NOT flag a container whose last child is self-closing', at( 'good' ).length === 0 );
	assert( 'CATCHES a comment-only container (a comment is not a child)', at( 'commentonly' ).length === 1 );
	assert( 'does NOT flag a self-closing container', at( 'selfclosing' ).length === 0 );
	assert( 'total findings are exactly the two planted defects', findings.length === 2 );

	fs.rmSync( root, { recursive: true, force: true } );

	process.stdout.write(
		failures.length === 0
			? '\n[check-empty-inspector-containers --self-test] ALL ASSERTIONS PASS.\n'
			: `\n[check-empty-inspector-containers --self-test] ${ failures.length } FAILURE(S).\n`
	);
	process.exit( failures.length === 0 ? 0 : 1 );
}

/**
 * CLI entry point.
 *
 * @return {void}
 */
function main() {
	const check = process.argv.includes( '--check' );
	const asJson = process.argv.includes( '--json' );
	const { findings, parseErrors, filesScanned } = scanTree();

	if ( asJson ) {
		process.stdout.write( JSON.stringify( { findings, parseErrors, filesScanned }, null, 2 ) + '\n' );
	} else {
		process.stdout.write( '[check-empty-inspector-containers]\n\n' );
		process.stdout.write( `Files scanned: ${ filesScanned }\n` );
		for ( const p of parseErrors ) {
			process.stdout.write( `  PARSE-FAIL ${ p.file }: ${ p.error }\n` );
		}
		process.stdout.write( `Empty containers: ${ findings.length }\n` );
		for ( const f of findings ) {
			process.stdout.write( `  ${ f.file }:${ f.line }  <${ f.container }>\n` );
		}
	}

	if ( check ) {
		process.exit( findings.length > 0 || parseErrors.length > 0 ? 1 : 0 );
	}
	process.exit( 0 );
}

if ( require.main === module ) {
	if ( process.argv.includes( '--self-test' ) ) {
		runSelfTest();
	} else {
		main();
	}
}

module.exports = { CONTAINERS, collectFiles, hasRenderingChild, scanFile, scanTree };
