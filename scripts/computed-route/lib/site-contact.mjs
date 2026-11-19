// The site-contact layer: the guard every route entry that reaches a WordPress site calls before it does anything.
//   - SGS_NO_SITE set (scripts/lib/no-site.js): the process may not contact a site at all (the mutation checker and the route's
//     test script set it, so no test can reach one whatever it does).
//   - A target carrying `protected` (calibration-targets.json) is refused unless the call is `readOnly`. The layer cannot tell a
//     read from a write inside a wp-cli call, so a caller that only reads says so with `readOnly: true`.
// The functions that call it: lib/calibration-refs.mjs::wpCommand (and wpEvalRunner), lib/wp-run-session.mjs::openRunSession and
// ::openDetachedSession, lib/trial-page.mjs::adminSession, lib/deploy-hash.mjs::remoteBlockHash, lib/build-compare.mjs::remoteFiles,
// lib/tree.mjs::assertQuiet, lib/media-upload.mjs::uploadMedia, apply.mjs, apply-options.mjs, refresh-pairs.mjs, head-check.mjs,
// form-submit-check.mjs (its reads, and its one form submission as a write), shop-load-more-check.mjs (each ssh call, a write
// unless it reads), site-check.mjs (lib/site-check-site.mjs::assertCheckContact before its browser opens: the kill switch, and on
// a protected site its forms check and --with-cart refused) and shop-fixtures.mjs's REST calls; scripts/wp-build-page.js and
// scripts/lib/wp-session.js call scripts/lib/no-site.js themselves. Each caller that knows its site names it.
import { createRequire } from 'module';
import { readTargets } from './site-targets.mjs';

const noSite = createRequire( import.meta.url )( '../../lib/no-site.js' );

export const NO_SITE_MESSAGE = noSite.MESSAGE;

// Throws before a site is contacted when the kill switch is on, or when `site` (or `target`) is protected and the call is not a
// read. `site` names the target in calibration-targets.json; `target` is its entry when the caller holds it; `env` and `targets`
// are for tests.
export function assertSiteContact( { site = null, target = null, readOnly = false, env = process.env, targets = null } = {} ) {
	noSite.assertMayContactSite( env );
	if ( readOnly ) {
		return;
	}
	const why = target?.protected ?? ( site ? ( targets ?? readTargets() )[ site ]?.protected : undefined );
	if ( 'string' === typeof why && why ) {
		throw new Error( `${ site ?? 'this site' } is protected: ${ why }; this call may write it (pass readOnly: true only for a call that reads)` );
	}
}
