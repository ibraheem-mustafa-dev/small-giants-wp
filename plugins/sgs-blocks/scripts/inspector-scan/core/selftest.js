'use strict';

// GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md §4.9
// source=file evidence=live-read plugins/sgs-blocks/scripts/check-dead-controls.js
// self-test (`:844-987`, `:912-924` "confirm the plant landed on disk") — the
// generic harness below generalises that pattern rather than re-deriving it.

const fs = require( 'fs' );
const path = require( 'path' );
const os = require( 'os' );
const { SourceCache } = require( './sources' );
const { applyBaseline } = require( './baseline' );
const components = require( './components' );

function copyDirSync( src, dest ) {
	fs.mkdirSync( dest, { recursive: true } );
	for ( const entry of fs.readdirSync( src, { withFileTypes: true } ) ) {
		const s = path.join( src, entry.name );
		const d = path.join( dest, entry.name );
		if ( entry.isDirectory() ) copyDirSync( s, d );
		else fs.copyFileSync( s, d );
	}
}

function buildTestCtx( cache, tmpBase ) {
	return {
		cache,
		blocksDir: tmpBase,
		patternsDir: tmpBase,
		// GROUND-TRUTH: spec=plugins/sgs-blocks/scripts/audit-inspector-conformance.js:466-478
		// source=file evidence=rule 17 (animation-no-reduced-motion, ported to
		// rules/17-reduced-motion-gate.js) reads
		// theme/sgs-theme/functions.php + its enqueued CSS to detect the
		// framework-wide gate. A rule reading a FIXED absolute real-repo path
		// would be untestable in isolation (self-test could never simulate
		// "gate absent" — H6, "a gate that cannot fail reads green forever").
		// themeDir is therefore ctx-supplied: the real run (run.js buildCtx)
		// points at the real theme; self-test points inside the copied fixture
		// tmpBase, so a fixture with no `_theme/functions.php` genuinely
		// exercises the "no framework gate found" path, sandboxed.
		themeDir: path.join( tmpBase, '_theme' ),
		// GROUND-TRUTH: spec=task brief 2026-08-08 (extensionsDir plumbing) —
		// same reasoning as themeDir immediately above: run.js's real buildCtx
		// points extensionsDir at the real src/blocks/extensions; a rule built
		// on it must be exercisable in isolation, so self-test points it inside
		// the copied fixture instead. A fixture with no `_extensions/` dir
		// genuinely and safely exercises "extension surface absent" — a
		// hardcoded real-repo path here would make any such rule untestable
		// (a gate that cannot fail reads green forever).
		extensionsDir: path.join( tmpBase, '_extensions' ),
		componentsDir: path.join( tmpBase, '_components' ),
		// Same reasoning again for repoRoot: rule 22 asserts that every surface
		// STATING the placement rule still states the current one. Pointed at the
		// real repo it could only ever confirm today's tree; pointed inside the
		// fixture, a fixture can genuinely carry a surface that has drifted back
		// to the retired wording, so the rule is provably able to FAIL.
		repoRoot: tmpBase,
		roster: { entries: [] },
		// Resolved against the REAL src/components/index.js, not the fixture
		// temp dir — shared-component discovery is a property of the framework,
		// not of any one fixture, exactly like the real run context.
		components: components.discover( cache ),
		ast: ( f ) => cache.parse( f ),
		text: ( f ) => cache.text( f ),
		stripped: ( f ) => cache.strippedText( f ),
		json: ( f ) => cache.json( f ),
	};
}

/**
 * A finding "belongs to" a fixture name if its block slug, its file's
 * directory name, or its file's basename (sans extension) matches — this
 * covers both per-block fixtures (subdirectories) and global/file-scoped
 * fixtures (flat files) without the harness needing per-rule knowledge.
 */
function findingMatchesName( finding, name ) {
	if ( finding.block && ( finding.block === name || finding.block === `sgs/${ name }` ) ) return true;
	if ( finding.file ) {
		const base = path.basename( finding.file, path.extname( finding.file ) );
		if ( base === name ) return true;
		if ( path.basename( path.dirname( finding.file ) ) === name ) return true;
	}
	return false;
}

/**
 * Materialises a rule's fixture directory into a temp dir, CONFIRMS the copy
 * actually landed (every top-level fixture entry present in the copy) before
 * trusting anything derived from it, then runs the rule against the copy in
 * complete isolation (fresh SourceCache, no real baseline, no real roster).
 */
function runRuleAgainstFixture( mod, fixtureAbsPath ) {
	const tmpBase = fs.mkdtempSync( path.join( os.tmpdir(), 'inspector-scan-selftest-' ) );
	try {
		copyDirSync( fixtureAbsPath, tmpBase );

		const originalNames = fs.readdirSync( fixtureAbsPath );
		const copiedNames = fs.readdirSync( tmpBase );
		const missing = originalNames.filter( ( n ) => ! copiedNames.includes( n ) );
		if ( missing.length ) {
			return {
				pass: false,
				reason: `fixture copy is INCOMPLETE — missing after copy: ${ missing.join( ', ' ) }. Refusing to trust a result derived from an unconfirmed plant.`,
				findings: [],
			};
		}

		const cache = new SourceCache();
		const ctx = buildTestCtx( cache, tmpBase );

		// Same reasoning as themeDir/extensionsDir/_surfaces.json above: rule 31's
		// mechanism axis resolves each colour attribute through the DB's
		// block_attributes.css_property map, keyed by REAL block slug. A fixture
		// slug is never in that map, so every fixture row resolved as UNRESOLVED
		// and the mechanism branch could not be exercised at all — a gate that
		// cannot fail reads green forever. A fixture directory may therefore seed
		// the map by placing `_css-property-map.json` at its root; absent = the
		// real DB lookup, unchanged for every other rule and fixture.
		const cssPropMapFile = path.join( tmpBase, '_css-property-map.json' );
		if ( fs.existsSync( cssPropMapFile ) ) {
			try {
				ctx.__colourCssPropertyMap = JSON.parse( fs.readFileSync( cssPropMapFile, 'utf8' ) );
			} catch ( e ) {
				return {
					pass: false,
					reason: `fixture root has a malformed _css-property-map.json: ${ e.message }`,
					findings: [],
				};
			}
		}

		// Same reasoning again for rule 34 (34-declared-attr-unrendered, Task 2,
		// 2026-08-27): it now consumes `check-dead-controls.js --dump-json`'s
		// per-(block,attr) verdicts instead of re-deriving consumption itself. That
		// CLI always scans the REAL src/blocks tree (no --blocks-dir flag exists,
		// and the brief forbids modifying it), so it can never see a fixture's
		// synthetic blocks — a fixture slug is never a row in the real dump. A
		// fixture directory may therefore seed synthetic dump rows by placing
		// `_dead-controls-dump.json` at its root (same array shape the real CLI
		// emits: { block, attr, renderConsumed, controlPresent, renderVia, exempt,
		// exemptReason }); absent = the real CLI invocation, unchanged for every
		// other rule and fixture. This tests rule 34's OWN logic (the two-clause
		// flag filter + the S1/S2/S3 kind classification) in isolation, without
		// re-implementing or re-exercising check-dead-controls.js's resolvers —
		// those already have their own self-test (Task 1).
		const deadControlsDumpFile = path.join( tmpBase, '_dead-controls-dump.json' );
		if ( fs.existsSync( deadControlsDumpFile ) ) {
			try {
				ctx.__deadControlsDumpRows = JSON.parse( fs.readFileSync( deadControlsDumpFile, 'utf8' ) );
			} catch ( e ) {
				return {
					pass: false,
					reason: `fixture root has a malformed _dead-controls-dump.json: ${ e.message }`,
					findings: [],
				};
			}
		}

		// Same reasoning again for rule 41 (41-co2-element-grouping-order,
		// C14/C4): it consumes placement-reach.py's `--json` ownership/element/
		// contested map instead of re-deriving THE PLACEMENT RULE's resolution
		// itself. That CLI always scans the REAL src/blocks tree (no
		// --blocks-dir flag exists), so it can never see a fixture's synthetic
		// blocks — a fixture slug is never a key in the real map. A fixture
		// directory may therefore seed `_placement-reach.json` at its root
		// (same shape placement-reach.py's --json prints: `{slug: {elements,
		// ownership, blockLevel, contested}}`); absent = the real CLI
		// invocation, unchanged for every other rule and fixture.
		const placementReachFile = path.join( tmpBase, '_placement-reach.json' );
		if ( fs.existsSync( placementReachFile ) ) {
			try {
				ctx.__placementReach = JSON.parse( fs.readFileSync( placementReachFile, 'utf8' ) );
			} catch ( e ) {
				return {
					pass: false,
					reason: `fixture root has a malformed _placement-reach.json: ${ e.message }`,
					findings: [],
				};
			}
		}

		let findings = [];

		if ( mod.scope === 'per-block' ) {
			for ( const name of originalNames ) {
				const full = path.join( tmpBase, name );
				if ( ! fs.statSync( full ).isDirectory() ) continue;
				if ( ! fs.existsSync( path.join( full, 'block.json' ) ) ) continue;
				// GROUND-TRUTH: spec=plugins/sgs-blocks/scripts/audit-inspector-conformance.js:466
				// source=file evidence=rule 17 (ported) gates on `block.surfaces.animation`,
				// a DB-derived roster.json field the OLD per-block synthetic fixture
				// object never carried (it only had slug/tail/onDisk/inRoster) — so
				// that rule could never be made to flag in self-test at all. A
				// fixture may opt in by placing a `_surfaces.json` file inside its
				// own per-block subdirectory; absent = `{}` (falsy on every surface),
				// which is a no-op for every rule that doesn't ask for surfaces —
				// existing fixtures for rules 01/18/20 are unaffected.
				const surfacesFile = path.join( full, '_surfaces.json' );
				let surfaces = {};
				if ( fs.existsSync( surfacesFile ) ) {
					try {
						surfaces = JSON.parse( fs.readFileSync( surfacesFile, 'utf8' ) );
					} catch ( e ) {
						return {
							pass: false,
							reason: `fixture "${ name }" has a malformed _surfaces.json: ${ e.message }`,
							findings: [],
						};
					}
				}
				const block = { slug: `sgs/${ name }`, tail: name, onDisk: true, inRoster: true, surfaces };
				let f;
				try {
					f = mod.run( ctx, block ) || [];
				} catch ( e ) {
					return {
						pass: false,
						reason: `rule threw during self-test on fixture "${ name }": ${ e.message }`,
						findings: [],
					};
				}
				findings = findings.concat(
					f.map( ( x ) => ( { ...x, rule: mod.id, checklistItem: mod.checklistItem } ) )
				);
			}
		} else {
			try {
				findings = ( mod.run( ctx ) || [] ).map( ( x ) => ( {
					...x,
					rule: mod.id,
					checklistItem: mod.checklistItem,
				} ) );
			} catch ( e ) {
				return { pass: false, reason: `rule threw during self-test: ${ e.message }`, findings: [] };
			}
		}

		return { pass: true, findings };
	} finally {
		fs.rmSync( tmpBase, { recursive: true, force: true } );
	}
}

function assertMandatoryFindingShape( findings ) {
	for ( const f of findings ) {
		if ( ! f.fix || typeof f.fix !== 'string' || ! f.fix.trim() ) {
			return `finding for ${ f.block || f.file } has no non-empty 'fix' text`;
		}
		if ( ! f.key || typeof f.key !== 'string' ) {
			return `finding for ${ f.block || f.file } has no well-formed 'key'`;
		}
	}
	return null;
}

/**
 * Runs the full proof protocol for one rule (design §4.9, steps 1-6):
 * materialise+confirm, run, mustFlag/mustNotFlag + finding-shape assertions,
 * baseline-suppression proof, mode-table proof.
 */
function testRule( ruleDef, mod ) {
	if ( ! mod.selfTest ) {
		return { pass: false, failures: [ `rule ${ ruleDef.id } has no selfTest block` ] };
	}
	const { fixture, mustFlag = [], mustNotFlag = [], mustFlagKind = {} } = mod.selfTest;
	const fixtureAbsPath = path.resolve( __dirname, '..', fixture );
	if ( ! fs.existsSync( fixtureAbsPath ) ) {
		return { pass: false, failures: [ `fixture directory missing: ${ fixtureAbsPath }` ] };
	}

	const runResult = runRuleAgainstFixture( mod, fixtureAbsPath );
	if ( ! runResult.pass ) {
		return { pass: false, failures: [ runResult.reason ] };
	}
	const findings = runResult.findings;
	const failures = [];

	const shapeErr = assertMandatoryFindingShape( findings );
	if ( shapeErr ) failures.push( `finding-shape: ${ shapeErr }` );

	for ( const name of mustFlag ) {
		const match = findings.find( ( f ) => findingMatchesName( f, name ) );
		if ( ! match ) {
			failures.push( `expected a finding for "${ name }" (mustFlag) but none was produced` );
		} else if ( Object.prototype.hasOwnProperty.call( mustFlagKind, name ) ) {
			// GROUND-TRUTH: spec=.superpowers/sdd/task-2-brief.md Critical 2 (2026-08-27)
			// — the `kind` field was requirement 2's entire deliverable and had ZERO
			// test coverage: a tampered classifyKind() (deleted branch, or collapsed to
			// a constant return) left every existing mustFlag/mustNotFlag check green
			// because they only match findings by NAME. This asserts the VALUE too.
			const expectedKind = mustFlagKind[ name ];
			if ( match.kind !== expectedKind ) {
				failures.push(
					`finding for "${ name }" has kind="${ match.kind }", expected "${ expectedKind }" (mustFlagKind)`
				);
			}
		}
	}
	for ( const name of mustNotFlag ) {
		if ( findings.some( ( f ) => findingMatchesName( f, name ) ) ) {
			failures.push( `unexpected finding for "${ name }" (mustNotFlag) was produced` );
		}
	}

	// Baseline-suppression proof — a real-reason entry must suppress; nothing
	// today tests this path (design §4.9 step 5).
	if ( findings.length ) {
		const target = findings[ 0 ];
		const tmpBaselineDir = fs.mkdtempSync( path.join( os.tmpdir(), 'inspector-scan-baseline-' ) );
		try {
			fs.writeFileSync(
				path.join( tmpBaselineDir, `${ ruleDef.id }.json` ),
				JSON.stringify(
					{
						_meta: { rule: ruleDef.id, ruleVersion: 1 },
						entries: [
							{
								key: target.key,
								reason: 'self-test: proving the baseline-suppression path works end-to-end',
								seededAt: null,
								expires: null,
							},
						],
					},
					null,
					2
				)
			);
			const suppressed = applyBaseline( ruleDef.id, [ target ], { baselineDir: tmpBaselineDir } );
			const stillPresent = suppressed.find( ( f ) => f.key === target.key );
			if ( ! stillPresent || stillPresent.status !== 'BASELINED' ) {
				failures.push(
					'baseline-suppression: a baseline entry with a real reason did not mark the matching finding BASELINED'
				);
			}
		} finally {
			fs.rmSync( tmpBaselineDir, { recursive: true, force: true } );
		}
	} else if ( mustFlag.length ) {
		failures.push(
			'baseline-suppression test skipped — mustFlag fixtures produced 0 findings, so nothing could be proven'
		);
	}

	// Mode-table proof (design §4.9 step 6) — with real findings present, gate
	// mode and advisory mode must compute DIFFERENT exit codes. This is exactly
	// the class of bug check-control-ux.js:535 shipped (--check changing nothing).
	if ( findings.length ) {
		const gateExit = findings.some( ( f ) => f.status !== 'BASELINED' ) ? 1 : 0;
		const advisoryExit = 0; // advisory NEVER gates by definition
		if ( gateExit === advisoryExit ) {
			failures.push(
				'mode-test: with real findings present, gate mode and advisory mode computed the same exit code — the mode table would be decorative'
			);
		}
	}

	return { pass: failures.length === 0, failures, liveFindingCount: findings.length };
}

function runLiveInformational( mod, realCtx ) {
	try {
		let findings = [];
		if ( mod.scope === 'per-block' ) {
			for ( const entry of realCtx.roster.entries ) {
				if ( ! entry.onDisk ) continue;
				findings = findings.concat( mod.run( realCtx, entry ) || [] );
			}
		} else {
			findings = mod.run( realCtx ) || [];
		}
		return findings.length;
	} catch ( e ) {
		return null;
	}
}

module.exports = {
	testRule,
	runRuleAgainstFixture,
	copyDirSync,
	findingMatchesName,
	runLiveInformational,
};
