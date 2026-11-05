/**
 * "Shop look" extension for WooCommerce's Cart and Checkout blocks (Spec 27 FR-30-18).
 *
 * Adds the settings in attributes.js to `woocommerce/cart` and `woocommerce/checkout` ONLY. No attribute has a
 * default, so an unset block is WooCommerce's and the theme's look, byte for byte. The front end is painted by
 * includes/woocommerce/commerce-look/writer.php; the editor canvas prints the same writer's output, fetched from
 * `GET /sgs/v1/commerce-look/css` (canvas-css.js).
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import { COMMERCE_LOOK_ATTRIBUTES } from './attributes';
import { CANVAS_SCOPE, setLookAttributes, useCommerceLookCss } from './canvas-css';
import { CheckoutPanels, ColumnsPanel, FieldsPanel, LineItemsPanel, NoticePanel, SummaryPanel } from './panels';

const CART_BLOCK = 'woocommerce/cart';
const CHECKOUT_BLOCK = 'woocommerce/checkout';
const isTarget = ( name ) => CART_BLOCK === name || CHECKOUT_BLOCK === name;

/** Guard against double registration (a CJS + ESM double-load would register every filter twice). */
if ( ! window.__sgsCommerceLookRegistered ) {
	window.__sgsCommerceLookRegistered = true;

	addFilter( 'blocks.registerBlockType', 'sgs/commerce-look/attributes', ( settings, name ) => {
		if ( ! isTarget( name ) ) {
			return settings;
		}
		return { ...settings, attributes: { ...settings.attributes, ...COMMERCE_LOOK_ATTRIBUTES } };
	} );

	/** The block's own edit plus its panels and the canvas CSS; mounted for the two target blocks only. */
	const CommerceLookEdit = ( { BlockEdit, ...props } ) => {
		const { name, attributes, setAttributes } = props;
		const css = useCommerceLookCss( name, attributes );
		const isCart = CART_BLOCK === name;
		const shared = { attributes, setAttributes };
		return (
			<>
				{ css && <style>{ css }</style> }
				<BlockEdit { ...props } />
				<InspectorControls group="styles">
					<FieldsPanel { ...shared } />
					<LineItemsPanel { ...shared } isCart={ isCart } />
					<SummaryPanel { ...shared } />
					<NoticePanel { ...shared } />
					<ColumnsPanel { ...shared } />
					{ ! isCart && <CheckoutPanels { ...shared } /> }
				</InspectorControls>
			</>
		);
	};

	const withCommerceLookControls = createHigherOrderComponent(
		( BlockEdit ) => ( props ) => ( isTarget( props.name ) ? <CommerceLookEdit BlockEdit={ BlockEdit } { ...props } /> : <BlockEdit { ...props } /> ),
		'withCommerceLookControls'
	);

	addFilter( 'editor.BlockEdit', 'sgs/commerce-look/controls', withCommerceLookControls );

	/** The canvas wrapper carries the scope the server CSS is written against, only while a setting is set. */
	const withCommerceLookScope = createHigherOrderComponent( ( BlockListBlock ) => ( props ) => {
		const { name, attributes } = props;
		if ( ! isTarget( name ) || 0 === Object.keys( setLookAttributes( attributes ) ).length ) {
			return <BlockListBlock { ...props } />;
		}
		const wrapperProps = {
			...( props.wrapperProps || {} ),
			className: [ props.wrapperProps?.className, 'sgs-commerce-look', CANVAS_SCOPE ].filter( Boolean ).join( ' ' ),
		};
		return <BlockListBlock { ...props } wrapperProps={ wrapperProps } />;
	}, 'withCommerceLookScope' );

	addFilter( 'editor.BlockListBlock', 'sgs/commerce-look/scope', withCommerceLookScope );
} // end guard: window.__sgsCommerceLookRegistered
