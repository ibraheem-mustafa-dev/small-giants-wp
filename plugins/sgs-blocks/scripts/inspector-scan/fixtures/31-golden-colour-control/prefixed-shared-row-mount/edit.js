import { FixturePrefixedColourPanel } from '../_components/FixturePrefixedColourPanel';

// Mounts the prefixed shared component with a literal prefix; rule 31 resolves
// the row's attribute to `heading` + `FixtureColour`.
export default function Edit( { attributes, setAttributes } ) {
	return <FixturePrefixedColourPanel attributes={ attributes } setAttributes={ setAttributes } prefix="heading" />;
}
