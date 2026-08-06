'use strict';

// GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 14
// source=file evidence=PORTED VERBATIM from
// plugins/sgs-blocks/scripts/audit-inspector-conformance.js:311-313,432-439
// (mediaUploadUsed / mediaUploadCheckUsed presence tracking + the
// file-level, not per-instance, finding) — read live 2026-08-05 (STOP-22).
// Cross-checked independently the same day with a standalone Babel walk
// over all 84 src/blocks/**/edit.js files: 10 files use <MediaUpload>, and
// of those, 0 have zero <MediaUploadCheck> anywhere in the same file.
// EXPECTED POPULATION declared before running this port: 0 (matches the OLD
// script's live --json output the same day: 0 FLAGGED, 0 EXCEPTION for
// this rule).
//
// SCOPE NOTE (kept identical to OLD): this is a FILE-LEVEL presence check,
// not a per-instance structural check — it flags "MediaUpload used
// somewhere in this file with MediaUploadCheck used nowhere in this file",
// not "this specific MediaUpload is wrapped by a MediaUploadCheck
// ancestor". A file with 3 MediaUpload elements and 1 MediaUploadCheck
// wrapping only one of them passes this rule exactly as it did under the
// OLD script — the same known blind spot, preserved for equivalence, not
// fixed here.
//
// BLIND SPOTS (declared, not fixed here — same blind spots the OLD script
// had, preserved for equivalence):
//   - Per-instance wrapping (see above) is not verified — only
//     file-level co-occurrence.
//   - A MediaUpload rendered via a shared component (e.g. MediaGalleryPicker,
//     which is known to internally wrap its own MediaUploadCheck) is
//     invisible to this rule exactly like the OLD script — it only sees a
//     literal `<MediaUpload` / `<MediaUploadCheck` JSX tag in the block's
//     OWN edit.js text, not inside an imported component's source. This is
//     the same class of gap rule 18 found and fixed for <img>/MediaPicker;
//     it has NOT been re-derived here, deliberately, to preserve exact OLD
//     behaviour for this port (a widening would need its own measured
//     before/after, not a silent addition during a verbatim port).

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

function jsxName( openingElement ) {
	const n = openingElement.name;
	if ( ! n ) return null;
	if ( n.type === 'JSXIdentifier' ) return n.name;
	if ( n.type === 'JSXMemberExpression' ) {
		return n.property && n.property.name ? n.property.name : null;
	}
	return null;
}

module.exports = {
	id: '14-media-upload-check',
	checklistItem: 14,
	title: 'Every MediaUpload is wrapped in MediaUploadCheck (capability gate)',
	scope: 'per-block',
	needs: [ 'ast:edit.js' ],
	run( ctx, block ) {
		const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
		let mediaUploadUsed = false;
		let mediaUploadCheckUsed = false;
		const ok = ctx.cache.traverse( editFile, {
			JSXOpeningElement( nodePath ) {
				const name = jsxName( nodePath.node );
				if ( name === 'MediaUpload' ) mediaUploadUsed = true;
				if ( name === 'MediaUploadCheck' ) mediaUploadCheckUsed = true;
			},
		} );
		if ( ! ok ) return [];
		if ( ! mediaUploadUsed || mediaUploadCheckUsed ) return [];

		return [
			makeFinding( {
				rule: this.id,
				block: block.slug,
				file: editFile,
				severity: 'warn',
				detail: `${ editFile } — <MediaUpload> used with no <MediaUploadCheck> capability gate anywhere in file`,
				fix: 'Wrap the MediaUpload (and its trigger button) in <MediaUploadCheck fallback={...}> so a user without the upload_files capability sees a fallback instead of a broken uploader.',
				keyParts: [ 'media-upload-no-check' ],
			} ),
		];
	},
	selfTest: {
		fixture: 'fixtures/14-media-upload-check',
		mustFlag: [ 'mediaupload-no-check' ],
		mustNotFlag: [ 'mediaupload-with-check', 'no-mediaupload-at-all' ],
	},
};
