#!/usr/bin/env node
/**
 * run-motion-fx-generators.js — build-reproducibility wrapper for the Spec 38
 * motion-fx generator chain (seed-motion-fx-registry.py,
 * generate-fx-effects-php.py, generate-fx-qualifying-blocks.py).
 *
 * WHY THIS EXISTS
 * ----------------------------------------------------------------------
 * All three generators read `sgs-framework.db` — a 13.9MB local dev SQLite
 * knowledge base that is DELIBERATELY UNVERSIONED (see .claude/dev-setup.md,
 * "sgs-framework.db"). On any machine other than the owner's, the DB is
 * absent, so the three `python scripts/...` calls that used to sit directly
 * in package.json's `prebuild`/`prestart` died before `npm run build` ever
 * reached the webpack step. Two same-named files WERE committed at
 * `scripts/sgs-framework.db` and `scripts/data/sgs-framework.db` — both
 * 0 bytes, decoys that would have handed anyone who "fixed" the path an
 * empty `fx_effects` table (every motion control silently vanishing, no
 * error). Both were deleted from git as part of this fix — never resurrect
 * either path.
 *
 * The four generated artefacts these scripts produce
 * (includes/generated-fx-effects.php, includes/generated-fx-qualifying-blocks.php,
 * src/blocks/extensions/generated-fx-qualifying-blocks.json,
 * src/blocks/extensions/generated-fx-effect-meta.json) are already committed
 * build INPUTS. This wrapper's job:
 *
 *   1. DB absent  -> skip all three generators cleanly (exit 0). A
 *      contributor without the DB builds off the committed artefacts as-is.
 *   2. DB present -> run all three for real, so the owner can never commit
 *      drifted artefacts:
 *        - seed-motion-fx-registry.py always runs (idempotent DB seeding).
 *        - generate-fx-effects-php.py runs with --check (that script owns
 *          its own regenerate-and-diff mode — see its own file).
 *        - generate-fx-qualifying-blocks.py has NO --check mode yet (it is
 *          owned by a concurrent track building src/blocks/extensions/fx.js
 *          and scripts/generate-fx-qualifying-blocks.py — out of scope for
 *          this fix, reported as owed rather than edited). This wrapper
 *          emulates the same "regenerate-and-diff, never leave a drifted
 *          working tree, fail loudly on staleness" contract EXTERNALLY: it
 *          snapshots the two output files before running the generator (which
 *          always writes), diffs after, restores the original bytes if
 *          nothing should have changed, and fails loudly (naming both files)
 *          if the regenerated content differs from what was committed.
 *
 * A missing DB must never silently produce an empty roster (see the module
 * docstrings of the two generators this wraps) — that guard lives IN each
 * generator (they raise SystemExit(1) naming DB_PATH on an empty query
 * result), not here.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const SCRIPTS_DIR = __dirname;
const PLUGIN_ROOT = path.resolve(SCRIPTS_DIR, "..");

// Same path all three python generators use (Path.home() / ".agents" / "skills"
// / "sgs-wp-engine" / "sgs-framework.db") — kept in sync manually since this is
// a Node wrapper around Python scripts with no shared config file. If a
// generator's DB_PATH ever changes, update this constant too.
const DB_PATH = path.join(os.homedir(), ".agents", "skills", "sgs-wp-engine", "sgs-framework.db");

const QUALIFYING_PHP = path.join(PLUGIN_ROOT, "includes", "generated-fx-qualifying-blocks.php");
const QUALIFYING_JSON = path.join(
	PLUGIN_ROOT,
	"src",
	"blocks",
	"extensions",
	"generated-fx-qualifying-blocks.json"
);

function log(msg) {
	process.stdout.write(`[run-motion-fx-generators] ${msg}\n`);
}

function errLog(msg) {
	process.stderr.write(`[run-motion-fx-generators] ${msg}\n`);
}

function runPython(scriptRelPath, extraArgs = []) {
	execFileSync("python", [path.join(SCRIPTS_DIR, scriptRelPath), ...extraArgs], {
		cwd: PLUGIN_ROOT,
		stdio: "inherit",
	});
}

function readIfExists(filePath) {
	return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

function main() {
	if (!fs.existsSync(DB_PATH)) {
		log(
			`DB not found: ${DB_PATH} — skipping the motion-fx generator chain (building ` +
				"off the committed generated artefacts; see .claude/dev-setup.md \"sgs-framework.db\")."
		);
		return 0;
	}

	// 1. Seed the DB (idempotent — safe to run every build).
	runPython("seed-motion-fx-registry.py");

	// 2. generate-fx-effects-php.py owns its own --check mode (added alongside
	//    this wrapper). It never writes when --check is passed.
	runPython("generate-fx-effects-php.py", ["--check"]);

	// 3. generate-fx-qualifying-blocks.py has no --check mode (owned by another
	//    track — see module docstring). Snapshot -> run (it writes for real) ->
	//    diff -> restore-if-unchanged-should-have-been-true -> fail loud if stale.
	const beforePhp = readIfExists(QUALIFYING_PHP);
	const beforeJson = readIfExists(QUALIFYING_JSON);

	runPython("generate-fx-qualifying-blocks.py");

	const afterPhp = readIfExists(QUALIFYING_PHP);
	const afterJson = readIfExists(QUALIFYING_JSON);

	const stale = [];
	if (beforePhp !== afterPhp) stale.push(QUALIFYING_PHP);
	if (beforeJson !== afterJson) stale.push(QUALIFYING_JSON);

	if (stale.length > 0) {
		errLog(
			"STALE — generate-fx-qualifying-blocks.py just regenerated content that " +
				`differs from what was committed:\n  ${stale.join("\n  ")}\n` +
				"The generator has already overwritten these files with the correct " +
				"regenerated content — review the diff and commit it. (NOTE: this staleness " +
				"check is performed externally by this wrapper because " +
				"generate-fx-qualifying-blocks.py itself has no --check mode yet — that is " +
				"owed to the track that owns that script, not fixed here.)"
		);
		return 1;
	}

	log("OK — motion-fx generator chain ran clean, no drift.");
	return 0;
}

process.exitCode = main();
