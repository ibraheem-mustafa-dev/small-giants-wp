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
let cachedDumpRows = null;

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
 */
function loadDumpRows( ctx ) {
	if ( ctx && Array.isArray( ctx.__deadControlsDumpRows ) ) {
		return ctx.__deadControlsDumpRows;
	}
	if ( ! cachedDumpRows ) {
		cachedDumpRows = runDumpJson();
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
	classifyKind, // exported for the self-test's direct-classification assertions
	run( ctx, block ) {
		const blockJsonFile = path.join( ctx.blocksDir, block.tail, 'block.json' );
		const blockJson = ctx.json( blockJsonFile );
		if ( ! blockJson.ok ) return []; // malformed/absent block.json is roster-drift/parse-error territory

		let rows;
		try {
			rows = loadDumpRows( ctx );
		} catch ( e ) {
			// The blocking gate itself failing to run is not this advisory rule's
			// business to paper over with a guess — surface nothing rather than
			// fabricate a verdict check-dead-controls.js never produced.
			return [];
		}

		const findings = [];
		for ( const attr of Object.keys( blockJson.data.attributes || {} ) ) {
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
		],
	},
};
