/**
 * SGS Product Search — block editor UI.
 *
 * Renders a static preview (disabled input) in the editor.
 * Inspector controls: placeholder, buttonLabel, maxResults.
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

// NumberControl is experimental — fall back gracefully to TextControl if absent.
let NumberControl;
try {
	( { __experimentalNumberControl: NumberControl } = require( '@wordpress/components' ) );
} catch ( _e ) {
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
	const { placeholder, buttonLabel, maxResults } = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-product-search',
	} );

	const resolvedPlaceholder = placeholder || __( 'Search products…', 'sgs-blocks' );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Search settings', 'sgs-blocks' ) }>
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
								setAttributes( { maxResults: Math.max( 1, Math.min( 20, parseInt( value, 10 ) || 10 ) ) } )
							}
							help={ __( 'Maximum number of product suggestions shown (1–20).', 'sgs-blocks' ) }
						/>
					) : (
						<TextControl
							label={ __( 'Max suggestions', 'sgs-blocks' ) }
							value={ String( maxResults ) }
							type="number"
							onChange={ ( value ) =>
								setAttributes( { maxResults: Math.max( 1, Math.min( 20, parseInt( value, 10 ) || 10 ) ) } )
							}
							help={ __( 'Maximum number of product suggestions shown (1–20).', 'sgs-blocks' ) }
						/>
					) }
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
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
			</div>
		</>
	);
}
