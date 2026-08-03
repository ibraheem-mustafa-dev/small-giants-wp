import MediaPicker from '../../components/MediaPicker';

// PLANTED DEFECT — mirrors the REAL live shape found in brand-strip/edit.js
// and team-member/edit.js (2026-08-03 cross-check): this block has ZERO
// literal <img> of its own; the image comes entirely from the shared
// MediaPicker component (src/components/MediaPicker.js, which genuinely
// renders <img> — confirmed at :125). A rule that only greps its own text
// for <img> is blind to this. No decorative-image/ariaLabel attribute is
// declared, so this must be flagged.
export default function Edit( { attributes, setAttributes } ) {
	const { imageId } = attributes;
	return (
		<MediaPicker
			imageId={ imageId }
			onSelect={ ( id ) => setAttributes( { imageId: id } ) }
		/>
	);
}
