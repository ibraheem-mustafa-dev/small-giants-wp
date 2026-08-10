import { PanelBody } from '@wordpress/components';
import { ResponsiveControl } from '../../../../../src/components';

// Mirrors src/blocks/image-sequence/edit.js:283-327 (read live 2026-08-10)
// — uses the shared <ResponsiveControl> wrapper, which no longer renders a
// switcher of its own (Spec 35 Phase 1.2) and reads the tier from the
// global toggle. This is the CANONICAL post-fix pattern. Must NOT be
// flagged.
export default function Edit( { attributes, setAttributes } ) {
	return (
		<PanelBody title="Thumbnail">
			<ResponsiveControl label="Thumbnail for this screen size">
				{ ( bp ) => {
					if ( bp === 'desktop' ) {
						return <p>Uses the thumbnail above.</p>;
					}
					const key = bp === 'tablet' ? 'thumbnailTablet' : 'thumbnailMobile';
					return (
						<p>{ attributes[ key ] }</p>
					);
				} }
			</ResponsiveControl>
		</PanelBody>
	);
}
