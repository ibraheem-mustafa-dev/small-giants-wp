// NEGATIVE CONTROL: renders <img> per repeater item, and the item schema
// (logos.items.properties.decorative) declares a nested decorative field —
// the correct shape for a per-item toggle (D918/S8). Must NOT be flagged.
export default function Edit( { attributes } ) {
	const { logos } = attributes;
	return logos.map( ( logo, i ) => (
		<img key={ i } src={ logo.url } alt={ logo.decorative ? '' : logo.alt } aria-hidden={ logo.decorative } />
	) );
}
