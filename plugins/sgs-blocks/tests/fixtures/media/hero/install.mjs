/**
 * AC-26 fixture for sgs/hero (Spec 49): installs, idempotently, the published page `hero-media-fixture` on a scratch
 * mirror. It holds three heroes set from settings alone (no custom CSS):
 *   1. a standard hero with a background photo, focal point per device, an overlay and a parallax layer on the
 *      `background` part (speedRatio 0.18, the Eye Care draft's plus or minus 9 percent);
 *   2. a split hero with a photo, a mobile focal point, a radius, a width and a shadow;
 *   3. a split hero with no media settings (the defaults).
 *
 * Usage: node install.mjs [--mirror local-mediatest-pkg-hero]   (runs wp-cli inside WSL as root)
 * Then:  node check.mjs --base http://localhost:8102
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const args = process.argv.slice( 2 );
const mirror = args.includes( '--mirror' ) ? args[ args.indexOf( '--mirror' ) + 1 ] : 'local-mediatest-pkg-hero';
const root = `/var/www/${ mirror }`;

const wp = ( ...cmd ) => {
	const r = spawnSync( 'wsl', [ '-d', 'Ubuntu', '-u', 'root', '--', 'bash', '-c', `cd ${ root } && wp --allow-root ${ cmd.join( ' ' ) } 2>/dev/null` ], { encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1' } } );
	return ( r.stdout || '' ).trim();
};

// Two photos of the mirror's own media library (the first two JPEG or PNG attachments over 1000 px wide).
const rows = wp( 'db', 'query', JSON.stringify( 'SELECT p.ID, m.meta_value FROM wp_posts p JOIN wp_postmeta m ON m.post_id=p.ID AND m.meta_key="_wp_attachment_metadata" WHERE p.post_type="attachment" AND p.post_mime_type IN ("image/jpeg","image/png") ORDER BY p.ID' ), '--skip-column-names' );
const photos = [];
for ( const line of rows.split( '\n' ) ) {
	const [ id, meta ] = line.split( '\t' );
	const w = Number( ( /s:5:"width";i:(\d+);/.exec( meta || '' ) || [] )[ 1 ] );
	const h = Number( ( /s:6:"height";i:(\d+);/.exec( meta || '' ) || [] )[ 1 ] );
	if ( w >= 1000 && h > 0 ) {
		photos.push( { id: Number( id ), width: w, height: h } );
	}
}
if ( photos.length < 1 ) {
	throw new Error( 'the mirror has no photo over 1000 px wide' );
}
const origin = wp( 'option', 'get', 'siteurl' );
const source = ( p ) => ( { kind: 'image', id: p.id, url: wp( 'eval', JSON.stringify( `echo wp_get_attachment_url(${ p.id });` ) ), width: p.width, height: p.height } );
const bg = source( photos[ 0 ] );
const side = source( photos[ photos.length > 1 ? 1 : 0 ] );

const block = ( attrs, inner ) => `<!-- wp:sgs/hero ${ JSON.stringify( attrs ) } -->\n${ inner }\n<!-- /wp:sgs/hero -->`;
const heading = '<!-- wp:sgs/heading {"content":"Fixture heading"} /-->';
const content = [
	block(
		{
			className: 'media-fixture-bg',
			minHeight: { desktop: '520px', tablet: '460px', mobile: '420px' },
			backgroundSource: { desktop: bg },
			backgroundFit: { desktop: 'cover' },
			backgroundFocal: { desktop: { x: 0.5, y: 0.2 }, mobile: { x: 0.5, y: 0.8 } },
			backgroundOverlayColour: '#000000',
			backgroundOverlayOpacity: { desktop: 40 },
			sgsMotion: { v: 1, elements: { background: { effects: [ { id: 'parallax', effect: 'parallax', values: { speedRatio: 0.18, basis: 'view' } } ] } } },
		},
		heading
	),
	block(
		{
			className: 'media-fixture-split',
			variant: 'split',
			splitSource: { desktop: side },
			splitFocal: { desktop: { x: 0.5, y: 0.5 }, mobile: { x: 0.5, y: 0.2 } },
			splitWidth: { desktop: '80%' },
			splitHeight: { desktop: '360px' },
			splitRadius: { desktop: { topLeft: '24px', topRight: '24px', bottomLeft: '24px', bottomRight: '24px' } },
			splitBoxShadow: '0 10px 30px 0',
			splitBoxShadowColour: '#222222',
		},
		heading
	),
	block( { className: 'media-fixture-default', variant: 'split', splitSource: { desktop: side } }, heading ),
].join( '\n\n' );

const file = path.join( os.tmpdir(), 'hero-media-fixture.html' );
fs.writeFileSync( file, content );
const wslFile = '/mnt/' + file[ 0 ].toLowerCase() + file.slice( 2 ).replace( /\\/g, '/' );
const existing = wp( 'post', 'list', '--post_type=page', '--name=hero-media-fixture', '--field=ID', '--post_status=any' );
if ( existing ) {
	wp( 'post', 'update', existing, wslFile );
	console.log( `updated page ${ existing }` );
} else {
	console.log( `created page ${ wp( 'post', 'create', wslFile, '--post_type=page', '--post_status=publish', '--post_title="Hero media fixture"', '--post_name=hero-media-fixture', '--porcelain' ) }` );
}
console.log( `${ origin }/hero-media-fixture/` );
