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

// One real reason string of each kind the motion, state, link-attribute, presence and media writers raise (the newest Fill
// runs of three clients), with the class, FR-48-65 class and candidacy its rule states.
const WRITERS = [
	[ "a one-shot animation on a route trigger: the draft's route drives it, which no layer or setting holds yet", 'trigger-no-layer', 'F-behaviour', false ],
	[ "a one-shot animation the draft's state starts: the block publishes no open or named state for this element to play it on (Spec 38A, FR-48-80)", 'trigger-no-layer', 'F-behaviour', false ],
	[ 'no effect draws this loop (translate moving, normal, 3200ms; tried marquee, ambient-float, ken-burns): a Spec 38 gap', 'trigger-no-layer', 'F-behaviour', false ],
	[ "the draft drives this hover from an ancestor's hover, and the block declares no item host (supports.sgs.animationItems) for the hover layer's Card hovered source, so it is written to play on the element's own hover", 'trigger-no-layer', 'F-behaviour', false ],
	[ 'sgs/container has no motion support; the record is also skipped: a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12)', 'reduced-motion', 'held', false ],
	[ 'sgs/heading has no motion support', 'no-motion-support', 'F-behaviour', false ],
	[ 'sgs/heading has no motion support; the record is also skipped: status dead-code: the draft never runs it', 'never-runs', 'render-wins', false ],
	[ 'status no-op: the draft never runs it', 'never-runs', 'render-wins', false ],
	[ "the code's record names this element, but the render shows no entrance at 375, 768, 1440, so the render wins and nothing is written", 'render-shows-none', 'render-wins', false ],
	[ "the draft's code starts this loop on route, and the render showed it not running on an untouched page, so nothing is written", 'render-shows-none', 'render-wins', false ],
	[ 'ripple: sgs/button does not offer ripple (generated-fx-qualifying-blocks.json)', 'effect-not-offered', 'F-behaviour', false ],
	[ 'a script-written js-style-write on mount: recognised by the behaviour recognisers wave (FR-48-77)', 'script-motion', 'W-route', false ],
	[ 'PS-005 (css-pseudo, hover) belongs to this surface, but no effect, setting or handover holds it: nothing recognised it, and a run that cannot place a record names it here', 'unaccounted-record', 'W-route', false ],
	[ 'J-11 maps onto settings of sgs/card-grid; this element is sgs/container', 'behaviour-other-block', 'W-route', false ],
	[ 'sgs/container declares no tiltMaxAngle setting', 'behaviour-no-setting', 'F-setting', true ],
	[ "the render's from-pose matches more than one run-time entrance equally", 'entrance-ambiguous', 'W-route', false ],
	[ "glareOpacity: the glare layers of the [data-tilt] elements differ in glareOpacity (0.42 on a, 0.3 on b): the tilt's one glare layer cannot hold them all, so the glare's own default stands", 'one-layer-value', 'F-setting', true ],
	[ 'focus-differs: keyboard focus paints with the hover look and the theme focus ring (settings.custom.focus); a different per-element focus look has no setting', 'state-look', 'F-setting', true ],
	[ "focus-shares-hover: colourTextHover paints the draft's hover color on :focus-visible too, and the draft keeps its resting color on focus; it is not separated", 'state-look', 'F-setting', true ],
	[ "press: a pressed look is sgs/button's buttonPresets active token (the theme snapshot), not a per-element setting", 'press-token', 'W-route', false ],
	[ 'state-refused: state "open" of S-09 was not opened: it opened at 375, 768 only, so it was not read at 1024, 1440', 'state-refused', 'W-walker', false ],
	[ 'clip-path has no hover channel', 'no-hover-channel', 'F-setting', true ],
	[ 'the block does not declare supports.anchor, so no setting holds its id', 'id-no-setting', 'F-setting', true ],
	[ 'an id on the nested element ".sgs-x__y" has no setting (anchor belongs to the block\'s root)', 'id-no-setting', 'F-setting', true ],
	[ 'the draft shows ".sgs-x__badge" and no setting of the block shows it (calibration found it in no default render and in no presence list)', 'presence-no-setting', 'F-setting', true ],
	[ 'walker-state-refused: walker state "open" of S-17 is not walked: "open": no usable state key (R.pin: a render value or selector, not a state key name) and no setState call in its how_to_reach', 'walker-state-refused', 'W-walker', false ],
	[ 'walker-state-refused: walker state "phone" of S-33 is not walked: it holds at none of the walk widths (375, 768, 1024, 1440px)', 'walker-state-refused', 'W-walker', false ],
	[ 'sgs/gallery holds its items in mediaItems; the draft element draws no loop or current-item list, so the block keeps its default items', 'list-items-unread', 'W-route', false ],
	[ 'sgs/option-picker holds its items in optionItems; the draft element draws no loop or current-item list (no skeleton inventory beside the skeleton), so the block keeps its default items', 'list-items-unread', 'W-route', false ],
	[ "the draft's logic is not read (no draft folder), so the items behind its current-item display are unknown", 'list-items-unread', 'W-route', false ],
	[ "sgs/gallery holds a list and there is no fact record (run intake), so the draft's items are not read", 'list-items-unread', 'W-route', false ],
	[ 'the element shows 2 current-item displays (a, b), so which list the block holds is not decided', 'list-items-unread', 'W-route', false ],
	[ 'the draft image "https://cdn.example/a.jpg" is not a file of the draft, so it has no uploaded copy; add it to sites/<client>/assets and run media-upload', 'media-unwritten', 'W-route', false ],
];

test( 'MUST FAIL: each reason kind of the motion, state, link-attribute, presence and media writers lands in its named class', () => {
	for ( const [ text, cls, fr, candidate ] of WRITERS ) {
		const rule = u( text );
		assert.ok( rule, `unclassified: ${ text.slice( 0, 70 ) }` );
		assert.deepEqual( [ rule.class, rule.frClass, !! rule.candidate ], [ cls, fr, candidate ], text.slice( 0, 70 ) );
		assert.ok( rule.owner, `${ cls } names an owner` );
	}
} );

test( 'negative control: the writer rules keep the earlier classes and refuse near misses', () => {
	assert.equal( u( 'a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself' )?.class, 'reduced-motion' );
	assert.equal( u( 'the render shows motion (an endless animation, a marquee or an SVG animation) on this element, whose block has no motion support to write it to (sgs/heading has no motion support)' )?.class, 'motion', 'a shown loop stays the motion route class' );
	assert.equal( u( 'no declared part of sgs/card is this element (.x)' )?.class, 'no-declared-part' );
	assert.equal( u( 'no-setting: sgs/button has no setting for clip-path' )?.class, 'no-setting' );
	assert.equal( u( 'focus-different: something else' ), null );
	assert.equal( u( 'status active: the draft runs it' ), null );
	assert.equal( u( 'J-11 maps onto nothing' ), null );
	assert.equal( u( 'state-refused: state "open" of S-09 was not opened: it opened at 375 only' )?.class, 'state-refused', 'the opener refusal keeps its own class' );
	assert.equal( u( 'walker state "open" is not walked' ), null, 'a walker-state text without the writer prefix stays unclassified' );
	assert.equal( u( 'sgs/gallery holds its items in mediaItems' ), null, "the list rule needs the writer's whole sentence" );
	assert.equal( u( 'current-item: the nav shows the current page' )?.class, 'current-item', 'a current-item row keeps its class' );
} );
