/**
 * Checks (a), (b) and (d) of probe-motion-a11y.mjs (FR-38A-30): hover-revealed content under `hover: none`, keyboard
 * parity with the pointer hover, and an axe-core run on the fixture page. Each check has a negative control that feeds the
 * same judge a deliberately wrong reading and must come out red.
 *
 * @package SGS\Blocks
 */

import { AXE_TAGS, FIXTURE_WRAPS, axeSourcePath, judgeAllVisible, judgeAxe, judgeParity, summariseAxe } from './probe-motion-a11y-lib.mjs';
import { READ_MOTION, hoverRead } from './probe-motion-per-device-page.mjs';
import { READ_REVEALED, READ_INPUT, settle, tabInto, leave, touchOptions } from './probe-motion-a11y-page.mjs';

const REVEAL = { root: '.m310-reveal', part: '.sgs-gallery__caption', box: '.sgs-gallery__item' };
const CARD = '.m310-card';
const NOT_ON_PAGE = 'selector not on the page: build the fixture and pass its id';

/** (a) Content a hover reveals is visible by default on a device that cannot hover. */
export async function revealChecks( ctx, facts ) {
	const { rep, page, engine } = ctx;
	const sel = `${ REVEAL.root } ${ REVEAL.part }`;
	if ( ! await page.$( sel ) ) {
		rep.check( 'hover-none-revealed-visible', { selector: sel, pass: null, why: NOT_ON_PAGE } );
		return;
	}
	await settle( page, REVEAL.root );
	await leave( page, 600 );
	const desktopInput = await page.evaluate( READ_INPUT );
	const resting = await page.evaluate( READ_REVEALED, REVEAL );

	const touch = await ctx.open( touchOptions( engine ) );
	try {
		const input = await touch.page.evaluate( READ_INPUT );
		if ( ! input.hoverNone ) {
			rep.check( 'hover-none-revealed-visible', { selector: sel, property: 'matchMedia(hover: none)', measured: input, expected: 'the touch context reports (hover: none)', pass: null, why: `${ engine } did not emulate a device without hover` } );
			return;
		}
		await settle( touch.page, REVEAL.root );
		await touch.page.waitForTimeout( 800 );
		const parts = await touch.page.evaluate( READ_REVEALED, REVEAL );
		rep.check( 'hover-none-revealed-visible', {
			selector: sel,
			property: 'opacity / visibility / display / position inside the revealing box under (hover: none)',
			measured: { media: input, parts },
			expected: `all ${ facts.reveal.captions } hover-revealed captions are displayed, visible, opaque and inside their item with no pointer`,
			pass: parts.length === facts.reveal.captions && judgeAllVisible( parts ),
			why: parts.length === facts.reveal.captions ? '' : `found ${ parts.length } revealed parts, the fixture stores ${ facts.reveal.captions }`,
		} );
		rep.control( 'hover-none-revealed-visible', {
			selector: sel,
			property: 'opacity / visibility',
			measured: { media: desktopInput, parts: resting },
			expected: 'the same captions on a hover-capable device with no pointer are hidden, and the visibility judge reads them red',
			red: desktopInput.hoverHover === true && resting.length > 0 && ! judgeAllVisible( resting ),
		} );
	} finally {
		await touch.close();
	}
}

/** (b) Keyboard focus on the card's link reproduces the pointer hover values. */
export async function parityChecks( ctx, facts ) {
	const { rep, page } = ctx;
	const link = `${ CARD } a[href]`;
	if ( ! await page.$( link ) ) {
		rep.check( 'keyboard-parity', { selector: link, pass: null, why: NOT_ON_PAGE } );
		return;
	}
	const { before, after } = await hoverRead( page, CARD, [ CARD ] );
	const rest = before[ CARD ];
	const hover = after[ CARD ];

	await settle( page, CARD );
	await leave( page );
	const landed = await tabInto( page, CARD, link );
	let via = 'Tab key';
	if ( ! landed.matches ) {
		via = `focus() (the ${ ctx.engine } Tab key landed on <${ landed.tag }>${ landed.cls ? `.${ landed.cls }` : '' } instead of the link)`;
		await page.focus( link );
	}
	await page.waitForTimeout( 800 );
	const focus = await page.evaluate( READ_MOTION, CARD );
	const inside = await page.evaluate( ( s ) => Boolean( document.activeElement ) && document.querySelector( s ).contains( document.activeElement ), CARD );
	await leave( page );
	const why = judgeParity( { rest, hover, focus: inside ? focus : null }, facts.card );
	const pick = ( r ) => ( { translate: r.translate, scale: r.scale, rotate: r.rotate } );
	rep.check( 'keyboard-parity', {
		selector: `${ CARD } (focus on ${ link })`,
		property: 'translate / scale / rotate',
		measured: { rest: pick( rest ), pointerHover: pick( hover ), keyboardFocus: pick( focus ), focusInsideCard: inside, via },
		expected: `rest differs from hover; hover is translate y ${ facts.card.y }px and scale ${ facts.card.scale }; keyboard focus on the link reads the same values as the hover`,
		pass: why.length === 0,
		why: why.join( '; ' ),
	} );
	rep.control( 'keyboard-parity', {
		selector: CARD,
		property: 'translate / scale / rotate',
		measured: pick( rest ),
		expected: 'the resting card read as if it were the keyboard-focused one is judged red',
		red: judgeParity( { rest, hover, focus: rest }, facts.card ).length > 0,
	} );
}

/** Run axe-core in the page: violations with each node's target and whether it sits inside a fixture wrapper. */
const RUN_AXE = async ( { tags, wraps, include } ) => {
	const wrapSel = wraps.map( ( w ) => `.${ w }` ).join( ', ' );
	const context = include ? { include: [ [ include ] ] } : document;
	const result = await window.axe.run( context, { runOnly: { type: 'tag', values: tags }, resultTypes: [ 'violations' ] } );
	return result.violations.map( ( v ) => ( {
		id: v.id,
		impact: v.impact,
		help: v.help,
		nodes: v.nodes.map( ( n ) => {
			const first = typeof n.target[ 0 ] === 'string' ? document.querySelector( n.target[ 0 ] ) : null;
			return { target: n.target, inFixture: Boolean( first && first.closest( wrapSel ) ) };
		} ),
	} ) );
};

/** (d) No axe-core violation on the fixture page (WCAG 2.0/2.1/2.2 A and AA tags), or inside the fixture sections with `scope` 'fixture'. */
export async function axeChecks( ctx, scope ) {
	const { rep, page } = ctx;
	const source = axeSourcePath();
	if ( ! source ) {
		rep.check( 'axe-no-violations', { selector: 'html', pass: null, why: 'axe-core is not installed (npm install in plugins/sgs-blocks)' } );
		return;
	}
	if ( ! await page.$( '.m310-card-wrap' ) ) {
		rep.check( 'axe-no-violations', { selector: 'html', pass: null, why: NOT_ON_PAGE } );
		return;
	}
	await page.evaluate( () => window.scrollTo( 0, 0 ) );
	await leave( page, 1200 );
	await page.addScriptTag( { path: source } );
	const include = scope === 'fixture' ? FIXTURE_WRAPS.map( ( w ) => `.${ w }` ).join( ', ' ) : null;
	const violations = await page.evaluate( RUN_AXE, { tags: AXE_TAGS, wraps: FIXTURE_WRAPS, include } );
	const found = summariseAxe( violations.map( ( v ) => ( { ...v, nodes: v.nodes.map( ( n ) => ( { ...n, target: n.target.map( String ) } ) ) } ) ) );
	rep.check( 'axe-no-violations', {
		selector: scope === 'fixture' ? FIXTURE_WRAPS.map( ( w ) => `.${ w }` ).join( ', ' ) : 'html',
		property: `axe-core ${ AXE_TAGS.join( ', ' ) } violations`,
		measured: found.map( ( v ) => ( { id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map( ( n ) => `${ n.target }${ n.inFixture ? ' [in fixture]' : ' [outside fixture]' }` ) } ) ),
		expected: [],
		pass: judgeAxe( found ),
		why: found.map( ( v ) => `${ v.id } (${ v.impact }) on ${ v.nodes.length } node(s)` ).join('; '),
	} );

	await page.evaluate( () => {
		const plant = document.createElement( 'div' );
		plant.id = 'm310-axe-plant';
		plant.innerHTML = '<button type="button"></button><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">';
		document.querySelector( '.m310-card-wrap' ).appendChild( plant );
	} );
	const planted = await page.evaluate( RUN_AXE, { tags: AXE_TAGS, wraps: FIXTURE_WRAPS, include: '#m310-axe-plant' } );
	await page.evaluate( () => document.getElementById( 'm310-axe-plant' )?.remove() );
	const ids = planted.map( ( v ) => v.id );
	rep.control( 'axe-no-violations', {
		selector: '#m310-axe-plant',
		property: 'axe-core violations',
		measured: ids,
		expected: 'a planted empty button and an image with no alt are found (button-name, image-alt), so a clean run above is not a blind scanner',
		red: ! judgeAxe( planted ) && ids.includes( 'button-name' ) && ids.includes( 'image-alt' ),
	} );
}
