// WooCommerce's coming-soon mode as site-check.mjs meets it (Spec 48 §3.7): with `woocommerce_coming_soon` = `yes`
// every logged-out request gets WooCommerce's holding page, so each check would report a missing header, unrendered
// forms and no products, all false. Before the checks the run loads the home page as a visitor; when the holding page
// stands in place of the site (the `woocommerce/coming-soon` block's root as a direct child of the site's block wrapper
// or the body, never one inside a page's own content) the run reports one failure naming the setting and the fix
// command, and every other check it runs is n-a with that reason.
import { CHECKS, checkRecord, skippedRecord } from './site-check-report.mjs';

export const COMING_SOON_ROOT = '[data-block-name="woocommerce/coming-soon"], .wp-block-woocommerce-coming-soon';

// In-page (page.evaluate( comingSoonInPage, COMING_SOON_ROOT )): whether WooCommerce's holding page replaces the site.
export function comingSoonInPage( selector ) {
	return [ ...document.querySelectorAll( selector ) ].some( ( el ) => el.parentElement === document.body || el.parentElement?.classList.contains( 'wp-site-blocks' ) );
}

export const storeVisibleCommand = ( client, site ) => `node scripts/computed-route/site-build.mjs ${ client } --site ${ site } --store-visible --apply`;

const REASON = 'the site is in WooCommerce coming-soon mode: visitors see a holding page (woocommerce_coming_soon=yes)';

// Every check's record for a site in coming-soon mode: the failure on `pages` (else on the first check `ids` runs), every
// other check in `ids` n-a with the reason, the rest skipped (--only). `screenshot` is the holding page's, when taken.
export function comingSoonChecks( { ids, url, client, site, screenshot = null } ) {
	const run = CHECKS.map( ( c ) => c.id ).filter( ( id ) => ids.includes( id ) );
	const failOn = run.includes( 'pages' ) ? 'pages' : run[ 0 ];
	const out = {};
	for ( const { id } of CHECKS ) {
		if ( ! run.includes( id ) ) {
			out[ id ] = skippedRecord( id );
		} else if ( id === failOn ) {
			out[ id ] = checkRecord( id, [ { status: 'fail', subject: 'the site as a visitor sees it', url, selector: '.wp-block-woocommerce-coming-soon', screenshot, error: REASON, detail: `fix: ${ storeVisibleCommand( client, site ) }` } ] );
		} else {
			out[ id ] = checkRecord( id, [], `not checked: ${ REASON }` );
		}
	}
	return out;
}
