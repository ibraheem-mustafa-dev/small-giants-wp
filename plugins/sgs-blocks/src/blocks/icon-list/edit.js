import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	Button,
	Icon,
} from '@wordpress/components';
import {
	check,
	starFilled,
	arrowRight,
	shipping,
	shield,
	payment,
	globe,
	people,
} from '@wordpress/icons';
import { DesignTokenPicker } from '../../components';
import { colourVar, spacingVar } from '../../utils';

const ICON_OPTIONS = [
	{ label: __( 'Tick', 'sgs-blocks' ), value: 'check', icon: check },
	{ label: __( 'Star', 'sgs-blocks' ), value: 'star-filled', icon: starFilled },
	{ label: __( 'Arrow', 'sgs-blocks' ), value: 'arrow-right', icon: arrowRight },
	{ label: __( 'Delivery', 'sgs-blocks' ), value: 'shipping', icon: shipping },
	{ label: __( 'Shield', 'sgs-blocks' ), value: 'shield', icon: shield },
	{ label: __( 'Payment', 'sgs-blocks' ), value: 'payment', icon: payment },
	{ label: __( 'Globe', 'sgs-blocks' ), value: 'globe', icon: globe },
	{ label: __( 'People', 'sgs-blocks' ), value: 'people', icon: people },
];

const ICON_MAP = Object.fromEntries(
	ICON_OPTIONS.map( ( opt ) => [ opt.value, opt.icon ] )
);

const ICON_SIZE_OPTIONS = [
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
];

const GAP_OPTIONS = [
	{ label: __( 'Tight', 'sgs-blocks' ), value: '10' },
	{ label: __( 'Normal', 'sgs-blocks' ), value: '20' },
	{ label: __( 'Relaxed', 'sgs-blocks' ), value: '30' },
	{ label: __( 'Spacious', 'sgs-blocks' ), value: '40' },
];

function ItemEditor( { item, defaultIcon, onChange, onRemove } ) {
	const update = ( key, value ) => {
		onChange( { ...item, [ key ]: value } );
	};

	return (
		<div
			className="sgs-icon-list-item-editor"
			style={ {
				padding: '12px',
				border: '1px solid #ddd',
				borderRadius: '4px',
				marginBottom: '12px',
			} }
		>
			<SelectControl
				label={ __( 'Icon', 'sgs-blocks' ) }
				value={ item.icon || defaultIcon }
				options={ ICON_OPTIONS.map( ( opt ) => ( {
					label: opt.label,
					value: opt.value,
				} ) ) }
				onChange={ ( val ) => update( 'icon', val ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Text', 'sgs-blocks' ) }
				value={ item.text || '' }
				onChange={ ( val ) => update( 'text', val ) }
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
		icon: defaultIcon,
		iconColour,
		iconSize,
		textColour,
		gap,
	} = attributes;

	const blockProps = useBlockProps( {
		className: `sgs-icon-list sgs-icon-list--icon-${ iconSize }`,
	} );

	const iconStyle = {
		color: colourVar( iconColour ) || undefined,
	};

	const textStyle = {
		color: colourVar( textColour ) || undefined,
	};

	const listStyle = {
		gap: spacingVar( gap ) || undefined,
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
				{ icon: defaultIcon, text: '' },
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
							defaultIcon={ defaultIcon }
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
					title={ __( 'Appearance', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Default icon', 'sgs-blocks' ) }
						value={ defaultIcon }
						options={ ICON_OPTIONS.map( ( opt ) => ( {
							label: opt.label,
							value: opt.value,
						} ) ) }
						onChange={ ( val ) =>
							setAttributes( { icon: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Icon size', 'sgs-blocks' ) }
						value={ iconSize }
						options={ ICON_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { iconSize: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Spacing', 'sgs-blocks' ) }
						value={ gap }
						options={ GAP_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { gap: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Icon colour', 'sgs-blocks' ) }
						value={ iconColour }
						onChange={ ( val ) =>
							setAttributes( { iconColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Text colour', 'sgs-blocks' ) }
						value={ textColour }
						onChange={ ( val ) =>
							setAttributes( { textColour: val } )
						}
					/>
				</PanelBody>
			</InspectorControls>

			<ul { ...blockProps } style={ { ...blockProps.style, ...listStyle } }>
				{ items.map( ( item, index ) => {
					const itemIcon = item.icon || defaultIcon;
					return (
						<li key={ index } className="sgs-icon-list__item">
							<span
								className="sgs-icon-list__icon"
								style={ iconStyle }
								aria-hidden="true"
							>
								{ ICON_MAP[ itemIcon ] && (
									<Icon
										icon={ ICON_MAP[ itemIcon ] }
										size={ 20 }
									/>
								) }
							</span>
							<span
								className="sgs-icon-list__text"
								style={ textStyle }
							>
								{ item.text }
							</span>
						</li>
					);
				} ) }
			</ul>
		</>
	);
}
