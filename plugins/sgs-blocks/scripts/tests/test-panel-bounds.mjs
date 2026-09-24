/**
 * Standing gate for nav panel horizontal bounds
 * (src/shared/nav-interactivity/panel-bounds.js, W2-p floating header).
 *
 * What it protects: a floating ("pill") header changes what a dropdown and a
 * mega panel are positioned against — the pill's box rather than the viewport.
 * The rule that matters far more than the new behaviour is that NOTHING moves
 * for the thousands of headers that do not float. That is an arithmetic claim,
 * so it is asserted as one: on a grid of viewport widths, panel widths and
 * anchor positions, the extracted helpers must return EXACTLY what the shipped
 * expressions in `mega-disclosure.js::repositionPanel` returned before the
 * extraction, to the bit.
 *
 * Carries NEGATIVE CONTROLS. A parity assertion that cannot fail proves
 * nothing, so the same comparison is re-run against deliberately broken
 * reimplementations (a dropped gutter, an inverted clamp order, a viewport-
 * centred mega) and must REJECT each one. Without that, an assertion that
 * stopped asserting would keep reporting green.
 *
 * Run:  node scripts/tests/test-panel-bounds.mjs
 * Exit: 0 = green, 1 = red.
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BS = String.fromCharCode( 92 );
const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const P = ( process.argv[ 2 ] || path.resolve( HERE, '..', '..' ) )
	.split( BS )
	.join( '/' );
const {
	viewportBounds,
	boundsFromHeaderRect,
	clampDropdownLeft,
	centreMegaLeft,
	megaPanelWidth,
	placePanel,
	itemAlignedLeft,
} = await import(
	'file:///' + P + '/src/shared/nav-interactivity/panel-bounds.js'
);

let passed = 0;
const failures = [];

function check( label, condition ) {
	if ( condition ) {
		passed++;
		console.log( `  ok   ${ label }` );
	} else {
		failures.push( label );
		console.log( `  FAIL ${ label }` );
	}
}

/*
 * THE SHIPPED ARITHMETIC, copied verbatim from the pre-extraction
 * `repositionPanel`. These are the reference implementations the non-floating
 * path must still match exactly.
 */
function shippedDropdownLeft( desired, width, innerWidth, gutter ) {
	const maxLeft = innerWidth - gutter - width;
	return Math.max( Math.min( desired, maxLeft ), gutter );
}
function shippedMegaLeft( width, innerWidth, gutter ) {
	return Math.max( ( innerWidth - width ) / 2, gutter );
}

const GUTTER = 28;
const VIEWPORTS = [ 320, 390, 768, 1024, 1280, 1440, 1920 ];
const WIDTHS = [ 120, 300, 480, 1120, 1600 ];
const ANCHORS = [ -40, 0, 17, 250, 700, 1300, 1900 ];

/* ── 1. Non-floating parity, dropdown ─────────────────────────────────────── */
let dropdownMismatch = null;
let dropdownCases = 0;
for ( const vw of VIEWPORTS ) {
	for ( const width of WIDTHS ) {
		for ( const desiredLeft of ANCHORS ) {
			dropdownCases++;
			const mine = clampDropdownLeft( {
				desiredLeft,
				width,
				bounds: viewportBounds( vw ),
				gutter: GUTTER,
			} );
			const shipped = shippedDropdownLeft( desiredLeft, width, vw, GUTTER );
			if ( mine !== shipped ) {
				dropdownMismatch = { vw, width, desiredLeft, mine, shipped };
			}
		}
	}
}
check(
	`dropdown: ${ dropdownCases } viewport cases identical to the shipped clamp` +
		( dropdownMismatch ? ` (first: ${ JSON.stringify( dropdownMismatch ) })` : '' ),
	null === dropdownMismatch
);

/* ── 2. Non-floating parity, mega ─────────────────────────────────────────── */
let megaMismatch = null;
let megaCases = 0;
for ( const vw of VIEWPORTS ) {
	for ( const width of WIDTHS ) {
		megaCases++;
		const mine = centreMegaLeft( {
			width,
			bounds: viewportBounds( vw ),
			gutter: GUTTER,
		} );
		const shipped = shippedMegaLeft( width, vw, GUTTER );
		if ( mine !== shipped ) {
			megaMismatch = { vw, width, mine, shipped };
		}
	}
}
check(
	`mega: ${ megaCases } viewport cases identical to the shipped centring` +
		( megaMismatch ? ` (first: ${ JSON.stringify( megaMismatch ) })` : '' ),
	null === megaMismatch
);

/* ── 3. A full-width header resolves to the viewport box ──────────────────── */
check(
	'a header spanning the viewport is NOT treated as floating',
	false ===
		boundsFromHeaderRect( { left: 0, right: 1440, bottom: 80 }, 1440 ).floating
);
check(
	'sub-pixel rounding (left 0.4 / right 1439.6) is still not floating',
	false ===
		boundsFromHeaderRect( { left: 0.4, right: 1439.6, bottom: 80 }, 1440 )
			.floating
);
check(
	'a null rect falls back to the viewport box',
	false === boundsFromHeaderRect( null, 1440 ).floating &&
		1440 === boundsFromHeaderRect( null, 1440 ).right
);
check(
	'an inset header IS floating and carries its bottom edge',
	( () => {
		const b = boundsFromHeaderRect( { left: 16, right: 1424, bottom: 96 }, 1440 );
		return true === b.floating && 16 === b.left && 96 === b.bottom;
	} )()
);

/* ── 4. Floating behaviour: mega MATCHES, dropdown CLAMPS ─────────────────── */
const pill = boundsFromHeaderRect( { left: 16, right: 1424, bottom: 96 }, 1440 );
check(
	'mega panel width equals the pill width (1408)',
	1408 === megaPanelWidth( pill )
);
check(
	'mega panel left equals the pill left (16)',
	16 === centreMegaLeft( { width: megaPanelWidth( pill ), bounds: pill, gutter: GUTTER } )
);
check(
	'a full-width header publishes NO mega width (the stylesheet governs)',
	null === megaPanelWidth( viewportBounds( 1440 ) )
);
check(
	'a dropdown on the leftmost item pins to the pill edge, not the viewport',
	16 ===
		clampDropdownLeft( {
			desiredLeft: 10,
			width: 300,
			bounds: pill,
			gutter: GUTTER,
		} )
);
check(
	'a dropdown on the rightmost item stops at the pill right edge (1124)',
	1124 ===
		clampDropdownLeft( {
			desiredLeft: 1380,
			width: 300,
			bounds: pill,
			gutter: GUTTER,
		} )
);
check(
	'a dropdown that fits is left exactly where its alignment put it',
	620 ===
		clampDropdownLeft( {
			desiredLeft: 620,
			width: 300,
			bounds: pill,
			gutter: GUTTER,
		} )
);
check(
	'a dropdown wider than the pill pins LEFT, keeping its first item reachable',
	16 ===
		clampDropdownLeft( {
			desiredLeft: 600,
			width: 2000,
			bounds: pill,
			gutter: GUTTER,
		} )
);
/* A 390px pill: the reference's own mobile case (16px inset each side). */
const pill390 = boundsFromHeaderRect( { left: 16, right: 374, bottom: 66 }, 390 );
check(
	'at 390 the pill is 358 wide and the mega panel matches it',
	358 === megaPanelWidth( pill390 ) &&
		16 === centreMegaLeft( { width: 358, bounds: pill390, gutter: GUTTER } )
);

/* ── 5. NEGATIVE CONTROLS — each broken variant must be REJECTED ──────────── */
function parityHolds( dropdownImpl, megaImpl ) {
	for ( const vw of VIEWPORTS ) {
		for ( const width of WIDTHS ) {
			if ( megaImpl( width, vw ) !== shippedMegaLeft( width, vw, GUTTER ) ) {
				return false;
			}
			for ( const desiredLeft of ANCHORS ) {
				if (
					dropdownImpl( desiredLeft, width, vw ) !==
					shippedDropdownLeft( desiredLeft, width, vw, GUTTER )
				) {
					return false;
				}
			}
		}
	}
	return true;
}

// Control A: the real implementation must PASS the comparator (proving the
// comparator is not rejecting everything).
check(
	'[control] the comparator accepts the real implementation',
	parityHolds(
		( d, w, vw ) =>
			clampDropdownLeft( {
				desiredLeft: d,
				width: w,
				bounds: viewportBounds( vw ),
				gutter: GUTTER,
			} ),
		( w, vw ) =>
			centreMegaLeft( { width: w, bounds: viewportBounds( vw ), gutter: GUTTER } )
	)
);

// Control B: gutter dropped on the viewport path — the exact mistake the
// `bounds.floating ? 0 : gutter` line could make if it inverted.
check(
	'[neg control] a gutterless viewport clamp is REJECTED',
	false ===
		parityHolds(
			( d, w, vw ) =>
				clampDropdownLeft( {
					desiredLeft: d,
					width: w,
					bounds: { left: 0, right: vw, bottom: null, floating: true },
					gutter: GUTTER,
				} ),
			( w, vw ) =>
				centreMegaLeft( { width: w, bounds: viewportBounds( vw ), gutter: GUTTER } )
		)
);

// Control C: clamp order inverted (min-then-max swapped), which silently breaks
// only the panel-wider-than-the-box case.
check(
	'[neg control] an inverted clamp order is REJECTED',
	false ===
		parityHolds(
			( d, w, vw ) =>
				Math.min( Math.max( d, GUTTER ), vw - GUTTER - w ),
			( w, vw ) =>
				centreMegaLeft( { width: w, bounds: viewportBounds( vw ), gutter: GUTTER } )
		)
);

// Control D: mega centred on the box's left edge instead of its centre.
check(
	'[neg control] a left-pinned mega is REJECTED',
	false ===
		parityHolds(
			( d, w, vw ) =>
				clampDropdownLeft( {
					desiredLeft: d,
					width: w,
					bounds: viewportBounds( vw ),
					gutter: GUTTER,
				} ),
			() => GUTTER
		)
);

/* ── 6. Panel placement vocabulary (Wave 3C U-8, Spec 36 FR-36-4) ───────── */
{
	const vp = viewportBounds( 1440 );
	const pill = boundsFromHeaderRect( { left: 100, right: 1340, bottom: 90 }, 1440 );
	const base = { anchorLeft: 600, anchorWidth: 100, width: 300, gutter: GUTTER };
	// Defaults reproduce the shipped arithmetic exactly.
	check(
		'dropdown start = the shipped clamp of the item left edge',
		placePanel( { ...base, align: 'start', isDropdown: true, bounds: vp } ).left ===
			shippedDropdownLeft( 600, 300, 1440, GUTTER )
	);
	check(
		'mega page-centred = the shipped viewport centring, stylesheet width kept',
		( () => {
			const r = placePanel( { ...base, width: 1120, align: 'page-centred', isDropdown: false, bounds: vp } );
			return r.left === shippedMegaLeft( 1120, 1440, GUTTER ) && null === r.width;
		} )()
	);
	check(
		'mega page-centred under a pill takes the pill box (unchanged rule)',
		( () => {
			const r = placePanel( { ...base, width: 1120, align: 'page-centred', isDropdown: false, bounds: pill } );
			return r.left === 100 && r.width === 1240;
		} )()
	);
	// New placements.
	check(
		'indus-foods More: a 300px dropdown centred on the page sits at 570',
		placePanel( { ...base, align: 'page-centred', isDropdown: true, bounds: vp } ).left === 570
	);
	check(
		'away: full-width takes the whole page (left 0, width 1440)',
		( () => {
			const r = placePanel( { ...base, align: 'full-width', isDropdown: false, bounds: vp } );
			return r.left === 0 && r.width === 1440;
		} )()
	);
	check(
		'full-width under a pill takes the pill width',
		( () => {
			const r = placePanel( { ...base, align: 'full-width', isDropdown: true, bounds: pill } );
			return r.left === 100 && r.width === 1240;
		} )()
	);
	check(
		'an item-centred mega panel centres on its item, then clamps inside the gutter',
		placePanel( { ...base, width: 1120, align: 'center', isDropdown: false, bounds: vp } ).left ===
			clampDropdownLeft( { desiredLeft: 650 - 560, width: 1120, bounds: vp, gutter: GUTTER } )
	);
	check(
		'end lines the panel up with the item right edge',
		itemAlignedLeft( { align: 'end', anchorLeft: 600, anchorWidth: 100, width: 300 } ) === 400
	);
	// NEGATIVE CONTROL: a placement that ignored `align` (always item-start)
	// lands at the item, not the page centre, so the page-centred case catches it.
	const ignoresAlign = ( args ) =>
		clampDropdownLeft( { desiredLeft: args.anchorLeft, width: args.width, bounds: args.bounds, gutter: args.gutter } );
	check(
		'[neg control] an align-blind placement is REJECTED (item 600, not page 570)',
		ignoresAlign( { ...base, bounds: vp } ) !== 570
	);
}

console.log(
	`\n${ passed } passed, ${ failures.length } failed` +
		( failures.length ? `\n  - ${ failures.join( '\n  - ' ) }` : '' )
);
process.exit( failures.length ? 1 : 0 );
