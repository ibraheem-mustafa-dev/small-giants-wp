import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	TextareaControl,
	Button,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

const CONNECTOR_OPTIONS = [
	{ label: __( 'Line', 'sgs-blocks' ), value: 'line' },
	{ label: __( 'Arrow', 'sgs-blocks' ), value: 'arrow' },
	{ label: __( 'Dots', 'sgs-blocks' ), value: 'dots' },
];

const NUMBER_STYLE_OPTIONS = [
	{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
	{ label: __( 'Square', 'sgs-blocks' ), value: 'square' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
];

function StepEditor( { step, index, onChange, onRemove } ) {
	const update = ( key, value ) => {
		onChange( { ...step, [ key ]: value } );
	};

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
				label={ __( 'Step number / label', 'sgs-blocks' ) }
				value={ step.number || '' }
				onChange={ ( val ) => update( 'number', val ) }
				placeholder={ String( index + 1 ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Title', 'sgs-blocks' ) }
				value={ step.title || '' }
				onChange={ ( val ) => update( 'title', val ) }
				__nextHasNoMarginBottom
			/>
			<TextareaControl
				label={ __( 'Description', 'sgs-blocks' ) }
				value={ step.description || '' }
				onChange={ ( val ) => update( 'description', val ) }
				rows={ 2 }
				__nextHasNoMarginBottom
			/>
			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
				style={ { marginTop: '8px' } }
			>
				{ __( 'Remove step', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		steps,
		connectorStyle,
		numberStyle,
		numberColour,
		numberBackground,
		titleColour,
		descriptionColour,
	} = attributes;

	const className = [
		'sgs-process-steps',
		`sgs-process-steps--connector-${ connectorStyle }`,
		`sgs-process-steps--number-${ numberStyle }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	const numStyle = {
		color: colourVar( numberColour ) || undefined,
		backgroundColor: colourVar( numberBackground ) || undefined,
	};

	const titleStyle = {
		color: colourVar( titleColour ) || undefined,
	};

	const descStyle = {
		color: colourVar( descriptionColour ) || undefined,
	};

	const updateStep = ( index, updated ) => {
		const newSteps = [ ...steps ];
		newSteps[ index ] = updated;
		setAttributes( { steps: newSteps } );
	};

	const removeStep = ( index ) => {
		setAttributes( {
			steps: steps.filter( ( _, i ) => i !== index ),
		} );
	};

	const addStep = () => {
		setAttributes( {
			steps: [
				...steps,
				{
					number: String( steps.length + 1 ),
					title: '',
					description: '',
				},
			],
		} );
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Steps', 'sgs-blocks' ) }>
					{ steps.map( ( step, index ) => (
						<StepEditor
							key={ index }
							step={ step }
							index={ index }
							onChange={ ( updated ) =>
								updateStep( index, updated )
							}
							onRemove={ () => removeStep( index ) }
						/>
					) ) }
					<Button variant="secondary" onClick={ addStep }>
						{ __( 'Add step', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

				<PanelBody
					title={ __( 'Appearance', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Connector style', 'sgs-blocks' ) }
						value={ connectorStyle }
						options={ CONNECTOR_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { connectorStyle: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Number style', 'sgs-blocks' ) }
						value={ numberStyle }
						options={ NUMBER_STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { numberStyle: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Number colour', 'sgs-blocks' ) }
						value={ numberColour }
						onChange={ ( val ) =>
							setAttributes( { numberColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'Number background colour',
							'sgs-blocks'
						) }
						value={ numberBackground }
						onChange={ ( val ) =>
							setAttributes( { numberBackground: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Title colour', 'sgs-blocks' ) }
						value={ titleColour }
						onChange={ ( val ) =>
							setAttributes( { titleColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'Description colour',
							'sgs-blocks'
						) }
						value={ descriptionColour }
						onChange={ ( val ) =>
							setAttributes( { descriptionColour: val } )
						}
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ steps.map( ( step, index ) => (
					<div key={ index } className="sgs-process-steps__step">
						{ numberStyle !== 'none' && (
							<span
								className="sgs-process-steps__number"
								style={ numStyle }
							>
								{ step.number || index + 1 }
							</span>
						) }
						<h3
							className="sgs-process-steps__title"
							style={ titleStyle }
						>
							{ step.title || __(
								'Step title',
								'sgs-blocks'
							) }
						</h3>
						{ step.description && (
							<p
								className="sgs-process-steps__description"
								style={ descStyle }
							>
								{ step.description }
							</p>
						) }
					</div>
				) ) }
			</div>
		</>
	);
}
