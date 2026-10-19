// Fixture SHARED component whose attribute names are built from a `prefix` prop, the shape of
// TypographyControls' outline colour row: the row reads `attributes[ k.fixtureColour ]`, where
// `k` comes from a keys factory that joins the prefix to a literal suffix. Rule 31 resolves the
// concrete attribute from each mount's literal `prefix`.
import { DesignTokenPicker } from '../../components';

function fixtureAttrName( prefix, base ) {
	return prefix ? prefix + base : base.charAt( 0 ).toLowerCase() + base.slice( 1 );
}

function fixtureAttrKeys( prefix ) {
	return {
		fixtureColour: fixtureAttrName( prefix, 'FixtureColour' ),
		fixtureColourHover: fixtureAttrName( prefix, 'FixtureColourHover' ),
	};
}

export function FixturePrefixedColourPanel( { attributes, setAttributes, prefix = '' } ) {
	const k = fixtureAttrKeys( prefix );
	return (
		<DesignTokenPicker
			label="Fixture prefixed colour"
			states={ [
				{
					key: 'normal',
					label: 'Normal',
					value: attributes[ k.fixtureColour ] || '',
					onChange: ( next ) => setAttributes( { [ k.fixtureColour ]: next ?? '' } ),
				},
				{
					key: 'hover',
					label: 'Hover',
					value: attributes[ k.fixtureColourHover ] || '',
					onChange: ( next ) => setAttributes( { [ k.fixtureColourHover ]: next ?? '' } ),
				},
			] }
		/>
	);
}
