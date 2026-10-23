// A rule's origin (lib/rule-origin.mjs): a block's sgsCustomCss residual is known by its own element or, once lifted into
// the consolidated sheet, by the scoper's doubled per-instance scope; anything else stays a stylesheet rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ruleOrigin, withOrigin } from '../lib/rule-origin.mjs';

test( 'MUST FAIL: the doubled sgs-c- scope classes a lifted rule custom-css; a single, mixed or longer second class does not', () => {
	const at = ( selector, owner = 'sgs-blocks-collected' ) => ruleOrigin( { selector, owner } );
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

test( 'MUST FAIL: a rule whose stylesheet WordPress or the theme owns is never custom-css, whatever its selector', () => {
	const scope = '.sgs-c-ab12.sgs-c-ab12 h2';
	for ( const owner of [ 'wp-block-library-css', 'wp-block-library-theme-css', 'global-styles-inline-css', 'classic-theme-styles-inline-css', 'core-block-supports-inline-css' ] ) {
		assert.equal( ruleOrigin( { selector: scope, owner } ), 'stylesheet', `owner ${ owner }` );
	}
	for ( const sheet of [ 'https://x.test/wp-includes/css/dist/block-library/style.min.css?ver=7.1', 'https://x.test/wp-content/themes/sgs-theme/style.css', 'https://x.test/wp-content/plugins/sgs-blocks/build/blocks/hero/style-index.css' ] ) {
		assert.equal( ruleOrigin( { selector: scope, owner: '', sheet } ), 'stylesheet', `sheet ${ sheet }` );
	}
	assert.equal( ruleOrigin( { selector: '.sgs-button-1', owner: 'sgs-custom-css-c1', sheet: 'inline <style>' } ), 'custom-css', 'a real residual element stays custom-css' );
	assert.equal( ruleOrigin( { selector: scope, owner: 'sgs-custom-css-c1', sheet: 'inline <style>' } ), 'custom-css' );
	assert.equal( ruleOrigin( { selector: scope, owner: '', sheet: 'inline <style>' } ), 'custom-css', 'a doubled scope from an unowned inline style' );
	assert.equal( ruleOrigin( { selector: scope, owner: 'sgs-blocks-collected', sheet: 'inline <style>' } ), 'custom-css', 'the collected sheet carries lifted residuals' );
	assert.equal( ruleOrigin( { selector: scope, owner: '', sheet: 'https://x.test/wp-content/uploads/sgs-css/sgs-1-abc.css' } ), 'custom-css', 'the collected file in uploads' );
	assert.equal( ruleOrigin( { selector: '.a', owner: 'wp-block-library-css' } ), 'stylesheet' );
} );

test( 'MUST FAIL: the SGS stylesheets are known by their real handles (an sgs- owner id), never custom-css; the residual and the collected sheet are not theirs', () => {
	const scope = '.sgs-c-ab12.sgs-c-ab12 h2';
	// Real handles: the theme's functions.php (sgs-core-blocks, sgs-utilities, sgs-layout-tokens, sgs-type-scale) and an
	// inline style added to one (-inline-css); WordPress prints `<handle>-css` as the element id.
	for ( const owner of [ 'sgs-core-blocks-css', 'sgs-utilities-css', 'sgs-layout-tokens-css', 'sgs-type-scale-inline-css', 'sgs-core-blocks-critical-css' ] ) {
		assert.equal( ruleOrigin( { selector: scope, owner } ), 'stylesheet', `owner ${ owner }` );
	}
	assert.equal( ruleOrigin( { selector: scope, owner: 'sgs-custom-css-c1' } ), 'custom-css', 'the residual element keeps its own prefix' );
	assert.equal( ruleOrigin( { selector: scope, owner: 'sgs-blocks-collected' } ), 'custom-css', 'the collected inline sheet holds lifted residuals' );
	assert.equal( ruleOrigin( { selector: scope, owner: 'sgs-blocks-collected-css' } ), 'custom-css', 'the collected file link holds lifted residuals' );
	assert.equal( ruleOrigin( { selector: '.a', owner: 'sgs-blocks-collected-css' } ), 'stylesheet', 'a plain rule in the collected sheet' );
	assert.equal( ruleOrigin( { selector: scope, owner: 'other-plugin-css' } ), 'custom-css', 'an unknown owner falls to the scope test' );
} );
