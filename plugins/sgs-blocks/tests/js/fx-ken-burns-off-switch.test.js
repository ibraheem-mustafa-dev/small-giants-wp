/**
 * Ken Burns honours a motion layer's per-device off switch (Spec 38A FR-38A-23) through `bootGated`, in both modes:
 * the looping zoom (`animateLoop`) and the single `zoom-out-once` run (`registerLoop`). The shared cases live in
 * `helpers/fx-loop-off-switch-suite.js`; the stubbed viewport in `helpers/fx-viewport.js`.
 */

const {
	runLoopOffSwitchSuite,
} = require( './helpers/fx-loop-off-switch-suite' );

runLoopOffSwitchSuite( {
	name: 'ken burns loop',
	slug: 'ken-burns',
	runtime: '../../../src/shared/effects/fx-ken-burns.js',
} );

runLoopOffSwitchSuite( {
	name: 'ken burns zoom-out-once',
	slug: 'ken-burns',
	runtime: '../../../src/shared/effects/fx-ken-burns.js',
	extraAttr: 'data-sgs-fx-ken-burns-mode="zoom-out-once"',
} );
