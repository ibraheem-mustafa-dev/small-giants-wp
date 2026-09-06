// Fixture SHARED panel — the NEGATIVE CONTROL half of the shared-owner scan
// proof (C4 step 2, 2026-08-20). Same isolation rationale as
// FixtureSharedRowPanel.js: lives under the fixture's own `_components/`, not
// the real tree. A fully conformant 2-state, gradient-on-both-states row via
// SgsColourPanel — mirrors two-state-with-gradient's shape exactly, just
// relocated to a file reached via a component mount. This fixture is only
// meaningful if it genuinely fails when the shared-owner walk breaks (e.g. if
// a future edit stops resolving SgsColourPanel `rows` in a shared file, or
// starts flagging conformant rows) — it is not a filler mustNotFlag.
import { SgsColourPanel } from '../../components';

export function FixtureCleanSharedRowPanel( { attributes, setAttributes } ) {
	const {
		fixtureCleanColour,
		fixtureCleanColourGradient,
		fixtureCleanColourHover,
		fixtureCleanColourHoverGradient,
	} = attributes;
	return (
		<SgsColourPanel
			rows={ [
				{
					key: 'fixture-clean',
					label: 'Fixture clean colour',
					states: [
						{
							key: 'normal',
							label: 'Normal',
							value: fixtureCleanColour,
							onChange: ( val ) => setAttributes( { fixtureCleanColour: val ?? '' } ),
							gradientValue: fixtureCleanColourGradient,
							onGradientChange: ( val ) =>
								setAttributes( { fixtureCleanColourGradient: val ?? '' } ),
						},
						{
							key: 'hover',
							label: 'Hover',
							value: fixtureCleanColourHover,
							onChange: ( val ) => setAttributes( { fixtureCleanColourHover: val ?? '' } ),
							gradientValue: fixtureCleanColourHoverGradient,
							onGradientChange: ( val ) =>
								setAttributes( { fixtureCleanColourHoverGradient: val ?? '' } ),
						},
					],
				},
			] }
		/>
	);
}
