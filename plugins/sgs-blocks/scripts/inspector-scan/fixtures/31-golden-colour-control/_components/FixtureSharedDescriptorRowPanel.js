// Fixture SHARED panel proving the descriptor-resolution fix applies to
// scanSharedOwnerRows() too, not only the per-block walk — the file's own
// `statesProvidedByParent` comment warns these are TWO SEPARATE walks over
// the same question, and a guard/fix added to one must be added to both.
//
// Standalone DesignTokenPicker mounted via `states={ ident.states }` where
// `ident` is bound to a fillRow() call — the SAME shape as
// standalone-descriptor-row-conformant, just relocated to a file reached via
// a component mount instead of living directly in a block's edit.js. 2
// states, gradient on both — must NOT flag.
import { DesignTokenPicker, fillRow } from '../../components';

export function FixtureSharedDescriptorRowPanel( { attributes, setAttributes } ) {
	const row = fillRow( {
		key: 'fixtureSharedDescriptor',
		label: 'Fixture shared descriptor colour',
		attrs: {
			base: 'fixtureSharedDescriptorColour',
			hover: 'fixtureSharedDescriptorColourHover',
			gradient: 'fixtureSharedDescriptorColourGradient',
			hoverGradient: 'fixtureSharedDescriptorColourHoverGradient',
		},
		attributes,
		setAttributes,
	} );
	return <DesignTokenPicker label={ row.label } states={ row.states } />;
}
