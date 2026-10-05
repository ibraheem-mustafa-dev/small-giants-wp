import { pathToFileURL } from 'url';
const { chromium } = await import( pathToFileURL( 'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/node_modules/playwright/index.mjs' ).href );
const LIVE = 'https://darkcyan-grouse-898606.hostingersite.com/?cb=' + Date.now();
const b = await chromium.launch( { headless: false, args: [ '--hide-scrollbars' ] } );
const p = await b.newPage( { viewport: { width: 1440, height: 900 } } );
await p.goto( LIVE, { waitUntil: 'networkidle' } ).catch( () => {} );
await p.waitForTimeout( 1500 );
const hdr = () => p.evaluate( () => { const h = document.querySelector( '.sgs-site-header' ) || document.querySelector( 'header' ); const r = h.getBoundingClientRect(); return { top: Math.round( r.top ), pos: getComputedStyle( h.closest( '[class*=sticky], header' ) || h ).position, scrolledClass: document.documentElement.className.match( /is-header-scrolled/ ) ? true : !! document.querySelector( '.is-header-scrolled' ) }; } );
const rest = await hdr();
await p.mouse.wheel( 0, 1600 ); await p.waitForTimeout( 1200 );
const scrolled = await hdr();
console.log( 'CR2 sticky header 1440: rest', JSON.stringify( rest ), '| after 1600px scroll', JSON.stringify( scrolled ) );
await p.setViewportSize( { width: 375, height: 800 } );
await p.goto( LIVE, { waitUntil: 'networkidle' } ).catch( () => {} );
await p.waitForTimeout( 1500 );
await p.locator( 'header button[aria-label="Menu"]' ).first().click();
const samples = [];
for ( const t of [ 60, 200, 400, 800 ] ) {
	await p.waitForTimeout( t - ( samples.at( -1 )?.t || 0 ) );
	samples.push( { t, ops: await p.evaluate( () => [ ...document.querySelectorAll( '.sgs-nav-drawer[open] a' ) ].slice( 0, 5 ).map( ( a ) => +getComputedStyle( a ).opacity.slice( 0, 4 ) ) ) } );
}
console.log( '14 drawer stagger 375 (opacity of first 5 links over time):', JSON.stringify( samples ) );
await b.close();
