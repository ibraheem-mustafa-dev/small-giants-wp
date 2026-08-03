// NEGATIVE CONTROL: renders <img>, but block.json declares "isDecorative" —
// the decorative-image toggle checklist item 18 asks for. Must NOT be flagged.
export default function Edit( { attributes } ) {
	const { imageUrl, imageAlt, isDecorative } = attributes;
	return <img src={ imageUrl } alt={ isDecorative ? '' : imageAlt } aria-hidden={ isDecorative } />;
}
