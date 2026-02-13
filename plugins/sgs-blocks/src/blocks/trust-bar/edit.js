import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	Button,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar, fontSizeVar } from '../../utils';

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

function ItemEditor( { item, onChange, onRemove } ) {
	const update = ( key, value ) => {
		onChange( { ...item, [ key ]: value } );
	};

	return (
		<div
			className="sgs-trust-bar-item-editor"
			style={ {
				padding: '12px',
				border: '1px solid #ddd',
				borderRadius: '4px',
				marginBottom: '12px',
			} }
		>
			<TextControl
				label={ __( 'Value', 'sgs-blocks' ) }
				value={ item.value || '' }
				onChange={ ( val ) => update( 'value', val ) }
				placeholder={ __( 'e.g. 5,000 or Next-Day', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Suffix', 'sgs-blocks' ) }
				value={ item.suffix || '' }
				onChange={ ( val ) => update( 'suffix', val ) }
				placeholder="+"
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Label', 'sgs-blocks' ) }
				value={ item.label || '' }
				onChange={ ( val ) => update( 'label', val ) }
				__nextHasNoMarginBottom
			/>
			<ToggleControl
				label={ __( 'Animate this item', 'sgs-blocks' ) }
				checked={ item.animated !== false }
				onChange={ ( val ) => update( 'animated', val ) }
				__nextHasNoMarginBottom
			/>
			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
				style={ { marginTop: '8px' } }
			>
				{ __( 'Remove item', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		items,
		animated,
		valueColour,
		labelColour,
		labelFontSize,
	} = attributes;

	const blockProps = useBlockProps( { className: 'sgs-trust-bar' } );

	const valueStyle = {
		color: colourVar( valueColour ) || undefined,
	};

	const labelStyle = {
		color: colourVar( labelColour ) || undefined,
		fontSize: fontSizeVar( labelFontSize ) || undefined,
	};

	const updateItem = ( index, updatedItem ) => {
		const updated = [ ...items ];
		updated[ index ] = updatedItem;
		setAttributes( { items: updated } );
	};

	const removeItem = ( index ) => {
		setAttributes( {
			items: items.filter( ( _, i ) => i !== index ),
		} );
	};

	const addItem = () => {
		setAttributes( {
			items: [
				...items,
				{
					value: '',
					suffix: '',
					label: '',
					animated: true,
				},
			],
		} );
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Items', 'sgs-blocks' ) }>
					{ items.map( ( item, index ) => (
						<ItemEditor
							key={ index }
							item={ item }
							onChange={ ( updated ) =>
								updateItem( index, updated )
							}
							onRemove={ () => removeItem( index ) }
						/>
					) ) }
					<Button variant="secondary" onClick={ addItem }>
						{ __( 'Add item', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

				<PanelBody
					title={ __( 'Animation', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __(
							'Animate numeric values',
							'sgs-blocks'
						) }
						checked={ animated }
						onChange={ ( val ) =>
							setAttributes( { animated: val } )
						}
						help={ __(
							'When enabled, numeric values count up when scrolled into view.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Value colour', 'sgs-blocks' ) }
						value={ valueColour }
						onChange={ ( val ) =>
							setAttributes( { valueColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Label colour', 'sgs-blocks' ) }
						value={ labelColour }
						onChange={ ( val ) =>
							setAttributes( { labelColour: val } )
						}
					/>
					<SelectControl
						label={ __( 'Label font size', 'sgs-blocks' ) }
						value={ labelFontSize || '' }
						options={ FONT_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { labelFontSize: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ items.map( ( item, index ) => (
					<div key={ index } className="sgs-trust-bar__item">
						<span
							className="sgs-trust-bar__value"
							style={ valueStyle }
						>
							{ item.value }
							{ item.suffix }
						</span>
						<span
							className="sgs-trust-bar__label"
							style={ labelStyle }
						>
							{ item.label }
						</span>
					</div>
				) ) }
			</div>
		</>
	);
}
