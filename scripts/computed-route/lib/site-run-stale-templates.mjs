// A saved template copy no surface builds any more, removed before a site run builds (Spec 48 FR-48-55 step 8 and FR-48-56).
//
// WordPress serves a page through its template hierarchy, and a saved copy named `page-<slug>` outranks the theme's `page`. An
// older manifest that built a `template-page-my-account` surface left such a copy on the site (recorded in
// `sgs_site_build_templates`); when the page map later made the account an ordinary page (template `page`), the copy stayed and
// served the page with its own old blocks: the page's saved content never rendered, the live markers were the old surface's
// (`cr-ref-template-page-my-account-*`) where the walk looks for the page's (`cr-ref-my-account-*`, "the live page has no element
// for the surface's root"), and the copy's hero kept the block's default dark gradient behind dark text.
//
// The site build already plans this removal (lib/site-build-plan.mjs::planBuild, its `template-remove` actions), but a site run
// never runs the site build, and a whole site build stops on any unrelated problem. So the run applies the same rule before its
// build stage: a saved copy the clone wrote (its slug is a key of `sgs_site_build_templates`) that no manifest surface builds
// (`target.template`) and no page-map row gives a source (lib/template-copies.mjs::copySource) is deleted, its recorded hash and
// content marker with it, and the theme's or plugin's file stands. A copy the clone did not write (WooCommerce's, a person's) is
// never touched.
import { copySource } from './template-copies.mjs';
import { TEMPLATE_OPTION } from './site-build-state.mjs';
import { templateForgetPhp } from './site-build-apply.mjs';

// The PHP reading what the rule needs: { hashes: { slug: hash }, saved: { slug: wp_template post id } }.
export const staleStatePhp = () => `<?php
$saved = array();
foreach ( get_block_templates( array(), 'wp_template' ) as $t ) {
	if ( 'custom' === $t->source ) {
		$saved[ $t->slug ] = (int) $t->wp_id;
	}
}
echo wp_json_encode( array( 'hashes' => (object) (array) get_option( '${ TEMPLATE_OPTION }', array() ), 'saved' => (object) $saved ) );
`;

// The saved copies to remove: [ { slug, id } ], in the order the site holds them. `surfaces` is the whole manifest (never the
// run's `--only` subset), `rows` the page map.
export function staleCopies( { state, surfaces, rows } ) {
	const built = new Set( Object.values( surfaces || {} ).map( ( e ) => e?.target?.template ).filter( Boolean ) );
	return Object.entries( state.saved || {} )
		.filter( ( [ slug ] ) => Object.hasOwn( state.hashes || {}, slug ) && ! built.has( slug ) && null === copySource( rows, slug ) )
		.map( ( [ slug, id ] ) => ( { slug, id } ) );
}

// Reads the site, removes each stale copy and returns the slugs removed. `runPhp` runs PHP on the site, `wp` runs wp-cli on it.
export function removeStaleTemplates( { runPhp, wp, rows, surfaces, log = console.log } ) {
	const text = String( runPhp( staleStatePhp() ) );
	const start = text.indexOf( '{' );
	if ( start < 0 ) {
		throw new Error( `the saved-template read printed no JSON: ${ text.slice( 0, 300 ) }` );
	}
	const state = JSON.parse( text.slice( start ) );
	const stale = staleCopies( { state, surfaces, rows } );
	let hashes = { ...state.hashes };
	for ( const { slug, id } of stale ) {
		if ( ! Number.isInteger( id ) || id < 1 ) {
			throw new Error( `the saved ${ slug } template has no post id on the site` );
		}
		wp( [ 'post', 'delete', String( id ), '--force' ] );
		const { [ slug ]: dropped, ...kept } = hashes;
		hashes = kept;
		wp( [ 'option', 'update', TEMPLATE_OPTION, JSON.stringify( hashes ), '--format=json' ] );
		runPhp( templateForgetPhp( slug ) );
		log( `stale template: removed the saved ${ slug } copy (wp_template ${ id }): the clone wrote it and no manifest surface builds it now, so the theme's file stands` );
	}
	return stale.map( ( s ) => s.slug );
}
