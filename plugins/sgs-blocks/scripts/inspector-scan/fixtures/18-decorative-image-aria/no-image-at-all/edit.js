// NEGATIVE CONTROL: no <img> anywhere in this block. Nothing for item 18 to
// check. Must NOT be flagged.
export default function Edit( { attributes } ) {
	return <p>{ attributes.text }</p>;
}
