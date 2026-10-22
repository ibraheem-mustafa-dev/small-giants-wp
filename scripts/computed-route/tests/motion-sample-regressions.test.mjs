// The pose sampler's literal check: a keyframe value counts as computed only when it is a token of the formula, so a
// formula that merely contains its digits (`x*10` for a 0 to 1 opacity) still samples the literal values.
import test from 'node:test';
import assert from 'node:assert/strict';
import { codePoseAt } from '../lib/motion-sample.mjs';

const given = ( formula ) => ( { mechanism: 'web-animation', properties: [ { property: 'opacity', from: '0', to: '1', formula, easing: 'linear' } ] } );

test( 'a literal opacity is sampled when the formula only contains its digits', () => {
	assert.equal( codePoseAt( given( 'x*10' ), 0.5 ).opacity, 0.5 );
} );

test( 'a literal endpoint that the formula uses as a token is not sampled as a literal', () => {
	assert.equal( 'opacity' in codePoseAt( given( 'x*1' ), 0.5 ), false );
} );
