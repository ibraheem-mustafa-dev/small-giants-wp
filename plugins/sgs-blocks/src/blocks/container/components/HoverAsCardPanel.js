/**
 * "Hover as one card": the container is a hover group without being a link.
 *
 * `hoverAsCard` stamps `data-sgs-hover-group` on the container root
 * (includes/motion/class-sgs-motion-renderer.php::render), so every child whose
 * hover settings use the "container hovered" source (motion hover, colour hovers)
 * plays from one hover, or keyboard focus, anywhere on the card. A container with
 * a whole-block link is already a hover group; this is for a card with no link.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl } from '@wordpress/components';

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {Element} The panel.
 */
export default function HoverAsCardPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody
			title={ __( 'Hover as one card', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<ToggleControl
				label={ __( 'Children follow the card hover', 'sgs-blocks' ) }
				help={ __(
					'Hovering anywhere on this container plays the hover settings of the blocks inside it that are set to follow the container (heading and text colours, icon movement). No link is added. Not needed when the container has a Block Link.',
					'sgs-blocks'
				) }
				checked={ !! attributes.hoverAsCard }
				onChange={ ( value ) => setAttributes( { hoverAsCard: !! value } ) }
				__nextHasNoMarginBottom
			/>
		</PanelBody>
	);
}
