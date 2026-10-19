import { FixturePrefixedMixedPanel } from '../_components/FixturePrefixedMixedPanel';

// Mounts the shared prefixed component with the literal prefix "body".
export default function Edit( { attributes, setAttributes } ) {
	return <FixturePrefixedMixedPanel attributes={ attributes } setAttributes={ setAttributes } prefix="body" />;
}
