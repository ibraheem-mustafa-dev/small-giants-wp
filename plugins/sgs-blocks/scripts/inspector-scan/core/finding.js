'use strict';

// GROUND-TRUTH: spec=none source=file evidence=live-read
// plugins/sgs-blocks/scripts/inspector-scan/core/roster.js (`BLOCKS_DIR =
// path.resolve(PLUGIN_ROOT, 'src', 'blocks')`) and run.js (`PATTERNS_DIR`/
// `THEME_DIR` both path.resolve()'d) confirm every `file` a rule passes into
// makeFinding() is absolute; baselines/08-raw-url-link.json's own committed
// `_meta.note` (written during the Task C port) already flagged this as a
// "found, not fixed" pre-existing property of this shared key shape — this
// commit is that fix, done once here rather than per-rule.

const path = require( 'path' );

// REPO_ROOT climbs from core/ (this file's directory) up 5 levels:
// core -> inspector-scan -> scripts -> sgs-blocks -> plugins -> repo root.
// Matches run.js's own climb for THEME_DIR/PATTERNS_DIR (4 levels from
// inspector-scan/, i.e. one fewer because run.js lives one directory closer
// to the root than core/finding.js does).
const REPO_ROOT = path.resolve( __dirname, '..', '..', '..', '..', '..' );

/**
 * Baseline-key portability fix (2026-08-06): every `file` a rule passes in is
 * an absolute filesystem path (ctx.blocksDir / ctx.patternsDir are both
 * path.resolve()'d in roster.js/run.js). Baking that raw into the dedup/
 * baseline key means a baseline entry only matches on THIS machine at THIS
 * checkout path — a fresh clone, a CI runner, or a second worktree would see
 * every previously-baselined finding reappear as net-new. Made repo-relative
 * with forward slashes (Windows backslashes normalised) so the key is stable
 * across machines and platforms. Only the KEY is normalised — the `file`
 * field on the finding itself stays absolute (useful for click-through in a
 * human/IDE report).
 */
function keyFileSegment( file ) {
	if ( ! file ) return '-';
	const rel = path.isAbsolute( file ) ? path.relative( REPO_ROOT, file ) : file;
	return rel.split( path.sep ).join( '/' );
}

/**
 * The one Finding shape every rule produces. `fix` is MANDATORY — Bean is the
 * QC layer for this framework, so a finding with no plain-English next action
 * is not a usable finding. Enforced here (throws) rather than by review.
 *
 * `key` is the stable dedup/baseline identity: rule + block + file + whatever
 * extra parts the rule supplies (attr name, JSX locus, filename, ...). Full
 * tuple identity, never a tier-blind join (STOP-17). The file segment is
 * repo-relative (see `keyFileSegment` above) — never embed an absolute path
 * in a baseline key.
 */
function makeFinding({
	rule,
	checklistItem = null,
	block = null,
	file = null,
	line = null,
	severity = 'warn',
	detail,
	fix,
	// A machine-readable axis label (e.g. 'below-min-states', 'missing-gradient').
	// OPTIONAL + defaulted, so every rule that omits it is unaffected.
	// It MUST be destructured here AND returned below, or it is silently DISCARDED:
	// this function builds its result from an explicit field list, so a rule passing
	// `kind:` into an unaware makeFinding() looks correct at the call site and emits
	// nothing. That is exactly what happened - rule 31 passed `kind` at 6 direct call
	// sites while every finding in --json came out without it, and nothing threw.
	// Verified by reading the emitted JSON keys, never the call sites.
	kind = null,
	keyParts = [],
}) {
	if (!detail || typeof detail !== 'string' || !detail.trim()) {
		throw new Error(
			`[inspector-scan] finding for rule "${rule}" has no non-empty 'detail' text.`
		);
	}
	if (!fix || typeof fix !== 'string' || !fix.trim()) {
		throw new Error(
			`[inspector-scan] finding for rule "${rule}" (${detail}) has no non-empty 'fix' text — ` +
				`fix is mandatory (Bean is the QC layer; every finding must carry a plain-English next action).`
		);
	}
	if (!['error', 'warn', 'informational'].includes(severity)) {
		throw new Error(
			`[inspector-scan] finding for rule "${rule}" has an unknown severity "${severity}".`
		);
	}
	const key = [rule, block || '-', keyFileSegment(file), ...keyParts].join('|');
	return {
		rule,
		checklistItem,
		block,
		file,
		line,
		severity,
		detail,
		fix,
		kind,
		key,
		status: 'FLAGGED',
	};
}

module.exports = { makeFinding };
