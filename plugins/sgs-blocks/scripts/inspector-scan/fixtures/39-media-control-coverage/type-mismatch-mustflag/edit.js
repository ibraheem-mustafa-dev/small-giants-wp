// Deliberately hand-rolled: `mediaType` offers image/video/svg, but the only
// declared atom is `link`, whose registry.js `types` is `[ 'image' ]` only —
// picking video or svg leaves the link concept with no control at all, and
// with no `MediaElementPanel` mount nothing dynamically hides or substitutes
// for the gap.
export default function Edit() {
	return null;
}
