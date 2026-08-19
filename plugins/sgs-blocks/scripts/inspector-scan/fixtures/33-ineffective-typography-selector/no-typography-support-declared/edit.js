// Deliberately does not reference the selectors.typography class anywhere,
// and would flag as case (a) DEAD if the rule evaluated it — proving the
// `supports.typography` gate is the thing keeping it out of scope, not luck.
export default function Edit() {
	return <div>Preview</div>;
}
