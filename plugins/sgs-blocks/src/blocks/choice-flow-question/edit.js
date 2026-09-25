import { __, sprintf } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import {
	PanelBody,
	TextControl,
	TextareaControl,
	SelectControl,
	ToggleControl,
	Button,
} from '@wordpress/components';
import { VStack } from '../../components/primitives';
import MediaPicker from '../../components/MediaPicker';
import AddonPricingPanel from './AddonPricingPanel';
import ProductAttributePanel from './ProductAttributePanel';

// Reserved sentinel (FR-43-2 / spec brief) — "jump straight to whichever
// result step is reachable" rather than a specific sibling sgs/form-step.
const TERMINAL_SENTINEL = '__terminal__';

/**
 * Slug an option label into a stable option `value` — mirrors
 * sanitize_title()'s common case (lowercase, non-alnum collapsed to a single
 * hyphen, trimmed) closely enough for editor-time value derivation. The
 * server never trusts this value as-is; it is just the option's identity.
 *
 * @param {string} label
 * @return {string}
 */
function slugifyLabel( label ) {
	return ( label || '' )
		.toString()
		.toLowerCase()
		.trim()
		.replace( /[^a-z0-9]+/g, '-' )
		.replace( /^-+|-+$/g, '' );
}

export default function Edit( { attributes, setAttributes, clientId, context } ) {
	const { question, options, layout, priceGroup } = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-choice-flow-question',
	} );

	// Walk up from this question block to the nearest sgs/choice-flow
	// ancestor, then list its sgs/form-step children as step-picker choices.
	// Walking (rather than assuming exactly one level, i.e. straight to the
	// parent sgs/form-step's own parent) keeps this resilient if a future
	// wrapper block is ever inserted between choice-flow and form-step.
	const stepChoices = useSelect(
		( select ) => {
			const { getBlockRootClientId, getBlock, getBlocks } =
				select( 'core/block-editor' );

			let ancestorId = getBlockRootClientId( clientId );
			let flowId = '';
			while ( ancestorId ) {
				const ancestorBlock = getBlock( ancestorId );
				if ( ancestorBlock && ancestorBlock.name === 'sgs/choice-flow' ) {
					flowId = ancestorId;
					break;
				}
				ancestorId = getBlockRootClientId( ancestorId );
			}

			if ( ! flowId ) {
				return [];
			}

			// value is the step's 0-based DOM-order position, NOT its
			// clientId. clientId is a React-editor-only concept — WordPress's
			// parse_blocks() never includes it in the parsed block tree that
			// render.php or a runtime store receives, so a stored clientId
			// could never be resolved back to a step at render/runtime.
			// choice-flow/view.js's step engine reads this same value
			// straight off `flowRoot.querySelectorAll('.sgs-form-step')[
			// index ]` — the identical DOM-order lookup sgs/form/view.js
			// already uses for its own step indexing, so a stringified
			// index is a stable, runtime-resolvable identifier.
			return getBlocks( flowId )
				.filter( ( block ) => block.name === 'sgs/form-step' )
				.map( ( block, index ) => ( {
					label: sprintf(
						/* translators: %d: step position within the flow. */
						__( 'Step %d', 'sgs-blocks' ),
						index + 1
					),
					value: String( index ),
				} ) );
		},
		[ clientId ]
	);

	const nextStepOptions = [
		{ label: __( 'Advance to next step', 'sgs-blocks' ), value: '' },
		...stepChoices,
		{ label: __( 'Show result', 'sgs-blocks' ), value: TERMINAL_SENTINEL },
	];

	const updateOption = ( index, key, value ) => {
		const newOptions = [ ...options ];
		newOptions[ index ] = { ...newOptions[ index ], [ key ]: value };
		setAttributes( { options: newOptions } );
	};

	const removeOption = ( index ) => {
		setAttributes( { options: options.filter( ( _, i ) => i !== index ) } );
	};

	const moveOption = ( index, direction ) => {
		const targetIndex = index + direction;
		if ( targetIndex < 0 || targetIndex >= options.length ) {
			return;
		}
		const newOptions = [ ...options ];
		const [ moved ] = newOptions.splice( index, 1 );
		newOptions.splice( targetIndex, 0, moved );
		setAttributes( { options: newOptions } );
	};

	const addOption = () => {
		const newIndex = options.length + 1;
		setAttributes( {
			options: [
				...options,
				{
					label: sprintf(
						/* translators: %d: option position. */
						__( 'Option %d', 'sgs-blocks' ),
						newIndex
					),
					value: `option-${ newIndex }`,
					nextStepId: '',
					tags: [],
					image: null,
					helpText: '',
					addToBagNow: false,
				},
			],
		} );
	};

	/**
	 * Adapt an option's stored `image` shape ({id, url, alt} — FR-43-15,
	 * matching sgs/media's own imageId/imageUrl/imageAlt attribute trio) to
	 * the richer `SGSMedia` shape `MediaPicker` expects ({url, type, id, alt,
	 * mime}), and back again on change/remove. `type`/`mime` are never
	 * persisted here — this option's `image` attribute is image-only
	 * (`allowedTypes={ [ 'image' ] }` below), so they would be redundant on
	 * every stored row.
	 *
	 * @param {{id?: number, url?: string, alt?: string}|null|undefined} image
	 * @return {import('../../components/MediaPicker').SGSMedia|null}
	 */
	const toMediaPickerValue = ( image ) =>
		image && image.url
			? {
					url: image.url,
					type: 'image',
					id: image.id || 0,
					alt: image.alt || '',
					mime: 'image/jpeg',
			  }
			: null;

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ true }>
					<SelectControl
						label={ __( 'Options layout', 'sgs-blocks' ) }
						value={ layout || 'grid' }
						options={ [
							{ label: __( 'Grid (cards)', 'sgs-blocks' ), value: 'grid' },
							{ label: __( 'List (stacked rows)', 'sgs-blocks' ), value: 'list' },
						] }
						onChange={ ( val ) => setAttributes( { layout: val } ) }
						help={ __(
							'List stacks every option full-width with a smaller side-by-side image, matching a reference quiz step that lists answers vertically rather than as a card grid.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
				<ProductAttributePanel attributes={ attributes } setAttributes={ setAttributes } clientId={ clientId } context={ context } />
				<AddonPricingPanel
					priceGroup={ priceGroup }
					options={ options }
					setAttributes={ setAttributes }
				/>
				<PanelBody title={ __( 'Options', 'sgs-blocks' ) } initialOpen={ true }>
					<VStack spacing={ 4 }>
						{ options.map( ( option, index ) => (
							<VStack
								key={ index }
								spacing={ 2 }
								className="sgs-choice-flow-question__option-row"
							>
								<TextControl
									label={ __( 'Label', 'sgs-blocks' ) }
									value={ option.label || '' }
									onChange={ ( val ) => {
										const newOptions = [ ...options ];
										const nextOption = { ...newOptions[ index ], label: val };
										// Only auto-derive the value while it still matches the
										// slug of the PREVIOUS label — once the operator edits
										// the value directly it stops tracking the label.
										if (
											! option.value ||
											option.value === slugifyLabel( option.label )
										) {
											nextOption.value = slugifyLabel( val );
										}
										newOptions[ index ] = nextOption;
										setAttributes( { options: newOptions } );
									} }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
								<TextControl
									label={ __( 'Value', 'sgs-blocks' ) }
									value={ option.value || '' }
									onChange={ ( val ) => updateOption( index, 'value', val ) }
									help={ __( 'Machine value used in submission data', 'sgs-blocks' ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
								<SelectControl
									label={ __( 'Goes to', 'sgs-blocks' ) }
									value={ option.nextStepId || '' }
									options={ nextStepOptions }
									onChange={ ( val ) => updateOption( index, 'nextStepId', val ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
								<TextControl
									label={ __( 'Tags', 'sgs-blocks' ) }
									value={ ( option.tags || [] ).join( ', ' ) }
									onChange={ ( val ) =>
										updateOption(
											index,
											'tags',
											val
												.split( ',' )
												.map( ( tag ) => tag.trim() )
												.filter( Boolean )
										)
									}
									help={ __(
										'Only needed if this flow has more than one possible result — comma-separated. Leave blank for a single-result flow.',
										'sgs-blocks'
									) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
								{ /* FR-43-15 (v1.3.0): optional per-option image, rendered in
								     the option card's 16:9 preview zone. Reuses this codebase's
								     shared MediaPicker (wraps MediaUpload/MediaUploadCheck —
								     see decorative-image/edit.js for the established pattern)
								     rather than hand-rolling a bespoke MediaUpload call. */ }
								<MediaPicker
									value={ toMediaPickerValue( option.image ) }
									allowedTypes={ [ 'image' ] }
									onChange={ ( media ) =>
										updateOption(
											index,
											'image',
											media
												? {
														id: media.id,
														url: media.url,
														alt: media.alt,
												  }
												: null
										)
									}
									onRemove={ () => updateOption( index, 'image', null ) }
									label={ __( 'Select image', 'sgs-blocks' ) }
									instructionsImage={ __(
										'Optional. Shown in the option card’s preview zone.',
										'sgs-blocks'
									) }
								/>
								{ /* FR-43-16 (v1.3.0): optional per-option help text, revealed
								     by a floating '?' toggle on the option card. */ }
								<TextareaControl
									label={ __( 'Help text', 'sgs-blocks' ) }
									value={ option.helpText || '' }
									onChange={ ( val ) => updateOption( index, 'helpText', val ) }
									help={ __(
										'Optional. Shown when a visitor taps the ‘?’ on this option — leave blank for no toggle at all.',
										'sgs-blocks'
									) }
									rows={ 3 }
									__nextHasNoMarginBottom
								/>
								<ToggleControl
									label={ __( 'Add to bag now (no add-ons)', 'sgs-blocks' ) }
									checked={ !! option.addToBagNow }
									onChange={ ( val ) => updateOption( index, 'addToBagNow', val ) }
									help={ __(
										'Ends the flow adding the product with no add-ons — e.g. “No prescription, keep the lenses they come with”. Still route this option to a result step below.',
										'sgs-blocks'
									) }
									__nextHasNoMarginBottom
								/>
								<VStack spacing={ 1 } className="sgs-choice-flow-question__option-row-actions">
									<Button
										isSmall
										variant="secondary"
										disabled={ index === 0 }
										onClick={ () => moveOption( index, -1 ) }
									>
										{ __( 'Move up', 'sgs-blocks' ) }
									</Button>
									<Button
										isSmall
										variant="secondary"
										disabled={ index === options.length - 1 }
										onClick={ () => moveOption( index, 1 ) }
									>
										{ __( 'Move down', 'sgs-blocks' ) }
									</Button>
									<Button
										isDestructive
										isSmall
										onClick={ () => removeOption( index ) }
									>
										{ __( 'Remove option', 'sgs-blocks' ) }
									</Button>
								</VStack>
							</VStack>
						) ) }
						<Button isPrimary onClick={ addOption }>
							{ __( 'Add option', 'sgs-blocks' ) }
						</Button>
					</VStack>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<TextControl
					label={ __( 'Question', 'sgs-blocks' ) }
					value={ question }
					onChange={ ( val ) => setAttributes( { question: val } ) }
					placeholder={ __( 'Which service suits you?', 'sgs-blocks' ) }
					className="sgs-choice-flow-question__title-input"
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<ul
					className={ `sgs-choice-flow-question__options-preview sgs-choice-flow-question__options-preview--${ layout || 'grid' }` }
				>
					{ options.map( ( option, index ) => (
						<li key={ index } className="sgs-choice-flow-question__option-preview">
							{ option.label || __( '(empty option)', 'sgs-blocks' ) }
						</li>
					) ) }
				</ul>
			</div>
		</>
	);
}
