import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ButtonGroup,
	Button,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

const VARIANT_OPTIONS = [
	{ label: __( 'Line', 'sgs-blocks' ), value: 'line' },
	{ label: __( 'Dots', 'sgs-blocks' ), value: 'dots' },
	{ label: __( 'Wave', 'sgs-blocks' ), value: 'wave' },
	{ label: __( 'Shape', 'sgs-blocks' ), value: 'shape' },
	{ label: __( 'Gap (invisible spacer)', 'sgs-blocks' ), value: 'gap' },
];

const SHAPE_OPTIONS = [
	{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
	{ label: __( 'Square', 'sgs-blocks' ), value: 'square' },
	{ label: __( 'Diamond', 'sgs-blocks' ), value: 'diamond' },
];

const ALIGN_OPTIONS = [
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
];

/**
 * Build wrapper inline styles for the divider container.
 */
function buildWrapperStyle( attributes ) {
	const { marginTop, marginBottom, marginUnit } = attributes;
	return {
		marginTop: `${ marginTop }${ marginUnit }`,
		marginBottom: `${ marginBottom }${ marginUnit }`,
	};
}

/**
 * Render the divider element for the canvas preview.
 */
function DividerPreview( { attributes } ) {
	const { variant, colour, thickness, width, widthUnit, shape, shapeSize, dotCount, gapHeight, gapHeightUnit } = attributes;
	const colourValue = colourVar( colour );

	const sizeStyle = {
		width: `${ width }${ widthUnit }`,
	};

	if ( 'gap' === variant ) {
		// Invisible spacer — pure vertical space, no visible line (maps core/spacer).
		return (
			<div
				className="wp-block-sgs-divider__gap"
				style={ { height: `${ gapHeight }${ gapHeightUnit || 'px' }` } }
				aria-hidden="true"
			/>
		);
	}

	if ( 'line' === variant ) {
		return (
			<hr
				className="wp-block-sgs-divider__line"
				style={ {
					...sizeStyle,
					borderTop: `${ thickness }px solid ${ colourValue }`,
					borderBottom: 'none',
					borderLeft: 'none',
					borderRight: 'none',
					margin: 0,
				} }
			/>
		);
	}

	if ( 'dots' === variant ) {
		const dots = Array.from( { length: dotCount } );
		return (
			<div
				className="wp-block-sgs-divider__dots"
				style={ sizeStyle }
			>
				{ dots.map( ( _, i ) => (
					<span
						key={ i }
						className="wp-block-sgs-divider__dot"
						style={ {
							width: `${ shapeSize }px`,
							height: `${ shapeSize }px`,
							backgroundColor: colourValue,
						} }
					/>
				) ) }
			</div>
		);
	}

	if ( 'wave' === variant ) {
		return (
			<div
				className="wp-block-sgs-divider__wave"
				style={ sizeStyle }
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 200 20"
					preserveAspectRatio="none"
					aria-hidden="true"
					focusable="false"
				>
					<path
						d="M0,10 C25,0 50,20 75,10 C100,0 125,20 150,10 C175,0 200,20 200,10"
						stroke={ colourValue }
						strokeWidth="2"
						fill="none"
					/>
				</svg>
			</div>
		);
	}

	if ( 'shape' === variant ) {
		const shapeClass = `wp-block-sgs-divider__shape-inner is-${ shape }`;
		return (
			<div className="wp-block-sgs-divider__shape" style={ sizeStyle }>
				<span
					className={ shapeClass }
					style={ {
						width: `${ shapeSize }px`,
						height: `${ shapeSize }px`,
						backgroundColor: colourValue,
					} }
				/>
			</div>
		);
	}

	return null;
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		variant,
		colour,
		thickness,
		width,
		widthUnit,
		dividerAlign,
		marginTop,
		marginBottom,
		marginUnit,
		shape,
		shapeSize,
		dotCount,
		gapHeight,
		gapHeightUnit,
	} = attributes;

	const wrapperClass = [
		'wp-block-sgs-divider',
		`wp-block-sgs-divider--${ variant }`,
		`is-divider-align-${ dividerAlign }`,
	].join( ' ' );

	const blockProps = useBlockProps( {
		className: wrapperClass,
		style: buildWrapperStyle( attributes ),
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Divider settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Variant', 'sgs-blocks' ) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( val ) => setAttributes( { variant: val } ) }
						__nextHasNoMarginBottom
					/>

					<DesignTokenPicker
						label={ __( 'Colour', 'sgs-blocks' ) }
						value={ colour }
						onChange={ ( val ) => setAttributes( { colour: val } ) }
					/>

					{ 'line' === variant && (
						<RangeControl
							label={ __( 'Thickness (px)', 'sgs-blocks' ) }
							value={ thickness }
							onChange={ ( val ) => setAttributes( { thickness: val } ) }
							min={ 1 }
							max={ 8 }
							step={ 1 }
							__nextHasNoMarginBottom
						/>
					) }

					{ 'gap' === variant && (
						<UnitControl
							label={ __( 'Gap height', 'sgs-blocks' ) }
							value={ `${ gapHeight }${ gapHeightUnit || 'px' }` }
							units={ [
								{ value: 'px',  label: 'px',  default: 48 },
								{ value: 'em',  label: 'em',  default: 3 },
								{ value: 'rem', label: 'rem', default: 3 },
								{ value: 'vh',  label: 'vh',  default: 5 },
							] }
							onChange={ ( val ) => {
								const unit = val?.replace( /[\d.]+/, '' ) || 'px';
								const num  = parseFloat( val ) || 0;
								setAttributes( { gapHeight: num, gapHeightUnit: unit } );
							} }
							__nextHasNoMarginBottom
						/>
					) }

					<UnitControl
						label={ __( 'Width', 'sgs-blocks' ) }
						value={ `${ width }${ widthUnit || '%' }` }
						units={ [
							{ value: '%',  label: '%',  default: 100 },
							{ value: 'px', label: 'px', default: 200 },
						] }
						onChange={ ( val ) => {
							const unit = val?.replace( /[\d.]+/, '' ) || '%';
							const num  = parseFloat( val ) || 0;
							setAttributes( { width: num, widthUnit: unit } );
						} }
						__nextHasNoMarginBottom
					/>

					<div style={ { marginBottom: '8px' } }>
						<p style={ { marginBottom: '4px', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase' } }>
							{ __( 'Alignment', 'sgs-blocks' ) }
						</p>
						<ButtonGroup>
							{ ALIGN_OPTIONS.map( ( opt ) => (
								<Button
									key={ opt.value }
									variant={ dividerAlign === opt.value ? 'primary' : 'secondary' }
									onClick={ () => setAttributes( { dividerAlign: opt.value } ) }
								>
									{ opt.label }
								</Button>
							) ) }
						</ButtonGroup>
					</div>

					{ 'shape' === variant && (
						<>
							<SelectControl
								label={ __( 'Shape', 'sgs-blocks' ) }
								value={ shape }
								options={ SHAPE_OPTIONS }
								onChange={ ( val ) => setAttributes( { shape: val } ) }
								__nextHasNoMarginBottom
							/>
							<RangeControl
								label={ __( 'Shape size (px)', 'sgs-blocks' ) }
								value={ shapeSize }
								onChange={ ( val ) => setAttributes( { shapeSize: val } ) }
								min={ 4 }
								max={ 64 }
								step={ 1 }
								__nextHasNoMarginBottom
							/>
						</>
					) }

					{ 'dots' === variant && (
						<>
							<RangeControl
								label={ __( 'Number of dots', 'sgs-blocks' ) }
								value={ dotCount }
								onChange={ ( val ) => setAttributes( { dotCount: val } ) }
								min={ 2 }
								max={ 7 }
								step={ 1 }
								__nextHasNoMarginBottom
							/>
							<RangeControl
								label={ __( 'Dot size (px)', 'sgs-blocks' ) }
								value={ shapeSize }
								onChange={ ( val ) => setAttributes( { shapeSize: val } ) }
								min={ 4 }
								max={ 16 }
								step={ 1 }
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<UnitControl
						label={ __( 'Margin top', 'sgs-blocks' ) }
						value={ `${ marginTop }${ marginUnit || 'px' }` }
						units={ [
							{ value: 'px',  label: 'px',  default: 0 },
							{ value: 'em',  label: 'em',  default: 0 },
							{ value: 'rem', label: 'rem', default: 0 },
						] }
						onChange={ ( val ) => {
							const unit = val?.replace( /[\d.]+/, '' ) || 'px';
							const num  = parseFloat( val ) || 0;
							setAttributes( { marginTop: num, marginUnit: unit } );
						} }
						__nextHasNoMarginBottom
					/>
					<UnitControl
						label={ __( 'Margin bottom', 'sgs-blocks' ) }
						value={ `${ marginBottom }${ marginUnit || 'px' }` }
						units={ [
							{ value: 'px',  label: 'px',  default: 0 },
							{ value: 'em',  label: 'em',  default: 0 },
							{ value: 'rem', label: 'rem', default: 0 },
						] }
						onChange={ ( val ) => {
							const unit = val?.replace( /[\d.]+/, '' ) || 'px';
							const num  = parseFloat( val ) || 0;
							setAttributes( { marginBottom: num, marginUnit: unit } );
						} }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<DividerPreview attributes={ attributes } />
			</div>
		</>
	);
}
