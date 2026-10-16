/**
 * Ambient float honours a motion layer's per-device off switch (Spec 38A FR-38A-23) through `bootGated`. The shared
 * cases live in `helpers/fx-loop-off-switch-suite.js`; the stubbed viewport in `helpers/fx-viewport.js`.
 */

const {
	runLoopOffSwitchSuite,
} = require( './helpers/fx-loop-off-switch-suite' );

runLoopOffSwitchSuite( {
	name: 'ambient float',
	slug: 'ambient-float',
	runtime: '../../../src/shared/effects/fx-ambient-float.js',
} );
