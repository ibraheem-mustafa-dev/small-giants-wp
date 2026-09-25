/**
 * "Price from list" panel for `sgs/choice-flow-question` — Spec 43 FR-43-17
 * (v1.4.0). Extracted out of edit.js (which already sits well over this
 * codebase's 250-line JS guideline) rather than growing that file further.
 *
 * Reads the site-wide add-on price list off `window.sgsBlocksData
 * .choiceFlowAddonGroups` — the same REST-free `wp_add_inline_script()`
 * channel `includes/product-collection-same-term.php` uses for its own
 * taxonomy list (see `includes/addon-price-list/editor-data.php`). The global is
 * an empty array (rendering just a "None" option, never a fatal) whenever
 * the price-list settings page doesn't exist yet.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, Button, Notice } from '@wordpress/components';

/**
 * @return {Array<{key: string, label: string, options: Array}>} The site-wide
 *         add-on groups exposed by PHP, or an empty array before that data
 *         exists.
 */
function getAddonGroups() {
	const groups = window?.sgsBlocksData?.choiceFlowAddonGroups;
	return Array.isArray( groups ) ? groups : [];
}

/**
 * @param {Object}   props
 * @param {string}   props.priceGroup   Current `priceGroup` attribute value.
 * @param {Array}    props.options      Current `options` attribute value.
 * @param {Function} props.setAttributes Block attribute setter.
 */
export default function AddonPricingPanel( { priceGroup, options, setAttributes } ) {
	const groups = getAddonGroups();
	const activeGroup = groups.find( ( group ) => group.key === priceGroup ) || null;

	const groupChoices = [
		{ label: __( 'None (plain question)', 'sgs-blocks' ), value: '' },
		...groups.map( ( group ) => ( {
			label: group.label || group.key,
			value: group.key,
		} ) ),
	];

	// FR-43-1: options whose stored `value` isn't one of the active group's
	// keys render with no price on the frontend — flagged here so the
	// operator notices before publishing, rather than discovering it live.
	const unmatchedLabels =
		activeGroup && Array.isArray( activeGroup.options )
			? options
					.filter(
						( option ) =>
							option.value &&
							! activeGroup.options.some( ( row ) => row.key === option.value )
					)
					.map( ( option ) => option.label || option.value )
			: [];

	/**
	 * Replace this question's options with the active group's option list —
	 * value = the group option's key, label = its label — keeping every
	 * OTHER setting (nextStepId, tags, image, helpText, addToBagNow) from
	 * any existing option that already shares that value, so re-filling
	 * after a price-list edit doesn't wipe out routing already set up.
	 */
	const fillFromGroup = () => {
		if ( ! activeGroup || ! Array.isArray( activeGroup.options ) ) {
			return;
		}
		const existingByValue = new Map(
			options.map( ( option ) => [ option.value, option ] )
		);
		setAttributes( {
			options: activeGroup.options.map( ( row ) => {
				const existing = existingByValue.get( row.key );
				return {
					...( existing || {
						nextStepId: '',
						tags: [],
						image: null,
						helpText: '',
						addToBagNow: false,
					} ),
					label: row.label,
					value: row.key,
				};
			} ),
		} );
	};

	return (
		<PanelBody title={ __( 'Pricing', 'sgs-blocks' ) } initialOpen={ false }>
			<SelectControl
				label={ __( 'Price from list', 'sgs-blocks' ) }
				value={ priceGroup || '' }
				options={ groupChoices }
				onChange={ ( value ) => setAttributes( { priceGroup: value } ) }
				help={
					groups.length === 0
						? __(
								'No add-on price groups are set up yet — add them under WooCommerce > Add-on prices.',
								'sgs-blocks'
						  )
						: __(
								'Each option’s price is read from this group at render time — never typed into the block.',
								'sgs-blocks'
						  )
				}
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ activeGroup && (
				<Button
					variant="secondary"
					onClick={ fillFromGroup }
					style={ { marginTop: '8px' } }
				>
					{ __( 'Fill options from the list', 'sgs-blocks' ) }
				</Button>
			) }
			{ unmatchedLabels.length > 0 && (
				<Notice status="warning" isDismissible={ false } style={ { marginTop: '8px' } }>
					{ __(
						'These options don’t match a key in the chosen price group, so they’ll show with no price: ',
						'sgs-blocks'
					) }
					{ unmatchedLabels.join( ', ' ) }
				</Notice>
			) }
		</PanelBody>
	);
}
