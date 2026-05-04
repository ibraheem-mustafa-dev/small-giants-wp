import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	InnerBlocks,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	TextareaControl,
	SelectControl,
	Button,
	ToggleControl,
	Notice,
} from '@wordpress/components';
import { Fragment } from '@wordpress/element';

const CTA_TEMPLATE = [
	[ 'sgs/multi-button', {}, [
		[ 'sgs/button', { inheritStyle: 'primary', label: 'Shop Now' } ],
	] ],
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		image,
		imageAlt,
		productName,
		description,
		variantStyle,
		trialTag,
		packSizes,
		priceLarge,
		priceNote,
	} = attributes;

	const isTrial = variantStyle === 'trial';

	const blockProps = useBlockProps( {
		className: `product-card${ isTrial ? ' trial-card' : '' }`,
	} );

	const updatePackSize = ( idx, key, value ) => {
		const next = packSizes.map( ( p, i ) => ( i === idx ? { ...p, [ key ]: value } : p ) );
		// Only one selected at a time.
		if ( 'selected' === key && value ) {
			next.forEach( ( p, i ) => { if ( i !== idx ) { p.selected = false; } } );
		}
		setAttributes( { packSizes: next } );
	};

	const addPackSize = () => {
		setAttributes( { packSizes: [ ...packSizes, { label: '', selected: false } ] } );
	};

	const removePackSize = ( idx ) => {
		setAttributes( { packSizes: packSizes.filter( ( _, i ) => i !== idx ) } );
	};

	return (
		<Fragment>
			<InspectorControls>
				<PanelBody title={ __( 'Product', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Variant style', 'sgs-blocks' ) }
						value={ variantStyle }
						options={ [
							{ value: 'standard', label: 'Standard' },
							{ value: 'trial', label: 'Trial (dashed border + gradient)' },
						] }
						onChange={ ( v ) => setAttributes( { variantStyle: v } ) }
						__nextHasNoMarginBottom
					/>
					{ isTrial && (
						<TextControl
							label={ __( 'Trial tag', 'sgs-blocks' ) }
							value={ trialTag }
							onChange={ ( v ) => setAttributes( { trialTag: v } ) }
							__nextHasNoMarginBottom
						/>
					) }
					<TextControl
						label={ __( 'Product name', 'sgs-blocks' ) }
						value={ productName }
						onChange={ ( v ) => setAttributes( { productName: v } ) }
						__nextHasNoMarginBottom
					/>
					<TextareaControl
						label={ __( 'Description', 'sgs-blocks' ) }
						value={ description }
						onChange={ ( v ) => setAttributes( { description: v } ) }
						__nextHasNoMarginBottom
					/>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) => setAttributes( { image: media.url, imageAlt: media.alt || '' } ) }
							allowedTypes={ [ 'image' ] }
							value={ image }
							render={ ( { open } ) => (
								<Button onClick={ open } variant="secondary">
									{ image ? __( 'Replace image', 'sgs-blocks' ) : __( 'Choose image', 'sgs-blocks' ) }
								</Button>
							) }
						/>
					</MediaUploadCheck>
					{ image && (
						<TextControl
							label={ __( 'Image alt text', 'sgs-blocks' ) }
							value={ imageAlt }
							onChange={ ( v ) => setAttributes( { imageAlt: v } ) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				{ ! isTrial && (
					<PanelBody title={ __( 'Pack sizes', 'sgs-blocks' ) } initialOpen={ false }>
						{ packSizes.map( ( p, idx ) => (
							<div key={ idx } style={ { borderBottom: '1px solid #ddd', paddingBottom: 8, marginBottom: 8 } }>
								<TextControl
									label={ __( 'Label', 'sgs-blocks' ) }
									value={ p.label }
									onChange={ ( v ) => updatePackSize( idx, 'label', v ) }
									__nextHasNoMarginBottom
								/>
								<ToggleControl
									label={ __( 'Default selected', 'sgs-blocks' ) }
									checked={ !! p.selected }
									onChange={ ( v ) => updatePackSize( idx, 'selected', v ) }
									__nextHasNoMarginBottom
								/>
								<Button isDestructive variant="link" onClick={ () => removePackSize( idx ) }>
									{ __( 'Remove', 'sgs-blocks' ) }
								</Button>
							</div>
						) ) }
						<Button variant="secondary" onClick={ addPackSize }>{ __( 'Add pack size', 'sgs-blocks' ) }</Button>
					</PanelBody>
				) }

				<PanelBody title={ __( 'Price', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'Price (large)', 'sgs-blocks' ) }
						value={ priceLarge }
						onChange={ ( v ) => setAttributes( { priceLarge: v } ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Price note', 'sgs-blocks' ) }
						value={ priceNote }
						onChange={ ( v ) => setAttributes( { priceNote: v } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'CTA Button', 'sgs-blocks' ) } initialOpen={ false }>
					<Notice status="info" isDismissible={ false }>
						{ __( 'The CTA button is now managed using the SGS Button Group block inside the card. Click on the button in the editor to configure its label, style, and link.', 'sgs-blocks' ) }
					</Notice>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ image && (
					<img className="product-card-img" src={ image } alt={ imageAlt } />
				) }
				<div className="product-card-body">
					{ isTrial && trialTag && <div className="trial-tag">{ trialTag }</div> }
					{ productName && <h3>{ productName }</h3> }
					{ description && <p className="product-desc">{ description }</p> }
					{ ! isTrial && packSizes.length > 0 && (
						<div className="pill-group" role="group" aria-label={ __( 'Choose pack size', 'sgs-blocks' ) }>
							{ packSizes.map( ( p, idx ) => (
								<button
									key={ idx }
									type="button"
									className={ `pill${ p.selected ? ' active' : '' }` }
									aria-pressed={ p.selected ? 'true' : 'false' }
								>
									{ p.label }
								</button>
							) ) }
						</div>
					) }
					{ ( priceLarge || priceNote ) && (
						<div className="price-row">
							{ priceLarge && <span className="price">{ priceLarge }</span> }
							{ priceNote && <span className="price-note">{ priceNote }</span> }
						</div>
					) }
					<InnerBlocks
						template={ CTA_TEMPLATE }
						templateLock={ false }
						allowedBlocks={ [ 'sgs/multi-button' ] }
					/>
				</div>
			</div>
		</Fragment>
	);
}
