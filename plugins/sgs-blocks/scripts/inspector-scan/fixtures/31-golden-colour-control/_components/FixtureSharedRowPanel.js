// Fixture SHARED panel (C4 step 2, 2026-08-20) — lives under the fixture's own
// isolated `_components/` directory (ctx.componentsDir points here during
// self-test; see buildTestCtx in core/selftest.js), NOT under the real
// src/components/. This proves rule 31's shared-owner scan can reach a colour
// row defined OUTSIDE a mounting block's own edit.js, without depending on any
// real, actively-edited framework file (a real example of this exact pattern
// lives in container/components/GridItemDefaultsPanel.js, deliberately not
// used here so this fixture cannot be broken by drift in that live file).
//
// Standalone DesignTokenPicker, legacy value=/onChange= shape: no states
// array (1 state), no gradient path. Mirrors legacy-single-value-row's shape
// exactly, just relocated to a file reached via a component mount instead of
// living directly in a block's edit.js.
import { DesignTokenPicker } from '../../components';

export function FixtureSharedRowPanel( { attributes, setAttributes } ) {
	return (
		<DesignTokenPicker
			label="Fixture shared colour"
			value={ attributes.fixtureSharedColour }
			onChange={ ( value ) => setAttributes( { fixtureSharedColour: value || '' } ) }
		/>
	);
}
