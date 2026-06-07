import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	Button,
	ToggleControl,
	RangeControl,
} from '@wordpress/components';
import { DesignTokenPicker, IconPicker } from '../../components';

// ── Select options ──────────────────────────────────────────────────────────

const ORIENTATION_OPTIONS = [
	{ label: __( 'Vertical', 'sgs-blocks' ), value: 'vertical' },
	{ label: __( 'Horizontal', 'sgs-blocks' ), value: 'horizontal' },
];

const ALIGNMENT_OPTIONS = [
	{ label: __( 'Alternating', 'sgs-blocks' ), value: 'alternating' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'centre' },
];

const CONNECTOR_OPTIONS = [
	{ label: __( 'Solid line', 'sgs-blocks' ), value: 'line' },
	{ label: __( 'Dashed', 'sgs-blocks' ), value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), value: 'dotted' },
];

// ── Entry editor sub-component ──────────────────────────────────────────────

function EntryEditor( { entry, index, onChange, onRemove } ) {
	const update = ( key, value ) => onChange( { ...entry, [ key ]: value } );

	return (
		<div
			style={ {
				padding: '12px',
				border: '1px solid #ddd',
				borderRadius: '4px',
				marginBottom: '12px',
			} }
		>
			<TextControl
				label={ __( 'Date', 'sgs-blocks' ) }
				value={ entry.date || '' }
				onChange={ ( val ) => update( 'date', val ) }
				placeholder="YYYY-MM-DD or e.g. January 2024"
				help={ __( 'Used as the visible label and the datetime attribute.', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Title', 'sgs-blocks' ) }
				value={ entry.title || '' }
				onChange={ ( val ) => update( 'title', val ) }
				__nextHasNoMarginBottom
			/>
			<div style={ { marginTop: '8px', marginBottom: '8px' } }>
				<label
					style={ {
						display: 'block',
						marginBottom: '4px',
						fontSize: '11px',
						fontWeight: '500',
						textTransform: 'uppercase',
					} }
				>
					{ __( 'Description', 'sgs-blocks' ) }
				</label>
				<RichText
					tagName="div"
					value={ entry.description || '' }
					onChange={ ( val ) => update( 'description', val ) }
					placeholder={ __( 'Entry description…', 'sgs-blocks' ) }
					allowedFormats={ [
						'core/bold',
						'core/italic',
						'core/link',
						'core/text-color',
					] }
					style={ {
						border: '1px solid #ddd',
						borderRadius: '2px',
						padding: '8px',
						minHeight: '60px',
					} }
				/>
			</div>
			<IconPicker
				label={ __( 'Icon (optional)', 'sgs-blocks' ) }
				value={ { source: 'lucide', name: entry.icon || '' } }
				onChange={ ( { name } ) => update( 'icon', name ) }
				sources={ [ 'lucide' ] }
			/>
			<MediaUploadCheck>
				<MediaUpload
					onSelect={ ( media ) => update( 'image', media.id ) }
					allowedTypes={ [ 'image' ] }
					value={ entry.image || 0 }
					render={ ( { open } ) => (
						<Button
							variant="secondary"
							onClick={ open }
							style={ { marginTop: '8px', marginBottom: '8px' } }
						>
							{ entry.image
								? __( 'Change image', 'sgs-blocks' )
								: __( 'Add image (optional)', 'sgs-blocks' ) }
						</Button>
					) }
				/>
			</MediaUploadCheck>
			{ entry.image > 0 && (
				<Button
					variant="tertiary"
					isDestructive
					onClick={ () => update( 'image', 0 ) }
					size="small"
					style={ { display: 'block', marginBottom: '8px' } }
				>
					{ __( 'Remove image', 'sgs-blocks' ) }
				</Button>
			) }
			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
				style={ { marginTop: '4px' } }
			>
				{ __( 'Remove entry', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

// ── Main Edit component ─────────────────────────────────────────────────────

export default function Edit( { attributes, setAttributes } ) {
	const {
		orientation,
		alignment,
		entries,
		connectorStyle,
		connectorColour,
		dateColour,
		revealOnScroll,
		revealStagger,
	} = attributes;

	// Build preview class list mirroring render.php.
	const previewClasses = [
		'sgs-timeline',
		`sgs-timeline--${ orientation }`,
		orientation === 'vertical' ? `sgs-timeline--align-${ alignment }` : '',
		`sgs-timeline--connector-${ connectorStyle }`,
	].filter( Boolean ).join( ' ' );

	const blockProps = useBlockProps( {
		className: previewClasses,
		style: {
			'--sgs-connector-colour': connectorColour
				? `var(--wp--preset--color--${ connectorColour })`
				: undefined,
			'--sgs-date-colour': dateColour
				? `var(--wp--preset--color--${ dateColour })`
				: undefined,
		},
	} );

	const updateEntry = ( index, updated ) => {
		const next = [ ...entries ];
		next[ index ] = updated;
		setAttributes( { entries: next } );
	};

	const removeEntry = ( index ) => {
		setAttributes( { entries: entries.filter( ( _, i ) => i !== index ) } );
	};

	const addEntry = () => {
		setAttributes( {
			entries: [
				...entries,
				{
					date: '',
					title: '',
					description: '',
					icon: '',
					image: 0,
				},
			],
		} );
	};

	return (
		<>
			<InspectorControls>
				{/* ── Entries ── */}
				<PanelBody title={ __( 'Timeline entries', 'sgs-blocks' ) }>
					{ entries.map( ( entry, index ) => (
						<EntryEditor
							key={ index }
							entry={ entry }
							index={ index }
							onChange={ ( updated ) => updateEntry( index, updated ) }
							onRemove={ () => removeEntry( index ) }
						/>
					) ) }
					<Button variant="secondary" onClick={ addEntry }>
						{ __( 'Add entry', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

				{/* ── Layout ── */}
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Orientation', 'sgs-blocks' ) }
						value={ orientation }
						options={ ORIENTATION_OPTIONS }
						onChange={ ( val ) => setAttributes( { orientation: val } ) }
						__nextHasNoMarginBottom
					/>
					{ orientation === 'vertical' && (
						<SelectControl
							label={ __( 'Alignment', 'sgs-blocks' ) }
							value={ alignment }
							options={ ALIGNMENT_OPTIONS }
							onChange={ ( val ) => setAttributes( { alignment: val } ) }
							help={ __( 'Alternating flips content left/right on each entry.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				{/* ── Connector ── */}
				<PanelBody title={ __( 'Connector', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Connector style', 'sgs-blocks' ) }
						value={ connectorStyle }
						options={ CONNECTOR_OPTIONS }
						onChange={ ( val ) => setAttributes( { connectorStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Connector colour', 'sgs-blocks' ) }
						value={ connectorColour }
						onChange={ ( val ) => setAttributes( { connectorColour: val } ) }
					/>
				</PanelBody>

				{/* ── Colours ── */}
				<PanelBody title={ __( 'Colours', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Date colour', 'sgs-blocks' ) }
						value={ dateColour }
						onChange={ ( val ) => setAttributes( { dateColour: val } ) }
					/>
				</PanelBody>

				{/* ── Animation ── */}
				<PanelBody title={ __( 'Scroll reveal', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Reveal on scroll', 'sgs-blocks' ) }
						checked={ revealOnScroll }
						onChange={ ( val ) => setAttributes( { revealOnScroll: val } ) }
						help={ __(
							'Entries animate in as they enter the viewport. Disable to show all entries immediately.',
							'sgs-blocks'
						) }
					/>
					{ revealOnScroll && (
						<RangeControl
							label={ __( 'Stagger delay (ms)', 'sgs-blocks' ) }
							value={ revealStagger }
							onChange={ ( val ) => setAttributes( { revealStagger: val } ) }
							min={ 0 }
							max={ 500 }
							step={ 25 }
							help={ __(
								'Delay between each entry animating in.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>
			</InspectorControls>

			{ /* ── Editor preview ── */ }
			<ol { ...blockProps }>
				{ entries.map( ( entry, index ) => (
					<li key={ index } className="sgs-timeline__entry is-revealed">
						<time className="sgs-timeline__date">
							{ entry.date || __( 'Date', 'sgs-blocks' ) }
						</time>
						<div className="sgs-timeline__node" aria-hidden="true" />
						<div className="sgs-timeline__content">
							<RichText.Content
								tagName="h3"
								className="sgs-timeline__title"
								value={ entry.title || __( 'Entry title', 'sgs-blocks' ) }
							/>
							{ entry.description && (
								<RichText.Content
									tagName="div"
									className="sgs-timeline__description"
									value={ entry.description }
								/>
							) }
						</div>
					</li>
				) ) }
			</ol>
		</>
	);
}
