import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, Notice } from '@wordpress/components';
import { useSelect } from '@wordpress/data';

/**
 * "Show a different product" (buyboxProductId): pin the buy box to one product by ID so it can sit on a page that is
 * not a product page. The title shown comes from the editor's own REST read, so a product the user may not read
 * never shows a title or a price; the notice then says only that it cannot be found.
 *
 * @param {Object}   props               Block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 */
export default function ProductPinPanel( { attributes, setAttributes } ) {
	const pinnedId = parseInt( attributes.buyboxProductId, 10 ) || 0;
	const record = useSelect(
		( select ) => {
			if ( pinnedId <= 0 ) {
				return { loading: false, title: '' };
			}
			const core = select( 'core' );
			const found = core.getEntityRecord( 'postType', 'product', pinnedId );
			const finished = core.hasFinishedResolution( 'getEntityRecord', [ 'postType', 'product', pinnedId ] );
			return { loading: ! finished, title: found && found.title ? found.title.raw || found.title.rendered || '' : '' };
		},
		[ pinnedId ]
	);

	return (
		<InspectorControls>
			<PanelBody title={ __( 'Product', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControl
					label={ __( 'Show a different product (product ID)', 'sgs-blocks' ) }
					__next40pxDefaultSize
					type="number"
					min={ 0 }
					value={ pinnedId > 0 ? String( pinnedId ) : '' }
					onChange={ ( val ) => setAttributes( { buyboxProductId: Math.max( 0, parseInt( val, 10 ) || 0 ) } ) }
					help={ __( 'Leave empty to show the product of the page this sits on. Set it to put this buy box on any other page, such as the home page.', 'sgs-blocks' ) }
				/>
				{ pinnedId > 0 && ! record.loading && '' !== record.title && (
					<Notice status="info" isDismissible={ false }>
						{ record.title }
					</Notice>
				) }
				{ pinnedId > 0 && ! record.loading && '' === record.title && (
					<Notice status="warning" isDismissible={ false }>
						{ __( 'No product with that ID was found, or you cannot read it. Visitors will see nothing.', 'sgs-blocks' ) }
					</Notice>
				) }
			</PanelBody>
		</InspectorControls>
	);
}
