'use strict';

// Deliberately-broken meta-fixture (design §4.9 / H6-applied-to-the-tester).
// This "rule" never flags anything, no matter the input. The self-test
// harness MUST catch this and report it as FAILING its own mustFlag
// assertion — if the harness instead reports this as PASS, the harness
// itself is a gate that cannot fail, which is worse than no gate at all.
module.exports = {
	id: '_harness-always-passes',
	checklistItem: null,
	title: 'META: a rule that never flags anything (harness negative control)',
	scope: 'per-block',
	needs: [],
	run() {
		return [];
	},
	selfTest: {
		// Reuses rule 01's fixture, which has a KNOWN real defect
		// (multi-panel-no-group). Because this rule never flags anything, the
		// mustFlag assertion for that fixture must fail.
		fixture: 'fixtures/01-tab-group',
		mustFlag: [ 'multi-panel-no-group' ],
		mustNotFlag: [ 'multi-panel-with-group', 'single-panel' ],
	},
};
