// Fixture: a plain block with no SVG features and no dangerouslySetInnerHTML
// at all — negative control proving this rule stays quiet on an ordinary block.
export default function Edit( { attributes } ) {
	const { heading } = attributes;
	return <div>{ heading }</div>;
}
