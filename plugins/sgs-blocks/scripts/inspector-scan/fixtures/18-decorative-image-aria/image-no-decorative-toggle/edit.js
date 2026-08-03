// PLANTED DEFECT: renders <img> with no decorative-image toggle or
// ariaLabel attribute declared in block.json.
export default function Edit( { attributes } ) {
	const { imageUrl, imageAlt } = attributes;
	return <img src={ imageUrl } alt={ imageAlt } />;
}
