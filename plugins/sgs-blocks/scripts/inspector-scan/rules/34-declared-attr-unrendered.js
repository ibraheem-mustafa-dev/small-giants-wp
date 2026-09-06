'use strict';

// GROUND-TRUTH: spec=.superpowers/sdd/task-2-brief.md ("make rule 34 consume the
// gate's verdicts, split by SURFACE") source=file evidence=live-read
// plugins/sgs-blocks/scripts/check-dead-controls.js `dumpAttributeRows()`
// (:1412-1480) + its `--dump-json` CLI branch (:1610-1614), run live
// 2026-08-27: `node check-dead-controls.js --dump-json` emits 2,657 rows, of
// which exactly 2 have `renderConsumed:false` AND `exempt:false` —
// `sgs/before-after::maxWidthUnit` and `sgs/button::fontFamily`.
//
// ── WHY THIS REWRITE EXISTS ─────────────────────────────────────────────────
// Rule 34 used to scan ONE corpus (its own render.php/view.js/save.js/style.css
// + admitted shared includes) with a literal-name + suffix/prefix regex match,
// duplicated from rule 21's resolver. That produced 319 FLAGGED findings — the
// blocking gate `check-dead-controls.js`, asking the SAME question with SIX
// corpora and three resolvers this rule lacked (block-context, prefixed-helper,
// dynamic-prefix, responsive-variant, plus a wider shared-include reach),
// reports 2. Joined per (block, attr) the overlap was exactly those 2; the
// other 317 named attributes the blocking gate proves are genuinely rendered.
// Worked example: `sgs/brand-strip.nameFontSize` was flagged unrendered by the
// old literal/suffix scan, while `brand-strip/render.php:412` consumes it via
// `sgs_typography_css_rule( $attributes, 'name', ... )` — a PREFIXED-HELPER
// call this rule's own resolver never modelled.
//
// Per Bean's governing instruction (2026-08-27): "is this attribute used?" is
// THREE questions, not one — S1 LIVE RENDER (does it paint on the published
// page?), S2 EDITOR CANVAS (does it paint/act in the block-editor preview?),
// S3 CONTROL (can the client actually change it?). check-dead-controls.js's
// dump already resolves S1 (`renderConsumed`) and S3 (`controlPresent`), and
// makes S2 visible via `exemptReason:'editor-only'`. Re-deriving any of that
// here — a second corpus scan, a second suffix loop, a second helper-prefix
// matcher — is exactly how these two instruments drifted 317 apart with no way
// to arbitrate. So this rule now does NO source-corpus resolution of its own:
// it shells out to `node check-dead-controls.js --dump-json` (cached for the
// lifetime of one scan process — see `loadDumpRows()` below), looks up each
// block.json-declared attribute's row by (block, attr), and reports ONLY
// when the gate's own verdict says the attribute is genuinely unrendered.
//
// This also RETIRES the old "honest middle ground" informational finding for
// an unresolvable `$attributes[ $var ]` computed-key read. That branch existed
// because THIS rule's own literal/suffix resolver could not see past a bare-
// variable bracket read. check-dead-controls.js has no such gap in the two
// live findings this rule now reports (both `renderVia:'none'` — no resolver
// matched anything at all, computed-key or otherwise), and the dump's six
// `renderVia` values carry no "computed-key-unresolved" case to surface. There
// is nothing left for that branch to report; a rule that consumes the gate's
// verdict cannot also invent a fourth kind the gate doesn't emit.
//
// ── THE THREE-KIND CLASSIFICATION (S1 x S3 x exemptReason) ──────────────────
// `dead-attr`    — no render, no control, not exempt -> DELETE from block.json.
// `dead-control` — no render, control PRESENT, not exempt -> a REAL bug: the
//                  client sets something that paints nowhere.
// `editor-only`  — exempt via `exemptReason:'editor-only'` -> consumed by S2
//                  (the editor canvas) BY DESIGN, not a defect. Named here for
//                  a consumer that inspects `classifyKind()`'s full vocabulary
//                  directly; it can never appear on an actual FINDING, because
//                  requirement 1 (below) flags ONLY `renderConsumed===false &&
//                  exempt===false`, and an `editor-only` row is `exempt:true`
//                  by construction — it is filtered out before `kind` is ever
//                  read. Today's live run therefore reports `kind:'dead-attr'`
//                  on both findings (both have `controlPresent:false`);
//                  `dead-control` and `editor-only` are reachable branches
//                  with zero live instances, not dead code with none possible.
//                  ⚠ As of 2026-08-27 the `editor-only` branch is currently
//                  UNREACHABLE for a stronger reason than "zero live
//                  instances": `check-dead-controls.js`'s `EDITOR_ONLY_ATTRS`
//                  set is now EMPTY. `templateMode` — the only attribute that
//                  ever produced `exemptReason:'editor-only'` — was removed
//                  from every block that declared it as vestigial (see
//                  `.superpowers/sdd/task-3-report.md`); the stored value was
//                  always its "free" default, so it never restricted anything
//                  in practice. This is a FACT ABOUT THE TREE, not a defect in
//                  this rule or in `classifyKind()` — the branch, the
//                  `exempt-editor-only` fixture, and `KNOWN_EXEMPT_REASONS`'
//                  `'editor-only'` member are all KEPT so the mechanism is
//                  ready the moment a genuinely editor-only attribute is
//                  declared again.

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );
const { makeFinding } = require( '../core/finding' );

// The blocking gate this rule now consumes. Resolved relative to this file so
// it is correct regardless of cwd — one level up from rules/ (inspector-scan/),
// then up out of inspector-scan/ into scripts/, where check-dead-controls.js
// lives alongside inspector-scan/ as a sibling script.
const CHECK_DEAD_CONTROLS_SCRIPT = path.resolve(
	__dirname,
	'..',
	'..',
	'check-dead-controls.js'
);

// Module-level cache for the real `--dump-json` invocation, scoped to the
// lifetime of ONE node process. Invalidation: there is none to build, because
// there is nothing to invalidate — every fresh `node scripts/inspector-scan/
// run.js` invocation is a new process, so this cache can never carry state
// across two separate scans. It exists purely so a per-block rule (this one
// runs once per block in the roster) does not shell out to a 2,657-row JSON
// dump once per block; it shells out ONCE per scan and every block's run()
// call reuses the same parsed array. Deliberately NOT written to disk as a
// snapshot file — a committed dump would go stale the moment render.php/
// edit.js/block.json changed underneath it, silently re-creating the exact
// 317-finding drift this task exists to end. The dump is process-memory-only.
//
// Task 3 (2026-08-27, review findings) — TWO module-level slots, not one.
// `cachedDumpRows` holds a SUCCESSFUL parse; `cachedDumpError` holds a FAILED
// one. Both are cached (not just the success case) so a broken producer only
// pays the `execFileSync` cost ONCE per scan instead of once per block (a
// reviewer measured 83 re-spawned `MODULE_NOT_FOUND` child processes before
// this fix — Minor 5).
let cachedDumpRows = null;
let cachedDumpError = null;

// The exemptReason vocabulary this rule trusts. check-dead-controls.js's
// `--dump-json` docblock is the source of truth for what values it emits;
// this Set is the CONSUMER-side guard that a value outside it — a silent
// rename, a retired reason, a typo — throws loudly instead of being read as
// `null` (not-exempt) or ignored. 'core-supports' added Task 4 (2026-08-27,
// IMPORTANT 4): a WP-native `supports`-backed attribute (anchor/lock/align)
// is consumed by WordPress core itself, not by this block's own render code.
// 'cloning-pipeline-anchor' added 2026-09-02: render/editor-dead by design,
// kept alive as a routing anchor for the Python cloning pipeline's
// scalar-media mechanism. Its only entries (`sgs/hero::splitImage`/
// `splitImageMobile`) were deleted from block.json the same day (Wave 7b)
// once the DB anchor moved to `splitMediaType`, which IS render-consumed and
// needs no exemption — CLONING_PIPELINE_ANCHOR_ATTRS in check-dead-
// controls.js is currently empty, so this reason value is unused today but
// kept in the vocabulary for a future virtual-only anchor. Source of truth:
// plugins/sgs-blocks/scripts/data/scalar-media-roles.json.
const KNOWN_EXEMPT_REASONS = new Set( [
	'system-attr',
	'editor-only',
	'key-noise',
	'core-supports',
	'cloning-pipeline-anchor',
] );

/**
 * Minor 7 (2026-08-27, review findings) — a shape guard on the dump contract.
 * A renamed `block` field format goes SILENT (Critical 1's exact mechanism:
 * every row.find() lookup below just stops matching, and a block reporting
 * zero matches is indistinguishable from a genuinely clean block); a renamed
 * `exemptReason` value silently retires that reason from the vocabulary this
 * rule's `classifyKind()` branches on. Throwing here — inside `loadDumpRows`,
 * the ONE function both the fixture seam and the real CLI invocation pass
 * through — covers fixture rows AND live rows with the same guard.
 */
function assertDumpRowShape( row ) {
	if ( typeof row.renderConsumed !== 'boolean' ) {
		throw new Error(
			`dead-controls dump row has a non-boolean "renderConsumed": ${ JSON.stringify( row ) }`
		);
	}
	if ( typeof row.exempt !== 'boolean' ) {
		throw new Error( `dead-controls dump row has a non-boolean "exempt": ${ JSON.stringify( row ) }` );
	}
	if ( typeof row.block !== 'string' || ! row.block.includes( '/' ) ) {
		throw new Error(
			`dead-controls dump row has a malformed "block" field (expected "namespace/slug"): ${ JSON.stringify(
				row
			) }`
		);
	}
	if ( row.exemptReason !== null && ! KNOWN_EXEMPT_REASONS.has( row.exemptReason ) ) {
		throw new Error(
			`dead-controls dump row has an exemptReason "${ row.exemptReason }" outside the vocabulary this ` +
				`rule knows (${ [ ...KNOWN_EXEMPT_REASONS ].join( ', ' ) }): ${ JSON.stringify( row ) }`
		);
	}
}

function runDumpJson() {
	const out = execFileSync( process.execPath, [ CHECK_DEAD_CONTROLS_SCRIPT, '--dump-json' ], {
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
	} );
	return JSON.parse( out );
}

/**
 * Returns the per-(block,attr) dump rows check-dead-controls.js produces.
 *
 * Self-test seam (mirrors `_css-property-map.json`/`_surfaces.json` in
 * core/selftest.js — the established pattern for a rule whose real-world
 * dependency can only ever see the REAL repo): a fixture may inject synthetic
 * rows via `ctx.__deadControlsDumpRows` (loaded from a fixture root's
 * `_dead-controls-dump.json`) so this rule's OWN logic — the flag filter and
 * the S1/S2/S3 kind classification — is provably exercisable in isolation,
 * without re-implementing or re-exercising check-dead-controls.js's resolvers
 * (that CLI has its own self-test for those; duplicating the proof here would
 * be exactly the "second copy of the logic" this rewrite exists to remove).
 * `--dump-json` accepts no `--blocks-dir` flag and this rule must not modify
 * check-dead-controls.js to add one, so a fixture's synthetic block can never
 * appear as a real dump row — the seam is the only way to test this rule's
 * classification logic against a controlled input.
 *
 * Task 3 (2026-08-27, review findings, Critical 1) — THROWS, never swallows.
 * A malformed/absent producer (a bad `CHECK_DEAD_CONTROLS_SCRIPT` path, a
 * thrown parse error, or a zero-length dump) is a FLOOR failure: a reviewer
 * proved that the old `catch -> return []` made a broken producer look like
 * "0 findings, PASS" — silent blindness. There is nothing safe to return in
 * that case, so this now propagates the error to `run()`, which turns it
 * into a real finding rather than papering over it.
 */
function loadDumpRows( ctx ) {
	if ( ctx && Array.isArray( ctx.__deadControlsDumpRows ) ) {
		ctx.__deadControlsDumpRows.forEach( assertDumpRowShape );
		return ctx.__deadControlsDumpRows;
	}
	if ( cachedDumpError ) {
		throw cachedDumpError;
	}
	if ( ! cachedDumpRows ) {
		try {
			const rows = runDumpJson();
			if ( ! Array.isArray( rows ) || rows.length === 0 ) {
				throw new Error(
					'check-dead-controls.js --dump-json produced a zero-length dump ' +
						`(got ${ Array.isArray( rows ) ? '0 rows' : typeof rows }) — expected thousands of ` +
						'rows. Treated as a producer FAILURE, not "nothing to report".'
				);
			}
			rows.forEach( assertDumpRowShape );
			cachedDumpRows = rows;
		} catch ( e ) {
			cachedDumpError = e;
			throw e;
		}
	}
	return cachedDumpRows;
}

function dumpRowKey( block, attr ) {
	return block + '::' + attr;
}

/**
 * S1 x S3 x exemptReason -> the surface-derived `kind` a consumer can act on
 * without re-reading the source. Returns `null` for a row this rule has
 * nothing to say about (genuinely consumed, or exempt for a reason other than
 * `editor-only`  — `system-attr`/`key-noise` rows are structurally invisible
 * or documentation-only, exactly as check-dead-controls.js itself treats them
 * as "not a finding").
 */
function classifyKind( row ) {
	if ( row.renderConsumed ) return null; // provably consumed on S1 — nothing to report
	if ( row.exemptReason === 'editor-only' ) return 'editor-only'; // consumed by S2 by design
	if ( row.exempt ) return null; // system-attr / key-noise — not this rule's business
	return row.controlPresent ? 'dead-control' : 'dead-attr';
}

const FINDING_TEXT = {
	'dead-attr': {
		severity: 'warn',
		detail( attr ) {
			return (
				`"${ attr }" is declared in block.json but is NOT consumed anywhere on the render side ` +
				'(check-dead-controls.js\'s full six-corpus resolution found no render-side consumption) and ' +
				'has NO editor control either — nothing paints it, and the client has no way to set it. ' +
				'This is a dead declaration.'
			);
		},
		fix( attr ) {
			return (
				`Delete "${ attr }" from block.json, OR add render-side consumption for it (render.php, a ` +
				'shared include this block calls, or save.js for a static block) if it was meant to affect ' +
				'output. This is the block.json-declares-to-render.php-consumes edge (R3-e).'
			);
		},
	},
	'dead-control': {
		severity: 'warn',
		detail( attr ) {
			return (
				`"${ attr }" has an editor control (S3: the client CAN change it) but is NOT consumed anywhere ` +
				'on the render side (S1: check-dead-controls.js\'s full six-corpus resolution found no ' +
				"render-side consumption). This is a REAL bug — the client sets a value and sees no effect " +
				'anywhere on the published page.'
			);
		},
		fix( attr ) {
			return (
				`Add render-side consumption for "${ attr }" (render.php, a shared include this block calls, ` +
				'or save.js for a static block) so the client\'s control actually paints something. If the ' +
				'control was left over from a removed feature, remove both the control and the block.json ' +
				'declaration instead.'
			);
		},
	},
};

module.exports = {
	id: '34-declared-attr-unrendered',
	checklistItem: null,
	title: "Every attribute block.json declares is consumed somewhere on the render side (via check-dead-controls.js's verdict)",
	scope: 'per-block',
	needs: [ 'json:block.json' ],
	run( ctx, block ) {
		const blockJsonFile = path.join( ctx.blocksDir, block.tail, 'block.json' );
		const blockJson = ctx.json( blockJsonFile );
		if ( ! blockJson.ok ) return []; // malformed/absent block.json is roster-drift/parse-error territory

		const attrNames = Object.keys( blockJson.data.attributes || {} );

		let rows;
		try {
			rows = loadDumpRows( ctx );
		} catch ( e ) {
			// Critical 1 (2026-08-27, review findings): the blocking gate failing to
			// run used to be swallowed here and papered over with an empty array —
			// proven, by tampering, to make a broken producer read as "PASS,
			// 0 finding(s)". An advisory rule with no floor is worse than no rule:
			// it actively hides the fact that NOTHING was verified this scan. This
			// now surfaces an error-severity finding naming the failure instead —
			// which pushes this block's (and, since the failure is cached across
			// every per-block run() call, every OTHER block's) FLAGGED count well
			// past the ratchet's openBacklog ceiling, so `--check` fails closed
			// rather than passing on a guess.
			return [
				makeFinding( {
					rule: this.id,
					block: block.slug,
					file: blockJsonFile,
					severity: 'error',
					kind: 'producer-failure',
					detail:
						'check-dead-controls.js --dump-json failed to run or returned an unusable dump ' +
						`(${ e.message }). Rule 34 cannot verify render-side consumption for ANY block while ` +
						'this is broken — reporting 0 findings here would be a false PASS, not a clean scan.',
					fix:
						'Run `node plugins/sgs-blocks/scripts/check-dead-controls.js --dump-json` directly from ' +
						'the `scripts/` directory (it anchors on `__dirname` — running it from elsewhere scans ' +
						'nothing) and fix whatever it throws before trusting this rule\'s output again.',
					keyParts: [ 'producer-failure' ],
				} ),
			];
		}

		const findings = [];

		// Critical 1, second clause: even when the producer runs and returns a
		// non-empty dump, a bug could still make it skip THIS block entirely (a
		// directory filter, a malformed block.json readBlock() silently drops,
		// …) while other blocks are scanned fine — a per-block blind spot the
		// zero-length-dump guard above cannot catch. `sgs/mega-group` declares 0
		// attributes (verified live, 2026-08-27) so it is the one block for which
		// zero matched rows is legitimate, not a coverage gap — handled simply by
		// only running this check when the block declares at least one attribute.
		if ( attrNames.length > 0 ) {
			const hasAnyRow = attrNames.some(
				( attr ) => rows.some( ( r ) => r.block === block.slug && r.attr === attr )
			);
			if ( ! hasAnyRow ) {
				findings.push(
					makeFinding( {
						rule: this.id,
						block: block.slug,
						file: blockJsonFile,
						severity: 'error',
						kind: 'no-dump-coverage',
						detail:
							`${ block.slug } declares ${ attrNames.length } attribute(s) in block.json, but NONE ` +
							'of them appear anywhere in check-dead-controls.js --dump-json\'s output — the ' +
							'producer never scanned this block at all. A silent zero-finding result here would ' +
							'be indistinguishable from "everything is fine".',
						fix:
							'Run `node plugins/sgs-blocks/scripts/check-dead-controls.js --dump-json` and grep for ' +
							`"${ block.slug }" — confirm the block directory is being read (BLOCKS_DIR, the ` +
							'directory-name filter, or a malformed block.json readBlock() silently skips).',
						keyParts: [ 'no-dump-coverage' ],
					} )
				);
			}
		}

		for ( const attr of attrNames ) {
			const row = rows.find(
				( r ) => r.block === block.slug && r.attr === attr
			);
			// No row at all — the gate never scanned this (block,attr) pair (e.g. a
			// `_comment`/`_note` documentation key, which check-dead-controls.js's
			// own readBlock() already excludes before building rows). Not this
			// rule's business to guess at what the gate didn't measure.
			if ( ! row ) continue;

			const kind = classifyKind( row );
			if ( kind !== 'dead-attr' && kind !== 'dead-control' ) continue; // requirement 1's exact filter

			const text = FINDING_TEXT[ kind ];
			findings.push(
				makeFinding( {
					rule: this.id,
					block: block.slug,
					file: blockJsonFile,
					severity: text.severity,
					kind,
					detail: text.detail( attr ),
					fix: text.fix( attr ),
					keyParts: [ attr ],
				} )
			);
		}
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/34-declared-attr-unrendered',
		mustFlag: [
			// The rule's basic ability to catch a genuinely dead declaration — proves
			// it is not a rule that can never fail (the negative-control requirement).
			// dump row: renderConsumed:false, controlPresent:false, exempt:false.
			'dead-attr-no-control',
			// S3 present, S1 absent — the REAL-bug shape (the client sets something
			// that paints nowhere). dump row: renderConsumed:false,
			// controlPresent:true, exempt:false.
			'dead-control-real-bug',
		],
		// Critical 2 (2026-08-27, review findings) — requirement 2's entire
		// deliverable is the `kind` field, and until now NOTHING asserted its
		// VALUE (only that a finding with SOME name existed). A tampered
		// `classifyKind()` — the `editor-only` branch deleted, or `:145`
		// collapsed to always `return 'dead-attr'` — left every existing gate
		// green. This maps each mustFlag fixture name to the exact `kind` its
		// finding must carry; `testRule` in core/selftest.js asserts it.
		mustFlagKind: {
			'dead-attr-no-control': 'dead-attr',
			'dead-control-real-bug': 'dead-control',
		},
		mustNotFlag: [
			// Consumed (any renderVia) — the gate says S1 is satisfied, nothing to
			// report regardless of how it resolved.
			'rendered-literal',
			// The exact drift this rewrite exists to end: attribute name never
			// appears literally anywhere in the render corpus, consumed ONLY via a
			// prefixed-helper call (mirrors the real sgs/brand-strip.nameFontSize
			// shape at brand-strip/render.php:412). Proven watched-failing-first
			// under the OLD literal/suffix-scan rule (git history / task report),
			// now passes because this rule trusts the gate's own
			// `renderVia:'prefixed-helper'` verdict instead of re-deriving it.
			'rendered-via-prefixed-helper',
			// exemptReason:'system-attr' — extension surface, structurally invisible
			// to render-side resolution by design; not this rule's business.
			'exempt-system-attr',
			// exemptReason:'editor-only' — renderConsumed:false but consumed by S2
			// (the editor canvas) by design; proves the exemption suppresses the
			// finding even though S1 alone would otherwise look dead.
			'exempt-editor-only',
			// exemptReason:'key-noise' — a house-convention non-semantic key (id/
			// url/alt/...), not a real render-consumption question.
			'exempt-key-noise',
			// exemptReason:'core-supports' (Task 4, 2026-08-27, Important 4) — a
			// WP-native `supports`-backed attribute (e.g. `anchor`, mirroring
			// sgs/button, sgs/heading, sgs/nav-drawer) is consumed by WordPress
			// core itself, not by this block's own render.php. Proves the new
			// exemption flows through rule 34's existing `exempt` filter with NO
			// rule-34 logic change — check-dead-controls.js is the only producer
			// that had to learn this new reason.
			'exempt-core-supports',
		],
	},
};
