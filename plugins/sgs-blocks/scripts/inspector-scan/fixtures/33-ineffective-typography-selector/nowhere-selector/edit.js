// GROUND-TRUTH: fixture reproduces the real sgs/testimonial-slider shape
// (testimonial-slider/render.php:211, live-read 2026-08-18) — its own
// comment states the declared selectors.typography class "no element in
// this block's own markup ever carried". This edit.js never references the
// declared class at all.
export default function Edit() {
	return <div className="sgs-nowhere-selector__root">Preview</div>;
}
