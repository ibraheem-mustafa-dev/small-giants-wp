/**
 * Card Grid — Card design panel (products modes): every product card is the grid's template product card, so its
 * design (button text, colours in both states, show and hide, pickers, price ladder, Effects) is set on that card.
 * "Edit card design" selects it, which opens the product card's own panels.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, Button } from '@wordpress/components';

/**
 * @param {Object}        props
 * @param {Function|null} props.onEdit Selects the template card; null while the grid holds none yet.
 */
export default function CardDesignPanel( { onEdit } ) {
	return (
		<PanelBody title={ __( 'Card design', 'sgs-blocks' ) } initialOpen={ true }>
			<p>
				{ __(
					'Every product shows as the same card. Edit that card to change its text, colours, buttons and effects for all products.',
					'sgs-blocks'
				) }
			</p>
			<Button variant="secondary" onClick={ onEdit || undefined } disabled={ ! onEdit } __next40pxDefaultSize>
				{ __( 'Edit card design', 'sgs-blocks' ) }
			</Button>
		</PanelBody>
	);
}
