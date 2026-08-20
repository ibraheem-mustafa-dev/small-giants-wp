// Static block: no render.php at all. The attribute is consumed here instead.
export default function save( { attributes } ) {
	return attributes.staticAttr;
}
