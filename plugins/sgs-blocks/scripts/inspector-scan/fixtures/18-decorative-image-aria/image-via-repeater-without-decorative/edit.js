// POSITIVE CONTROL: renders <img> per repeater item, but the item schema
// (logos.items.properties) has no decorative/ariaLabel/altText field — this
// proves the array-recursion fix doesn't blanket-exempt every array attr.
// Must still be flagged.
export default function Edit( { attributes } ) {
	const { logos } = attributes;
	return logos.map( ( logo, i ) => (
		<img key={ i } src={ logo.url } alt={ logo.alt } />
	) );
}
