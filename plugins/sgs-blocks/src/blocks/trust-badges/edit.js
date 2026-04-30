import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	Button,
	RangeControl,
	Notice,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

/**
 * Icon options — editor slug maps to a Lucide icon name in render.php.
 * Labels use UK English.
 */
const ICON_OPTIONS = [
	{ label: __( 'Home', 'sgs-blocks' ),         value: 'home' },
	{ label: __( 'Tick / Check', 'sgs-blocks' ),  value: 'check' },
	{ label: __( 'Truck / Delivery', 'sgs-blocks' ), value: 'truck' },
	{ label: __( 'Star', 'sgs-blocks' ),          value: 'star' },
	{ label: __( 'Moon / Halal', 'sgs-blocks' ),  value: 'moon' },
	{ label: __( 'Shield Check', 'sgs-blocks' ),  value: 'shield-check' },
	{ label: __( 'Award', 'sgs-blocks' ),         value: 'award' },
	{ label: __( 'Heart', 'sgs-blocks' ),         value: 'heart' },
	{ label: __( 'Leaf', 'sgs-blocks' ),          value: 'leaf' },
	{ label: __( 'Zap / Energy', 'sgs-blocks' ),  value: 'zap' },
	{ label: __( 'Clock', 'sgs-blocks' ),         value: 'clock' },
	{ label: __( 'Package', 'sgs-blocks' ),       value: 'package' },
	{ label: __( 'Users / People', 'sgs-blocks' ), value: 'users' },
	{ label: __( 'Globe', 'sgs-blocks' ),         value: 'globe' },
	{ label: __( 'Badge Check', 'sgs-blocks' ),   value: 'badge-check' },
	{ label: __( 'Thumbs Up', 'sgs-blocks' ),     value: 'thumbs-up' },
	{ label: __( 'Flame', 'sgs-blocks' ),         value: 'flame' },
	{ label: __( 'Gift', 'sgs-blocks' ),          value: 'gift' },
	{ label: __( 'Baby', 'sgs-blocks' ),          value: 'baby' },
	{ label: __( 'Milk', 'sgs-blocks' ),          value: 'milk' },
];

const GAP_OPTIONS = [
	{ label: __( 'Tight (8px)', 'sgs-blocks' ),    value: '10' },
	{ label: __( 'Normal (16px)', 'sgs-blocks' ),   value: '20' },
	{ label: __( 'Relaxed (24px)', 'sgs-blocks' ),  value: '30' },
	{ label: __( 'Spacious (32px)', 'sgs-blocks' ), value: '40' },
];

/**
 * Simple SVG placeholder used in the editor preview — a small circle with a
 * generic icon mark. The real Lucide SVG renders on the frontend via render.php.
 */
function EditorIconCircle( { size, circleBg, iconColour } ) {
	return (
		<span
			className="sgs-trust-badges__circle"
			aria-hidden="true"
			style={ {
				width: size,
				height: size,
				borderRadius: '50%',
				backgroundColor: circleBg || '#ffffff',
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
				boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
			} }
		>
			{ /* Generic circle placeholder — real SVG rendered by render.php */ }
			<svg
				width={ Math.round( size * 0.45 ) }
				height={ Math.round( size * 0.45 ) }
				viewBox="0 0 24 24"
				fill="none"
				stroke={ iconColour || 'currentColor' }
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="8" />
			</svg>
		</span>
	);
}

function BadgeItemEditor( { item, index, onChange, onRemove, showPending } ) {
	const update = ( key, value ) => onChange( { ...item, [ key ]: value } );

	return (
		<div
			style={ {
				padding: '12px',
				marginBottom: '12px',
				background: item.pending ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.02)',
				borderRadius: '4px',
				border: item.pending ? '1px dashed #ccc' : '1px solid transparent',
				opacity: item.pending ? 0.75 : 1,
			} }
		>
			{ item.pending && (
				<Notice status="warning" isDismissible={ false } style={ { marginBottom: '8px' } }>
					{ __( 'Pending — hidden on the frontend until you uncheck "Pending".', 'sgs-blocks' ) }
				</Notice>
			) }
			<SelectControl
				label={ __( 'Icon', 'sgs-blocks' ) }
				value={ item.icon || 'check' }
				options={ ICON_OPTIONS }
				onChange={ ( val ) => update( 'icon', val ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Label', 'sgs-blocks' ) }
				value={ item.label || '' }
				onChange={ ( val ) => update( 'label', val ) }
				placeholder={ __( 'Badge label…', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
			/>
			<ToggleControl
				label={ __( 'Pending (hidden on frontend)', 'sgs-blocks' ) }
				help={ __( 'Keep the slot in the editor but hide it from visitors until the credential is confirmed.', 'sgs-blocks' ) }
				checked={ !! item.pending }
				onChange={ ( val ) => update( 'pending', val ) }
				__nextHasNoMarginBottom
			/>
			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
				style={ { marginTop: '8px' } }
			>
				{ __( 'Remove badge', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		items,
		iconCircleSize,
		iconCircleBackground,
		iconColour,
		textColour,
		columns,
		gap,
		showPendingInEditor,
	} = attributes;

	const circleBgValue  = colourVar( iconCircleBackground ) || '#ffffff';
	const iconColorValue = colourVar( iconColour ) || 'currentColor';
	const textColorValue = colourVar( textColour ) || undefined;

	const blockProps = useBlockProps( {
		className: 'sgs-trust-badges',
		style: {
			'--sgs-trust-badges-gap': gap ? `var(--wp--preset--spacing--${ gap })` : undefined,
			'--sgs-trust-badge-circle-size': iconCircleSize !== 44 ? `${ iconCircleSize }px` : undefined,
			'--sgs-trust-badge-circle-bg': circleBgValue,
			'--sgs-trust-badge-icon-colour': iconColorValue,
			'--sgs-trust-badge-text-colour': textColorValue,
		},
	} );

	const updateItem = ( index, updated ) => {
		const next = [ ...items ];
		next[ index ] = updated;
		setAttributes( { items: next } );
	};

	const removeItem = ( index ) => {
		setAttributes( { items: items.filter( ( _, i ) => i !== index ) } );
	};

	const addItem = () => {
		setAttributes( {
			items: [
				...items,
				{ icon: 'check', label: '', pending: false },
			],
		} );
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Trust Badges', 'sgs-blocks' ) }>
					<p style={ { fontSize: '12px', color: '#757575', marginTop: 0 } }>
						{ __( 'Add up to 6 trust badges. Badges marked as "Pending" are hidden on the frontend but remain editable here.', 'sgs-blocks' ) }
					</p>
					{ items.map( ( item, index ) => (
						<BadgeItemEditor
							key={ index }
							item={ item }
							index={ index }
							onChange={ ( updated ) => updateItem( index, updated ) }
							onRemove={ () => removeItem( index ) }
							showPending={ showPendingInEditor }
						/>
					) ) }
					<Button
						variant="secondary"
						onClick={ addItem }
						style={ { width: '100%', justifyContent: 'center' } }
					>
						{ __( 'Add badge', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

				<PanelBody title={ __( 'Appearance', 'sgs-blocks' ) } initialOpen={ false }>
					<RangeControl
						label={ __( 'Icon circle size (px)', 'sgs-blocks' ) }
						value={ iconCircleSize }
						onChange={ ( val ) => setAttributes( { iconCircleSize: val } ) }
						min={ 36 }
						max={ 64 }
						step={ 2 }
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Icon circle background', 'sgs-blocks' ) }
						value={ iconCircleBackground }
						onChange={ ( val ) => setAttributes( { iconCircleBackground: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Icon colour', 'sgs-blocks' ) }
						value={ iconColour }
						onChange={ ( val ) => setAttributes( { iconColour: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Label colour', 'sgs-blocks' ) }
						value={ textColour }
						onChange={ ( val ) => setAttributes( { textColour: val } ) }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<RangeControl
						label={ __( 'Columns (at 600px+)', 'sgs-blocks' ) }
						value={ columns }
						onChange={ ( val ) => setAttributes( { columns: val } ) }
						min={ 2 }
						max={ 6 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Gap between badges', 'sgs-blocks' ) }
						value={ gap }
						options={ GAP_OPTIONS }
						onChange={ ( val ) => setAttributes( { gap: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			{ /* Editor preview — simplified visual approximation of the frontend */ }
			<div { ...blockProps }>
				{ items.map( ( item, index ) => {
					// In the editor, always render pending items but visually dim them.
					const isPending = !! item.pending;
					return (
						<div
							key={ index }
							className="sgs-trust-badges__badge"
							style={ { opacity: isPending ? 0.45 : 1 } }
							title={ isPending ? __( 'Pending — hidden on frontend', 'sgs-blocks' ) : undefined }
						>
							<EditorIconCircle
								size={ iconCircleSize }
								circleBg={ circleBgValue }
								iconColour={ iconColorValue }
							/>
							<span
								className="sgs-trust-badges__label"
								style={ { color: textColorValue } }
							>
								{ item.label || <em>{ __( '(no label)', 'sgs-blocks' ) }</em> }
								{ isPending && (
									<span
										style={ {
											marginLeft: '6px',
											fontSize: '10px',
											fontWeight: 600,
											textTransform: 'uppercase',
											background: '#f0ad4e',
											color: '#fff',
											padding: '1px 5px',
											borderRadius: '3px',
											letterSpacing: '0.05em',
										} }
									>
										{ __( 'Pending', 'sgs-blocks' ) }
									</span>
								) }
							</span>
						</div>
					);
				} ) }
			</div>
		</>
	);
}
