// Proves the census class list (data/census-classes.json, FR-48-65) names every reason kind the Indus header Fill run raised:
// one real reason string of each kind lands in its class with the FR-48-65 class and candidacy the rule states.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules, classify } from '../lib/fill-census.mjs';

const rules = loadRules();
const u = ( text ) => classify( text, rules.unmapped );
const h = ( text ) => classify( text, rules.held );

const UNMAPPED = [
	[ 'a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12)', 'reduced-motion', 'held', false ],
	[ 'timing-no-home: sgs/site-header has no setting that holds the resting transition-duration of this element (no-setting)', 'timing-no-home', 'F-setting', true ],
	[ 'timing-no-home: sgs/nav-bar-menu has no setting that holds the resting transition-delay of .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(3) (no-setting)', 'timing-no-home', 'F-setting', true ],
	[ 'timing-conflict: the motion hover layer (sgsMotion) times colour, background, border colour and shadow of this element with one transition-duration, 0.2s (background, color); the draft times box-shadow at 0.25s', 'timing-conflict', 'F-setting', true ],
	[ 'default-state: sgs/nav-bar-menu changes background-color on hover by itself and the draft does not, and nothing holds it (it is held with color, which cannot be)', 'default-state', 'F-setting', true ],
	[ 'default-state: sgs/nav-bar-menu changes color on hover by itself and the draft does not, and nothing holds it (ambiguous: navColourHover, burgerColourHover all paint color on ".sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger")', 'default-state', 'F-setting', true ],
	[ 'default-state: navColourHover already holds "primary" on this block, and this element\'s resting color is "custom-ink"', 'default-state', 'F-setting', true ],
	[ 'used-value: width is the box\'s used size, not a declared value (the draft declares {"375":"var(--b2,13px)","768":"var(--b2,13px)"})', 'used-value', 'W-walker', false ],
	[ 'script-look: open on Root/50#0 (open-panel look): no-setting: sgs/nav-bar-menu has no setting for transform (open); equivalence: 1 spelling: no shorthand | 5 judges: nothing written, so the walker judges the row; items with it: copy 0; without it: none', 'script-look', 'F-setting', true ],
];

test( 'MUST FAIL: each reason kind of the Indus header run lands in its named class', () => {
	for ( const [ text, cls, fr, candidate ] of UNMAPPED ) {
		const rule = u( text );
		assert.ok( rule, `unclassified: ${ text.slice( 0, 70 ) }` );
		assert.deepEqual( [ rule.class, rule.frClass, !! rule.candidate ], [ cls, fr, candidate ], text.slice( 0, 70 ) );
		assert.ok( rule.owner, `${ cls } names an owner` );
	}
} );

test( 'MUST FAIL: a held inert row is held-inert', () => {
	const rule = h( 'inert' );
	assert.deepEqual( [ rule?.class, rule?.frClass ], [ 'held-inert', 'held' ] );
} );

test( 'negative control: a near-miss reason keeps its other class or stays unclassified', () => {
	assert.equal( u( 'timing-computed: the draft times a computed value' )?.class, 'motion' );
	assert.equal( u( 'default-state: color follows the element\'s colour, so the colour\'s hold holds it' ), null );
	assert.equal( u( 'a rule about something else: the motion model' ), null );
	assert.equal( u( 'no-setting: sgs/button has no setting for transform' )?.class, 'no-setting' );
	assert.equal( u( 'x default-state: sgs/a changes color on hover by itself and the draft does not, and nothing holds it' ), null );
	assert.equal( h( 'inertia' ), null );
} );
