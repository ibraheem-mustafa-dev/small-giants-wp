/**
 * Gift order: editor component. Draws the front-end component in preview mode
 * (no store, no network) and offers every visible word and both limits as
 * inspector settings.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import GiftOrder from '../../commerce-blocks/gift/component';

/**
 * Text settings shown in each panel: [ attribute, label, help ].
 */
const BASKET_FIELDS = [
	[ 'basketLabel', __( 'Switch label', 'sgs-blocks' ) ],
	[ 'basketHelp', __( 'Text under the switch', 'sgs-blocks' ) ],
];
const STEP_FIELDS = [
	[ 'stepTitle', __( 'Step title', 'sgs-blocks' ) ],
	[ 'optionMeLabel', __( 'First tile: heading', 'sgs-blocks' ) ],
	[ 'optionMeText', __( 'First tile: text', 'sgs-blocks' ) ],
	[ 'optionGiftLabel', __( 'Second tile: heading', 'sgs-blocks' ) ],
	[ 'optionGiftText', __( 'Second tile: text', 'sgs-blocks' ) ],
	[ 'giftOnlyLine', __( 'Line shown only for a gift', 'sgs-blocks' ) ],
];
const FIELD_FIELDS = [
	[ 'recipientLabel', __( 'Recipient name label', 'sgs-blocks' ) ],
	[ 'messageLabel', __( 'Note label', 'sgs-blocks' ) ],
	[ 'messagePlaceholder', __( 'Note placeholder', 'sgs-blocks' ) ],
	[
		'characterCountText',
		__( 'Character count text', 'sgs-blocks' ),
		/* translators: %1$d and %2$d are printed as they are; the shop owner types them into the text. */
		__(
			'Use %1$d for characters used and %2$d for the maximum.',
			'sgs-blocks'
		),
	],
	[ 'saveErrorText', __( 'Message when saving fails', 'sgs-blocks' ) ],
];

/**
 * @param {Object}   props
 * @param {Array}    props.fields        [ attribute, label, help ] rows.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {JSX.Element[]} Text controls.
 */
function TextRows( { fields, attributes, setAttributes } ) {
	return fields.map( ( [ name, label, help ] ) => (
		<TextControl
			key={ name }
			label={ label }
			help={ help }
			value={ attributes[ name ] }
			onChange={ ( value ) => setAttributes( { [ name ]: value } ) }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	) );
}

export default function Edit( { attributes, setAttributes, clientId } ) {
	const placement = useSelect(
		( select ) =>
			select( 'core/block-editor' ).getBlockParentsByBlockName(
				clientId,
				'woocommerce/checkout'
			).length
				? 'checkout'
				: 'basket',
		[ clientId ]
	);
	const rows = { attributes, setAttributes };
	return (
		<div { ...useBlockProps() }>
			<InspectorControls group="settings">
				<PanelBody title={ __( 'Basket switch', 'sgs-blocks' ) }>
					<TextRows fields={ BASKET_FIELDS } { ...rows } />
				</PanelBody>
				<PanelBody
					title={ __( 'Checkout step', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextRows fields={ STEP_FIELDS } { ...rows } />
				</PanelBody>
				<PanelBody
					title={ __( 'Name and note', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextRows fields={ FIELD_FIELDS } { ...rows } />
					<TextControl
						type="number"
						min={ 0 }
						label={ __( 'Name limit (characters)', 'sgs-blocks' ) }
						help={ __(
							'0 uses the shop limit (100 unless the sgs_gift_limits filter changes it).',
							'sgs-blocks'
						) }
						value={ attributes.recipientLimit }
						onChange={ ( value ) =>
							setAttributes( {
								recipientLimit: parseInt( value, 10 ) || 0,
							} )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						type="number"
						min={ 0 }
						label={ __( 'Note limit (characters)', 'sgs-blocks' ) }
						help={ __(
							'0 uses the shop limit (500 unless the sgs_gift_limits filter changes it).',
							'sgs-blocks'
						) }
						value={ attributes.messageLimit }
						onChange={ ( value ) =>
							setAttributes( {
								messageLimit: parseInt( value, 10 ) || 0,
							} )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>
			<GiftOrder settings={ attributes } forcePlacement={ placement } />
		</div>
	);
}
