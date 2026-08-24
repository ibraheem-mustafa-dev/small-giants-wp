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
 * The three generated artefacts these scripts produce
 * (includes/generated-fx-effects.php, src/blocks/extensions/generated-fx-qualifying-blocks.json,
 * src/blocks/extensions/generated-fx-effect-meta.json) are already committed
 * build INPUTS. (A fourth artefact, includes/generated-fx-qualifying-blocks.php, was a dead PHP
 * mirror with zero callers and was DELETED at 1ac16ec9 — the generator no longer emits it; only
 * the JSON twin above is live.) This wrapper's job:
 *
 *   1. DB absent  -> skip all three generators cleanly (exit 0). A
 *      contributor without the DB builds off the committed artefacts as-is.
 *   2. DB present -> run all three for real, so the owner can never commit
 *      drifted artefacts:
 *        - seed-motion-fx-registry.py always runs (idempotent DB seeding).
 *        - generate-fx-effects-php.py runs with --check (that script owns
 *          its own regenerate-and-diff mode — see its own file).
 *        - generate-fx-qualifying-blocks.py ALSO runs with --check (2026-07-31
 *          — it used to have no --check mode, so this wrapper emulated one
 *          externally via a snapshot/diff/restore dance; that external
 *          emulation is gone now that the script owns its own --check,
 *          matching generate-fx-effects-php.py's contract exactly).
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

function log(msg) {
	process.stdout.write(`[run-motion-fx-generators] ${msg}\n`);
}

function runPython(scriptRelPath, extraArgs = []) {
	execFileSync("python", [path.join(SCRIPTS_DIR, scriptRelPath), ...extraArgs], {
		cwd: PLUGIN_ROOT,
		stdio: "inherit",
	});
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

	// 2 + 3. Both generators own their own --check mode (identical contract):
	//    regenerate in memory, diff against the committed artefacts, never
	//    write, exit 1 naming any stale file. execFileSync throws (non-zero
	//    exit) on failure, which propagates as this wrapper's own failure.
	runPython("generate-fx-effects-php.py", ["--check"]);
	runPython("generate-fx-qualifying-blocks.py", ["--check"]);

	log("OK — motion-fx generator chain ran clean, no drift.");
	return 0;
}

process.exitCode = main();
