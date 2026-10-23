// A rule's origin (lib/rule-origin.mjs): a block's sgsCustomCss residual is known by its own element or, once lifted into
// the consolidated sheet, by the scoper's doubled per-instance scope; anything else stays a stylesheet rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ruleOrigin, withOrigin } from '../lib/rule-origin.mjs';

test( 'MUST FAIL: the doubled sgs-c- scope classes a lifted rule custom-css; a single, mixed or longer second class does not', () => {
	const at = ( selector, owner = 'sgs-blocks-css' ) => ruleOrigin( { selector, owner } );
	assert.equal( at( '.sgs-c-ab12.sgs-c-ab12' ), 'custom-css' );
	assert.equal( at( 'a.sgs-c-ab12.sgs-c-ab12 h2, .x' ), 'custom-css', 'an element-qualified scope inside a list' );
	assert.equal( at( '.sgs-c-0a1b2c3d-2.sgs-c-0a1b2c3d-2:hover' ), 'custom-css', 'a hash uid with its occurrence suffix' );
	assert.equal( at( '.sgs-c-ab12' ), 'stylesheet' );
	assert.equal( at( '.sgs-c-ab12.sgs-c-cd34' ), 'stylesheet' );
	assert.equal( at( '.sgs-c-ab12.sgs-c-ab12-3' ), 'stylesheet', 'two different uids that share a prefix' );
	assert.equal( at( '.sgs-c-abc.sgs-c-abc' ), 'stylesheet', 'a key shorter than 4 characters is no scoper uid' );
	assert.equal( at( '.sgs-button-1234abcd', 'sgs-custom-css-c1' ), 'custom-css', 'the residual element' );
	assert.equal( at( '.sgs-button-1234abcd', '' ), 'stylesheet' );
	assert.equal( ruleOrigin( { rule: 'element.style', owner: null } ), 'inline' );
	assert.equal( ruleOrigin( { rule: '.sgs-c-ab12.sgs-c-ab12', owner: '' } ), 'custom-css', 'a winner names its selector as rule' );
	assert.deepEqual( withOrigin( [ { selector: '.a', owner: '' } ] ), [ { selector: '.a', owner: '', origin: 'stylesheet' } ] );
} );
