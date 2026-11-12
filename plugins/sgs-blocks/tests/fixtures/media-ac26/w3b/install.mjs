#!/usr/bin/env node
/**
 * AC-26 fixture for the product card and the buybox (Spec 49 §10.4, FR-49-37): one page that sets the settings §10.4
 * lists for their media slots, so `check.mjs` can assert the computed styles those settings print at three widths.
 *
 * Idempotent: it creates the page `ac26-w3b` on a local mirror, or rewrites it in place. Run it after the mirror holds
 * the build under test (`scripts/local-wp/sync-build.sh <site>`).
 *
 *   node plugins/sgs-blocks/tests/fixtures/media-ac26/w3b/install.mjs --site local-mediatest-pkg-w3b [--variable ID] [--simple ID] [--pickset ID]
 *
 * The page holds, each in its own wrapper class so the check finds it:
 *   ac26-typed    a typed product card: photo with Ratio 4:3 (1:1 on mobile), Fit contain, 12px corners
 *   ac26-simple   a card bound to a simple product with Height 180px
 *   ac26-default  a card bound to a simple product with no photo settings (the 220px box)
 *   ac26-buybox   a buybox on the variable product: main photo corners, border and shadow, thumbnail corners and Fit
 *   ac26-pick     a Pick a set buybox (the slug `zookies` when the mirror has it, else the variable product): the preview picture's Fit, corners and border
 *
 * Needs WooCommerce and one image in the media library (it uses the first). The mirror is reached through WSL's WP-CLI.
 *
 * @package SGS\Blocks
 */
import { execFileSync } from 'child_process';

const args = process.argv.slice( 2 );
const option = ( name, fallback = null ) => {
	const at = args.indexOf( `--${ name }` );
	return at === -1 ? fallback : args[ at + 1 ] ?? fallback;
};
const site = option( 'site' );
if ( ! site || ! /^local-mediatest[a-z0-9-]*$|^local-[a-z0-9-]+$/.test( site ) ) {
	console.error( 'Usage: install.mjs --site local-<name> [--variable ID] [--simple ID] [--pickset ID]' );
	process.exit( 2 );
}
const SLUG = 'ac26-w3b';
const docroot = `/var/www/${ site }`;

const wslWp = ( wpArgs, input ) =>
	execFileSync( 'wsl', [ '-d', 'Ubuntu', '-u', 'root', '--', 'wp', `--path=${ docroot }`, '--allow-root', ...wpArgs ], {
		encoding: 'utf8',
		input,
		env: { ...process.env, MSYS_NO_PATHCONV: '1' },
	} ).trim();
const wp = ( ...wpArgs ) => wslWp( wpArgs );
/** Run a PHP snippet in WordPress (written to a file in WSL first, so `$` and quotes reach PHP untouched). */
const wpPhp = ( code ) => {
	execFileSync( 'wsl', [ '-d', 'Ubuntu', '-u', 'root', '--', 'tee', '/tmp/sgs-ac26-snippet.php' ], { input: `<?php ${ code }`, stdio: [ 'pipe', 'ignore', 'inherit' ] } );
	return wslWp( [ 'eval-file', '/tmp/sgs-ac26-snippet.php' ] );
};

const productOf = ( type ) =>
	wpPhp(`$p = wc_get_products( array( 'type' => '${ type }', 'status' => 'publish', 'limit' => 1, 'return' => 'ids' ) ); echo $p ? $p[0] : 0;`
	);
const variable = option( 'variable' ) || productOf( 'variable' );
const simple = option( 'simple' ) || productOf( 'simple' );
if ( ! Number( variable ) || ! Number( simple ) ) {
	console.error( `The mirror needs a published variable and a published simple product (found variable=${ variable }, simple=${ simple }).` );
	process.exit( 2 );
}
const pickset = Number(
	option( 'pickset' ) ||
		wpPhp(`$p = get_page_by_path( 'zookies', OBJECT, 'product' ); echo $p ? $p->ID : 0;` ) ||
		0
) || Number( variable );
const imageId = Number( wp( 'post', 'list', '--post_type=attachment', '--post_mime_type=image', '--posts_per_page=1', '--orderby=ID', '--order=ASC', '--field=ID' ).split( /\s+/ )[ 0 ] );
const imageUrl = wp( 'post', 'get', String( imageId ), '--field=guid' );
const imageMeta = JSON.parse(
	wpPhp(`echo wp_json_encode( wp_get_attachment_metadata( ${ imageId } ) ?: array() );` ) || '{}'
);
if ( ! imageId || ! imageUrl ) {
	console.error( 'The mirror has no image in its media library.' );
	process.exit( 2 );
}

const corners = ( px ) => ( { topLeft: px, topRight: px, bottomRight: px, bottomLeft: px } );
const sides = ( px ) => ( { top: px, right: px, bottom: px, left: px } );
const block = ( name, attrs ) => `<!-- wp:sgs/${ name } ${ JSON.stringify( attrs ) } /-->`;

const content = [
	block( 'product-card', {
		className: 'ac26-typed',
		sourceMode: 'typed',
		productName: 'AC-26 typed card',
		imageSource: { desktop: { kind: 'image', id: imageId, url: imageUrl, width: imageMeta.width || 0, height: imageMeta.height || 0 } },
		imageAlt: 'AC-26 fixture photo',
		imageRatio: { desktop: '4 / 3', mobile: '1 / 1' },
		imageFit: { desktop: 'contain' },
		imageRadius: { desktop: corners( '12px' ) },
	} ),
	block( 'product-card', {
		className: 'ac26-simple',
		sourceMode: 'wc-product',
		productId: Number( simple ),
		imageHeight: { desktop: '180px' },
	} ),
	block( 'product-card', {
		className: 'ac26-default',
		sourceMode: 'wc-product',
		productId: Number( simple ),
	} ),
	block( 'buybox', {
		className: 'ac26-buybox',
		buyboxProductId: Number( variable ),
		mainRadius: { desktop: corners( '20px' ) },
		mainBorderWidth: sides( '3px' ),
		mainBorderStyle: 'solid',
		mainBorderColour: '#112233',
		mainBoxShadow: '0 4px 12px',
		mainBoxShadowColour: '#000000',
		mainFit: { desktop: 'contain' },
		thumbRadius: { desktop: corners( '10px' ) },
		thumbFit: { desktop: 'contain' },
		thumbBorderWidth: sides( '2px' ),
		thumbBorderColour: '#445566',
	} ),
	block( 'buybox', {
		className: 'ac26-pick',
		buyboxLayout: 'configurator',
		buyboxProductId: pickset,
		previewSource: { desktop: { kind: 'image', id: imageId, url: imageUrl, width: imageMeta.width || 0, height: imageMeta.height || 0 } },
		previewFit: { desktop: 'contain' },
		previewRadius: { desktop: corners( '16px' ) },
		previewBorderWidth: sides( '4px' ),
		previewBorderColour: '#223344',
	} ),
].join( '\n\n' );

const existing = wp( 'post', 'list', '--post_type=page', `--name=${ SLUG }`, '--post_status=any', '--field=ID' ).split( /\s+/ )[ 0 ];
if ( existing ) {
	wslWp( [ 'post', 'update', existing, '-', '--post_status=publish' ], content );
	console.log( `updated page ${ existing } (/${ SLUG }/)` );
} else {
	const id = wslWp( [ 'post', 'create', '-', '--post_type=page', '--post_status=publish', `--post_name=${ SLUG }`, '--post_title=AC-26 product card and buybox', '--porcelain' ], content );
	console.log( `created page ${ id } (/${ SLUG }/)` );
}
