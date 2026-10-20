// The theme-token mappers (Spec 48 FR-48-81): a draft focus look → settings.custom.focus keys, a draft :active look →
// buttonPresets.{variant}.active-* keys. MUST FAIL cases: each rule has a case that goes red if the rule is removed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { focusTokens, pressTokens } from '../lib/snapshot-tokens.mjs';

test( 'MUST FAIL: a look that declares no focus property sets nothing, so the derived ring stays', () => {
	assert.deepEqual( focusTokens( { declared: {} } ), { focus: null, gaps: [] } );
	assert.deepEqual( focusTokens( { 'outline-width': '  ' } ), { focus: null, gaps: [] } );
	assert.deepEqual( focusTokens( null ), { focus: null, gaps: [] } );
} );

test( 'MUST FAIL: width, ring and offset come from the outline and the look is marked draft-sourced', () => {
	const { focus, gaps } = focusTokens( { 'outline-width': '3px', 'outline-color': 'rgb(200, 16, 46)', 'outline-style': 'solid', 'outline-offset': '4px', 'box-shadow': 'none' } );
	assert.deepEqual( focus, { width: '3px', ring: '#c8102e', offset: '4px', bloom: '0', source: 'draft' } );
	assert.deepEqual( gaps, [] );
} );

test( 'MUST FAIL: a whole look with a declared map is read the same as the declared map itself', () => {
	const declared = { 'outline-width': '2px', 'outline-color': '#112233' };
	assert.deepEqual( focusTokens( { states: [ 'focus' ], declared } ), focusTokens( declared ) );
} );

test( 'MUST FAIL: an outline with no declared offset is offset 0, the browser initial, never the framework width', () => {
	assert.equal( focusTokens( { 'outline-width': '2px', 'outline-color': '#112233' } ).focus.offset, '0px' );
	assert.equal( focusTokens( { 'outline-offset': '-2px' } ).focus.offset, '-2px', 'a negative offset is kept' );
	assert.equal( focusTokens( { 'outline-width': '2px', 'outline-offset': '0' } ).focus.offset, '0px' );
} );

test( 'MUST FAIL: a box-shadow glow becomes the bloom colours, first layer near and last layer far', () => {
	const { focus } = focusTokens( { 'outline-width': '2px', 'box-shadow': 'rgb(0, 0, 255) 0px 0px 8px 2px, rgba(0, 0, 255, 0.4) 0px 0px 20px 6px' } );
	assert.deepEqual( [ focus.bloom, focus.near, focus.far ], [ '1', '#0000ff', 'rgba(0, 0, 255, 0.4)' ] );
	const one = focusTokens( { 'box-shadow': '0px 0px 10px 0px rgb(10, 20, 30)' } ).focus;
	assert.deepEqual( [ one.near, one.far ], [ '#0a141e', '#0a141e' ], 'a colour after the lengths, and a single layer, is both near and far' );
} );

test( 'MUST FAIL: no glow turns the bloom off; a hard ring, an inset layer or a clear glow is not a glow', () => {
	assert.equal( focusTokens( { 'outline-width': '2px', 'box-shadow': 'none' } ).focus.bloom, '0' );
	assert.equal( focusTokens( { 'outline-width': '2px' } ).focus.bloom, '0', 'a draft with no shadow draws no glow' );
	const hard = focusTokens( { 'box-shadow': 'rgb(0, 0, 0) 0px 0px 0px 3px' } );
	assert.equal( hard.focus.bloom, '0' );
	assert.match( hard.gaps.join( '|' ), /hard \(zero-blur\)/ );
	const inset = focusTokens( { 'box-shadow': 'inset 0px 0px 8px 0px rgb(0, 0, 0)' } );
	assert.equal( inset.focus.bloom, '0' );
	assert.match( inset.gaps.join( '|' ), /inset/ );
	assert.equal( focusTokens( { 'box-shadow': '0px 0px 8px 2px rgba(0, 0, 0, 0)' } ).focus.bloom, '0', 'a fully transparent glow paints nothing' );
} );

test( 'MUST FAIL: an outline switched off, a dashed outline, a zero width and a non-literal colour are named gaps, never written', () => {
	const off = focusTokens( { 'outline-style': 'none', 'outline-width': '3px', 'outline-color': '#ff0000', 'box-shadow': '0px 0px 8px 2px rgb(1, 2, 3)' } );
	assert.equal( off.focus.width, undefined, 'the width of a switched-off outline is not written' );
	assert.equal( off.focus.ring, undefined );
	assert.equal( off.focus.offset, undefined );
	assert.equal( off.focus.near, '#010203', 'the glow of an outline-less look is still mapped' );
	assert.match( off.gaps.join( '|' ), /outline-style:none/ );
	assert.match( focusTokens( { 'outline-style': 'dashed', 'outline-width': '2px' } ).gaps.join( '|' ), /outline-style:dashed/ );
	assert.match( focusTokens( { 'outline-width': '0px', 'outline-color': '#fff' } ).gaps.join( '|' ), /outline-width:0px/ );
	const negative = focusTokens( { 'outline-width': '-2px', 'outline-color': '#fff' } );
	assert.equal( negative.focus.width, undefined, 'a negative width is not a width' );
	assert.match( negative.gaps.join( '|' ), /outline-width:-2px/ );
	const vars = focusTokens( { 'outline-color': 'var(--ring)', 'outline-width': '2px' } );
	assert.equal( vars.focus.ring, undefined );
	assert.match( vars.gaps.join( '|' ), /outline-color:var\(--ring\)/ );
	assert.equal( focusTokens( { 'outline-color': 'currentcolor' } ).focus.ring, undefined );
} );

test( 'a translucent ring colour is kept as written and a named or hex colour passes through', () => {
	assert.equal( focusTokens( { 'outline-color': 'rgba(10, 20, 30, 0.5)' } ).focus.ring, 'rgba(10, 20, 30, 0.5)' );
	assert.equal( focusTokens( { 'outline-color': '#ABCDEF' } ).focus.ring, '#ABCDEF' );
	assert.equal( focusTokens( { 'outline-color': 'rgb(255 0 0 / 100%)' } ).focus.ring, '#ff0000' );
} );

test( 'MUST FAIL: a pressed button takes active-transform and active-shadow under its variant', () => {
	const r = pressTokens( { declared: { transform: 'matrix(0.98, 0, 0, 0.98, 0, 1)', 'box-shadow': 'rgba(0, 0, 0, 0.2) 0px 1px 2px 0px' } }, 'primary' );
	assert.deepEqual( r, { variant: 'primary', tokens: { 'active-transform': 'matrix(0.98, 0, 0, 0.98, 0, 1)', 'active-shadow': 'rgba(0, 0, 0, 0.2) 0px 1px 2px 0px' }, gaps: [] } );
	assert.deepEqual( pressTokens( { transform: 'scale(0.97)' }, 'default' ).tokens, { 'active-transform': 'scale(0.97)' }, 'a flat declared map is accepted' );
} );

test( 'MUST FAIL: no transform, an identity matrix and an unset shadow write nothing; a pressed "none" shadow is a real look', () => {
	assert.deepEqual( pressTokens( { transform: 'none' }, 'outline' ).tokens, {} );
	assert.deepEqual( pressTokens( { transform: 'matrix(1, 0, 0, 1, 0, 0)' }, 'outline' ).tokens, {} );
	assert.deepEqual( pressTokens( {}, 'secondary' ).tokens, {} );
	assert.deepEqual( pressTokens( { 'box-shadow': 'none' }, 'secondary' ).tokens, { 'active-shadow': 'none' } );
} );

test( 'MUST FAIL: a pressed colour has no token and is a named gap; the link style and an unknown variant write nothing', () => {
	const colours = pressTokens( { 'background-color': 'rgb(0, 0, 0)', color: '#fff', transform: 'scale(0.9)' }, 'primary' );
	assert.deepEqual( Object.keys( colours.tokens ), [ 'active-transform' ] );
	assert.equal( colours.gaps.length, 2 );
	assert.match( colours.gaps[ 0 ], /background-color: sgs\/button paints no pressed colour/ );
	const link = pressTokens( { transform: 'scale(0.9)' }, 'link' );
	assert.deepEqual( [ link.tokens, link.gaps.length ], [ {}, 1 ] );
	assert.match( link.gaps[ 0 ], /never presses/, 'the link style is named, not reported as an unknown variant' );
	const odd = pressTokens( { transform: 'scale(0.9)' }, 'ghost' );
	assert.deepEqual( [ odd.tokens, odd.gaps.length ], [ {}, 1 ] );
} );
