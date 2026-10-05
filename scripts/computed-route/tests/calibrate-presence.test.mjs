// Proves Spec 47 §3.2's presence read (FR-47-2): a setting whose role is boolean-visibility or presence-boolean, and
// each value of a variant setting, records the elements that appear and disappear when it flips. Presence is existence
// and display only, so a setting that merely restyles an element records nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { presenceFrom, collectContent } from '../lib/calibrate-content.mjs';
import { WIDTHS } from '../lib/calibrate.mjs';

// The same element map at every width.
const atAll = ( map ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, map ] ) );
const shown = ( ...paths ) => Object.fromEntries( paths.map( ( p ) => [ p, { shown: true } ] ) );

test( 'MUST FAIL TO SEE A FLIP: a boolean that removes one element and adds another records both', () => {
	const def = atAll( shown( '', 'sgs-card__media', 'sgs-card__placeholder' ) );
	const mark = atAll( shown( '', 'sgs-card__media', 'sgs-card__badge' ) );
	assert.deepEqual( presenceFrom( def, mark ), { shows: [ 'sgs-card__badge' ], hides: [ 'sgs-card__placeholder' ] } );
} );

test( 'MUST FAIL TO RECORD: a boolean that only recolours an element yields no presence', () => {
	// Both reads hold the same elements, all displayed: the colour change is invisible to the presence read.
	const same = atAll( shown( '', 'sgs-card__title', 'sgs-card__body' ) );
	const p = presenceFrom( same, atAll( shown( '', 'sgs-card__title', 'sgs-card__body' ) ) );
	assert.deepEqual( p, { shows: [], hides: [] } );
	// And an empty result is never written into the file.
	const file = collectContent( [ { content: { attr: 'titleColour', kind: 'presence' }, contentDef: same, contentRead: same } ] );
	assert.ok( ! Object.hasOwn( file, 'presence' ) );
} );

test( 'an element rendered but not displayed counts as absent', () => {
	const def = { ...atAll( { ...shown( '', 'sgs-card__media' ), 'sgs-card__note': { shown: false } } ) };
	const mark = atAll( shown( '', 'sgs-card__media', 'sgs-card__note' ) );
	assert.deepEqual( presenceFrom( def, mark ), { shows: [ 'sgs-card__note' ], hides: [] } );
} );

test( 'an element shown at one width only is in neither list, because both sides read the same widths', () => {
	const burgerAt375 = ( extra ) => ( { 375: { ...shown( '', 'sgs-nav__burger' ), ...extra }, 768: { ...shown( '' ), ...extra }, 1440: { ...shown( '' ), ...extra } } );
	assert.deepEqual( presenceFrom( burgerAt375( {} ), burgerAt375( {} ) ), { shows: [], hides: [] } );
	// The flip still shows through at the width it happens at.
	assert.deepEqual( presenceFrom( burgerAt375( {} ), burgerAt375( shown( 'sgs-nav__cta' ) ) ), { shows: [ 'sgs-nav__cta' ], hides: [] } );
} );

test( 'collectContent keys a variant value as attr=value and a plain presence row by its attribute', () => {
	const def = atAll( shown( '', 'sgs-hero__ground' ) );
	const file = collectContent( [
		{ content: { attr: 'showBadge', kind: 'presence' }, contentDef: def, contentRead: atAll( shown( '', 'sgs-hero__ground', 'sgs-hero__badge' ) ) },
		{ content: { attr: 'layout', kind: 'presence', value: 'split' }, contentDef: def, contentRead: atAll( shown( '', 'sgs-hero__split-media' ) ) },
	] );
	assert.deepEqual( Object.keys( file.presence ).sort(), [ 'layout=split', 'showBadge' ] );
	assert.deepEqual( file.presence.showBadge, { shows: [ 'sgs-hero__badge' ], hides: [] } );
	assert.deepEqual( file.presence[ 'layout=split' ], { shows: [ 'sgs-hero__split-media' ], hides: [ 'sgs-hero__ground' ] } );
	assert.ok( ! Object.hasOwn( file, 'text' ) );
	assert.ok( ! Object.hasOwn( file, 'link' ) );
} );
