// The site-option step. Run: node --test tests/apply-options.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { optionsOf, progressTpl } from '../apply-options.mjs';

test( 'the progress element is the one a scroll record scales from scaleX(0) to scaleX(1); other records name none', () => {
	const rec = ( type, from, to ) => ( { trigger: { type }, element: { template_tpl_id: '38' }, properties: [ { property: 'transform', from, to } ] } );
	assert.equal( progressTpl( [ rec( 'scroll-position', 'scaleX(0)', 'scaleX(1)' ) ] ), '38' );
	assert.equal( progressTpl( [ rec( 'hover', 'scaleX(0)', 'scaleX(1)' ), rec( 'scroll-position', 'scale(1)', 'scale(2)' ) ] ), null );
} );

test( 'a gradient bar writes the gradient and height; a flat bar the colour; a height outside 2 to 8 is left', () => {
	const g = optionsOf( { backgroundImage: 'linear-gradient(90deg, rgb(1, 2, 3) 0%, rgb(4, 5, 6) 100%)', backgroundColor: 'rgba(0, 0, 0, 0)', height: '3px' } );
	assert.deepEqual( Object.keys( g ), [ 'sgs_floating_ui_reading_progress_gradient', 'sgs_floating_ui_reading_progress_height' ] );
	assert.deepEqual( optionsOf( { backgroundImage: 'none', backgroundColor: 'rgb(1, 2, 3)', height: '12px' } ), { sgs_floating_ui_reading_progress_colour: 'rgb(1, 2, 3)' } );
	assert.deepEqual( optionsOf( { backgroundImage: 'none', backgroundColor: 'rgba(0, 0, 0, 0)', height: '3px' } ), { sgs_floating_ui_reading_progress_height: 3 } );
} );
