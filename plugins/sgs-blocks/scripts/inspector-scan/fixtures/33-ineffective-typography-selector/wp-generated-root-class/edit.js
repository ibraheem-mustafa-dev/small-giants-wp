// GROUND-TRUTH: fixture reproduces the real sgs/social-icons /
// sgs/modal shape (both live-read 2026-08-18) — supports.typography is
// declared with no selectors.typography key, so it falls back to
// selectors.root, which equals the WP-core-generated `wp-block-<ns>-<name>`
// class WordPress writes at render time via get_block_wrapper_attributes().
// That class is legitimately absent from this file's own source.
export default function Edit() {
	return <div>Preview</div>;
}
