/**
 * SGS Product Search — block editor UI.
 *
 * Renders a static preview (disabled input) in the editor.
 * Inspector controls: placeholder, buttonLabel, maxResults.
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl } from '@wordpress/components';
import { ResponsiveBoxControl } from '../../components';

// NumberControl is experimental — fall back gracefully to TextControl if absent.
let NumberControl;
try {
	( { __experimentalNumberControl: NumberControl } = require( '@wordpress/components' ) );
} catch {
	NumberControl = null;
}

/**
 * Edit component.
 *
 * @param {Object}   props               Block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute updater.
 * @return {JSX.Element} Editor UI.
 */
export default function Edit( { attributes, setAttributes } ) {
	const {
		displayMode,
		placeholder,
		buttonLabel,
		maxResults,
		style,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
	} = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-product-search',
	} );

	const resolvedPlaceholder = placeholder || __( 'Search products…', 'sgs-blocks' );
	const isIcon = displayMode === 'icon';

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Search settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Display', 'sgs-blocks' ) }
						value={ displayMode || 'inline' }
						options={ [
							{ label: __( 'Inline bar', 'sgs-blocks' ),          value: 'inline' },
							{ label: __( 'Icon (expand on click)', 'sgs-blocks' ), value: 'icon'   },
						] }
						onChange={ ( value ) => setAttributes( { displayMode: value } ) }
						help={ __( 'Inline bar: always-visible search field. Icon: collapsed icon that expands on click.', 'sgs-blocks' ) }
					/>
					<TextControl
						label={ __( 'Input placeholder', 'sgs-blocks' ) }
						value={ placeholder }
						onChange={ ( value ) => setAttributes( { placeholder: value } ) }
						help={ __( 'Placeholder text shown inside the search input.', 'sgs-blocks' ) }
					/>
					<TextControl
						label={ __( 'Button label', 'sgs-blocks' ) }
						value={ buttonLabel }
						onChange={ ( value ) => setAttributes( { buttonLabel: value } ) }
						help={ __( 'Accessible label for the search button (screen readers).', 'sgs-blocks' ) }
					/>
					{ NumberControl ? (
						<NumberControl
							label={ __( 'Max suggestions', 'sgs-blocks' ) }
							value={ maxResults }
							min={ 1 }
							max={ 20 }
							onChange={ ( value ) =>
								setAttributes( { maxResults: Math.max( 1, Math.min( 20, Number.parseInt( value, 10 ) || 10 ) ) } )
							}
							help={ __( 'Maximum number of product suggestions shown (1–20).', 'sgs-blocks' ) }
						/>
					) : (
						<TextControl
							label={ __( 'Max suggestions', 'sgs-blocks' ) }
							value={ String( maxResults ) }
							type="number"
							onChange={ ( value ) =>
								setAttributes( { maxResults: Math.max( 1, Math.min( 20, Number.parseInt( value, 10 ) || 10 ) ) } )
							}
							help={ __( 'Maximum number of product suggestions shown (1–20).', 'sgs-blocks' ) }
						/>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: style?.spacing?.padding ?? {},
							tablet: paddingTablet ?? {},
							mobile: paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, padding: next } } } );
							} else {
								setAttributes( { [ `padding${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
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
				{ isIcon ? (
					/* Icon-mode editor preview — compact button, matches the collapsed state. */
					<>
						<button
							type="button"
							className="sgs-product-search__submit"
							disabled
							aria-label={ buttonLabel || __( 'Search products', 'sgs-blocks' ) }
							style={ { minWidth: '44px', minHeight: '44px' } }
						>
							<svg
								aria-hidden="true"
								focusable="false"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="11" cy="11" r="8" />
								<line x1="21" y1="21" x2="16.65" y2="16.65" />
							</svg>
						</button>
						<p className="sgs-product-search__editor-hint">
							{ __( 'Icon mode — click the icon to expand the search field.', 'sgs-blocks' ) }
						</p>
					</>
				) : (
					/* Inline-mode editor preview — full disabled search bar. */
					<>
						<div className="sgs-product-search__field-wrap">
							<input
								type="search"
								className="sgs-product-search__input"
								disabled
								placeholder={ resolvedPlaceholder }
							/>
							<button
								type="button"
								className="sgs-product-search__submit"
								disabled
								aria-label={ buttonLabel || __( 'Search', 'sgs-blocks' ) }
							>
								<svg
									aria-hidden="true"
									focusable="false"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<circle cx="11" cy="11" r="8" />
									<line x1="21" y1="21" x2="16.65" y2="16.65" />
								</svg>
							</button>
						</div>
						<p className="sgs-product-search__editor-hint">
							{ __( 'Live product search — works on the published site.', 'sgs-blocks' ) }
						</p>
					</>
				) }
			</div>
		</>
	);
}
