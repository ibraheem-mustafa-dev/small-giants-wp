#!/usr/bin/env node
// Stage 1 of a client build (Spec 48 FR-48-17): intake, closed by Bean's one batched review.
//   node scripts/computed-route/intake.mjs <client> [--record] [--widths 375,768,1440] [--surfaces a,b] [--repo <path>]
//     reads sites/<client>/handoff/ and writes sites/<client>/build/intake/{intake.json,review.md} and
//     sites/<client>/build/page-map.json. --record (re)records the replay file; without it a missing one is an error.
//     --widths sets the replay check, runtime census, recording and draft-defect widths (the skeleton inventory always
//     reads 375, 768 and 1440); --surfaces limits the skeleton step to those surface slugs or surfaces.json ids.
//   node scripts/computed-route/intake.mjs --apply-review <client> [--repo <path>]
//     reads review.md back, writes the dated marks into intake.json and the confirmed page-map.json.
// Exit 0 pass, 1 a failure (named on stderr), 2 usage. --repo points every path at another repository root (tests).
import { parseArgs, runIntake, applyIntakeReview, USAGE } from './lib/intake-run.mjs';

const o = parseArgs( process.argv.slice( 2 ) );
if ( o.error ) {
	process.stderr.write( `${ o.error }\n${ USAGE }\n` );
	process.exit( 2 );
}
process.exitCode = 'apply' === o.mode ? applyIntakeReview( o ) : await runIntake( o );
