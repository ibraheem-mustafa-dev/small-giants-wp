import { FixturePrefixedWrongMechanismPanel } from '../_components/FixturePrefixedWrongMechanismPanel';

// Mounts the prefixed shared component with a literal prefix; rule 31 resolves
// the row's attribute to `heading` + `FixtureColour`.
export default function Edit( { attributes, setAttributes } ) {
	return <FixturePrefixedWrongMechanismPanel attributes={ attributes } setAttributes={ setAttributes } prefix="heading" />;
}
