/**
 * "Hide when this product list is empty" — the `sgsConditionCollectionQueryId`
 * condition (condition 9).
 *
 * Registers its own attribute, following the same split-file pattern as
 * responsive-visibility.js (which registers sgsHideOnMobile/Tablet/Desktop
 * independently of conditional-visibility.js, the file that renders their
 * controls). The control itself is rendered inside conditional-visibility.js's
 * "Visibility conditions" panel, next to condition 8 (Product reviews).
 *
 * Evaluated server-side in includes/conditional-visibility.php against the
 * result recorded by includes/product-collection-empty-detection.php: the
 * block hides only when the named `woocommerce/product-collection` query
 * (matched by its `queryId`) is PROVEN to have rendered with no products.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { __, sprintf } from '@wordpress/i18n';
import { NumberControl } from '../../components/primitives';

/**
 * Guard against double registration (see conditional-visibility.js's header
 * for why: a CJS and an ESM build both evaluated would otherwise double the
 * addFilter calls and the control would render twice).
 */
if ( ! window.__sgsCollectionEmptyConditionRegistered ) {
	window.__sgsCollectionEmptyConditionRegistered = true;

	/**
	 * Check whether a block type supports the className prop — no wrapper
	 * element means nowhere for a suppressed block to disappear from.
	 *
	 * @param {Object} settings Block settings object.
	 * @return {boolean} True when the block supports className.
	 */
	const supportsClassName = ( settings ) =>
		settings?.supports?.className !== false;

	/**
	 * Inject the `sgsConditionCollectionQueryId` attribute into all block types.
	 *
	 * @param {Object} settings Block settings.
	 * @return {Object} Modified settings with the attribute added.
	 */
	function addCollectionEmptyAttribute( settings ) {
		if ( ! supportsClassName( settings ) ) {
			return settings;
		}

		return {
			...settings,
			attributes: {
				...settings.attributes,
				/** 0 = off. Otherwise the `queryId` of the product collection to check. */
				sgsConditionCollectionQueryId: { type: 'number', default: 0 },
			},
		};
	}

	addFilter(
		'blocks.registerBlockType',
		'sgs/collection-empty-condition-attribute',
		addCollectionEmptyAttribute
	);
}

/**
 * True when condition 9 is active (differs from its default of 0/off).
 *
 * @param {Object} attributes Block attributes.
 * @return {boolean} True when a collection query ID has been set.
 */
export function isCollectionEmptyConditionActive( attributes ) {
	return Number( attributes.sgsConditionCollectionQueryId ) > 0;
}

/**
 * Plain-English summary fragment for the active-condition Notice, or ''
 * when the condition is not active.
 *
 * @param {Object} attributes Block attributes.
 * @return {string} Summary fragment, or ''.
 */
export function collectionEmptyConditionSummary( attributes ) {
	if ( ! isCollectionEmptyConditionActive( attributes ) ) {
		return '';
	}
	return sprintf(
		/* translators: %d = product collection query ID */
		__( 'hidden when collection #%d has no products', 'sgs-blocks' ),
		attributes.sgsConditionCollectionQueryId
	);
}

/**
 * The condition-9 inspector control: a query-ID number field.
 *
 * Rendered by conditional-visibility.js directly under condition 8 (Product
 * reviews), inside the same "Visibility conditions" panel.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {Element} The control.
 */
export default function CollectionEmptyConditionControl( {
	attributes,
	setAttributes,
} ) {
	return (
		<div style={ { marginTop: '16px' } }>
			<NumberControl
				label={ __(
					'Hide when this product list is empty: its query ID',
					'sgs-blocks'
				) }
				min={ 0 }
				value={ attributes.sgsConditionCollectionQueryId }
				onChange={ ( val ) =>
					setAttributes( {
						sgsConditionCollectionQueryId: Math.max(
							0,
							parseInt( val, 10 ) || 0
						),
					} )
				}
				help={ __(
					'The Query ID of the product collection this block depends on — visible in the Code Editor as "queryId" on its wp:woocommerce/product-collection block, or the value used when the page was built. 0 turns this off.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</div>
	);
}
