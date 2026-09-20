/**
 * The non-modal drawer's selective background freeze — pure-logic gate.
 *
 * Subject: `src/shared/nav-interactivity/freeze-background.js::collectFreezeTargets`,
 * the traversal `store.js::freezeBackground` drives on the FR-36-6 `non-modal`
 * `.show()` path. No DOM: the trees below are plain objects carrying the three
 * members the traversal reads (`children`, `contains`, identity).
 *
 * The contract under test is FR-36-6's — background inertness with "focus
 * containment … kept exactly as `modal` has them", the live exception being the
 * header region the mode's z-index scale paints above the panel, plus the toggle
 * itself. Expressed as ONE invariant, checked on every tree:
 *
 *   the focusable leaves still reachable with the drawer open ===
 *   the toggle + whatever lives inside the live header region
 *
 * NEGATIVE CONTROL (case 3): the same invariant is run against the superseded
 * rule — skip any child that CONTAINS the toggle, descend one fixed level — on
 * the content-toggle tree. It must FAIL there, leaving the whole `<main>`
 * reachable. Without that, a traversal that froze nothing at all, or an invariant
 * that could not detect a live background, would pass every case above it.
 *
 * Run:  node scripts/tests/test-nonmodal-freeze-background.mjs
 * Exit: 0 = green, non-zero = red.
 */

import { collectFreezeTargets } from '../../src/shared/nav-interactivity/freeze-background.js';

/* ── Tiny element stub ─────────────────────────────────────────────────── */

function el( name, props = {}, children = [] ) {
	const node = { name, children, parent: null, ...props };
	children.forEach( ( child ) => {
		child.parent = node;
	} );
	node.contains = ( other ) => {
		let cursor = other;
		while ( cursor ) {
			if ( cursor === node ) {
				return true;
			}
			cursor = cursor.parent;
		}
		return false;
	};
	return node;
}

function leaves( node, found = [] ) {
	if ( node.focusable ) {
		found.push( node );
	}
	node.children.forEach( ( child ) => leaves( child, found ) );
	return found;
}

function hasAncestorIn( node, set ) {
	let cursor = node;
	while ( cursor ) {
		if ( set.has( cursor ) ) {
			return true;
		}
		cursor = cursor.parent;
	}
	return false;
}

/** Focusable leaves a keyboard user can still reach once `frozen` is inert. */
function reachable( root, frozen ) {
	const set = new Set( frozen );
	return leaves( root ).filter( ( leaf ) => ! hasAncestorIn( leaf, set ) );
}

function names( nodes ) {
	return nodes
		.map( ( n ) => n.name )
		.sort()
		.join( ',' );
}

/* ── The trees ─────────────────────────────────────────────────────────── */

const isLive = ( node ) => true === node.live;

/**
 * @param {string} where 'header' or 'content' — where the burger is placed.
 * @return {Object} { body, toggle, dialog, scrim, adminBar, expectedReachable }
 */
function buildPage( where ) {
	const headerBurger = el( 'header-burger', { focusable: true } );
	const contentBurger = el( 'content-burger', { focusable: true } );
	const logo = el( 'logo', { focusable: true } );
	const megaTrigger = el( 'mega-trigger', { focusable: true } );

	const header = el( 'header', { live: true }, [ logo, headerBurger ] );
	const heroLink = el( 'hero-link', { focusable: true } );
	const hero = el( 'hero', {}, [ heroLink ] );
	const bodyCopyLink = el( 'body-copy-link', { focusable: true } );
	const inlineBar = el( 'inline-bar', {}, [ megaTrigger, contentBurger ] );
	const article = el( 'article', {}, [ bodyCopyLink, inlineBar ] );
	const main = el( 'main', {}, [ hero, article ] );
	const footerLink = el( 'footer-link', { focusable: true } );
	const footer = el( 'footer', {}, [ footerLink ] );

	const siteBlocks = el( 'wp-site-blocks', {}, [ header, main, footer ] );
	const dialogLink = el( 'dialog-link', { focusable: true } );
	const dialog = el( 'dialog', {}, [ dialogLink ] );
	const scrim = el( 'scrim' );
	const adminBarLink = el( 'admin-bar-link', { focusable: true } );
	const adminBar = el( 'wpadminbar', {}, [ adminBarLink ] );
	const body = el( 'body', {}, [ siteBlocks, dialog, scrim, adminBar ] );

	const toggle = 'header' === where ? headerBurger : contentBurger;

	return {
		body,
		toggle,
		dialog,
		scrim,
		adminBar,
		// The dialog + admin bar are SKIPPED, so their leaves stay reachable by
		// construction; the header is the declared live region; the toggle is the
		// affordance the mode exists to keep live. Nothing else may survive.
		expectedReachable: [
			logo,
			headerBurger,
			toggle,
			dialogLink,
			adminBarLink,
		],
	};
}

/** The superseded rule, for the negative control only. */
function legacyFreezeTargets( body, toggle, skipped ) {
	const targets = [];
	const freezeChildrenOf = ( parent ) => {
		parent.children.forEach( ( node ) => {
			if ( skipped.includes( node ) || node.contains( toggle ) ) {
				return;
			}
			targets.push( node );
		} );
	};
	freezeChildrenOf( body );
	const siteBlocks = body.children.find(
		( node ) => 'wp-site-blocks' === node.name
	);
	if ( siteBlocks ) {
		freezeChildrenOf( siteBlocks );
	}
	return targets;
}

/* ── Cases ─────────────────────────────────────────────────────────────── */

const failures = [];

function check( label, actual, expected ) {
	if ( actual !== expected ) {
		failures.push(
			`${ label }\n    expected: ${ expected }\n    actual:   ${ actual }`
		);
	}
}

for ( const where of [ 'header', 'content' ] ) {
	const page = buildPage( where );
	const skipped = [ page.dialog, page.scrim, page.adminBar ];
	const frozen = collectFreezeTargets( page.body, page.toggle, {
		isSkipped: ( node ) => skipped.includes( node ),
		isLive,
	} );

	check(
		`case 1/2 (${ where } toggle): reachable focusables`,
		names( reachable( page.body, frozen ) ),
		names( [ ...new Set( page.expectedReachable ) ] )
	);
	check(
		`case 1/2 (${ where } toggle): the toggle is never frozen`,
		frozen.includes( page.toggle ),
		false
	);
	check(
		`case 1/2 (${ where } toggle): the live header is never frozen`,
		frozen.some( ( node ) => 'header' === node.name ),
		false
	);
	check(
		`case 1/2 (${ where } toggle): nothing skipped is frozen`,
		frozen.some( ( node ) => skipped.includes( node ) ),
		false
	);
}

// Case 1 detail: a header toggle must still freeze exactly main + footer, so the
// fix is proven NOT to have changed the shipped header behaviour.
{
	const page = buildPage( 'header' );
	const frozen = collectFreezeTargets( page.body, page.toggle, {
		isSkipped: ( node ) =>
			[ page.dialog, page.scrim, page.adminBar ].includes( node ),
		isLive,
	} );
	check(
		'case 1 (header toggle): frozen set unchanged from the shipped behaviour',
		names( frozen ),
		'footer,main'
	);
}

// NEGATIVE CONTROL — the superseded rule must FAIL the same invariant on the
// content-toggle tree. If this ever passes, the invariant above is vacuous.
{
	const page = buildPage( 'content' );
	const legacy = legacyFreezeTargets( page.body, page.toggle, [
		page.dialog,
		page.scrim,
		page.adminBar,
	] );
	const stillReachable = reachable( page.body, legacy );
	check(
		'case 3 NEGATIVE CONTROL: the superseded rule leaves the page live',
		stillReachable.some( ( node ) => 'hero-link' === node.name ) &&
			stillReachable.some( ( node ) => 'body-copy-link' === node.name ) &&
			stillReachable.some( ( node ) => 'mega-trigger' === node.name ),
		true
	);
}

// Case 4: no toggle at all (a drawer opened with no trigger element) — every
// unskipped, non-live top-level branch freezes and nothing is descended.
{
	const page = buildPage( 'header' );
	const frozen = collectFreezeTargets( page.body, null, {
		isSkipped: ( node ) =>
			[ page.dialog, page.scrim, page.adminBar ].includes( node ),
		isLive,
	} );
	check(
		'case 4 (no toggle): freezes the site wrapper whole',
		names( frozen ),
		'wp-site-blocks'
	);
}

// Case 5: the toggle is never descended into — `inert` on a descendant would
// strip the button's own label from the accessibility tree.
{
	const label = el( 'burger-label' );
	const burger = el( 'burger', { focusable: true }, [ label ] );
	const body = el( 'body', {}, [ burger, el( 'main-2' ) ] );
	const frozen = collectFreezeTargets( body, burger, { isLive } );
	check(
		'case 5: the toggle subtree is left intact',
		names( frozen ),
		'main-2'
	);
}

if ( failures.length ) {
	process.stdout.write(
		`FAIL: ${ failures.length } assertion(s) in the non-modal freeze gate.\n` +
			failures.map( ( line ) => `  - ${ line }` ).join( '\n' ) +
			'\n'
	);
	process.exit( 1 );
}

process.stdout.write(
	'PASS: non-modal freeze — header-toggle behaviour unchanged, content-toggle ' +
		'background fully frozen, negative control shows the superseded rule failing.\n'
);
