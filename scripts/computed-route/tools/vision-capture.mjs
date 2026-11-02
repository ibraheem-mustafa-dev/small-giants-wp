// Paired full-page captures for a vision review: each surface's draft (served locally from sites/<client>/handoff, the
// surface's own draft file from build/surfaces.json, reached through its walker state step) and the live page, at 375,
// 768 and 1440, written to E:/sgs-tmp/vision/<client>/<surface>-<width>-{draft,live}.png.
//   node scripts/computed-route/tools/vision-capture.mjs <client> <ENVKEY (the KEY of a WP_URL_<KEY> in a .claude/secrets/*.env)> <surface,...>
// Env: SIDES=draft|live (default both); LIVE_LOCAL=1 captures the local mirror instead of the test site; SUFFIX names
// the live files (e.g. -28oct); LIVE_PATHS overrides a surface's live path. Scroll entrances are played by a page sweep before each capture.
import fs from 'fs';
import { chromium } from 'playwright';
import { serveDraft } from '../lib/draft.mjs';
const [ client, envKey, list ] = process.argv.slice( 2 );
// A surface with no draftIndex in build/surfaces.json opens the client's main draft file: the largest .dc.html in its handoff.
const INDEX = fs.readdirSync( `sites/${ client }/handoff` ).filter( ( f ) => f.endsWith( '.dc.html' ) ).sort( ( a, b ) => fs.statSync( `sites/${ client }/handoff/${ b }` ).size - fs.statSync( `sites/${ client }/handoff/${ a }` ).size )[ 0 ];
// The site is the secrets file that defines WP_URL_<ENVKEY>.
const envFile = fs.readdirSync( '.claude/secrets' ).filter( ( f ) => f.endsWith( '.env' ) ).find( ( f ) => new RegExp( `^WP_URL_${ envKey }=`, 'm' ).test( fs.readFileSync( `.claude/secrets/${ f }`, 'utf8' ) ) );
const env = fs.readFileSync( `.claude/secrets/${ envFile }`, 'utf8' );
// LIVE_PATHS=surface=/path/,surface=/path/ sends a surface's live side to that path on the site (a hand-built site's slugs).
const LIVE_PATHS = Object.fromEntries( ( process.env.LIVE_PATHS || '' ).split( ',' ).filter( Boolean ).map( ( pair ) => pair.split( '=' ) ) );
const site = new RegExp( `^WP_URL_${ envKey }=(.*)$`, 'm' ).exec( env )[ 1 ].trim().replace( /^['"]|['"]$/g, '' ).replace( /\/$/, '' );
const OUT = `E:/sgs-tmp/vision/${ client }`; fs.mkdirSync( OUT, { recursive: true } );
const b = await chromium.launch();
const servers = {};
for ( const surface of list.split( ',' ) ) {
	const cfg = ( await import( `../../../sites/${ client }/build/qa/parity/${ surface }.fill-base.mjs` ) ).default;
	const manifest = JSON.parse( fs.readFileSync( `sites/${ client }/build/surfaces.json`, 'utf8' ) );
	const index = manifest[ surface ]?.draftIndex ? manifest[ surface ].draftIndex.split( '/' ).pop() : INDEX;
	servers[ index ] ||= await serveDraft( `sites/${ client }/handoff`, { index: index || ( fs.readdirSync( `sites/${ client }/handoff` ).find( ( f ) => /^Home\.dc\.html$/.test( f ) ) ) } );
	const liveUrl = ( LIVE_PATHS[ surface ] ? site + LIVE_PATHS[ surface ] : ( process.env.LIVE_LOCAL ? cfg.live.url : cfg.live.url.replace( /^https?:\/\/localhost:\d+/, site ) ) ).replace( '{cb}', String( Date.now() ) );
	for ( const w of [ 375, 768, 1440 ] ) {
		for ( const side of ( process.env.SIDES || 'draft,live' ).split( ',' ) ) {
			const p = await b.newPage( { viewport: { width: w, height: 900 } } );
			try {
				if ( 'draft' === side ) {
					const draftUrl = ( cfg.draft?.url || '' ).replace( /^https?:\/\/127\.0\.0\.1:\d+\//, servers[ index ].url );
					await p.goto( draftUrl.startsWith( 'http' ) ? draftUrl : servers[ index ].url );
					await p.waitForTimeout( 2500 );
					typeof cfg.states?.[ 0 ]?.draft === 'function' && await cfg.states[ 0 ].draft( { page: p, log: [], goto: ( u ) => p.goto( u ), wait: ( ms ) => p.waitForTimeout( ms ) } ).catch( () => {} );
				} else {
					await p.goto( liveUrl, { waitUntil: 'load', timeout: 60000 } );
				}
				await p.waitForTimeout( 2000 );
				// Play every scroll entrance so nothing is captured mid-reveal.
				await p.evaluate( async () => { for ( let y = 0; y < document.body.scrollHeight; y += 200 ) { window.scrollTo( 0, y ); await new Promise( ( r ) => setTimeout( r, 250 ) ); } window.scrollTo( 0, 0 ); } );
				await p.waitForTimeout( 1200 );
				await p.screenshot( { path: `${ OUT }/${ surface }-${ w }-${ side }${ 'live' === side && process.env.SUFFIX ? process.env.SUFFIX : '' }.png`, fullPage: true } );
			} catch ( e ) {
				console.log( `${ surface } ${ w } ${ side }: ${ e.message.slice( 0, 120 ) }` );
			} finally {
				await p.close();
			}
		}
	}
	console.log( `${ surface } done (${ liveUrl })` );
}
await b.close();
for ( const s of Object.values( servers ) ) await s.close();
