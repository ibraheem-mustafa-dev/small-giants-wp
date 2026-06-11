import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, Icon } from '@wordpress/components';

/**
 * Editor view for sgs/buybox.
 *
 * Static placeholder panel — the block is fully server-rendered on the
 * product page (render.php resolves the product from context.postId).
 * A live ServerSideRender preview is deliberately avoided: outside a
 * product template context there is no product to render, so the preview
 * would always show the core-blocks fallback and mislead operators.
 */
export default function Edit( { attributes, setAttributes } ) {
	const { soldOutLabel, unavailableLabel, notifyMeLabel, addToCartLabel } =
		attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-buybox sgs-buybox--editor-placeholder',
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Buybox labels', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Add to Cart label', 'sgs-blocks' ) }
						value={ addToCartLabel }
						onChange={ ( val ) =>
							setAttributes( { addToCartLabel: val } )
						}
						placeholder={ __( 'Add to Cart', 'sgs-blocks' ) }
						help={ __(
							'Empty = the default translated label.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Sold-out label', 'sgs-blocks' ) }
						value={ soldOutLabel }
						onChange={ ( val ) =>
							setAttributes( { soldOutLabel: val } )
						}
						help={ __(
							'Screen-reader suffix on pills whose combination is sold out.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Unavailable label', 'sgs-blocks' ) }
						value={ unavailableLabel }
						onChange={ ( val ) =>
							setAttributes( { unavailableLabel: val } )
						}
						help={ __(
							'Screen-reader suffix on pills whose combination does not exist.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Notify-me label', 'sgs-blocks' ) }
						value={ notifyMeLabel }
						onChange={ ( val ) =>
							setAttributes( { notifyMeLabel: val } )
						}
						help={ __(
							'Notify-me capture is deferred — this label is stored now and used when the feature ships.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<Icon icon="cart" size={ 32 } />
				<p className="sgs-buybox__placeholder-title">
					{ __( 'Buybox', 'sgs-blocks' ) }
				</p>
				<p className="sgs-buybox__placeholder-help">
					{ __(
						'Renders the product configurator (option pills, live price, add to cart) on the product page. Simple products fall back to the standard WooCommerce price and add-to-cart blocks.',
						'sgs-blocks'
					) }
				</p>
			</div>
		</>
	);
}
