// Calibration's probe trigger (Spec 48 FR-48-81) in a real browser on local HTML: a setting state with no dedicated
// trigger is entered by the first state-vocabulary mechanism that changes the setting's property, on the target or an
// ancestor, and the page is left as it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readInstancesInPage, markTargetInPage } from '../lib/calibrate-read.mjs';
import { READ_PROPS, TEXT_PSEUDO_PROPS, CAL_PSEUDO_PROPS } from '../lib/calibrate-props.mjs';
import { elementPath } from '../../parity/lib/ref-trace.mjs';
import { probeState, probeMechanisms, changed } from '../lib/calibrate-probe.mjs';
import { triggerFor } from '../lib/calibrate-instances.mjs';

const HTML = `<style>
	.sgs-m__item { color: rgb(0, 0, 0) } .sgs-m__item.is-disabled-x { color: rgb(1, 1, 1) }
	.sgs-m__link { color: rgb(0, 0, 0) } .sgs-m__item[aria-disabled="true"] .sgs-m__link { color: rgb(150, 150, 150) }
	.sgs-m__body { color: rgb(0, 0, 0) } .sgs-m__body--collapsed { color: rgb(9, 9, 9) }
	.sgs-m__btn { color: rgb(0, 0, 0) } .sgs-m__btn:disabled { color: rgb(77, 77, 77) }
</style>
<div class="cr-ref-cal-0 sgs-m"><div class="sgs-m__item"><a class="sgs-m__link" href="#a">Link</a></div></div>
<div class="cr-ref-cal-1 sgs-m"><p class="sgs-m__body">Body</p></div>
<div class="cr-ref-cal-2 sgs-m"><button class="sgs-m__btn">Go</button></div>`;

const { chromium } = await import( 'playwright' );

async function probe( n, target, state, props, mechanisms = probeMechanisms( state ) ) {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( HTML );
		await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', n, target, null ] );
		const read = async () => ( await page.evaluate( readInstancesInPage, [ 3, 'cr-ref-cal-', READ_PROPS, elementPath.toString(), CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS, n ] ) )[ n ];
		const before = await page.evaluate( () => document.body.innerHTML );
		const cdp = await page.context().newCDPSession( page );
		const r = await probeState( { page, cdp, read, rootSel: `.cr-ref-cal-${ n }`, props, mechanisms } );
		const restored = before === await page.evaluate( () => document.body.innerHTML );
		return { r, restored };
	} finally {
		await browser.close();
	}
}

test( 'MUST FAIL WITHOUT THE PROBE: a disabled state is entered on the ancestor that carries it, and the page is restored', async () => {
	const { r, restored } = await probe( 0, '.sgs-m__link', 'disabled', [ 'color' ] );
	assert.ok( r.read, r.why );
	const link = Object.entries( r.read ).find( ( [ k ] ) => k.includes( 'sgs-m__link' ) )?.[ 1 ];
	assert.equal( link?.color, 'rgb(150, 150, 150)' );
	assert.ok( restored, 'the attribute and the host mark are removed' );
} );

test( 'a BEM state modifier joins the host\'s own BEM class, and a forced pseudo-class is cleared after', async () => {
	const closed = await probe( 1, '.sgs-m__body', 'closed', [ 'color' ] );
	assert.ok( closed.r.read, closed.r.why );
	assert.ok( closed.restored );
	const disabled = await probe( 2, '.sgs-m__btn', 'disabled', [ 'color' ], probeMechanisms( 'disabled' ).filter( ( m ) => 'pseudo-class' === m.kind ) );
	assert.ok( disabled.r.read, disabled.r.why );
	assert.ok( disabled.restored );
} );

test( 'negative control: with no mechanism that paints, the probe says why and reads nothing', async () => {
	const { r, restored } = await probe( 0, '.sgs-m__link', 'disabled', [ 'color' ], probeMechanisms( 'disabled' ).filter( ( m ) => 'class' === m.kind ) );
	assert.equal( r.read, null );
	assert.match( r.why, /no state mechanism/ );
	assert.ok( restored );
} );

test( 'calibration gives the probe to states with no dedicated trigger, keeps the dedicated ones', () => {
	assert.equal( triggerFor( 'disabled' ), 'probe' );
	assert.equal( triggerFor( 'closed' ), 'probe' );
	assert.equal( triggerFor( 'hover' ), 'hover' );
	assert.equal( triggerFor( 'open' ), 'fixture' );
	assert.equal( triggerFor( 'no-such-state' ), undefined );
	assert.equal( triggerFor( null ), null );
	assert.ok( changed( { a: { color: 'x' } }, { a: { color: 'y' } }, [ 'color' ] ) );
	assert.ok( ! changed( { a: { color: 'x' } }, { a: { color: 'x', width: '1px' } }, [ 'color' ] ) );
} );
