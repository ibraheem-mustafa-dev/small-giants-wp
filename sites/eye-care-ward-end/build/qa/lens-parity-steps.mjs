// Walk draft and live lens flows through every question at one width:
// screenshots per step, stage/header text, and computed motion values.
// Usage: node lens-steps.mjs <outDir> <width>
import { chromium } from 'file:///C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/node_modules/playwright/index.mjs';
import fs from 'fs';

const OUT = process.argv[ 2 ] || 'steps';
const W = Number( process.argv[ 3 ] || 1440 );
fs.mkdirSync( OUT, { recursive: true } );
const DRAFT = 'https://mintcream-lyrebird-224487.hostingersite.com/';
const LIVE = 'https://darkcyan-grouse-898606.hostingersite.com/product/gucci-oversized-cat-eye/?nc=' + Date.now();

async function clickText( page, src ) {
	await page.evaluate( ( src ) => {
		const re = new RegExp( src, 'i' );
		const els = [ ...document.querySelectorAll( 'a,button,[role=button],div,span,h3' ) ].filter( ( e ) => re.test( ( e.textContent || '' ).trim() ) && e.offsetParent !== null );
		els.sort( ( a, b ) => a.textContent.length - b.textContent.length );
		els[ 0 ] && els[ 0 ].click();
	}, src );
	await page.waitForTimeout( 900 );
}

const ROOT = { draft: '[aria-label="Add prescription lenses"]', live: 'dialog[open] .sgs-choice-flow' };

// Motion + text snapshot, run in page.
const snapshot = ( [ which, root ] ) => {
	const r = document.querySelector( root );
	const cs = ( e ) => ( e ? getComputedStyle( e ) : null );
	const t = ( e ) => ( e ? { transition: cs( e ).transition.slice( 0, 160 ), animation: `${ cs( e ).animationName } ${ cs( e ).animationDuration } ${ cs( e ).animationTimingFunction }` } : null );
	const vis = ( e ) => e && e.offsetParent !== null;
	let card, fill, close, help, total, stageImg, header, stepWrap;
	if ( which === 'draft' ) {
		card = [ ...r.querySelectorAll( 'button' ) ].find( ( b ) => vis( b ) && b.querySelector( 'span span' ) && /£|included/.test( b.textContent ) );
		fill = r.children[ 1 ]?.firstElementChild;
		close = [ ...r.querySelectorAll( 'button' ) ].find( ( b ) => /^close/i.test( b.textContent.trim() ) );
		help = [ ...r.querySelectorAll( 'button' ) ].find( ( b ) => vis( b ) && b.textContent.trim() === '?' );
		total = [ ...r.querySelectorAll( 'aside span' ) ].find( ( s ) => /^£/.test( s.textContent.trim() ) && parseFloat( getComputedStyle( s ).fontSize ) > 20 );
		stageImg = r.querySelector( 'aside [role=img]' );
		header = r.firstElementChild.querySelector( 'span' );
		stepWrap = [ ...r.querySelectorAll( 'div[style*="rise"]' ) ][ 0 ];
	} else {
		card = [ ...r.querySelectorAll( '.sgs-choice-flow-question__option-button' ) ].find( vis );
		fill = r.querySelector( '.sgs-choice-flow__progress-fill' );
		close = r.querySelector( '.sgs-choice-flow__chrome-close' );
		help = [ ...r.querySelectorAll( '.sgs-info-toggle' ) ].find( vis );
		total = r.querySelector( '.sgs-choice-flow__summary-total-value' );
		if ( ! vis( total ) ) total = r.querySelector( '.sgs-choice-flow__summary-summary-total-value' );
		stageImg = r.querySelector( '.sgs-choice-flow__summary-body .sgs-choice-flow__summary-image' );
		header = r.querySelector( '.sgs-choice-flow__chrome-eyebrow' );
		stepWrap = [ ...r.querySelectorAll( '.sgs-form-step' ) ].find( ( s ) => ! s.hidden );
	}
	const stage = which === 'draft' ? r.querySelector( 'aside' ) : r.querySelector( '.sgs-choice-flow__summary' );
	return {
		header: header?.textContent.trim(),
		eyebrow: ( which === 'draft' ? [ ...r.querySelectorAll( 'p' ) ].find( ( p ) => vis( p ) && /question|last bit/i.test( p.textContent ) ) : r.querySelector( '.sgs-choice-flow__step-count' ) )?.textContent.trim(),
		progress: fill ? Math.round( fill.getBoundingClientRect().width ) : null,
		stage: stage?.innerText.replace( /\n+/g, ' | ' ).slice( 0, 300 ),
		motion: { card: t( card ), fill: t( fill ), close: t( close ), help: t( help ), total: t( total ), step: t( stepWrap ), stageImg: stageImg ? { filter: cs( stageImg ).filter, transition: cs( stageImg ).transition.slice( 0, 90 ) } : null },
	};
};

async function openFlow( page, which ) {
	if ( which === 'draft' ) {
		await page.goto( DRAFT, { waitUntil: 'networkidle' } );
		await page.waitForTimeout( 600 );
		await clickText( page, '^sunglasses$' );
		await clickText( page, '^oversized cat-eye$' );
		await clickText( page, '^add my prescription' );
		await page.waitForSelector( ROOT.draft );
	} else {
		await page.goto( LIVE, { waitUntil: 'networkidle' } );
		await page.waitForTimeout( 500 );
		await page.evaluate( () => [ ...document.querySelectorAll( 'a,button' ) ].find( ( e ) => /add my prescription/i.test( e.textContent ) && e.offsetParent )?.click() );
		await page.waitForSelector( ROOT.live );
	}
	await page.waitForTimeout( 900 );
}

async function choose( page, which, label ) {
	await page.evaluate( ( [ which, root, label ] ) => {
		const r = document.querySelector( root );
		const sel = which === 'draft' ? 'button' : '.sgs-choice-flow-question__option-button';
		const b = [ ...r.querySelectorAll( sel ) ].find( ( e ) => e.offsetParent !== null && e.textContent.trim().toLowerCase().startsWith( label.toLowerCase() ) );
		b && b.click();
	}, [ which, ROOT[ which ], label ] );
	await page.waitForTimeout( 150 );
	if ( which === 'live' ) {
		await page.evaluate( ( root ) => document.querySelector( root + ' .sgs-choice-flow__continue' )?.click(), ROOT.live );
	}
	// Total animation right after the change.
	await page.waitForTimeout( 60 );
	const mid = await page.evaluate( snapshot, [ which, ROOT[ which ] ] );
	await page.waitForTimeout( 900 );
	return mid.motion.total;
}

const b = await chromium.launch();
const report = {};
for ( const which of [ 'draft', 'live' ] ) {
	const page = await b.newPage( { viewport: { width: W, height: W < 500 ? 812 : 900 } } );
	await openFlow( page, which );
	const steps = [];
	steps.push( { step: 'q1', ...( await page.evaluate( snapshot, [ which, ROOT[ which ] ] ) ) } );
	// Hover end state of the first card.
	const cardBox = await page.evaluate( ( [ which, root ] ) => {
		const r = document.querySelector( root );
		const sel = which === 'draft' ? 'button' : '.sgs-choice-flow-question__option-button';
		const c = [ ...r.querySelectorAll( sel ) ].find( ( e ) => e.offsetParent !== null && /^distance/i.test( e.textContent.trim() ) );
		const bb = c.getBoundingClientRect();
		return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
	}, [ which, ROOT[ which ] ] );
	await page.mouse.move( cardBox.x, cardBox.y );
	await page.waitForTimeout( 600 );
	steps[ 0 ].hover = await page.evaluate( ( [ which, root, p ] ) => {
		const e = document.elementFromPoint( p.x, p.y ).closest( 'button' );
		const s = getComputedStyle( e );
		return { transform: s.transform, shadow: s.boxShadow, border: s.borderTopColor };
	}, [ which, ROOT[ which ], cardBox ] );
	await page.mouse.move( 5, 5 );
	await page.screenshot( { path: `${ OUT }/${ which }-${ W }-q1.png` } );
	let pop = await choose( page, which, 'Distance' );
	steps.push( { step: 'q2', popOnChange: pop, ...( await page.evaluate( snapshot, [ which, ROOT[ which ] ] ) ) } );
	await page.screenshot( { path: `${ OUT }/${ which }-${ W }-q2.png` } );
	pop = await choose( page, which, 'Thin' );
	steps.push( { step: 'q3', popOnChange: pop, ...( await page.evaluate( snapshot, [ which, ROOT[ which ] ] ) ) } );
	await page.screenshot( { path: `${ OUT }/${ which }-${ W }-q3.png` } );
	pop = await choose( page, which, 'Polarised' );
	steps.push( { step: 'q4', popOnChange: pop, ...( await page.evaluate( snapshot, [ which, ROOT[ which ] ] ) ) } );
	await page.screenshot( { path: `${ OUT }/${ which }-${ W }-q4.png` } );
	report[ which ] = steps;
	await page.close();
}
await b.close();
fs.writeFileSync( `${ OUT }/steps-${ W }.json`, JSON.stringify( report, null, 1 ) );
for ( const i of [ 0, 1, 2, 3 ] ) {
	console.log( `--- step ${ i + 1 }` );
	for ( const which of [ 'draft', 'live' ] ) {
		const s = report[ which ][ i ];
		console.log( which.padEnd( 5 ), JSON.stringify( { header: s.header, eyebrow: s.eyebrow, progress: s.progress, pop: s.popOnChange?.animation, stage: s.stage } ) );
	}
}
console.log( '--- motion q1' );
for ( const which of [ 'draft', 'live' ] ) console.log( which, JSON.stringify( report[ which ][ 0 ].motion ), JSON.stringify( report[ which ][ 0 ].hover ) );
console.log( '--- stage image q4' );
for ( const which of [ 'draft', 'live' ] ) console.log( which, JSON.stringify( report[ which ][ 3 ].motion.stageImg ) );
