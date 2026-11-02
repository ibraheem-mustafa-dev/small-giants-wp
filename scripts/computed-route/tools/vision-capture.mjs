// Paired full-page captures for a vision review: each surface's draft (served locally from sites/<client>/handoff, the
// surface's own draft file from build/surfaces.json, reached through its walker state step) and the live page, at 375,
// 768 and 1440, written to E:/sgs-tmp/vision/<client>/<surface>-<width>-{draft,live}.png.
//   node scripts/computed-route/tools/vision-capture.mjs <client> <INDUSTEST|MAMASTEST|EYECARECLONETEST> <surface,...>
// Env: SIDES=draft|live (default both); LIVE_LOCAL=1 captures the local mirror instead of the test site; SUFFIX names
// the live files (e.g. -28oct). Scroll entrances are played by a page sweep before each capture.
import fs from 'fs';
import { chromium } from 'playwright';
import { serveDraft } from '../lib/draft.mjs';
const [ client, envKey, list ] = process.argv.slice( 2 );
const INDEX = { 'indus-foods': 'Indus Foods Website v2.dc.html', 'eye-care-ward-end': 'Eye Care Birmingham.dc.html', 'mamas-munches-redesign': null };
const env = fs.readFileSync( `.claude/secrets/${ { INDUSTEST: 'indus-test', MAMASTEST: 'mamas-test', EYECARECLONETEST: 'eye-care-clone-test' }[ envKey ] }.env`, 'utf8' );
const site = new RegExp( `^WP_URL_${ envKey }=(.*)$`, 'm' ).exec( env )[ 1 ].trim().replace( /^['"]|['"]$/g, '' ).replace( /\/$/, '' );
const OUT = `E:/sgs-tmp/vision/${ client }`; fs.mkdirSync( OUT, { recursive: true } );
const b = await chromium.launch();
const servers = {};
for ( const surface of list.split( ',' ) ) {
	const cfg = ( await import( `../../../sites/${ client }/build/qa/parity/${ surface }.fill-base.mjs` ) ).default;
	const manifest = JSON.parse( fs.readFileSync( `sites/${ client }/build/surfaces.json`, 'utf8' ) );
	const index = manifest[ surface ]?.draftIndex ? manifest[ surface ].draftIndex.split( '/' ).pop() : INDEX[ client ];
	servers[ index ] ||= await serveDraft( `sites/${ client }/handoff`, { index: index || ( fs.readdirSync( `sites/${ client }/handoff` ).find( ( f ) => /^Home\.dc\.html$/.test( f ) ) ) } );
	const liveUrl = ( process.env.LIVE_LOCAL ? cfg.live.url : cfg.live.url.replace( /^https?:\/\/localhost:\d+/, site ) ).replace( '{cb}', String( Date.now() ) );
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
				await p.evaluate( async () => { for ( let y = 0; y < document.body.scrollHeight; y += 600 ) { window.scrollTo( 0, y ); await new Promise( ( r ) => setTimeout( r, 120 ) ); } window.scrollTo( 0, 0 ); } );
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
