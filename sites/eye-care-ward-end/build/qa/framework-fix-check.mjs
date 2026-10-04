// Live check of the framework fixes S3 (link hovers), S4 (WhatsApp buttons), S5 (accordion) and S11 (gaps).
// Usage: SGS_HEADED=1 node sites/eye-care-ward-end/build/qa/framework-fix-check.mjs
// One browser, 375 / 768 / 1440, one page at a time. Prints `PASS|FAIL|INFO <check> <width> <detail>`; exit 1 on any FAIL.
// Expected values are read from the page trees in sites/eye-care-ward-end/build/*.tree.json (never hardcoded here).
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = 'C:/Users/Bean/Projects/small-giants-wp';
const { chromium } = await import( pathToFileURL( `${ ROOT }/plugins/sgs-blocks/node_modules/playwright/index.mjs` ).href );
const { waitOutHostCheck } = await import( pathToFileURL( `${ ROOT }/scripts/parity/lib/helpers.mjs` ).href );

const BASE = 'https://darkcyan-grouse-898606.hostingersite.com';
const WIDTHS = [ 375, 768, 1440 ];
const BUILD = `${ ROOT }/sites/eye-care-ward-end/build`;
let failed = false;
const out = ( ok, check, w, detail ) => {
	if ( 'FAIL' === ok ) {
		failed = true;
	}
	console.log( `${ ok } ${ check } ${ w } ${ detail }` );
};
// ---- tree helpers ----
const nodes = ( file ) => {
	const found = [];
	const walk = ( n ) => {
		if ( Array.isArray( n ) ) {
			n.forEach( walk );
		} else if ( n && 'object' === typeof n ) {
			if ( n.name && n.attributes ) {
				found.push( n );
			}
			Object.values( n ).forEach( walk );
		}
	};
	walk( JSON.parse( readFileSync( `${ BUILD }/${ file }.tree.json`, 'utf8' ) ) );
	return found;
};
const byClass = ( file, name ) => nodes( file ).filter( ( n ) => n.name === name );
const tier = ( v, w ) => ( v && 'object' === typeof v ? ( 375 === w ? v.mobile ?? v.tablet ?? v.desktop : 768 === w ? v.tablet ?? v.desktop : v.desktop ) : v );
// ---- page helpers ----
// Marks one element (the root matched by `root`, or `inner` inside it) with data-fc and says whether it is visible.
const tag = ( page, root, inner ) => page.evaluate( ( [ r, i ] ) => {
	document.querySelectorAll( '[data-fc]' ).forEach( ( e ) => e.removeAttribute( 'data-fc' ) );
	const base = document.querySelector( r );
	if ( ! base ) {
		return 'missing';
	}
	const el = i ? ( base.matches( i ) ? base : base.querySelector( i ) ) : base;
	if ( ! el ) {
		return 'missing';
	}
	el.setAttribute( 'data-fc', '1' );
	return el.getClientRects().length && 'hidden' !== getComputedStyle( el ).visibility ? 'ok' : 'hidden';
}, [ root, inner ] );
const FC = '[data-fc="1"]';
// Resolves a tree value (preset slug, hex, length) to the browser's computed value by probing a throwaway element.
const resolve = ( page, prop, value, preset ) => page.evaluate( ( [ p, v, pre ] ) => {
	const probe = document.createElement( 'div' );
	probe.style.cssText = 'position:absolute;visibility:hidden;display:flex;';
	probe.style.setProperty( p, /^[a-z][a-z0-9-]*$/i.test( String( v ) ) || /^\d+$/.test( String( v ) ) ? `var(--wp--preset--${ pre }--${ v })` : String( v ) );
	document.body.appendChild( probe );
	const r = getComputedStyle( probe ).getPropertyValue( p );
	probe.remove();
	return r;
}, [ prop, value, preset ] );
const css = ( page, props, pseudo ) => page.evaluate( ( [ sel, ps, pe ] ) => {
	const cs = getComputedStyle( document.querySelector( sel ), pe || null );
	return Object.fromEntries( ps.map( ( p ) => [ p, cs[ p ] ] ) );
}, [ FC, props, pseudo ] );
const hoverOn = async ( page ) => {
	await page.locator( FC ).scrollIntoViewIfNeeded();
	await page.hover( FC );
	await page.waitForTimeout( 400 );
};
const away = async ( page ) => {
	await page.mouse.move( 2, 2 );
	await page.waitForTimeout( 400 );
};

// ---- S5 accordion (/help/) ----
async function accordion( page, w ) {
	const attrs = byClass( 'help', 'sgs/accordion' )[ 0 ].attributes;
	const item = `.${ byClass( 'help', 'sgs/accordion-item' )[ 1 ].attributes.className }`; // second item: the first starts open
	const state = await tag( page, item, '.sgs-accordion-item__header' );
	if ( 'ok' !== state ) {
		return out( 'FAIL', 'S5-accordion', w, `header ${ state }` );
	}
	const size = tier( attrs.fontSize, w );
	const title = await page.evaluate( ( s ) => getComputedStyle( document.querySelector( `${ s } .sgs-accordion-item__title` ) ).fontSize, item );
	if ( undefined === size ) {
		out( 'INFO', 'S5a-header-font-size', w, `tree sets none; measured ${ title }` );
	} else {
		const want = `${ size }${ attrs.fontSizeUnit || 'px' }`;
		out( title === want ? 'PASS' : 'FAIL', 'S5a-header-font-size', w, `measured ${ title }, tree ${ want }` );
	}
	const ground = async () => {
		const a = await css( page, [ 'backgroundColor', 'backgroundImage' ] );
		const b = await css( page, [ 'backgroundColor' ], '::after' );
		return `${ a.backgroundColor }|${ a.backgroundImage }|after:${ b.backgroundColor }`;
	};
	await away( page );
	const rest = await ground();
	const iconBefore = await page.evaluate( ( s ) => getComputedStyle( document.querySelector( `${ s } .sgs-accordion-item__icon-open` ) ).transform, item );
	await hoverOn( page );
	const hov = await ground();
	await page.click( FC );
	await page.waitForTimeout( 60 );
	const anims = await page.evaluate( ( s ) => {
		const el = document.querySelector( s );
		return el.getAnimations( { subtree: true } ).filter( ( a ) => 'running' === a.playState || 'pending' === a.playState ).map( ( a ) => {
			const props = a.transitionProperty ? [ a.transitionProperty ] : Object.keys( a.effect?.getKeyframes?.()[ 0 ] || {} );
			return { target: a.effect?.target?.className?.toString().split( ' ' )[ 0 ] || a.effect?.target?.tagName, pseudo: a.effect?.pseudoElement || '', props: props.join( '+' ), name: a.animationName || '' };
		} );
	}, item );
	const heightish = anims.filter( ( a ) => /height|block-size|grid-template-rows|^open$/.test( a.props ) );
	out( heightish.length <= 1 ? 'PASS' : 'FAIL', 'S5c-one-animation', w, `${ heightish.length } height/open animation(s); all running: ${ JSON.stringify( anims ) }` );
	await page.waitForTimeout( 700 );
	await away( page );
	const open = await ground();
	out( rest === hov && rest === open ? 'PASS' : 'FAIL', 'S5b-no-ground', w, `rest ${ rest } | hover ${ hov } | open ${ open }` );
	const iconAfter = await page.evaluate( ( s ) => getComputedStyle( document.querySelector( `${ s } .sgs-accordion-item__icon-open` ) ).transform, item );
	if ( attrs.iconRotation ) {
		out( iconBefore !== iconAfter ? 'PASS' : 'FAIL', 'S5d-icon-rotation', w, `rest ${ iconBefore }, open ${ iconAfter }, tree ${ attrs.iconRotation }deg` );
	} else {
		out( 'INFO', 'S5d-icon-rotation', w, `tree sets no iconRotation; rest ${ iconBefore }, open ${ iconAfter }` );
	}
	await page.click( FC ); // close it again
	await page.waitForTimeout( 700 );
}
// ---- S11 gaps ----
async function gaps( page, w, files ) {
	for ( const file of files ) {
		for ( const n of [ ...byClass( file, 'sgs/icon-list' ), ...byClass( file, 'sgs/social-icons' ) ] ) {
			const raw = tier( n.attributes.gap, w );
			if ( undefined === raw || ! n.attributes.className ) {
				continue;
			}
			const label = `S11-gap-${ n.name.slice( 4 ) }-${ n.attributes.className }`;
			if ( 'missing' === await tag( page, `.${ n.attributes.className }`, null ) ) {
				out( 'FAIL', label, w, 'instance not on the page' );
				continue;
			}
			const want = await resolve( page, 'row-gap', raw, 'spacing' );
			const got = await page.evaluate( () => {
				const root = document.querySelector( '[data-fc]' );
				const el = [ root, ...root.querySelectorAll( '*' ) ].find( ( e ) => /flex|grid/.test( getComputedStyle( e ).display ) && e.children.length > 1 );
				const cs = getComputedStyle( el || root );
				return { row: cs.rowGap, col: cs.columnGap, layout: el ? `${ el.tagName }.${ String( el.className ).split( ' ' )[ 0 ] }` : 'none' };
			} );
			out( got.row === want || got.col === want ? 'PASS' : 'FAIL', label, w, `tree ${ raw } = ${ want }; ${ got.layout } row-gap ${ got.row}, column-gap ${ got.col }` );
		}
	}
}
// ---- S3 business-info link hovers ----
async function links( page, w, targets ) {
	for ( const t of targets ) {
		const check = `S3-${ t.label }`;
		const state = await tag( page, t.root, '.sgs-business-info__link' );
		if ( 'ok' !== state ) {
			out( 'missing' === state ? 'FAIL' : 'INFO', check, w, `link ${ state } at this width` );
			continue;
		}
		await away( page );
		const props = [ 'opacity', 'color' ];
		const rest = await css( page, props );
		await hoverOn( page );
		const hov = await css( page, props );
		const wantHover = t.hover ? await resolve( page, 'color', t.hover, 'color' ) : null;
		const noFade = '1' === rest.opacity && '1' === hov.opacity;
		const colourOk = ! wantHover || hov.color === wantHover;
		out( noFade && colourOk ? 'PASS' : 'FAIL', check, w, `opacity ${ rest.opacity } -> ${ hov.opacity }; colour ${ rest.color } -> ${ hov.color }; tree hover ${ t.hover || 'none set' }${ wantHover ? ` = ${ wantHover }` : '' }` );
		await away( page );
	}
}
// ---- S4 WhatsApp buttons ----
const scaleOf = ( t ) => {
	if ( ! t || 'none' === t ) {
		return { a: 1, d: 1, tx: 0, ty: 0 };
	}
	const v = t.match( /matrix(3d)?\(([^)]+)\)/ )[ 2 ].split( ',' ).map( Number );
	return v.length === 6 ? { a: v[ 0 ], d: v[ 3 ], tx: v[ 4 ], ty: v[ 5 ] } : { a: v[ 0 ], d: v[ 5 ], tx: v[ 12 ], ty: v[ 13 ] };
};
const shadowExtent = ( s ) => ( 'none' === s ? 0 : ( s.replace( /rgba?\([^)]*\)/g, '' ).match( /-?[\d.]+px/g ) || [] ).reduce( ( x, p ) => x + Math.abs( parseFloat( p ) ), 0 ) );
async function whatsapp( page, w, file ) {
	for ( const n of byClass( file, 'sgs/whatsapp-cta' ).filter( ( x ) => x.attributes.className ) ) {
		const label = `S4-${ n.attributes.className }`;
		if ( 'ok' !== await tag( page, `.${ n.attributes.className }`, '.sgs-whatsapp-cta__btn' ) ) {
			out( 'FAIL', label, w, 'button not found or hidden' );
			continue;
		}
		const paint = await page.evaluate( () => {
			const b = document.querySelector( '[data-fc]' );
			const svg = b.querySelector( 'svg' );
			const shape = svg?.querySelector( 'path,circle,rect,polygon' );
			return { label: getComputedStyle( b.querySelector( '.sgs-whatsapp-cta__label' ) ).color, svgFill: svg && getComputedStyle( svg ).fill, svgColor: svg && getComputedStyle( svg ).color, shapeFill: shape && getComputedStyle( shape ).fill };
		} );
		out( paint.shapeFill === paint.label || ( paint.svgFill === paint.label && ! paint.shapeFill ) ? 'PASS' : 'FAIL', `${ label }-icon-colour`, w, `label ${ paint.label }; svg fill ${ paint.svgFill }, svg color ${ paint.svgColor }, shape fill ${ paint.shapeFill }` );
		await away( page );
		const rest = await css( page, [ 'transform', 'scale', 'boxShadow' ] );
		await hoverOn( page );
		const hov = await css( page, [ 'transform', 'scale', 'boxShadow' ] );
		const s = scaleOf( hov.transform );
		const noScale = Math.abs( s.a - 1 ) < 0.001 && Math.abs( s.d - 1 ) < 0.001 && ( 'none' === hov.scale || '1' === hov.scale );
		const shadowOk = shadowExtent( hov.boxShadow ) <= shadowExtent( rest.boxShadow ) + 0.5;
		out( noScale && shadowOk ? 'PASS' : 'FAIL', `${ label }-hover`, w, `scale ${ s.a }/${ s.d } (scale prop ${ hov.scale }); translate ${ s.tx },${ s.ty } (S1 lift, allowed); shadow ${ rest.boxShadow } -> ${ hov.boxShadow }` );
		await away( page );
	}
}
const headerPhone = byClass( 'header', 'sgs/business-info' ).find( ( n ) => 'phone' === n.attributes.displayType )?.attributes || {};
const footerPhone = byClass( 'footer', 'sgs/business-info' ).find( ( n ) => 'phone' === n.attributes.displayType )?.attributes || {};
const PAGES = {
	'/help/': ( p, w ) => accordion( p, w ),
	'/': async ( p, w ) => {
		await gaps( p, w, [ 'home', 'footer' ] );
		await links( p, w, [
			{ label: 'header-phone', root: 'header .sgs-business-phone', hover: headerPhone.textColourHover },
			{ label: 'footer-phone', root: `.${ footerPhone.className }`, hover: footerPhone.textColourHover },
		] );
	},
	'/about/': async ( p, w ) => {
		await gaps( p, w, [ 'about' ] );
		await whatsapp( p, w, 'about' );
	},
	'/contact/': async ( p, w ) => {
		await gaps( p, w, [ 'contact' ] );
		const bi = byClass( 'contact', 'sgs/business-info' );
		const pick = ( type ) => bi.find( ( n ) => type === n.attributes.displayType ).attributes;
		await links( p, w, [ 'phone', 'email' ].map( ( t ) => ( { label: `contact-${ t }`, root: `.${ pick( t ).className }`, hover: pick( t ).textColourHover } ) ) );
		await whatsapp( p, w, 'contact' );
	},
	'/prescription-lenses/': ( p, w ) => gaps( p, w, [ 'lenses' ] ),
};

const browser = await chromium.launch( { headless: ! process.env.SGS_HEADED } );
const page = await ( await browser.newContext() ).newPage();
for ( const w of WIDTHS ) {
	await page.setViewportSize( { width: w, height: 900 } );
	for ( const [ path, run ] of Object.entries( PAGES ) ) {
		try {
			await page.goto( BASE + path, { waitUntil: 'domcontentloaded' } );
			await waitOutHostCheck( page );
			await run( page, w );
		} catch ( e ) {
			out( 'FAIL', `page${ path }`, w, `error: ${ String( e.message ).split( '\n' )[ 0 ] }` );
		}
	}
}
await browser.close();
process.exit( failed ? 1 : 0 );
