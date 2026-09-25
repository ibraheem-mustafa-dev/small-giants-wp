/**
 * SGS Store Selector — editor component.
 *
 * A trigger + a repeater of {label, url, flag} stores, edited entirely in
 * the inspector (Block Customisation Standard). The canvas shows a static
 * preview of the trigger and every store, so the operator can see the list
 * without needing the frontend's disclosure JS.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	Button,
	Flex,
	FlexItem,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import {
	SgsColourPanel,
	fillRow,
	textRow,
	TypographyControls,
	ResponsiveOverride,
	ResponsiveControl,
	SgsBoxControl,
	BOX_UNITS,
	normaliseResponsiveBox,
	SgsBorderControl,
	LinkPopoverField,
} from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	const {
		triggerPrefix,
		stores,
		flagSize,
		panelAlign,
		triggerColour,
		triggerColourHover,
		panelBackground,
		itemColour,
		itemColourHover,
		borderColour,
		borderColourHover,
		borderColourGradient,
		borderColourHoverGradient,
		borderStyle,
		borderWidth,
		borderRadius,
	} = attributes;

	const blockProps = useBlockProps( {
		className: `sgs-store-selector sgs-store-selector--panel-${ panelAlign }`,
	} );

	const updateStore = ( index, field, value ) => {
		const updated = [ ...stores ];
		updated[ index ] = { ...updated[ index ], [ field ]: value };
		setAttributes( { stores: updated } );
	};

	const addStore = () => {
		setAttributes( {
			stores: [ ...stores, { label: '', url: '', flagId: 0, flagUrl: '' } ],
		} );
	};

	const removeStore = ( index ) => {
		setAttributes( { stores: stores.filter( ( _, i ) => i !== index ) } );
	};

	const moveStore = ( index, direction ) => {
		const target = index + direction;
		if ( target < 0 || target >= stores.length ) {
			return;
		}
		const updated = [ ...stores ];
		[ updated[ index ], updated[ target ] ] = [ updated[ target ], updated[ index ] ];
		setAttributes( { stores: updated } );
	};

	const previewFlag = flagSize?.desktop?.w ? flagSize.desktop : { w: 16, h: 12 };

	return (
		<>
			<SgsColourPanel
				rows={ [
					textRow( {
						key: 'trigger',
						label: __( 'Trigger text', 'sgs-blocks' ),
						attrs: { base: 'triggerColour', hover: 'triggerColourHover' },
						attributes,
						setAttributes,
					} ),
					fillRow( {
						key: 'panel',
						label: __( 'Panel background', 'sgs-blocks' ),
						attrs: { base: 'panelBackground' },
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'item',
						label: __( 'Store link text', 'sgs-blocks' ),
						attrs: { base: 'itemColour', hover: 'itemColourHover' },
						attributes,
						setAttributes,
					} ),
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Store Selector Settings', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Trigger prefix', 'sgs-blocks' ) }
						help={ __( 'Text shown before the flag and current store, e.g. "Select store".', 'sgs-blocks' ) }
						value={ triggerPrefix }
						onChange={ ( val ) => setAttributes( { triggerPrefix: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleGroupControl
						label={ __( 'Panel alignment', 'sgs-blocks' ) }
						value={ panelAlign }
						onChange={ ( val ) => setAttributes( { panelAlign: val } ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="start" label={ __( 'Start', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="end" label={ __( 'End', 'sgs-blocks' ) } />
					</ToggleGroupControl>
				</PanelBody>

				<PanelBody title={ __( 'Stores', 'sgs-blocks' ) }>
					{ stores.map( ( store, index ) => (
						<div key={ index } className="sgs-store-selector-editor__item">
							<TextControl
								label={ __( 'Label', 'sgs-blocks' ) }
								value={ store.label || '' }
								onChange={ ( val ) => updateStore( index, 'label', val ) }
								placeholder={ __( 'e.g. United Kingdom', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							{ /* Spec 35 §2 LINK standard, searchOnly mode — a store's url
							   is a bare string with no target/rel concept (mirrors
							   sgs/product-card's ctaUrl). */ }
							<LinkPopoverField
								label={ __( 'URL', 'sgs-blocks' ) }
								value={ store.url || '' }
								onChange={ ( val ) => updateStore( index, 'url', val ) }
								searchOnly
							/>
							<MediaUploadCheck>
								<MediaUpload
									onSelect={ ( media ) => {
										updateStore( index, 'flagId', media.id );
										updateStore( index, 'flagUrl', media.url );
									} }
									allowedTypes={ [ 'image' ] }
									value={ store.flagId }
									render={ ( { open } ) => (
										<Flex align="center" gap={ 2 } className="sgs-store-selector-editor__flag-row">
											<FlexItem>
												{ store.flagUrl ? (
													<img
														src={ store.flagUrl }
														alt=""
														width={ previewFlag.w }
														height={ previewFlag.h }
														style={ { display: 'block' } }
													/>
												) : null }
											</FlexItem>
											<FlexItem>
												<Button variant="secondary" onClick={ open }>
													{ store.flagUrl
														? __( 'Replace flag', 'sgs-blocks' )
														: __( 'Upload flag', 'sgs-blocks' ) }
												</Button>
											</FlexItem>
										</Flex>
									) }
								/>
							</MediaUploadCheck>
							<Flex justify="flex-end" gap={ 1 } className="sgs-store-selector-editor__actions">
								<Button icon="arrow-up-alt2" onClick={ () => moveStore( index, -1 ) } disabled={ 0 === index } label={ __( 'Move up', 'sgs-blocks' ) } />
								<Button icon="arrow-down-alt2" onClick={ () => moveStore( index, 1 ) } disabled={ index === stores.length - 1 } label={ __( 'Move down', 'sgs-blocks' ) } />
								<Button icon="trash" isDestructive onClick={ () => removeStore( index ) } label={ __( 'Remove', 'sgs-blocks' ) } />
							</Flex>
						</div>
					) ) }
					<Button variant="secondary" onClick={ addStore }>
						{ __( 'Add store', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="styles">
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						showFontFamily
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
					/>
				</PanelBody>

				<PanelBody title={ __( 'Flag size', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveControl
						label={ __( 'Flag width / height (px)', 'sgs-blocks' ) }
					>
						{ ( tier ) => {
							const tierValue = flagSize?.[ tier ] && typeof flagSize[ tier ] === 'object' ? flagSize[ tier ] : {};
							const setTier = ( field, val ) => {
								const nextTier = { ...tierValue, [ field ]: val ? Number( val ) : undefined };
								setAttributes( { flagSize: { ...flagSize, [ tier ]: nextTier } } );
							};
							return (
								<Flex gap={ 2 }>
									<FlexItem>
										<TextControl
											label={ __( 'Width', 'sgs-blocks' ) }
											type="number"
											min={ 1 }
											value={ tierValue.w ?? '' }
											placeholder="16"
											onChange={ ( val ) => setTier( 'w', val ) }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
									</FlexItem>
									<FlexItem>
										<TextControl
											label={ __( 'Height', 'sgs-blocks' ) }
											type="number"
											min={ 1 }
											value={ tierValue.h ?? '' }
											placeholder="12"
											onChange={ ( val ) => setTier( 'h', val ) }
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
									</FlexItem>
								</Flex>
							);
						} }
					</ResponsiveControl>
				</PanelBody>

				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride
						value={ attributes.panelPadding }
						onChange={ ( obj ) => setAttributes( { panelPadding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Panel padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveControl label={ __( 'Gap', 'sgs-blocks' ) }>
						{ ( tier ) => (
							<TextControl
								label={ __( 'Gap', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ attributes.gap?.[ tier ] ?? '' }
								placeholder="8px"
								onChange={ ( val ) =>
									setAttributes( {
										gap: { ...attributes.gap, [ tier ]: val || undefined },
									} )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveControl>
				</PanelBody>

				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourStates={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: borderColour,
								onChange: ( val ) => setAttributes( { borderColour: val ?? '' } ),
								gradientValue: borderColourGradient,
								onGradientChange: ( val ) => setAttributes( { borderColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: borderColourHover,
								onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
								gradientValue: borderColourHoverGradient,
								onGradientChange: ( val ) => setAttributes( { borderColourHoverGradient: val ?? '' } ),
							},
						] }
						radiusValues={ {
							base: borderRadius?.desktop ?? {},
							tablet: borderRadius?.tablet ?? {},
							mobile: borderRadius?.mobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const key = 'base' === tier ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<span className="sgs-store-selector__trigger">
					{ triggerPrefix && (
						<span className="sgs-store-selector__prefix">{ triggerPrefix }</span>
					) }
					{ stores[ 0 ]?.flagUrl && (
						<img
							className="sgs-store-selector__flag"
							src={ stores[ 0 ].flagUrl }
							alt=""
							width={ previewFlag.w }
							height={ previewFlag.h }
						/>
					) }
					<span className="sgs-store-selector__current">
						{ stores[ 0 ]?.label || __( 'Add a store…', 'sgs-blocks' ) }
					</span>
				</span>
				<ul className="sgs-store-selector__list">
					{ stores.map( ( store, index ) => (
						<li key={ index } className="sgs-store-selector__item">
							<span>
								{ store.flagUrl && (
									<img
										className="sgs-store-selector__flag"
										src={ store.flagUrl }
										alt=""
										width={ previewFlag.w }
										height={ previewFlag.h }
									/>
								) }
								<span>{ store.label || __( '(no label)', 'sgs-blocks' ) }</span>
							</span>
						</li>
					) ) }
				</ul>
			</div>
		</>
	);
}
