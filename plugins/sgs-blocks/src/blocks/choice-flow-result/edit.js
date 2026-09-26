import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import { PanelBody, TextControl, SelectControl, ToggleControl } from '@wordpress/components';
import { NumberControl } from '../../components/primitives';

export default function Edit( { attributes, setAttributes } ) {
	const {
		heading,
		body,
		matchTags,
		action,
		rateLimit,
		emailLabel,
		submitLabel,
		successMessage,
		showAddToBasket,
		addToBasketLabel,
		showBuyNow,
		buyNowLabel,
	} = attributes;

	const blockProps = useBlockProps( { className: 'sgs-choice-flow-result' } );

	// Free-text comma-separated tags, kept deliberately simple per FR-43-12
	// ("keep it simple, a weighted-tag match is enough for v1, no formula/
	// expression engine"). No tag-picker/autocomplete UI this phase.
	const tagsValue = ( matchTags || [] ).join( ', ' );

	const onTagsChange = ( val ) => {
		const nextTags = val
			.split( ',' )
			.map( ( tag ) => tag.trim() )
			.filter( ( tag ) => tag.length > 0 );

		setAttributes( { matchTags: nextTags } );
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Terminal action', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Action', 'sgs-blocks' ) }
						value={ action || 'recommend' }
						options={ [
							{ label: __( 'Recommendation (heading + body)', 'sgs-blocks' ), value: 'recommend' },
							{ label: __( 'Add to bag', 'sgs-blocks' ), value: 'add-to-bag' },
							{ label: __( 'Email capture', 'sgs-blocks' ), value: 'email' },
						] }
						onChange={ ( val ) => setAttributes( { action: val } ) }
						help={ __(
							'Add to bag shows "Add to basket"/"Buy now" in the flow’s own footer (Back on the left, these on the right) — the product/variation and every priced answer on the path taken. Email capture shows an email form that stores the path’s answers as a form submission.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ 'add-to-bag' === action && (
						<>
							<ToggleControl
								label={ __( 'Show “Add to basket”', 'sgs-blocks' ) }
								checked={ showAddToBasket !== false }
								onChange={ ( val ) => setAttributes( { showAddToBasket: val } ) }
								__nextHasNoMarginBottom
							/>
							{ showAddToBasket !== false && (
								<TextControl
									label={ __( 'Add to basket label', 'sgs-blocks' ) }
									value={ addToBasketLabel }
									onChange={ ( val ) => setAttributes( { addToBasketLabel: val } ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
							<ToggleControl
								label={ __( 'Show “Buy now”', 'sgs-blocks' ) }
								checked={ showBuyNow !== false }
								onChange={ ( val ) => setAttributes( { showBuyNow: val } ) }
								help={ __( 'Buy now adds the item then goes straight to checkout.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
							/>
							{ showBuyNow !== false && (
								<TextControl
									label={ __( 'Buy now label', 'sgs-blocks' ) }
									value={ buyNowLabel }
									onChange={ ( val ) => setAttributes( { buyNowLabel: val } ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
						</>
					) }
					{ 'email' === action && (
						<>
						<NumberControl
							label={ __( 'Rate limit', 'sgs-blocks' ) }
							value={ rateLimit }
							min={ 1 }
							max={ 50 }
							onChange={ ( value ) =>
								setAttributes( { rateLimit: parseInt( value, 10 ) || 5 } )
							}
							help={ __( 'Maximum submissions accepted per IP address, per hour.', 'sgs-blocks' ) }
							__next40pxDefaultSize
						/>
						<TextControl
							label={ __( 'Email field label', 'sgs-blocks' ) }
							value={ emailLabel }
							onChange={ ( val ) => setAttributes( { emailLabel: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<TextControl
							label={ __( 'Submit button label', 'sgs-blocks' ) }
							value={ submitLabel }
							onChange={ ( val ) => setAttributes( { submitLabel: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<TextControl
							label={ __( 'Success message', 'sgs-blocks' ) }
							value={ successMessage }
							onChange={ ( val ) => setAttributes( { successMessage: val } ) }
							help={ __( 'Shown in place of the form once the submission succeeds.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						</>
					) }
				</PanelBody>
				<PanelBody title={ __( 'Result Matching', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Match tags', 'sgs-blocks' ) }
						value={ tagsValue }
						onChange={ onTagsChange }
						help={ __(
							'Leave blank if this is your only result. If you have multiple possible results, add tags here that match the tags your questions’ answers carry — whichever result matches most wins.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<RichText
					tagName="h3"
					className="sgs-choice-flow-result__heading"
					value={ heading }
					onChange={ ( val ) => setAttributes( { heading: val } ) }
					placeholder={ __( 'Your recommended result…', 'sgs-blocks' ) }
					allowedFormats={ [] }
				/>
				<RichText
					tagName="div"
					className="sgs-choice-flow-result__body"
					value={ body }
					onChange={ ( val ) => setAttributes( { body: val } ) }
					placeholder={ __(
						'Explain the recommendation to your visitor…',
						'sgs-blocks'
					) }
					allowedFormats={ [ 'core/bold', 'core/italic', 'core/link' ] }
					multiline="p"
				/>
				{ /* Canvas preview only (D3) — the real "Add to basket"/"Buy now"
				   buttons render in sgs/choice-flow's own footer, not here (Back
				   left, these right), built by navigation.js from this block's
				   data-* attributes once this step is current. This static line
				   stands in so showAddToBasket/addToBasketLabel/showBuyNow/
				   buyNowLabel reflect visibly in the editor canvas
				   (check-editor-render-parity.js CHECK A). */ }
				{ 'add-to-bag' === action && (
					<p className="sgs-choice-flow-result__addon-summary-preview">
						{ __( 'Shown in the flow’s footer:', 'sgs-blocks' ) }{ ' ' }
						{ [
							showAddToBasket !== false ? ( addToBasketLabel || __( 'Add to basket', 'sgs-blocks' ) ) : null,
							showBuyNow !== false ? ( buyNowLabel || __( 'Buy now', 'sgs-blocks' ) ) : null,
						]
							.filter( Boolean )
							.join( ' · ' ) || __( 'no button — both are switched off', 'sgs-blocks' ) }
					</p>
				) }
				{ /* Canvas preview only — the real submit handler is built client-side
				   by choice-flow/email.js; this is a static stand-in so the `action`
				   attribute reflects visibly in the editor canvas. */ }
				{ 'email' === action && (
					<div className="sgs-choice-flow-result__email-form">
						<label className="sgs-choice-flow-result__email-label" htmlFor="sgs-choice-flow-result-email-preview">
							{ emailLabel || __( 'Email address', 'sgs-blocks' ) }
						</label>
						<input
							type="email"
							id="sgs-choice-flow-result-email-preview"
							className="sgs-choice-flow-result__email-input"
							disabled
							placeholder="you@example.com"
						/>
						<button type="button" disabled className="sgs-choice-flow-result__email-submit">
							{ submitLabel || __( 'Submit', 'sgs-blocks' ) }
						</button>
					</div>
				) }
			</div>
		</>
	);
}
