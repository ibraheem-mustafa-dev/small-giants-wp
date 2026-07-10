/**
 * SGS Filter Search — editor component.
 *
 * Renders a static preview of the search input and exposes inspector controls
 * for attributeId, threshold, and placeholder. Actual filtering is
 * frontend-only (render.php + view.js).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, Notice } from '@wordpress/components';
import { ResponsiveBoxControl } from '../../components';

// Guard the experimental NumberControl import — it may not exist on older WP
// versions. Falls back to a plain text input (type=number) via TextControl.
// This pattern mirrors the B3 crash lesson (dead-control crash on missing import).
const { __experimentalNumberControl: NumberControl } = wp?.components ?? {};

export default function Edit( { attributes, setAttributes } ) {
	const { attributeId, threshold, placeholder, style, marginTablet, marginMobile } = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-filter-search sgs-filter-search--editor-preview',
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Filter Search Settings', 'sgs-blocks' ) }>

					{ NumberControl ? (
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
						/>
					) }

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
					/>

				</PanelBody>

				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						values={ {
							base: style?.spacing?.margin ?? {},
							tablet: marginTablet ?? {},
							mobile: marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, margin: next } } } );
							} else {
								setAttributes( { [ `margin${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ /* Static editor preview — filtering is frontend-only. */ }
				<input
					type="search"
					className="sgs-filter-search__input"
					placeholder={ placeholder || __( 'Type to filter…', 'sgs-blocks' ) }
					disabled
					aria-label={ __( 'Filter search preview (inactive in editor)', 'sgs-blocks' ) }
				/>
				<p className="sgs-filter-search__editor-hint">
					{ 0 === attributeId
						? __( '⚠ Set an Attribute ID in the block settings to activate this block.', 'sgs-blocks' )
						: (
							/* translators: %d is the minimum-terms threshold number */
							__( 'Shows on the frontend only when this attribute has %d+ options.', 'sgs-blocks' )
								.replace( '%d', String( threshold ) )
						)
					}
				</p>
			</div>
		</>
	);
}
