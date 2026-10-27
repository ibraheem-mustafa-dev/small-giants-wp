// WooCommerce's coming-soon mode (Spec 48 FR-48-55 part 6): a new WooCommerce install sets `woocommerce_coming_soon` to
// `yes`, which serves every logged-out visitor WooCommerce's holding page in place of the site (no header, no forms, no
// products). For a shop client (a page map with a SHOP_TYPES row) the site build sets it to `no` when the site reads
// `yes`; any other value, and every non-shop client, plans nothing. `woocommerce_store_pages_only` (coming soon on the
// store pages alone) is never written. The whole build plans it through lib/site-build-plan.mjs::planBuild (its state
// read, lib/site-build-state.mjs::statePhp, reads the option); `site-build.mjs --store-visible [--apply]` runs this step
// alone through runStoreVisible, reading the page map only to tell a shop client and writing nothing else.
import { SHOP_TYPES } from './site-build-map.mjs';

export const COMING_SOON_OPTION = 'woocommerce_coming_soon';
export const STORE_PAGES_ONLY_OPTION = 'woocommerce_store_pages_only';

export const isShopClient = ( rows ) => rows.some( ( r ) => SHOP_TYPES.includes( r.postType ) );

// The one action a site in coming-soon mode needs, else null; callers ask only for a shop client. `value` is the option
// as the site reads it.
export function comingSoonAction( value ) {
	if ( 'yes' !== String( value ?? '' ) ) {
		return null;
	}
	return { phase: 'site', type: 'option', name: COMING_SOON_OPTION, value: 'no', say: `option ${ COMING_SOON_OPTION }: "yes" -> no (WooCommerce's coming-soon mode serves visitors a holding page in place of the site)` };
}

// The read: both coming-soon options, as strings.
export const storeVisiblePhp = () => `echo wp_json_encode( array( 'comingSoon' => (string) get_option( '${ COMING_SOON_OPTION }' ), 'storePagesOnly' => (string) get_option( '${ STORE_PAGES_ONLY_OPTION }' ) ) );`;

const writePhp = () => `update_option( '${ COMING_SOON_OPTION }', 'no' ); echo 'ok';`;

export function readStoreVisible( runPhp ) {
	const text = String( runPhp( storeVisiblePhp() ) );
	const start = text.indexOf( '{' );
	if ( start < 0 ) {
		throw new Error( `the coming-soon read printed no JSON: ${ text.slice( 0, 300 ) }` );
	}
	return JSON.parse( text.slice( start ) );
}

// The narrow plan: { actions, options, notes } from the rows and readStoreVisible's answer.
export function planStoreVisible( rows, read ) {
	const notes = [];
	if ( ! isShopClient( rows ) ) {
		notes.push( 'the page map has no shop row, so WooCommerce\'s coming-soon mode is left as it is' );
		return { actions: [], options: [], notes };
	}
	const action = comingSoonAction( read.comingSoon );
	if ( ! action ) {
		notes.push( `${ COMING_SOON_OPTION } reads ${ JSON.stringify( read.comingSoon ?? '' ) }: visitors already see the site` );
	}
	if ( 'yes' === read.storePagesOnly ) {
		notes.push( `${ STORE_PAGES_ONLY_OPTION } reads "yes"; it only narrows coming-soon mode to the store pages and is left as it is` );
	}
	return { actions: action ? [ action ] : [], options: action ? [ { name: COMING_SOON_OPTION, before: String( read.comingSoon ), after: 'no' } ] : [], notes };
}

// `--store-visible [--apply]`: prints the plan; with apply writes the option, reads it back and fails unless it reads `no`.
// Exit 0 done or nothing to do, 1 the read-back disagrees.
export function runStoreVisible( { rows, runPhp, apply, log = console.log } ) {
	const plan = planStoreVisible( rows, readStoreVisible( runPhp ) );
	plan.notes.forEach( ( n ) => log( `note: ${ n }` ) );
	if ( plan.options.length ) {
		log( 'option | before | after' );
		plan.options.forEach( ( o ) => log( `${ o.name } | ${ o.before } | ${ o.after }` ) );
	}
	if ( ! plan.actions.length ) {
		log( 'store visible: nothing to do' );
		return 0;
	}
	if ( ! apply ) {
		log( `store visible: 1 to change (dry run: re-run with --apply)` );
		return 0;
	}
	runPhp( writePhp() );
	const after = readStoreVisible( runPhp );
	if ( 'no' !== after.comingSoon ) {
		log( `FAILED: ${ COMING_SOON_OPTION } still reads ${ JSON.stringify( after.comingSoon ) } after the write` );
		return 1;
	}
	log( `store visible: ${ COMING_SOON_OPTION } now reads "no"; visitors see the site` );
	return 0;
}
