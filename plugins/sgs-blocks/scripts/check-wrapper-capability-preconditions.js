/**
 * check-wrapper-capability-preconditions.js
 *
 * STRUCTURAL GUARD for the shared-wrapper capability declarations in each
 * block's `supports.sgs` — Spec 35 §F.2.1 + §F.2.2 (D637, step 7 of the
 * shared-wrapper decomposition).
 *
 * TWO RULES, one script:
 *
 *   RULE 1 — CAPABILITY PRECONDITIONS (§F.2.1).
 *     A block that declares `gridItems` in `supports.sgs.enabledExtensions`
 *     without ALSO declaring `layout` would offer a client per-grid-item
 *     styling controls for grid items that cannot exist.
 *     `GridItemDefaultsPanel`'s own `if ( layout !== 'grid' ) return null` is a
 *     RENDER-TIME bail — it hides the panel once the wrong combination is
 *     already declared; it is not a guarantee the combination can't be
 *     declared in the first place. This rule is that guarantee, at build time.
 *
 *   RULE 2 — gridAreas RETIREMENT GUARD (§F.2.2, as closed by D639).
 *     `supports.sgs.gridAreas` is RETIRED. Declaring it on any block fails the
 *     build. It started as an orphan guard ("must have a live reader") — and
 *     building that reader is what proved the flag never needed one. Full
 *     reasoning sits on `checkRetiredGridAreas()` below; the short version is
 *     that the editor capability comes from each block's own per-area attrs and
 *     the converter derives area names from the DRAFT's CSS, so the flag was
 *     redundant by construction and could only ever drift.
 *
 * ── WHY A BUILD-TIME SCRIPT AND NOT A /sgs-update DB-SEED CHECK ─────────────
 * `enabledExtensions` is a flat block.json array with no DB table home and no
 * consumer that would justify creating one. That makes it unlike
 * `boxFamilies`/`variantAttr`, which genuinely feed the cloning converter and
 * ARE legitimate R-31-1 DB-first cases. Checking it needs block.json and
 * nothing else, so it belongs in `prebuild` beside its siblings.
 *
 * ── WHY NO BASELINE MECHANISM ───────────────────────────────────────────────
 * Its two siblings differ in a load-bearing way, and this script deliberately
 * follows the FIRST:
 *   - `check-shared-panel-schema.js` has NO baseline — every finding is a real
 *     bug, always, because it shipped against a clean tree.
 *   - `check-box-family-guard.py` IS baseline-gated (hash-locked,
 *     `--update-baseline`) because it was retrofitted onto pre-existing
 *     violations that could not all be fixed at once.
 * RULE 1 has ZERO current violations (verified live: `container` and
 * `cta-section` are the only `gridItems` declarers and both also declare
 * `layout`), so there is nothing to baseline and a baseline would only be a
 * hole for the next violation to hide in.
 *
 * ── WHY NO --fix MODE ───────────────────────────────────────────────────────
 * A codemod silently injecting `layout` into a block's declared extensions
 * would change that block's rendered capability set as a side effect of a
 * lint run — exactly the scope creep step 6 Phase B forbids for per-block
 * migration commits. The fix is a human decision: either add `layout`
 * deliberately, or remove `gridItems`.
 *
 * ── NO HARDCODED BLOCK LIST (blub.db 260 / R-31-1) ──────────────────────────
 * Every block is discovered by walking `src/blocks/&#42;/block.json`. The only
 * declared constant is CAPABILITY_PRECONDITIONS — the RULE itself, which is
 * the same shape `check-shared-panel-schema.js` uses for its own PANEL_NAMES /
 * OBJECT_FAMILY_TAGS constants. A rule is not a data cache.
 *
 * USAGE
 *   node scripts/check-wrapper-capability-preconditions.js --survey     # census, exit 0 always
 *   node scripts/check-wrapper-capability-preconditions.js --check      # gate, exit 1 on any BLOCKING finding
 *   node scripts/check-wrapper-capability-preconditions.js --json       # machine-readable
 *   node scripts/check-wrapper-capability-preconditions.js --self-test  # proves each rule CAN fail
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const BLOCKS_DIR = path.resolve( __dirname, '..', 'src', 'blocks' );

/**
 * RULE 1's table: capability -> the capabilities it cannot work without.
 *
 * This is the RULE, not a cache of data — adding a row here is a deliberate
 * architectural statement, the same way `check-shared-panel-schema.js`
 * declares its own PANEL_NAMES list.
 */
const CAPABILITY_PRECONDITIONS = {
	gridItems: [ 'layout' ],
};

/**
 * Read + parse one block.json, tolerating unreadable/invalid files rather than
 * crashing the whole prebuild on one bad file (the caller reports them).
 *
 * @param {string} file Absolute path to a block.json.
 * @return {Object|null} Parsed manifest, or null when unreadable/invalid.
 */
function readManifest( file ) {
	try {
		return JSON.parse( fs.readFileSync( file, 'utf8' ) );
	} catch ( e ) {
		return null;
	}
}

/**
 * Walk src/blocks/&#42;/block.json and return every parsed manifest.
 *
 * @param {string} [blocksDir] Override for --self-test fixtures.
 * @return {Array<{slug: string, dir: string, file: string, manifest: Object}>} Manifests.
 */
function collectManifests( blocksDir = BLOCKS_DIR ) {
	const out = [];
	if ( ! fs.existsSync( blocksDir ) ) {
		return out;
	}
	for ( const entry of fs.readdirSync( blocksDir, { withFileTypes: true } ).sort( ( a, b ) => a.name.localeCompare( b.name ) ) ) {
		if ( ! entry.isDirectory() ) {
			continue;
		}
		const file = path.join( blocksDir, entry.name, 'block.json' );
		if ( ! fs.existsSync( file ) ) {
			continue;
		}
		const manifest = readManifest( file );
		if ( ! manifest ) {
			continue;
		}
		out.push( {
			slug: manifest.name || `sgs/${ entry.name }`,
			dir: entry.name,
			file,
			manifest,
		} );
	}
	return out;
}

/**
 * Pull `supports.sgs` off a manifest, defensively.
 *
 * @param {Object} manifest Parsed block.json.
 * @return {Object} The supports.sgs object, or {} when absent/malformed.
 */
function sgsSupports( manifest ) {
	const supports = manifest && manifest.supports;
	if ( ! supports || typeof supports !== 'object' ) {
		return {};
	}
	const sgs = supports.sgs;
	return sgs && typeof sgs === 'object' ? sgs : {};
}

/**
 * RULE 1 — every declared capability's preconditions must also be declared.
 *
 * @param {Array} manifests Output of collectManifests().
 * @return {Array<Object>} Findings.
 */
function checkPreconditions( manifests ) {
	const findings = [];
	for ( const { slug, dir, manifest } of manifests ) {
		const sgs = sgsSupports( manifest );
		const declared = Array.isArray( sgs.enabledExtensions ) ? sgs.enabledExtensions : [];
		if ( declared.length === 0 ) {
			continue;
		}
		for ( const capability of declared ) {
			const required = CAPABILITY_PRECONDITIONS[ capability ];
			if ( ! Array.isArray( required ) ) {
				continue;
			}
			for ( const precondition of required ) {
				if ( ! declared.includes( precondition ) ) {
					findings.push( {
						rule: 'missing-precondition',
						severity: 'BLOCKING',
						slug,
						dir,
						capability,
						precondition,
						message:
							`${ slug } declares supports.sgs.enabledExtensions["${ capability }"] ` +
							`without "${ precondition }". ${ capability } cannot function without ` +
							`${ precondition }. Fix by declaring "${ precondition }" deliberately, or ` +
							`by removing "${ capability }" — never by a codemod.`,
					} );
				}
			}
		}
	}
	return findings;
}

/**
 * RULE 2 — `supports.sgs.gridAreas` is RETIRED. Declaring it fails the build.
 *
 * This rule started life (D637) as an orphan guard: "a non-empty `gridAreas`
 * must have at least one live reader". Building that reader is what proved the
 * flag never needed one, so the rule became a retirement guard instead (D639).
 *
 * WHY THE FLAG WENT (do not reinstate it without reading this):
 *  - EDITOR — its only consumer, `GridAreaPanel`, was doubly unreachable (an
 *    AST census of all 17 `<ContainerWrapperControls>` mounts: 12 `layout`,
 *    5 `content`, ZERO `section`, and no consumer passed a `gridAreas` prop),
 *    AND it wrote the flat per-side storage D580 retired on 2026-08-11. The
 *    capability is delivered by each block's own object-shaped controls.
 *  - CONVERTER — the LIVE route is `assembly.py` step 3d: it walks the section
 *    root's children and derives each area name from the DRAFT's own BEM ELEMENT
 *    TOKEN (`parse_sgs_bem( cls ).element` — `sgs-hero__content` -> `content`),
 *    then routes via `route_area_css_to_block_attrs` ->
 *    `db.attr_for_area_property( block, area, prop )`, gated on the block
 *    declaring `<area>+<Suffix>` attrs. `assembly.py:250` says it outright:
 *    "no gridAreas lookup is needed".
 *    ⚠ Mechanism corrected by the closing /qc-council — this first credited
 *    `resolvers/grid_area.py` + `grid_item_areas()`, which are BOTH DEAD in
 *    production (zero callers; `ctx.area_name` set only in tests).
 *
 * The declaration was redundant BY CONSTRUCTION — "hero has areas content and
 * media" is fully derivable from hero declaring `contentPadding`/`mediaPadding`.
 * A flag that restates data already in the attributes is a second source of
 * truth that can only ever drift out of agreement with the first.
 *
 * @param {Array} manifests Output of collectManifests().
 * @return {Array<Object>} Findings.
 */
function checkRetiredGridAreas( manifests ) {
	const findings = [];
	for ( const { slug, dir, manifest } of manifests ) {
		const areas = sgsSupports( manifest ).gridAreas;
		if ( areas === undefined ) {
			continue;
		}
		findings.push( {
			rule: 'gridareas-retired',
			severity: 'BLOCKING',
			slug,
			dir,
			areas,
			message:
				`${ slug } declares supports.sgs.gridAreas, which was RETIRED 2026-08-16 (D639). ` +
				`It has no consumer and needs none: the editor capability comes from the block's ` +
				`own per-area attrs, and the converter derives area names from the draft's CSS ` +
				`via resolvers/grid_area.py. Remove the declaration — the per-area attrs ` +
				`(<area>Padding/<area>Background) ARE the definition of the regions.`,
		} );
	}
	return findings;
}

/**
 * Print the human census.
 *
 * @param {Array} findings  All findings.
 * @param {Array} manifests All manifests scanned.
 * @return {void}
 */
function printSurvey( findings, manifests ) {
	const out = [];
	out.push( '[check-wrapper-capability-preconditions --survey]\n' );
	out.push( `Blocks scanned: ${ manifests.length }` );
	out.push( 'Rule 2: supports.sgs.gridAreas is RETIRED (D639) — any declaration is BLOCKING.\n' );

	out.push( '-- Declared wrapper capabilities --' );
	for ( const { slug, dir, manifest } of manifests ) {
		const sgs = sgsSupports( manifest );
		const declared = Array.isArray( sgs.enabledExtensions ) ? sgs.enabledExtensions : [];
		const areas = Array.isArray( sgs.gridAreas ) ? sgs.gridAreas : [];
		if ( declared.length === 0 && areas.length === 0 ) {
			continue;
		}
		const areaNote = areas.length ? `  ⛔ RETIRED gridAreas=[${ areas.join( ',' ) }]` : '';
		out.push( `  ${ slug.padEnd( 28 ) } [${ declared.join( ', ' ) }]${ areaNote }` );
	}

	const blocking = findings.filter( ( f ) => f.severity === 'BLOCKING' );
	const advisory = findings.filter( ( f ) => f.severity === 'ADVISORY' );

	out.push( `\n-- Findings: ${ blocking.length } BLOCKING, ${ advisory.length } ADVISORY --` );
	if ( findings.length === 0 ) {
		out.push( '  none' );
	}
	for ( const f of findings ) {
		out.push( `  [${ f.severity }] ${ f.rule }: ${ f.message }` );
	}
	process.stdout.write( out.join( '\n' ) + '\n' );
}

/**
 * Build a throwaway fixture tree, run the rules against it, and delete it.
 *
 * @param {string}   name  Fixture name (used for the temp dir).
 * @param {Object}   tree  { <dir>: { blockJson: Object, editJs?: string } }.
 * @param {Function} runFn Receives (manifests, fixtureBlocksDir).
 * @return {*} Whatever runFn returns.
 */
function withFixture( name, tree, runFn ) {
	const root = fs.mkdtempSync( path.join( require( 'os' ).tmpdir(), `wcp-${ name }-` ) );
	try {
		for ( const [ dir, files ] of Object.entries( tree ) ) {
			const blockDir = path.join( root, dir );
			fs.mkdirSync( blockDir, { recursive: true } );
			fs.writeFileSync( path.join( blockDir, 'block.json' ), JSON.stringify( files.blockJson, null, 2 ), 'utf8' );
			if ( typeof files.editJs === 'string' ) {
				fs.writeFileSync( path.join( blockDir, 'edit.js' ), files.editJs, 'utf8' );
			}
		}
		return runFn( collectManifests( root ), root );
	} finally {
		fs.rmSync( root, { recursive: true, force: true } );
	}
}

/**
 * --self-test: prove each rule CAN fail (a gate that has never been seen to
 * fail is not known to work — Spec 35 Part N, N-5), and prove each rule stays
 * quiet on the clean case (the negative control's own negative control —
 * a rule that fires on everything is as useless as one that fires on nothing).
 *
 * @return {void}
 */
function runSelfTest() {
	const failures = [];
	const assert = ( label, condition ) => {
		process.stdout.write( `  ${ condition ? 'PASS' : 'FAIL' }  ${ label }\n` );
		if ( ! condition ) {
			failures.push( label );
		}
	};

	process.stdout.write( '[check-wrapper-capability-preconditions --self-test]\n\n' );

	// RULE 1 — POSITIVE CONTROL: gridItems without layout must be caught.
	withFixture( 'r1-bad', {
		bad: { blockJson: { name: 'sgs/bad', supports: { sgs: { enabledExtensions: [ 'width', 'gridItems' ] } } } },
	}, ( manifests ) => {
		const f = checkPreconditions( manifests );
		assert( 'RULE 1 catches gridItems declared without layout', f.length === 1 && f[ 0 ].rule === 'missing-precondition' );
		assert( 'RULE 1 finding is BLOCKING', f.length === 1 && f[ 0 ].severity === 'BLOCKING' );
	} );

	// RULE 1 — NEGATIVE CONTROL: the correct combination must stay silent.
	withFixture( 'r1-good', {
		good: { blockJson: { name: 'sgs/good', supports: { sgs: { enabledExtensions: [ 'layout', 'gridItems' ] } } } },
		none: { blockJson: { name: 'sgs/none', supports: { sgs: { enabledExtensions: [ 'width' ] } } } },
		bare: { blockJson: { name: 'sgs/bare' } },
	}, ( manifests ) => {
		assert( 'RULE 1 silent when layout IS declared alongside gridItems', checkPreconditions( manifests ).length === 0 );
		assert( 'RULE 1 tolerates a block with no supports.sgs at all', manifests.length === 3 );
	} );

	// RULE 2 — POSITIVE CONTROL: any gridAreas declaration is now a failure.
	withFixture( 'r2-declared', {
		declared: {
			blockJson: { name: 'sgs/declared', supports: { sgs: { gridAreas: [ 'content', 'media' ] } } },
		},
	}, ( manifests ) => {
		const f = checkRetiredGridAreas( manifests );
		assert( 'RULE 2 catches a retired gridAreas declaration', f.length === 1 && f[ 0 ].rule === 'gridareas-retired' );
		assert( 'RULE 2 finding is BLOCKING', f.length === 1 && f[ 0 ].severity === 'BLOCKING' );
	} );

	// RULE 2 — an EMPTY array is still a declaration, and must still fail.
	// The pre-D639 rule deliberately ignored `[]` (nothing to orphan). Under a
	// retirement rule that exemption becomes a hole: `gridAreas: []` is the
	// obvious way to "keep the key but silence the gate", which is exactly the
	// resurrection this guard exists to stop.
	withFixture( 'r2-empty', {
		empty: { blockJson: { name: 'sgs/empty', supports: { sgs: { gridAreas: [] } } } },
	}, ( manifests ) => {
		assert( 'RULE 2 also catches an EMPTY gridAreas array (no silencing hole)', checkRetiredGridAreas( manifests ).length === 1 );
	} );

	// RULE 2 — NEGATIVE CONTROL: a block that never declared it stays silent.
	// Without this, a rule that flagged EVERY block would still show green above.
	withFixture( 'r2-clean', {
		clean: { blockJson: { name: 'sgs/clean', supports: { sgs: { enabledExtensions: [ 'width' ] } } } },
		bare: { blockJson: { name: 'sgs/bare2' } },
	}, ( manifests ) => {
		assert( 'RULE 2 silent on blocks that never declared gridAreas', checkRetiredGridAreas( manifests ).length === 0 );
	} );

	process.stdout.write(
		failures.length === 0
			? '\n[check-wrapper-capability-preconditions --self-test] ALL ASSERTIONS PASS.\n'
			: `\n[check-wrapper-capability-preconditions --self-test] ${ failures.length } FAILURE(S).\n`
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

	const manifests = collectManifests();
	const findings = [
		...checkPreconditions( manifests ),
		...checkRetiredGridAreas( manifests ),
	];

	if ( asJson ) {
		process.stdout.write( JSON.stringify( { findings, blocksScanned: manifests.length }, null, 2 ) + '\n' );
	} else {
		printSurvey( findings, manifests );
	}

	if ( check ) {
		process.exit( findings.some( ( f ) => f.severity === 'BLOCKING' ) ? 1 : 0 );
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

module.exports = {
	CAPABILITY_PRECONDITIONS,
	collectManifests,
	checkPreconditions,
	checkRetiredGridAreas,
};
