#!/usr/bin/env node
/**
 * Verify the product-card colour-swatch buttons on a live site.
 *
 * Register items 59 and 61: a card's colour dots are real buttons that change
 * only their own card's photo, and the card link then opens the product with
 * that colour chosen.
 *
 * Run (from the repo root, after a deploy):
 *   node scripts/verify-card-swatch-buttons.mjs --url https://<host>/shop/
 *   node scripts/verify-card-swatch-buttons.mjs --url <listing-url> --headed
 *
 * Playwright resolves from plugins/sgs-blocks/node_modules.
 *
 * Every check prints PASS or FAIL with the reading it took, plus the reading
 * that would have turned it red. Exit code 1 if any check fails.
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname( fileURLToPath( import.meta.url ) );
const require = createRequire(
	path.join( here, '..', 'plugins', 'sgs-blocks', 'package.json' )
);
const { chromium } = require( 'playwright' );

const args = process.argv.slice( 2 );
const urlArg = args[ args.indexOf( '--url' ) + 1 ];
const headed = args.includes( '--headed' );
if ( ! urlArg || urlArg.startsWith( '--' ) ) {
	console.error( 'Usage: node scripts/verify-card-swatch-buttons.mjs --url <listing-url> [--headed]' );
	process.exit( 2 );
}

const WIDTHS = [ 1440, 768, 375 ];
let failures = 0;

/**
 * Record one check.
 *
 * @param {boolean} ok      Whether the check passed.
 * @param {string}  name    Check name.
 * @param {string}  reading What was actually measured.
 * @param {string}  red     The reading that would have failed it.
 */
function check( ok, name, reading, red ) {
	if ( ! ok ) {
		failures++;
	}
	console.log( `  ${ ok ? 'PASS' : 'FAIL' }  ${ name }` );
	console.log( `        reading: ${ reading }` );
	if ( ! ok ) {
		console.log( `        RED because: ${ red }` );
	}
}

const browser = await chromium.launch( { headless: ! headed, channel: 'chrome' } );
const page = await browser.newPage();

for ( const width of WIDTHS ) {
	console.log( `\n================ ${ width }px ================` );
	await page.setViewportSize( { width, height: 900 } );
	await page.goto( urlArg, { waitUntil: 'networkidle' } );

	/* ── 1. The swatch rendered as a button at all ───────────────────────── */
	const counts = await page.evaluate( () => ( {
		buttons: document.querySelectorAll( '.sgs-product-card__swatch--button' ).length,
		spans: document.querySelectorAll( 'span.sgs-product-card__swatch' ).length,
		cards: document.querySelectorAll( '.wp-block-sgs-product-card' ).length,
	} ) );
	check(
		counts.buttons > 0,
		'swatches render as <button>',
		`${ counts.buttons } button swatches, ${ counts.spans } span swatches, ${ counts.cards } cards`,
		'0 button swatches — the dots are still decorative spans (live-fill found no _sgsSwatchTaxonomy, or the deploy did not land)'
	);
	if ( counts.buttons === 0 ) {
		console.log( '        (remaining checks skipped at this width)' );
		continue;
	}

	/* ── 2. Hit box >= 24x24 with the visible dot still 16/17px ──────────── */
	const geom = await page.evaluate( () => {
		const btn = document.querySelector( '.sgs-product-card__swatch--button' );
		const dot = btn.getBoundingClientRect();
		const cs = getComputedStyle( btn );
		const after = getComputedStyle( btn, '::after' );
		// The ::after inset is the widener; resolve it to a pixel number.
		const inset = parseFloat( after.insetBlockStart || after.top || '0' );
		return {
			dotW: Math.round( dot.width * 10 ) / 10,
			dotH: Math.round( dot.height * 10 ) / 10,
			insetPx: inset,
			position: cs.position,
			afterContent: after.content,
			frame: btn.closest( '.is-style-frame-card' ) ? 'frame-card' : 'classic',
		};
	} );
	const hitW = geom.dotW + Math.abs( geom.insetPx ) * 2;
	const hitH = geom.dotH + Math.abs( geom.insetPx ) * 2;
	const expectDot = geom.frame === 'frame-card' ? 17 : 16;
	check(
		Math.abs( geom.dotW - expectDot ) <= 1 && Math.abs( geom.dotH - expectDot ) <= 1,
		`visible dot still ${ expectDot }px (${ geom.frame })`,
		`${ geom.dotW } x ${ geom.dotH }px`,
		`a dot bigger or smaller than ${ expectDot }px (+/-1) — the hit area was grown by resizing the dot instead of by invisible padding`
	);
	check(
		hitW >= 24 && hitH >= 24 && geom.position === 'relative' && geom.afterContent !== 'none',
		'hit box >= 24 x 24',
		`${ hitW } x ${ hitH }px (::after inset ${ geom.insetPx }px, position ${ geom.position }, ::after content ${ geom.afterContent })`,
		'a hit box under 24px in either axis, position != relative (the ::after would not anchor), or ::after content "none" (the widener is not painting)'
	);

	/* ── 3. The hit area is actually hit-testable at its outer edge ──────── */
	const edgeHit = await page.evaluate( () => {
		const btn = document.querySelector( '.sgs-product-card__swatch--button' );
		const r = btn.getBoundingClientRect();
		// 2px outside the visible dot, inside the widened box.
		const el = document.elementFromPoint( r.left - 2, r.top + r.height / 2 );
		return {
			tag: el ? el.tagName.toLowerCase() : 'none',
			isSwatch: !! ( el && el.classList.contains( 'sgs-product-card__swatch--button' ) ),
		};
	} );
	check(
		edgeHit.isSwatch,
		'a point 2px outside the dot still hits the swatch',
		`elementFromPoint returned <${ edgeHit.tag }>, is the swatch: ${ edgeHit.isSwatch }`,
		'elementFromPoint returning anything other than the swatch button — the ::after is not hit-testable, so the 24px box is cosmetic only'
	);

	/* ── 4. Keyboard focus with a visible ring ───────────────────────────── */
	const focus = await page.evaluate( async () => {
		const btn = document.querySelector( '.sgs-product-card__swatch--button' );
		btn.focus();
		const cs = getComputedStyle( btn );
		return {
			isFocused: document.activeElement === btn,
			tabIndex: btn.tabIndex,
			outlineWidth: cs.outlineWidth,
			outlineStyle: cs.outlineStyle,
			outlineColour: cs.outlineColor,
			name: btn.getAttribute( 'aria-label' ),
			role: btn.getAttribute( 'role' ),
			pressed: btn.getAttribute( 'aria-pressed' ),
		};
	} );
	check(
		focus.isFocused && focus.tabIndex >= 0,
		'swatch is focusable',
		`activeElement is the swatch: ${ focus.isFocused }, tabIndex ${ focus.tabIndex }`,
		'the swatch not receiving focus, or a negative tabIndex — it is out of the tab order'
	);
	check(
		!! focus.name && focus.name.trim() !== '' && focus.role !== 'img',
		'accessible name is the colour name, and role="img" is gone',
		`aria-label "${ focus.name }", role ${ focus.role }`,
		'an empty aria-label (an unnamed button) or role="img" still present on the button'
	);
	check(
		focus.pressed === 'false',
		'aria-pressed starts at false',
		`aria-pressed="${ focus.pressed }"`,
		'a missing aria-pressed attribute — the chosen state would not be in the accessibility tree'
	);
	// :focus-visible only paints on a real keyboard route, so Tab onto it:
	// step back off the swatch, then Tab forward so the focus is keyboard-made.
	await page.keyboard.press( 'Shift+Tab' );
	await page.keyboard.press( 'Tab' );
	const kbRing = await page.evaluate( () => {
		const el = document.activeElement;
		const cs = getComputedStyle( el );
		return {
			onSwatch: el.classList.contains( 'sgs-product-card__swatch--button' ),
			outline: `${ cs.outlineStyle } ${ cs.outlineWidth } ${ cs.outlineColor }`,
			offset: cs.outlineOffset,
			matchesFocusVisible: el.matches( ':focus-visible' ),
		};
	} );
	check(
		kbRing.onSwatch &&
			kbRing.matchesFocusVisible &&
			kbRing.outline.includes( 'solid' ) &&
			parseFloat( kbRing.outline.match( /(\d+(\.\d+)?)px/ )?.[ 1 ] || '0' ) >= 2,
		'keyboard focus paints a visible ring (>=2px solid)',
		`focus on swatch: ${ kbRing.onSwatch }, :focus-visible: ${ kbRing.matchesFocusVisible }, outline ${ kbRing.outline }, offset ${ kbRing.offset }`,
		'outline-style "none", an outline-width under 2px, or :focus-visible not matching — the keyboard user cannot see where they are'
	);

	/* ── 5. Photo swap, own card only + named sibling NEGATIVE CONTROL ──── */
	const swap = await page.evaluate( async () => {
		const cards = Array.from(
			document.querySelectorAll( '.wp-block-sgs-product-card' )
		).filter( ( c ) => c.querySelector( '.sgs-product-card__swatch--button' ) );
		if ( cards.length < 2 ) {
			return { skipped: `only ${ cards.length } card(s) with swatches on this page` };
		}
		const mainImg = ( c ) =>
			c.querySelector( '.product-card__media img, .sgs-product-card__media-wrap img' );
		const nameOf = ( c ) => {
			const h = c.querySelector( 'h2, h3, h4, .product-card__title' );
			return h ? h.textContent.trim().slice( 0, 60 ) : '(untitled)';
		};
		const src = ( c ) => {
			const img = mainImg( c );
			return img ? img.getAttribute( 'src' ) || img.dataset.src || '' : '';
		};

		const target = cards[ 0 ];
		const sibling = cards[ 1 ];
		const before = { target: src( target ), sibling: src( sibling ) };

		// Press a swatch that is NOT the one already showing.
		const dots = Array.from(
			target.querySelectorAll( '.sgs-product-card__swatch--button' )
		);
		const press = dots[ dots.length - 1 ];
		const pressedName = press.getAttribute( 'aria-label' );
		press.click();
		await new Promise( ( r ) => setTimeout( r, 700 ) );

		return {
			targetName: nameOf( target ),
			siblingName: nameOf( sibling ),
			pressedName,
			dots: dots.length,
			targetBefore: before.target,
			targetAfter: src( target ),
			siblingBefore: before.sibling,
			siblingAfter: src( sibling ),
			targetPressed: press.getAttribute( 'aria-pressed' ),
			siblingPressedAny: Array.from(
				sibling.querySelectorAll( '.sgs-product-card__swatch--button' )
			).some( ( b ) => b.getAttribute( 'aria-pressed' ) === 'true' ),
		};
	} );

	if ( swap.skipped ) {
		console.log( `  SKIP  photo swap + sibling negative control — ${ swap.skipped }` );
		console.log( '        (run this against a listing page with at least two variable products carrying swatch colours)' );
		failures++;
		console.log( '        counted as a FAIL: without the sibling control the swap test is vacuous' );
	} else {
		check(
			swap.targetAfter !== '' && swap.targetAfter !== swap.targetBefore,
			`pressing "${ swap.pressedName }" changes its OWN card's photo ("${ swap.targetName }")`,
			`src before ${ swap.targetBefore } -> after ${ swap.targetAfter }`,
			'an unchanged src — the swap did not reach applyPillSelection, or the chosen term has no variation photo of its own'
		);
		check(
			swap.siblingAfter === swap.siblingBefore,
			`NEGATIVE CONTROL: sibling card "${ swap.siblingName }" photo did NOT change`,
			`src before ${ swap.siblingBefore } -> after ${ swap.siblingAfter }`,
			'a changed sibling src — a DOM query escaped the card and every card on the grid moved together'
		);
		check(
			swap.targetPressed === 'true' && swap.siblingPressedAny === false,
			'pressed state lands on the pressed dot only',
			`target aria-pressed="${ swap.targetPressed }", any sibling dot pressed: ${ swap.siblingPressedAny }`,
			'the pressed dot still false, or a sibling card dot turning true'
		);
	}

	/* ── 6. The card link now carries the colour ─────────────────────────── */
	const link = await page.evaluate( () => {
		const card = Array.from(
			document.querySelectorAll( '.wp-block-sgs-product-card' )
		).find( ( c ) => c.querySelector( '.sgs-product-card__swatch--button[aria-pressed="true"]' ) );
		if ( ! card ) {
			return { none: true };
		}
		const btn = card.querySelector( '.sgs-product-card__swatch--button[aria-pressed="true"]' );
		const param = btn.dataset.sgsSwatchParam;
		const slug = btn.dataset.sgsSwatchKey;
		const hrefs = Array.from( card.querySelectorAll( 'a[href]' ) ).map( ( a ) => a.getAttribute( 'href' ) );
		const matching = hrefs.filter( ( h ) => h.includes( `${ param }=${ slug }` ) );
		return { param, slug, hrefs, matching, overlay: !! card.querySelector( '.sgs-block-link-overlay' ) };
	} );
	if ( link.none ) {
		console.log( '  SKIP  link parameter — no pressed swatch (step 5 skipped)' );
	} else {
		check(
			link.matching.length > 0,
			'the card product link carries the chosen colour',
			`${ link.param }=${ link.slug } found on ${ link.matching.length } of ${ link.hrefs.length } link(s); block-link overlay present: ${ link.overlay }`,
			'0 matching links — the parameter never reached whichever element carries the link (if the overlay is present, check the overlay href matched the permalink pathname)'
		);
	}

	/* ── 7. The swatch sits above the stretched block-link overlay ───────── */
	const stacking = await page.evaluate( () => {
		const card = document.querySelector( '.sgs-has-block-link' );
		if ( ! card ) {
			return { none: true };
		}
		const btn = card.querySelector( '.sgs-product-card__swatch--button' );
		const overlay = card.querySelector( '.sgs-block-link-overlay' );
		if ( ! btn || ! overlay ) {
			return { none: true };
		}
		const r = btn.getBoundingClientRect();
		btn.scrollIntoView( { block: 'center' } );
		const r2 = btn.getBoundingClientRect();
		const top = document.elementFromPoint( r2.left + r2.width / 2, r2.top + r2.height / 2 );
		return {
			btnZ: getComputedStyle( btn ).zIndex,
			btnPos: getComputedStyle( btn ).position,
			overlayZ: getComputedStyle( overlay ).zIndex,
			topIsSwatch: top === btn,
			topTag: top ? top.className : 'none',
			had: r.width > 0,
		};
	} );
	if ( stacking.none ) {
		console.log( '  SKIP  overlay stacking — no card with sgsBlockLinkAuto on this page' );
		console.log( '        (turn the Block Link toggle on for one card and re-run, or this interaction stays unverified)' );
	} else {
		check(
			stacking.topIsSwatch &&
				parseInt( stacking.btnZ, 10 ) > parseInt( stacking.overlayZ, 10 ),
			'swatch sits above the stretched block-link overlay',
			`swatch z-index ${ stacking.btnZ } / position ${ stacking.btnPos }, overlay z-index ${ stacking.overlayZ }, element at the dot centre: ${ stacking.topTag }`,
			'the overlay being the element at the dot centre, or a swatch z-index at or below the overlay — a press would navigate instead of changing the photo'
		);
	}

	/* ── 8. The '+N' pill is not interactive ─────────────────────────────── */
	const more = await page.evaluate( () => {
		const pill = document.querySelector( '.sgs-product-card__swatch-more' );
		if ( ! pill ) {
			return { none: true };
		}
		return {
			tag: pill.tagName.toLowerCase(),
			tabIndex: pill.tabIndex,
			hasTabindexAttr: pill.hasAttribute( 'tabindex' ),
			cursor: getComputedStyle( pill ).cursor,
			isButtonClass: pill.classList.contains( 'sgs-product-card__swatch--button' ),
		};
	} );
	if ( more.none ) {
		console.log( '  SKIP  +N pill — no card on this page overflows swatchMaxVisible' );
		console.log( '        (drop swatchMaxVisible to 2 on one card to make the pill render, or this stays unverified)' );
	} else {
		check(
			more.tag === 'span' && ! more.hasTabindexAttr && more.tabIndex < 0 && ! more.isButtonClass,
			'the +N pill is not interactive',
			`<${ more.tag }>, tabindex attr: ${ more.hasTabindexAttr }, tabIndex ${ more.tabIndex }, cursor ${ more.cursor }`,
			'a <button> tag, a tabindex attribute, a tabIndex of 0 or more, or the --button class — the count would become a control'
		);
	}
}

/* ── 9. Deep-link preselection + a tampered value, on the product page ──── */
console.log( '\n================ product page deep link ================' );
await page.setViewportSize( { width: 1440, height: 900 } );
await page.goto( urlArg, { waitUntil: 'networkidle' } );
const deep = await page.evaluate( () => {
	const btn = document.querySelector( '.sgs-product-card__swatch--button' );
	if ( ! btn ) {
		return null;
	}
	const card = btn.closest( '.wp-block-sgs-product-card' );
	const row = card.querySelector( '.sgs-product-card__swatches' );
	const dots = Array.from( card.querySelectorAll( '.sgs-product-card__swatch--button' ) );
	const pick = dots[ dots.length - 1 ];
	return {
		base: row ? row.dataset.sgsSwatchProductUrl : '',
		param: pick.dataset.sgsSwatchParam,
		slug: pick.dataset.sgsSwatchKey,
		label: pick.getAttribute( 'aria-label' ),
	};
} );

if ( ! deep || ! deep.base ) {
	console.log( '  SKIP  deep link — no swatch with a product URL on the listing page' );
	failures++;
	console.log( '        counted as a FAIL: the "opens with that colour chosen" half is unverified' );
} else {
	/**
	 * Read what the product page selected.
	 *
	 * @param {string} url Product URL to open.
	 * @return {Promise<Object>} The selected state.
	 */
	async function readSelection( url ) {
		await page.goto( url, { waitUntil: 'networkidle' } );
		return page.evaluate( () => {
			const picked = Array.from(
				document.querySelectorAll( '.sgs-option-picker__pill[aria-current="true"], .sgs-option-picker__pill[aria-pressed="true"]' )
			).map( ( p ) => ( {
				type: p.closest( '[data-type-key]' )?.dataset.typeKey || '?',
				label: p.textContent.trim().slice( 0, 40 ),
			} ) );
			const ctxHost = document.querySelector( '.wp-block-sgs-buybox [data-wp-context]' ) ||
				document.querySelector( '.wp-block-sgs-buybox[data-wp-context]' );
			let selectedKey = '';
			try {
				selectedKey = JSON.parse( ctxHost.getAttribute( 'data-wp-context' ) ).selectedKey || '';
			} catch ( e ) {
				selectedKey = '(unreadable)';
			}
			return { picked, selectedKey };
		} );
	}

	const good = `${ deep.base }${ deep.base.includes( '?' ) ? '&' : '?' }${ deep.param }=${ deep.slug }`;
	const sel = await readSelection( good );
	check(
		sel.selectedKey.includes( `${ deep.param.replace( 'attribute_', '' ) }:${ deep.slug }` ),
		`product page opens on "${ deep.label }" rather than falling back to defaultAxes`,
		`${ good } -> seeded selectedKey "${ sel.selectedKey }", pills marked: ${ JSON.stringify( sel.picked ) }`,
		`a selectedKey without "${ deep.slug }" — sgs_preselect_apply_to_manifest did not move defaultKey, so the page opened on the manifest default`
	);

	const baseline = await readSelection( deep.base );
	const tampered = await readSelection(
		`${ deep.base }${ deep.base.includes( '?' ) ? '&' : '?' }${ deep.param }=` +
			encodeURIComponent( "nope' OR 1=1 --" )
	);
	check(
		tampered.selectedKey === baseline.selectedKey && ! /OR 1=1|nope/i.test( tampered.selectedKey ),
		'a tampered / off-enum URL value is rejected, not coerced',
		`tampered selectedKey "${ tampered.selectedKey }" vs no-parameter baseline "${ baseline.selectedKey }"`,
		'a selectedKey that differs from the baseline, or that contains any of the tampered text — the value was accepted, or it silently coerced the block attribute to a different default'
	);
}

await browser.close();
console.log( `\n${ failures === 0 ? 'ALL CHECKS PASSED' : `${ failures } CHECK(S) FAILED` }` );
process.exit( failures === 0 ? 0 : 1 );
