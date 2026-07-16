#!/usr/bin/env node
/**
 * Prove-the-cause probe: on the minimal contentWidth:800 repro, find the
 * sgs-container OUTER element and enumerate EXACTLY which CSS rule caps its
 * width — plus the __inner width. Live DOM, matched-rule enumeration (never
 * static parsing). Settles whether contentWidth is capping the outer.
 */
const { chromium } = require( 'playwright' );

( async () => {
	const url = process.argv[ 2 ] || 'https://sandybrown-nightingale-600381.hostingersite.com/tc-cw-probe/';
	const anchor = process.argv[ 3 ] || 'CONTENTWIDTH-800-PROBE';
	const browser = await chromium.launch();
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	await page.goto( url, { waitUntil: 'networkidle' } );
	const out = await page.evaluate( ( a ) => {
		const probe = Array.from( document.querySelectorAll( 'p, h1, h2, h3, summary' ) )
			.find( ( n ) => ( n.innerText || '' ).includes( a ) );
		if ( ! probe ) return 'probe text NOT FOUND';
		// OUTER = nearest ancestor with wp-block-sgs-container (NOT __inner).
		let outer = probe.closest( '.wp-block-sgs-container' );
		const inner = probe.closest( '.sgs-container__inner' );
		const rect = ( el ) => el ? Math.round( el.getBoundingClientRect().width ) : null;
		const cs = ( el ) => el ? getComputedStyle( el ) : null;

		// Enumerate every matched rule that sets max-width or width on the outer.
		const matched = [];
		if ( outer ) {
			for ( const sheet of document.styleSheets ) {
				let rules;
				try { rules = sheet.cssRules; } catch ( e ) { continue; }
				for ( const rule of rules ) {
					if ( ! rule.selectorText ) continue;
					let hit = false;
					try { hit = outer.matches( rule.selectorText ); } catch ( e ) { continue; }
					if ( hit && /max-width|(?:^|[^-])width\s*:/.test( rule.cssText ) ) {
						matched.push( rule.selectorText + ' { ' +
							( rule.style.maxWidth ? 'max-width:' + rule.style.maxWidth + '; ' : '' ) +
							( rule.style.width ? 'width:' + rule.style.width + ';' : '' ) + '}' );
					}
				}
			}
		}
		return {
			outer: {
				tag: outer && outer.tagName.toLowerCase(),
				classes: outer && outer.className,
				width: rect( outer ),
				maxWidth: cs( outer ) && cs( outer ).maxWidth,
				marginInline: cs( outer ) && ( cs( outer ).marginLeft + '/' + cs( outer ).marginRight ),
			},
			inner: {
				width: rect( inner ),
				maxWidth: cs( inner ) && cs( inner ).maxWidth,
			},
			matchedWidthRulesOnOuter: matched,
		};
	}, anchor );
	console.log( JSON.stringify( out, null, 1 ) );
	await browser.close();
} )();
