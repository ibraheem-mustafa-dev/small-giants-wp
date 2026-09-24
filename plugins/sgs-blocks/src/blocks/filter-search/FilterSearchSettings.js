/**
 * SGS Filter Search — "Filter Search Settings" inspector panel body.
 *
 * Split out of edit.js (JS file-length limit, 250 lines) — this renders the
 * searchMode select plus the mode-specific fields (taxonomy + showCounts for
 * 'taxonomy-terms'; attributeId for the legacy 'attribute-chips'), the
 * threshold field, and the placeholder field. edit.js keeps ownership of the
 * colour panel, the margin panel, and the static canvas preview.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, SelectControl, ToggleControl } from '@wordpress/components';

// Guard the experimental NumberControl import — it may not exist on older WP
// versions. Falls back to a plain text input (type=number) via TextControl.
// This pattern mirrors the B3 crash lesson (dead-control crash on missing import).
const { __experimentalNumberControl: NumberControl } = wp?.components ?? {};

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes (searchMode, taxonomy,
 *                                       showCounts, attributeId, threshold,
 *                                       placeholder).
 * @param {Function} props.setAttributes Block editor setAttributes.
 */
export default function FilterSearchSettings( { attributes, setAttributes } ) {
	const { searchMode, taxonomy, showCounts, attributeId, threshold, placeholder } = attributes;
	const isTermsMode = 'taxonomy-terms' === searchMode;

	return (
		<PanelBody title={ __( 'Filter Search Settings', 'sgs-blocks' ) }>

			<SelectControl
				label={ __( 'Search in', 'sgs-blocks' ) }
				help={ __(
					'"Existing attribute filter" narrows the chips of an ancestor Product Filter (Attribute) block. "A taxonomy\'s terms" makes this block render its own searchable, tickable list — use this to stand it alone in a filter panel (e.g. a brand list).',
					'sgs-blocks'
				) }
				value={ searchMode }
				options={ [
					{ label: __( 'Existing attribute filter (chips)', 'sgs-blocks' ), value: 'attribute-chips' },
					{ label: __( "A taxonomy's terms (own list)", 'sgs-blocks' ), value: 'taxonomy-terms' },
				] }
				onChange={ ( val ) => setAttributes( { searchMode: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>

			{ isTermsMode ? (
				<>
					<TextControl
						label={ __( 'Taxonomy', 'sgs-blocks' ) }
						help={ __(
							'The taxonomy slug to list, e.g. product_cat, product_tag, a brand taxonomy registered on products, or an attribute taxonomy such as pa_size.',
							'sgs-blocks'
						) }
						value={ taxonomy }
						onChange={ ( val ) => setAttributes( { taxonomy: val.trim() } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Show term counts', 'sgs-blocks' ) }
						help={ __(
							"Show each term's product count next to its name.",
							'sgs-blocks'
						) }
						checked={ showCounts }
						onChange={ ( val ) => setAttributes( { showCounts: val } ) }
						__nextHasNoMarginBottom
					/>
				</>
			) : ( NumberControl ? (
				<NumberControl
					label={ __( 'Attribute ID', 'sgs-blocks' ) }
					help={ __(
						'The WooCommerce product attribute ID this filter belongs to. Find it at Products → Attributes.',
						'sgs-blocks'
					) }
					value={ attributeId }
					min={ 0 }
					onChange={ ( val ) =>
						setAttributes( { attributeId: parseInt( val, 10 ) || 0 } )
					}
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) : (
				<TextControl
					label={ __( 'Attribute ID', 'sgs-blocks' ) }
					help={ __(
						'The WooCommerce product attribute ID this filter belongs to. Find it at Products → Attributes.',
						'sgs-blocks'
					) }
					type="number"
					min={ 0 }
					value={ String( attributeId ) }
					onChange={ ( val ) =>
						setAttributes( { attributeId: parseInt( val, 10 ) || 0 } )
					}
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) ) }

			{ NumberControl ? (
				<NumberControl
					label={ __( 'Minimum terms to show search', 'sgs-blocks' ) }
					help={ __(
						'The search input appears only when this attribute has at least this many options. Recommended: 16 (Baymard Institute threshold).',
						'sgs-blocks'
					) }
					value={ threshold }
					min={ 2 }
					onChange={ ( val ) =>
						setAttributes( { threshold: Math.max( 2, parseInt( val, 10 ) || 16 ) } )
					}
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) : (
				<TextControl
					label={ __( 'Minimum terms to show search', 'sgs-blocks' ) }
					help={ __(
						'The search input appears only when this attribute has at least this many options. Recommended: 16.',
						'sgs-blocks'
					) }
					type="number"
					min={ 2 }
					value={ String( threshold ) }
					onChange={ ( val ) =>
						setAttributes( { threshold: Math.max( 2, parseInt( val, 10 ) || 16 ) } )
					}
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }

			<TextControl
				label={ __( 'Placeholder text', 'sgs-blocks' ) }
				help={ __(
					'Leave blank to use the default: "Type to filter…"',
					'sgs-blocks'
				) }
				value={ placeholder }
				onChange={ ( val ) => setAttributes( { placeholder: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>

		</PanelBody>
	);
}
