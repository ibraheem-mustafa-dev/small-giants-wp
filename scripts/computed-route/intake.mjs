#!/usr/bin/env node
// Stage 1 of a client build (Spec 48 FR-48-17): intake, closed by Bean's one batched review.
//   node scripts/computed-route/intake.mjs <client> [--record] [--widths 375,768,1440] [--surfaces a,b] [--repo <path>]
//     reads sites/<client>/handoff/ and writes sites/<client>/build/intake/{intake.json,review.md} and
//     sites/<client>/build/page-map.json. --record (re)records the replay file; without it a missing one is an error.
//     --widths sets the replay check, runtime census, recording and draft-defect widths (the skeleton inventory always
//     reads 375, 768 and 1440); --surfaces limits the skeleton step to those surface slugs or surfaces.json ids.
//   node scripts/computed-route/intake.mjs --apply-review <client> [--repo <path>]
//     reads review.md back, writes the dated marks into intake.json and the confirmed page-map.json, and saves Bean's
//     block:<slug> marks and accepted finaliser picks to sites/<client>/build/skeleton/decisions.json.
//   node scripts/computed-route/intake.mjs --finalise <client>      writes build/intake/finalise-request.json (the
//     low-confidence and unresolved skeleton rows) for an agent run with prompts/skeleton-finaliser.md.
//   node scripts/computed-route/intake.mjs --apply-picks <client>   applies that agent's finalise-picks.json to
//     intake.json and re-renders review.md (no browser stage); an invalid pick writes nothing.
//   node scripts/computed-route/intake.mjs --render <client>        re-renders review.md from intake.json.
//   node scripts/computed-route/intake.mjs --rerun-skeletons <client>   proposes the skeleton rows again offline from
//     the inventories the last run saved, with today's standing rules (no browser), carries the finaliser's earlier
//     picks for rows that still await it, and re-renders review.md.
//   node scripts/computed-route/intake.mjs --facts <client>         writes only build/intake/facts.json (FR-48-7) from the
//     export, the replay file and the inventories the last run saved, without the other intake stages.
//   node scripts/computed-route/intake.mjs --page-map <client>      rebuilds only build/page-map.json offline from the
//     export, with Bean's saved page-map review marks and the current map's ids carried by row key, and prints every
//     changed row (lib/intake-pagemap-regen.mjs).
// Exit 0 pass, 1 a failure (named on stderr), 2 usage. --repo points every path at another repository root (tests).
import { parseArgs, runIntake, applyIntakeReview, recordProblems, pathsFor, USAGE } from './lib/intake-run.mjs';
import { runFinalise, runApplyPicks, runRender, runRerunSkeletons } from './lib/intake-run-finalise.mjs';
import { runFacts } from './lib/intake-facts-run.mjs';
import { runPageMap } from './lib/intake-pagemap-regen.mjs';

const o = parseArgs( process.argv.slice( 2 ) );
if ( o.error ) {
	process.stderr.write( `${ o.error }\n${ USAGE }\n` );
	process.exit( 2 );
}
const at = pathsFor( o.repo, o.client );
const log = ( l ) => console.error( l );
const modes = {
	apply: () => applyIntakeReview( o ),
	finalise: () => runFinalise( at, o, { log } ),
	'apply-picks': () => runApplyPicks( at, o, { log, recordProblems } ),
	render: () => runRender( at, o, { log } ),
	'rerun-skeletons': () => runRerunSkeletons( at, o, { log, recordProblems } ),
	facts: () => runFacts( o, { log } ),
	'page-map': () => runPageMap( o, { log } ),
	run: () => runIntake( o ),
};
process.exitCode = await modes[ o.mode ]();
