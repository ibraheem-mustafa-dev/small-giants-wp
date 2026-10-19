import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import MediaPicker from '../../components/MediaPicker';

/**
 * Floating layer — the optional image: choose, replace or remove it.
 *
 * @param {Object}      props
 * @param {Object|null} props.media    The current media object, or null.
 * @param {Function}    props.onSelect Called with the picked media.
 * @param {Function}    props.onRemove Called when the image is removed.
 * @return {JSX.Element} Inspector panel.
 */
export default function LayerImagePanel( { media, onSelect, onRemove } ) {
	return (
		<PanelBody title={ __( 'Image', 'sgs-blocks' ) }>
			<MediaPicker
				value={ media }
				onChange={ onSelect }
				onRemove={ onRemove }
				label={ __( 'Choose image', 'sgs-blocks' ) }
				instructionsImage={ __(
					'Optional. A layer can also hold only text, a label or a badge.',
					'sgs-blocks'
				) }
			/>
		</PanelBody>
	);
}
