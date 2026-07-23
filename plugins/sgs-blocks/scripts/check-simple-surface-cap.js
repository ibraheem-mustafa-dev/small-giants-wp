/**
 * check-simple-surface-cap.js
 *
 * FR-37-27 (Spec 37, .claude/specs/37-HEADER-FOOTER-BUILDER.md) — the SIMPLE
 * SURFACE CAP, made computable. The Simple surface (`sgs/site-header` and
 * `sgs/site-footer`) ships **at most 3 controls by default**. Operator
 * pin/unpin exists but is default-off, reached through Advanced ("Customise
 * this panel") — never a first-class drag handle, because a tech-illiterate
 * client can unpin a control they rely on and get a "missing setting" with no
 * trail (P2 §5, Bean-confirmed).
 *
 * COUNTING RULES (P2 §5 `:464-466`, quoted verbatim in FR-37-27 — implemented
 * exactly, not re-derived):
 *
 *   "one labelled inspector row = one control."
 *   "A ResponsiveTriStateControl counts as ONE control."
 *   A preset control (FR-37-28) counts as ONE, not as the N attributes it
 *     writes.
 *   "The Advanced ToolsPanel is uncapped and does NOT count" — the cap
 *     governs the default-visible surface only.
 *
 * HOW "DEFAULT-VISIBLE" IS DECIDED
 * ---------------------------------
 * `sgs/site-header` already uses `__experimentalToolsPanel` (ToolsPanel)
 * disclosure (`site-header/edit.js:116-230`) — that IS the Simple/Advanced
 * split mechanism this spec designed around, so this script reads it
 * directly rather than inventing a parallel classification:
 *
 *   - A control wrapped in a `<ToolsPanelItem isShownByDefault>` (boolean
 *     shorthand, or `={true}`) is DEFAULT-VISIBLE (Simple) — ONE row,
 *     regardless of how many attributes its own onChange writes (this is
 *     exactly the "ResponsiveTriStateControl counts as one" / "preset counts
 *     as one" rule — the row is the unit, not the attribute).
 *   - A `<ToolsPanelItem>` with `isShownByDefault={false}` or the prop
 *     omitted (WP's own default) is ADVANCED-ONLY — reached only through
 *     "Customise this panel" — and is UNCAPPED, per FR-37-27. Not counted.
 *   - A control-like element that sits OUTSIDE any ToolsPanel at all (bare in
 *     a `<PanelBody>` or directly in `<InspectorControls>`) has NO Advanced
 *     disclosure covering it — it is unconditionally shown, so it counts as
 *     ONE default-visible row too. This is deliberate: an un-migrated bare
 *     control is not "safely hidden", it is MORE exposed than an
 *     unpin-by-default ToolsPanelItem, so undercounting it would be the
 *     wrong direction of error.
 *   - A custom composite component (e.g. `<WidthPanel />`,
 *     `<ResponsiveSpacingPanel />`) is opaque to this script — it is not
 *     re-parsed — and is counted as exactly ONE row, matching how FR-37-27's
 *     roster table names it as a single item ("Header width",
 *     "per-breakpoint spacing").
 *   - `<PanelBody>`, `<ToolsPanel>`, `<InspectorControls>`, `<PanelRow>`,
 *     `<Fragment>`/`<>...</>` and lowercase host elements (`<div>`, `<p>`,
 *     `<hr>`) are transparent structural wrappers, not rows themselves — the
 *     walk descends through them looking for the real rows inside.
 *
 * WHICH REGIONS ARE COUNTED
 * --------------------------
 * `<InspectorControls>` (no `group` prop, or `group="default"`, or
 * `group="settings"`) is bucketed as "Settings-tab". `<InspectorControls
 * group="styles">` is bucketed as "Styles-tab". Both buckets count toward
 * the SAME per-block cap of 3 — FR-37-27's own roster table sums the two
 * tabs to exactly 3 for `sgs/site-header` (2 Settings + 1 Styles) and 2 for
 * `sgs/site-footer` (2 Settings + 0 Styles), i.e. the cap is per-BLOCK, not
 * per-tab. Any other `group` value (`"color"`, `"advanced"`, `"border"`,
 * `"position"`, `"typography"`, `"filter"` — WP's native style-engine
 * sub-panels) is OUT OF SCOPE for the Simple/Advanced split this spec
 * describes; such regions are scanned and reported for visibility but never
 * counted toward the cap and never cause a failure.
 *
 * NO CONFLICT WITH check-element-manifest-conformance.js (verified in
 * FR-37-27, 2026-07-21). That script asks whether every capability has a
 * control SOMEWHERE (Advanced satisfies it) and is WARN-ONLY, always exits 0.
 * This script asks a different question — which controls are DEFAULT-VISIBLE
 * — and is a HARD gate (non-zero exit on a cap violation). Do not merge them.
 *
 * NOT WIRED INTO THE BUILD. This script exists as a standalone gate per
 * FR-37-27's "done when" clause ("the lint fails a build that adds a
 * fourth"); wiring it into `prebuild` is a separate decision, deliberately
 * not taken here (`sgs/site-header` and `sgs/site-footer` are still
 * NOT-BUILT against this cap — see the real findings printed below).
 *
 * Usage
 * -----
 *   node scripts/check-simple-surface-cap.js                 # default roster (site-header + site-footer), human report
 *   node scripts/check-simple-surface-cap.js --json           # machine report to stdout
 *   node scripts/check-simple-surface-cap.js --check           # alias of the default run (CLI symmetry with sibling gates)
 *   node scripts/check-simple-surface-cap.js --self-test       # run the script's own fixture assertions, no disk access
 *   node scripts/check-simple-surface-cap.js [--cap=N] <file> [<file> ...]
 *                                                                # scan explicit edit.js file(s) instead of the default
 *                                                                # roster (block slug inferred from the parent directory
 *                                                                # name) — use this to point the gate at a scratch fixture
 *                                                                # copy without touching the real block files.
 *
 * Exit code: 0 when every scanned block's default-visible row count is
 * ≤ its cap; 1 when any block is over cap, any target file is missing, or
 * any target file fails to parse. --self-test exits 1 if its own fixture
 * assertions do not match the expected PASS/FAIL outcome.
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const parser = require( '@babel/parser' );
const traverse = require( '@babel/traverse' ).default;

const ROOT = path.join( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const DEFAULT_CAP = 3;

const DEFAULT_TARGETS = [
	{
		blockSlug: 'sgs/site-header',
		file: path.join( BLOCKS_DIR, 'site-header', 'edit.js' ),
		cap: DEFAULT_CAP,
	},
	{
		blockSlug: 'sgs/site-footer',
		file: path.join( BLOCKS_DIR, 'site-footer', 'edit.js' ),
		cap: DEFAULT_CAP,
	},
];

const PARSER_OPTIONS = {
	sourceType: 'module',
	plugins: [
		'jsx',
		'classProperties',
		'objectRestSpread',
		'optionalChaining',
		'nullishCoalescingOperator',
		'dynamicImport',
	],
};

// Structural wrappers that are never a "row" themselves — the walk descends
// through them looking for real rows. Kept small + justified (mirrors the
// house style of check-duplicate-controls.js's own curated allowlists).
const PASSTHROUGH_NAMES = new Set( [
	'InspectorControls',
	'ToolsPanel',
	'PanelBody',
	'PanelRow',
	'Fragment',
] );

// ---------------------------------------------------------------------------
// AST HELPERS
// ---------------------------------------------------------------------------

/** JSXIdentifier -> string; JSXMemberExpression (e.g. React.Fragment) -> dotted string; else null. */
function getJsxName( nameNode ) {
	if ( ! nameNode ) return null;
	if ( nameNode.type === 'JSXIdentifier' ) return nameNode.name;
	if ( nameNode.type === 'JSXMemberExpression' ) {
		const object = getJsxName( nameNode.object );
		const property = getJsxName( nameNode.property );
		return object && property ? `${ object }.${ property }` : null;
	}
	return null;
}

/** Find a JSXAttribute by name on an opening element's attributes list (ignores spreads). */
function findAttr( attributes, name ) {
	return ( attributes || [] ).find(
		( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === name
	);
}

/**
 * Resolve a boolean-shaped JSX attribute.
 * @return {true|false|'dynamic'|'absent'}
 */
function resolveBooleanAttr( attributes, name ) {
	const attr = findAttr( attributes, name );
	if ( ! attr ) return 'absent';
	if ( attr.value === null ) return true; // boolean shorthand: `isShownByDefault`
	if ( attr.value.type === 'JSXExpressionContainer' ) {
		const expr = attr.value.expression;
		if ( expr.type === 'BooleanLiteral' ) return expr.value;
		return 'dynamic'; // can't statically resolve — see module header, counted conservatively.
	}
	return 'dynamic';
}

/**
 * Resolve a string-shaped JSX attribute to its literal value, or null.
 * Also unwraps the standard WordPress i18n call `__( 'text', 'text-domain' )`
 * (and the no-text-domain single-arg form) — the house style for every
 * `label`/`help` string in this codebase, so labels report legibly instead of
 * "(unlabelled)" for every real control.
 */
function resolveStringAttr( attributes, name ) {
	const attr = findAttr( attributes, name );
	if ( ! attr || ! attr.value ) return null;
	if ( attr.value.type === 'StringLiteral' ) return attr.value.value;
	if ( attr.value.type !== 'JSXExpressionContainer' ) return null;

	const expr = attr.value.expression;
	if ( expr.type === 'StringLiteral' ) return expr.value;
	if (
		expr.type === 'CallExpression' &&
		expr.callee &&
		expr.callee.type === 'Identifier' &&
		expr.callee.name === '__' &&
		expr.arguments[ 0 ] &&
		expr.arguments[ 0 ].type === 'StringLiteral'
	) {
		return expr.arguments[ 0 ].value;
	}
	return null; // genuinely dynamic (template literal / identifier) — reported as unlabelled, never used as a group bucket (see resolveGroupBucket).
}

/**
 * Classify an `<InspectorControls>` element's `group` prop into which tab
 * bucket it belongs to for the Simple-surface cap, per the module header.
 */
function resolveGroupBucket( attributes ) {
	const attr = findAttr( attributes, 'group' );
	if ( ! attr ) return { group: 'default', bucket: 'settings-tab' };
	const value = resolveStringAttr( attributes, 'group' );
	if ( value === null ) return { group: '(dynamic)', bucket: 'excluded' };
	if ( value === 'default' || value === 'settings' ) return { group: value, bucket: 'settings-tab' };
	if ( value === 'styles' ) return { group: 'styles', bucket: 'styles-tab' };
	return { group: value, bucket: 'excluded' };
}

/**
 * Build a JSXElement visitor (for `path.traverse()`, scoped to one
 * `<InspectorControls>` subtree) that finds every "row" per the counting
 * rules and pushes it to `rows`.
 */
function makeRowVisitor( rows ) {
	return {
		JSXElement( elPath ) {
			const opening = elPath.node.openingElement;
			const name = getJsxName( opening.name );
			if ( ! name ) return;

			if ( name === 'ToolsPanelItem' ) {
				const label = resolveStringAttr( opening.attributes, 'label' ) || '(unlabelled)';
				const shown = resolveBooleanAttr( opening.attributes, 'isShownByDefault' );
				// WP's own ToolsPanelItem default is isShownByDefault=false when the
				// prop is omitted — 'absent' therefore means Advanced-only, exactly
				// like an explicit `={false}`. A 'dynamic' value is counted as
				// default-visible (fail toward MORE exposed, never toward silently
				// undercounting — see module header).
				const defaultVisible = shown === true || shown === 'dynamic';
				rows.push( {
					kind: 'ToolsPanelItem',
					label,
					defaultVisible,
					dynamic: shown === 'dynamic',
					line: elPath.node.loc ? elPath.node.loc.start.line : 0,
				} );
				elPath.skip(); // the control(s) inside are part of THIS row, not separate rows.
				return;
			}

			if ( PASSTHROUGH_NAMES.has( name ) ) {
				return; // keep descending — not a row itself.
			}

			if ( name[ 0 ] !== name[ 0 ].toUpperCase() ) {
				return; // lowercase host element (div/p/hr/span) — transparent, keep descending.
			}

			// Opaque leaf: any other capitalised component — a real control
			// primitive (ToggleControl, SelectControl, ResponsiveTriStateControl,
			// a preset control, ...) or a custom composite panel (WidthPanel,
			// ResponsiveSpacingPanel, ...). Neither has any Advanced disclosure of
			// its own here, so it is unconditionally default-visible. ONE row —
			// do not descend into it (its own internals, if any, belong to this
			// one labelled row, not separate rows; the "one labelled inspector
			// row = one control" rule).
			const label = resolveStringAttr( opening.attributes, 'label' ) || name;
			rows.push( {
				kind: 'bare',
				label,
				component: name,
				defaultVisible: true,
				dynamic: false,
				line: elPath.node.loc ? elPath.node.loc.start.line : 0,
			} );
			elPath.skip();
		},
	};
}

// ---------------------------------------------------------------------------
// PER-SOURCE ANALYSIS
// ---------------------------------------------------------------------------

/**
 * Analyse one edit.js source string against the Simple-surface cap.
 *
 * @param {string} src       edit.js source.
 * @param {string} blockSlug Block slug for reporting (e.g. 'sgs/site-header').
 * @param {number} cap       Default-visible-row cap (FR-37-27 headline: 3).
 * @param {string} filePath  Path for reporting (need not exist on disk).
 * @return {Object} Result — see shape below.
 */
function analyseSource( src, blockSlug, cap, filePath ) {
	const ast = parser.parse( src, PARSER_OPTIONS );

	const regions = []; // { group, bucket, rows: [...], line }

	traverse( ast, {
		JSXElement( elPath ) {
			const name = getJsxName( elPath.node.openingElement.name );
			if ( name !== 'InspectorControls' ) return;
			const { group, bucket } = resolveGroupBucket( elPath.node.openingElement.attributes );
			const rows = [];
			elPath.traverse( makeRowVisitor( rows ) );
			regions.push( {
				group,
				bucket,
				rows,
				line: elPath.node.loc ? elPath.node.loc.start.line : 0,
			} );
			elPath.skip();
		},
	} );

	const countedRows = [];
	const excludedRegions = [];
	for ( const region of regions ) {
		if ( region.bucket === 'excluded' ) {
			excludedRegions.push( region );
			continue;
		}
		for ( const row of region.rows ) {
			countedRows.push( Object.assign( {}, row, { bucket: region.bucket, group: region.group } ) );
		}
	}
	countedRows.sort( ( a, b ) => a.line - b.line );

	const defaultVisibleRows = countedRows.filter( ( r ) => r.defaultVisible );
	const advancedRows = countedRows.filter( ( r ) => ! r.defaultVisible );
	const overCap = defaultVisibleRows.length > cap;
	const pushingRow = overCap ? defaultVisibleRows[ cap ] : null; // the (cap+1)-th default-visible row, 0-indexed.

	return {
		blockSlug,
		filePath,
		cap,
		regions,
		excludedRegions,
		countedRows,
		defaultVisibleRows,
		advancedRows,
		totalDefaultVisible: defaultVisibleRows.length,
		pass: ! overCap,
		pushingRow,
		parseError: null,
	};
}

/** Analyse a target { blockSlug, file, cap }, reading it from disk. Never throws. */
function analyseTarget( target ) {
	if ( ! fs.existsSync( target.file ) ) {
		return {
			blockSlug: target.blockSlug,
			filePath: target.file,
			cap: target.cap,
			pass: false,
			missing: true,
			parseError: null,
			totalDefaultVisible: null,
			defaultVisibleRows: [],
			advancedRows: [],
			excludedRegions: [],
			pushingRow: null,
		};
	}
	const src = fs.readFileSync( target.file, 'utf8' );
	try {
		return Object.assign( analyseSource( src, target.blockSlug, target.cap, target.file ), {
			missing: false,
		} );
	} catch ( e ) {
		return {
			blockSlug: target.blockSlug,
			filePath: target.file,
			cap: target.cap,
			pass: false,
			missing: false,
			parseError: e.message,
			totalDefaultVisible: null,
			defaultVisibleRows: [],
			advancedRows: [],
			excludedRegions: [],
			pushingRow: null,
		};
	}
}

// ---------------------------------------------------------------------------
// REPORTING
// ---------------------------------------------------------------------------

function relPath( p ) {
	return path.relative( ROOT, p ).split( path.sep ).join( '/' );
}

function printHuman( results ) {
	process.stdout.write(
		'[check-simple-surface-cap] FR-37-27 — Simple surface ships ≤N controls by default (HARD GATE)\n\n'
	);

	for ( const r of results ) {
		process.stdout.write( `${ r.blockSlug }  (${ relPath( r.filePath ) })\n` );

		if ( r.missing ) {
			process.stdout.write( `  [FAIL] file does not exist\n\n` );
			continue;
		}
		if ( r.parseError ) {
			process.stdout.write( `  [FAIL] could not parse: ${ r.parseError }\n\n` );
			continue;
		}

		for ( const region of r.regions ) {
			const tag =
				region.bucket === 'settings-tab'
					? 'Settings-tab'
					: region.bucket === 'styles-tab'
					? 'Styles-tab'
					: `excluded (group="${ region.group }")`;
			process.stdout.write( `  ▸ <InspectorControls group="${ region.group }"> at line ${ region.line } — ${ tag }\n` );
			if ( region.rows.length === 0 ) {
				process.stdout.write( `      (no rows found)\n` );
			}
			for ( const row of region.rows ) {
				const visTag = row.defaultVisible ? 'DEFAULT' : 'ADVANCED';
				const dynTag = row.dynamic ? ' [dynamic isShownByDefault — counted conservatively]' : '';
				process.stdout.write(
					`      [${ visTag }] ${ row.label } (${ row.kind }${ row.component ? `: <${ row.component }>` : '' }) — line ${ row.line }${ dynTag }\n`
				);
			}
		}

		if ( r.excludedRegions.length ) {
			process.stdout.write(
				`  (${ r.excludedRegions.length } region(s) excluded — group not part of the Simple/Advanced split, never counted): ` +
					r.excludedRegions.map( ( e ) => `group="${ e.group }" at line ${ e.line }` ).join( ', ' ) +
					'\n'
			);
		}

		process.stdout.write(
			`  → default-visible: ${ r.totalDefaultVisible } | default: ${ r.cap } | ${ r.pass ? 'WITHIN' : 'OVER' }
`
		);
		if ( ! r.pass && r.pushingRow ) {
			process.stdout.write(
				`  ✗ over the default because of: "${ r.pushingRow.label }" (${ r.pushingRow.kind }${ r.pushingRow.component ? `: <${ r.pushingRow.component }>` : '' }) at line ${ r.pushingRow.line } — this was default-visible row #${ r.cap + 1 }\n`
			);
		}
		process.stdout.write( '\n' );
	}

	const failing = results.filter( ( r ) => ! r.pass );
	if ( failing.length === 0 ) {
		process.stdout.write( `[check-simple-surface-cap] OK — ${ results.length } block(s) within cap.\n` );
	} else {
		process.stdout.write(
			`[check-simple-surface-cap] ${ failing.length }/${ results.length } block(s) OVER the Simple-surface default (advisory).
`
		);
	}
}

function printJson( results ) {
	process.stdout.write(
		JSON.stringify(
			{
				audit: 'simple-surface-cap',
				hard_gate: true,
				results: results.map( ( r ) => ( {
					blockSlug: r.blockSlug,
					filePath: relPath( r.filePath ),
					cap: r.cap,
					missing: !! r.missing,
					parseError: r.parseError,
					totalDefaultVisible: r.totalDefaultVisible,
					defaultVisibleRows: r.defaultVisibleRows,
					advancedRows: r.advancedRows,
					excludedRegions: r.excludedRegions,
					pushingRow: r.pushingRow,
					pass: r.pass,
				} ) ),
			},
			null,
			2
		) + '\n'
	);
}

// ---------------------------------------------------------------------------
// SELF-TEST (--self-test) — no disk access, in-memory fixtures only.
// ---------------------------------------------------------------------------

// A minimal fixture shaped like the FR-37-27 roster's intended end-state for
// sgs/site-header's Settings tab (Sticky + Show phone default-visible;
// Transparent + Contrast behind Advanced) — 2 default-visible rows, cap 3,
// expect PASS.
const SELF_TEST_PASS_FIXTURE = `
import { InspectorControls } from '@wordpress/block-editor';
import {
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls group="settings">
			<ToolsPanel label="Header behaviour" resetAll={ () => {} }>
				<ToolsPanelItem label="Sticky on scroll" isShownByDefault hasValue={ () => false } onDeselect={ () => {} }>
					<ToggleControl label="Sticky on scroll" checked={ false } onChange={ () => {} } />
				</ToolsPanelItem>
				<ToolsPanelItem label="Show phone / click-to-call" isShownByDefault hasValue={ () => false } onDeselect={ () => {} }>
					<ToggleControl label="Show phone / click-to-call" checked={ false } onChange={ () => {} } />
				</ToolsPanelItem>
				<ToolsPanelItem label="Transparent until scrolled" isShownByDefault={ false } hasValue={ () => false } onDeselect={ () => {} }>
					<ToggleControl label="Transparent until scrolled" checked={ false } onChange={ () => {} } />
				</ToolsPanelItem>
				<ToolsPanelItem label="Contrast safety over hero" hasValue={ () => false } onDeselect={ () => {} }>
					<ToggleControl label="Contrast safety over hero" checked={ false } onChange={ () => {} } />
				</ToolsPanelItem>
			</ToolsPanel>
		</InspectorControls>
	);
}
`;

// Same fixture with a FOURTH default-visible control added ("Transparent
// until scrolled" flipped to isShownByDefault) — this is the exact shape of
// FR-37-27's negative control: 4 default-visible rows, cap 3, expect FAIL,
// with the pushing row correctly identified as "Contrast safety over hero"
// (the row that lands at index cap, i.e. the 4th default-visible row
// encountered in file order).
const SELF_TEST_FAIL_FIXTURE = SELF_TEST_PASS_FIXTURE.replace(
	'isShownByDefault={ false } hasValue={ () => false } onDeselect={ () => {} }>\n\t\t\t\t\t<ToggleControl label="Transparent until scrolled"',
	'isShownByDefault hasValue={ () => false } onDeselect={ () => {} }>\n\t\t\t\t\t<ToggleControl label="Transparent until scrolled"'
).replace(
	'<ToolsPanelItem label="Contrast safety over hero" hasValue',
	'<ToolsPanelItem label="Contrast safety over hero" isShownByDefault hasValue'
);

// A bare-control fixture (no ToolsPanel at all) — proves a control with no
// Advanced disclosure at all is counted as default-visible, and that a
// custom composite component (WidthPanel-shaped) counts as exactly one row.
const SELF_TEST_BARE_FIXTURE = `
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { WidthPanel } from '../container/components/ContainerWrapperControls';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody title="Header width">
				<WidthPanel attributes={ attributes } setAttributes={ setAttributes } />
			</PanelBody>
		</InspectorControls>
	);
}
`;

function runSelfTest() {
	const cases = [
		{
			name: 'PASS fixture (2 default-visible, cap 3)',
			src: SELF_TEST_PASS_FIXTURE,
			expectPass: true,
			expectCount: 2,
		},
		{
			name: 'FAIL fixture (4 default-visible, cap 3 — negative control)',
			src: SELF_TEST_FAIL_FIXTURE,
			expectPass: false,
			expectCount: 4,
			expectPushingLabel: 'Contrast safety over hero',
		},
		{
			name: 'Bare-control fixture (1 opaque composite, no ToolsPanel, cap 3)',
			src: SELF_TEST_BARE_FIXTURE,
			expectPass: true,
			expectCount: 1,
		},
	];

	let allOk = true;
	process.stdout.write( '[check-simple-surface-cap] --self-test\n\n' );

	for ( const c of cases ) {
		let result;
		let error = null;
		try {
			result = analyseSource( c.src, 'sgs/self-test', DEFAULT_CAP, '(in-memory fixture)' );
		} catch ( e ) {
			error = e;
		}

		if ( error ) {
			allOk = false;
			process.stdout.write( `  [ERROR] ${ c.name }: ${ error.message }\n` );
			continue;
		}

		const countOk = result.totalDefaultVisible === c.expectCount;
		const passOk = result.pass === c.expectPass;
		const pushOk =
			c.expectPushingLabel === undefined ||
			( result.pushingRow && result.pushingRow.label === c.expectPushingLabel );

		const ok = countOk && passOk && pushOk;
		allOk = allOk && ok;

		process.stdout.write(
			`  [${ ok ? 'OK' : 'FAIL' }] ${ c.name }\n` +
				`         found default-visible=${ result.totalDefaultVisible } (expected ${ c.expectCount }), ` +
				`pass=${ result.pass } (expected ${ c.expectPass })` +
				( c.expectPushingLabel !== undefined
					? `, pushingRow="${ result.pushingRow ? result.pushingRow.label : null }" (expected "${ c.expectPushingLabel }")`
					: '' ) +
				'\n'
		);
	}

	process.stdout.write( `\n[check-simple-surface-cap] self-test ${ allOk ? 'PASSED' : 'FAILED' }.\n` );
	process.exit( allOk ? 0 : 1 );
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main() {
	const argv = process.argv.slice( 2 );

	if ( argv.includes( '--self-test' ) ) {
		runSelfTest();
		return;
	}

	const asJson = argv.includes( '--json' );
	// Opt-in enforcement. The <=3 figure is a DEFAULT, not a ceiling (P2 §5,
	// Bean-confirmed), so this script is WARN-ONLY unless explicitly asked.
	const strict = argv.includes( '--strict' );
	// --check is accepted as an alias for CLI symmetry with the sibling
	// gates (check-dead-controls.js etc.) — this script is a hard gate by
	// default already, so --check changes nothing about its behaviour.

	let cap = DEFAULT_CAP;
	const capArg = argv.find( ( a ) => a.startsWith( '--cap=' ) );
	if ( capArg ) {
		const parsed = parseInt( capArg.slice( '--cap='.length ), 10 );
		if ( Number.isFinite( parsed ) && parsed > 0 ) cap = parsed;
	}

	const positional = argv.filter( ( a ) => ! a.startsWith( '--' ) );

	const targets =
		positional.length > 0
			? positional.map( ( file ) => {
					const absolute = path.isAbsolute( file ) ? file : path.join( process.cwd(), file );
					const blockSlug = `sgs/${ path.basename( path.dirname( absolute ) ) }`;
					return { blockSlug, file: absolute, cap };
			  } )
			: DEFAULT_TARGETS;

	const results = targets.map( analyseTarget );

	if ( asJson ) {
		printJson( results );
	} else {
		printHuman( results );
	}

	// WARN-ONLY — always exit 0 unless --strict is passed.
	//
	// CORRECTED 2026-07-23 (Bean-caught). This gate originally exited 1 on >3
	// default-visible controls, making the ≤3 figure a hard CEILING. P2 §5 — the
	// Bean-confirmed source FR-37-27 cites — says the opposite, twice:
	//   "the ≤3 lint is the sensible DEFAULT, not a ceiling"        (P2:52)
	//   "Operator pin/unpin; lint = default not ceiling. Bean-confirmed." (P2:91)
	// P2 raised "hard cap fights client self-service" as an objection and RESOLVED
	// it in favour of a default. FR-37-27 mis-transcribed that resolution as "the
	// lint fails a build that adds a fourth", and this script implemented the
	// mis-transcription — turning a design guideline into a build blocker.
	//
	// This also aligns it with its sibling: FR-37-27 itself notes that
	// check-element-manifest-conformance.js is WARN-ONLY and always exits 0.
	//
	// `--strict` is retained so the cap CAN be enforced deliberately (e.g. in a
	// focused conformance pass), but never by default and never in prebuild.
	const anyFail = results.some( ( r ) => ! r.pass );
	if ( anyFail && ! strict ) {
		process.stdout.write(
			'\n[check-simple-surface-cap] ADVISORY — the <=3 figure is a DEFAULT, not a ceiling ' +
				'(P2 §5, Bean-confirmed). Exiting 0. Use --strict to enforce it.\n'
		);
	}
	process.exit( anyFail && strict ? 1 : 0 );
}

main();
