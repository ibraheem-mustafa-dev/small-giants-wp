// Mirrors sgs/media's real shape: the block does not mount `<MediaElementPanel`
// directly — it goes through a local wrapper component (real block:
// MediaPanelLayout.js). For this fixture the mount is inlined directly so the
// self-test proves the block-level "does this file mention MediaElementPanel"
// signal, without depending on a real cross-fixture-boundary import.
import MediaElementPanel from '../../components/MediaElementPanel.js';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<MediaElementPanel
			attributes={ attributes }
			setAttributes={ setAttributes }
			atoms={ [ 'object-fit', 'overlay' ] }
			blockSlug="sgs/media"
		/>
	);
}
