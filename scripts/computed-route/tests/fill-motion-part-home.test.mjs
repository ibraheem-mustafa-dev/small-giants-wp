// lib/fill-motion.mjs::partForSlot with lib/fill-part-pairing.mjs::exactHome: a slot path that names its element by
// position only (calibration's `__burger-bar:nth-of-type(2)`, the element whose own class is `__burger-bar-2`) is the one
// declared motion part whose own resting settings calibration measured at exactly that slot, so the draft's per-bar
// hover widths and timings reach motion parts burger-bar-1 to -3.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { partForSlot, targetName } from '../lib/fill-motion.mjs';
import { exactHome, partHome } from '../lib/fill-part-pairing.mjs';

const db = openDb();
const ICON = '.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon';
const bar = ( n ) => `${ ICON } > .sgs-nav-bar-menu__burger-bar:nth-of-type(${ n })`;
const targets = [ 1, 2, 3 ].map( ( n ) => ( { target: `burger-bar-${ n }`, cssElement: `burger-bar-${ n }`, kind: 'part' } ) ).concat( { target: 'root', cssElement: 'root', kind: 'root' }, { target: 'burger-icon', cssElement: 'burger-icon', kind: 'part' } );
const cal = { settings: Object.fromEntries( [ 1, 2, 3 ].map( ( n ) => [ `burgerBar${ n }BorderRadius`, { slot: bar( n ) } ] ).concat( [ [ 'burgerIconWidth', { slot: ICON } ] ] ) ) };
const home = ( element ) => exactHome( db, 'sgs/nav-bar-menu', cal, element );

test( 'MUST FAIL: each positional bar slot is its own burger-bar part, from where that part\'s settings were calibrated', () => {
	assert.equal( partForSlot( 'sgs/nav-bar-menu', bar( 2 ), targets, home ), 'burger-bar-2' );
	assert.equal( partForSlot( 'sgs/nav-bar-menu', bar( 3 ), targets, home ), 'burger-bar-3' );
	assert.equal( targetName( { name: 'sgs/nav-bar-menu' }, { slot: bar( 1 ) }, targets, home ), 'burger-bar-1' );
	assert.equal( home( 'burger-bar-2' ), bar( 2 ), 'the exact home keeps the :nth-of-type step' );
	assert.equal( partHome( db, 'sgs/nav-bar-menu', cal, 'burger-bar-2', null ), `${ ICON } > .sgs-nav-bar-menu__burger-bar`, 'the loose home drops it' );
} );

test( 'negative control: the class match still wins, no calibration finds nothing, and a slot no part is calibrated at is none', () => {
	assert.equal( partForSlot( 'sgs/nav-bar-menu', ICON, targets, home ), 'burger-icon' );
	assert.equal( partForSlot( 'sgs/nav-bar-menu', bar( 2 ), targets ), null );
	assert.equal( partForSlot( 'sgs/nav-bar-menu', bar( 4 ), targets, home ), null );
	const twice = { settings: { burgerBar1BorderRadius: { slot: bar( 2 ) }, burgerBar2BorderRadius: { slot: bar( 2 ) } } };
	assert.equal( partForSlot( 'sgs/nav-bar-menu', bar( 2 ), targets, ( el ) => exactHome( db, 'sgs/nav-bar-menu', twice, el ) ), null, 'two parts homed at one slot are no answer' );
} );

// Real calibration (cache/nav-bar-menu.json) and the framework DB's motion targets: the item part's settings are
// calibrated at link 3 (`.sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link`), a slot whose last compound
// carries no `__item` class, so no link is the item part by its home.
test( 'MUST FAIL: a nav link is not the item part because calibration measured the item settings at link 3', async () => {
	const { readFileSync } = await import( 'node:fs' );
	const { motionDb } = await import( '../lib/motion-db.mjs' );
	const real = JSON.parse( readFileSync( new URL( '../cache/nav-bar-menu.json', import.meta.url ), 'utf8' ) );
	const realTargets = motionDb( db ).targetsOf( 'sgs/nav-bar-menu' );
	const realHome = ( element ) => exactHome( db, 'sgs/nav-bar-menu', real, element );
	const link = ( n ) => `.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(${ n }) > .sgs-nav-bar-menu__link`;
	assert.ok( realTargets.some( ( t ) => 'item' === t.cssElement ), 'the DB declares an item motion part' );
	assert.equal( realHome( 'item' ), link( 3 ), 'calibration homes the item part at link 3' );
	for ( const n of [ 1, 2, 3 ] ) {
		assert.equal( partForSlot( 'sgs/nav-bar-menu', link( n ), realTargets, realHome ), null, `link ${ n }` );
	}
	// Negative control: the real bars still map to their own parts.
	const realBar = ( n ) => `.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(${ n })`;
	for ( const n of [ 1, 2, 3 ] ) {
		assert.equal( partForSlot( 'sgs/nav-bar-menu', realBar( n ), realTargets, realHome ), `burger-bar-${ n }`, `bar ${ n }` );
	}
} );

test( 'negative control: a home with no position step is the part, on the real site-header-row calibration (content band)', async () => {
	const { readFileSync } = await import( 'node:fs' );
	const { motionDb } = await import( '../lib/motion-db.mjs' );
	const real = JSON.parse( readFileSync( new URL( '../cache/site-header-row.json', import.meta.url ), 'utf8' ) );
	const rowHome = ( element ) => exactHome( db, 'sgs/site-header-row', real, element );
	assert.equal( rowHome( 'content-band' ), '.sgs-container__inner' );
	assert.equal( partForSlot( 'sgs/site-header-row', '.sgs-container__inner', motionDb( db ).targetsOf( 'sgs/site-header-row' ), rowHome ), 'content-band' );
	// A positional copy of that element is not it.
	assert.equal( partForSlot( 'sgs/site-header-row', '.sgs-container__inner:nth-of-type(2)', [ { target: 'content-band', cssElement: 'content-band', kind: 'part' } ], () => '.sgs-container__inner:nth-of-type(2)' ), null );
} );
