// A minimum size a block declares is recorded by calibration as its own paint (`_own:min-height`, `_own:min-width`,
// lib/calibrate-read.mjs::readInstancesInPage), because the computed style reads 0px both for a box left at `auto` (in
// block layout) and for one that declares 0; only the typed computed value tells them apart. The comparison then leaves the
// declared value as it is (lib/fill-prop.mjs::inOwnContext) and reads the undeclared one as `auto`.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readInstancesInPage } from '../lib/calibrate-read.mjs';
import { READ_PROPS, PSEUDO_PROPS, TEXT_PSEUDO_PROPS, OWN_INHERITED } from '../lib/calibrate-props.mjs';
import { calibratedContext, inOwnContext } from '../lib/fill-prop.mjs';
import { elementPath } from '../../parity/lib/ref-trace.mjs';

let shared = null;
after( async () => shared && ( await shared ).close() );
async function read( html, ownAt = [ 0, 1 ] ) {
	shared ??= import( 'playwright' ).then( ( { chromium } ) => chromium.launch() );
	const page = await ( await shared ).newPage();
	try {
		await page.setContent( html );
		return await page.evaluate( readInstancesInPage, [ 2, 'cr-ref-cal-', READ_PROPS, elementPath.toString(), PSEUDO_PROPS, TEXT_PSEUDO_PROPS, undefined, OWN_INHERITED, ownAt ] );
	} finally {
		await page.close();
	}
}

// Two boxes in block layout: one declares `min-height: 0; min-width: 0`, the other declares neither.
const PAGE = `<div><div class="cr-ref-cal-0" style="min-height:0;min-width:0"><span>x</span></div><div class="cr-ref-cal-1"><span>y</span></div></div>`;

test( 'MUST FAIL: a declared min-height: 0 is recorded as the block\'s own paint; an undeclared minimum is not', async () => {
	const [ declared, unstyled ] = await read( PAGE );
	assert.equal( declared[ '' ][ 'min-height' ], '0px' );
	assert.equal( unstyled[ '' ][ 'min-height' ], '0px', 'the computed style alone cannot tell them apart' );
	assert.equal( declared[ '' ][ '_own:min-height' ], '0px' );
	assert.equal( declared[ '' ][ '_own:min-width' ], '0px' );
	assert.equal( unstyled[ '' ][ '_own:min-height' ], undefined );
	assert.equal( unstyled[ '' ][ '_own:min-width' ], undefined );
	assert.equal( declared.span[ '_own:min-height' ], undefined, 'a child that declares nothing records nothing' );
	// The comparison: the declared 0 stays 0px; the undeclared one reads as the initial auto.
	const ctx = ( paint ) => calibratedContext( { elements: { '': { 1440: paint } } }, '', 1440 );
	assert.equal( inOwnContext( 'min-height', '0px', ctx( declared[ '' ] ) ), '0px' );
	assert.equal( inOwnContext( 'min-height', '0px', ctx( unstyled[ '' ] ) ), 'auto' );
} );

test( 'a marked instance records no declared minimum, so the slot finder never sees it change', async () => {
	const [ declared ] = await read( PAGE, [ 1 ] );
	assert.equal( declared[ '' ][ '_own:min-height' ], undefined );
} );
