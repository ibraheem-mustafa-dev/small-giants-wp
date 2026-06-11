/**
 * SGS Option Picker — editor component.
 *
 * Renders a live pill preview in the canvas + full InspectorControls:
 * label text, showLabel toggle, option repeater (add/remove/reorder),
 * defaultSelected, pillStyle, pillSize, and all five colour token controls.
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
	Button,
	Flex,
	FlexItem,
	FlexBlock,
	Notice,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';
// WS-4: shared sgs/container wrapper editor controls (content kind = width/spacing).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';

/* ── Pill-style options ─────────────────────────────────────────────────── */

const PILL_STYLE_OPTIONS = [
	{ label: __( 'Outlined (default)', 'sgs-blocks' ), value: 'outlined' },
	{ label: __( 'Filled', 'sgs-blocks' ),            value: 'filled'   },
	{ label: __( 'Ghost', 'sgs-blocks' ),             value: 'ghost'    },
];

const PILL_SIZE_OPTIONS = [
	{ label: __( 'Small', 'sgs-blocks' ),           value: 'small'  },
	{ label: __( 'Medium (default)', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ),            value: 'large'  },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Ensure every option item has a unique, non-empty key.
 * Returns a copy of the items array with any duplicates or empty keys warned-about.
 */
function hasDuplicateKeys( items ) {
	const keys = items.map( ( it ) => it.key ).filter( Boolean );
	return new Set( keys ).size !== keys.length;
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function Edit( { attributes, setAttributes } ) {
	const {
		label,
		showLabel,
		labelFontSize,
		labelColour,
		labelFontWeight,
		labelMarginBottom,
		optionItems,
		defaultSelected,
		pillStyle,
		pillSize,
		pillBgColour,
		pillTextColour,
		pillBorderColour,
		pillSelectedBgColour,
		pillSelectedTextColour,
		pillFontSize,
		pillFontWeight,
		pillBorderRadius,
	} = attributes;

	const blockProps = useBlockProps( {
		className: [
			'sgs-option-picker',
			`sgs-option-picker--${ pillStyle }`,
			`sgs-option-picker--${ pillSize }`,
		].join( ' ' ),
	} );

	/* ── Inline CSS vars for the canvas preview ── */
	const previewVars = {};
	if ( pillBgColour )           previewVars[ '--sgs-op-bg' ]               = colourVar( pillBgColour );
	if ( pillTextColour )         previewVars[ '--sgs-op-text' ]             = colourVar( pillTextColour );
	if ( pillBorderColour )       previewVars[ '--sgs-op-border' ]           = colourVar( pillBorderColour );
	if ( pillSelectedBgColour )   previewVars[ '--sgs-op-sel-bg' ]           = colourVar( pillSelectedBgColour );
	if ( pillSelectedTextColour ) previewVars[ '--sgs-op-sel-text' ]         = colourVar( pillSelectedTextColour );
	if ( pillFontSize )           previewVars[ '--sgs-op-pill-font-size' ]   = pillFontSize;
	if ( pillFontWeight )         previewVars[ '--sgs-op-pill-font-weight' ] = pillFontWeight;
	if ( pillBorderRadius )       previewVars[ '--sgs-op-pill-radius' ]      = pillBorderRadius;

	/* ── Effective default: first option if defaultSelected is missing ── */
	const effectiveDefault =
		defaultSelected ||
		( optionItems.length > 0 ? optionItems[ 0 ].key : '' );

	/* ── Option-repeater handlers ── */

	function addOption() {
		const newKey = `option-${ Date.now() }`;
		setAttributes( {
			optionItems: [
				...optionItems,
				{ key: newKey, label: __( 'New option', 'sgs-blocks' ) },
			],
		} );
	}

	function updateOption( index, field, value ) {
		const updated = optionItems.map( ( item, i ) =>
			i === index ? { ...item, [ field ]: value } : item
		);
		setAttributes( { optionItems: updated } );

		/* If the key being renamed was the defaultSelected, follow the rename */
		if ( field === 'key' && optionItems[ index ].key === defaultSelected ) {
			setAttributes( { defaultSelected: value } );
		}
	}

	function removeOption( index ) {
		const updated = optionItems.filter( ( _, i ) => i !== index );
		setAttributes( { optionItems: updated } );
		/* Clear defaultSelected if the removed item was selected */
		if ( optionItems[ index ].key === defaultSelected ) {
			setAttributes( {
				defaultSelected: updated.length > 0 ? updated[ 0 ].key : '',
			} );
		}
	}

	function moveOption( fromIndex, direction ) {
		const toIndex = fromIndex + direction;
		if ( toIndex < 0 || toIndex >= optionItems.length ) return;
		const updated = [ ...optionItems ];
		[ updated[ fromIndex ], updated[ toIndex ] ] = [
			updated[ toIndex ],
			updated[ fromIndex ],
		];
		setAttributes( { optionItems: updated } );
	}

	const duplicateKeysExist = hasDuplicateKeys( optionItems );

	/* ── Default-selected options for the SelectControl ── */
	const defaultOptions = [
		{
			label: __( '— First option (auto) —', 'sgs-blocks' ),
			value: '',
		},
		...optionItems
			.filter( ( it ) => it.key )
			.map( ( it ) => ( { label: it.label || it.key, value: it.key } ) ),
	];

	/* ── Canvas preview pills ── */
	const renderPills = () => {
		if ( optionItems.length === 0 ) {
			return (
				<p className="sgs-option-picker__empty-notice">
					{ __(
						'Add options in the sidebar to preview pills.',
						'sgs-blocks'
					) }
				</p>
			);
		}

		return optionItems.map( ( item, index ) => {
			const isSelected = item.key === effectiveDefault;
			const pillClass = [
				'sgs-option-picker__option',
				isSelected ? 'sgs-option-picker__option--selected' : '',
			]
				.filter( Boolean )
				.join( ' ' );

			return (
				<span key={ index } className={ pillClass }>
					<span className="sgs-option-picker__pill">
						{ item.label || item.key || `Option ${ index + 1 }` }
					</span>
				</span>
			);
		} );
	};

	return (
		<>
			{ /* ── Inspector ────────────────────────────────────────── */ }
			<InspectorControls>

				{ /* Label panel */ }
				<PanelBody title={ __( 'Label', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Label text', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) =>
							setAttributes( { label: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show label', 'sgs-blocks' ) }
						checked={ showLabel }
						onChange={ ( val ) =>
							setAttributes( { showLabel: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ showLabel && (
						<>
							<TextControl
								label={ __( 'Label font size', 'sgs-blocks' ) }
								help={ __(
									'Token slug or CSS value, e.g. 1rem / 0.875rem. Empty = default.',
									'sgs-blocks'
								) }
								value={ labelFontSize }
								onChange={ ( val ) =>
									setAttributes( { labelFontSize: val } )
								}
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={ __( 'Label font weight', 'sgs-blocks' ) }
								help={ __(
									'Token slug or CSS value, e.g. 1rem / 600 / bold. Empty = default.',
									'sgs-blocks'
								) }
								value={ labelFontWeight }
								onChange={ ( val ) =>
									setAttributes( { labelFontWeight: val } )
								}
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={ __( 'Label margin bottom', 'sgs-blocks' ) }
								help={ __(
									'Token slug or CSS value, e.g. 1rem / 8px. Empty = default.',
									'sgs-blocks'
								) }
								value={ labelMarginBottom }
								onChange={ ( val ) =>
									setAttributes( { labelMarginBottom: val } )
								}
								__nextHasNoMarginBottom
							/>
							<DesignTokenPicker
								label={ __( 'Label colour', 'sgs-blocks' ) }
								value={ labelColour }
								onChange={ ( val ) =>
									setAttributes( { labelColour: val } )
								}
							/>
						</>
					) }
				</PanelBody>

				{ /* Options repeater */ }
				<PanelBody
					title={ __( 'Options', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					{ duplicateKeysExist && (
						<Notice
							status="warning"
							isDismissible={ false }
						>
							{ __(
								'Duplicate option keys detected. Each option must have a unique key.',
								'sgs-blocks'
							) }
						</Notice>
					) }

					{ optionItems.map( ( item, index ) => (
						<div
							key={ index }
							className="sgs-option-picker-editor__option-row"
						>
							<Flex align="flex-start" gap={ 1 }>
								<FlexBlock>
									<TextControl
										label={ __(
											'Label',
											'sgs-blocks'
										) }
										value={ item.label }
										onChange={ ( val ) =>
											updateOption(
												index,
												'label',
												val
											)
										}
										__nextHasNoMarginBottom
									/>
									<TextControl
										label={ __( 'Key (unique ID)', 'sgs-blocks' ) }
										help={ __(
											'Used in the event payload. Lowercase letters, digits, hyphens only.',
											'sgs-blocks'
										) }
										value={ item.key }
										onChange={ ( val ) =>
											updateOption(
												index,
												'key',
												val
													.toLowerCase()
													.replace(
														/[^a-z0-9-]/g,
														'-'
													)
											)
										}
										__nextHasNoMarginBottom
									/>
								</FlexBlock>
								<FlexItem>
									<Button
										icon="arrow-up"
										label={ __( 'Move up', 'sgs-blocks' ) }
										isSmall
										disabled={ index === 0 }
										onClick={ () =>
											moveOption( index, -1 )
										}
									/>
									<Button
										icon="arrow-down"
										label={ __(
											'Move down',
											'sgs-blocks'
										) }
										isSmall
										disabled={
											index ===
											optionItems.length - 1
										}
										onClick={ () =>
											moveOption( index, 1 )
										}
									/>
									<Button
										icon="trash"
										label={ __(
											'Remove option',
											'sgs-blocks'
										) }
										isSmall
										isDestructive
										onClick={ () =>
											removeOption( index )
										}
									/>
								</FlexItem>
							</Flex>
						</div>
					) ) }

					<Button
						variant="secondary"
						onClick={ addOption }
						style={ { marginTop: '8px' } }
					>
						{ __( '+ Add option', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

				{ /* Default selection */ }
				<PanelBody
					title={ __( 'Default selection', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Pre-selected option', 'sgs-blocks' ) }
						help={ __(
							'Which pill is selected on page load. Defaults to the first option.',
							'sgs-blocks'
						) }
						value={ defaultSelected }
						options={ defaultOptions }
						onChange={ ( val ) =>
							setAttributes( { defaultSelected: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* Appearance */ }
				<PanelBody
					title={ __( 'Appearance', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Pill style', 'sgs-blocks' ) }
						value={ pillStyle }
						options={ PILL_STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { pillStyle: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Pill size', 'sgs-blocks' ) }
						value={ pillSize }
						options={ PILL_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { pillSize: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Pill font size', 'sgs-blocks' ) }
						help={ __(
							'Token slug or CSS value, e.g. 1rem / 0.875rem. Empty = default.',
							'sgs-blocks'
						) }
						value={ pillFontSize }
						onChange={ ( val ) =>
							setAttributes( { pillFontSize: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Pill font weight', 'sgs-blocks' ) }
						help={ __(
							'Token slug or CSS value, e.g. 1rem / 600 / bold. Empty = default.',
							'sgs-blocks'
						) }
						value={ pillFontWeight }
						onChange={ ( val ) =>
							setAttributes( { pillFontWeight: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Pill border radius', 'sgs-blocks' ) }
						help={ __(
							'Token slug or CSS value, e.g. 1rem / 8px / 50%. Empty = default.',
							'sgs-blocks'
						) }
						value={ pillBorderRadius }
						onChange={ ( val ) =>
							setAttributes( { pillBorderRadius: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* Colours */ }
				<PanelBody
					title={ __( 'Colours', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Resting pill background', 'sgs-blocks' ) }
						value={ pillBgColour }
						onChange={ ( val ) =>
							setAttributes( { pillBgColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Resting pill text', 'sgs-blocks' ) }
						value={ pillTextColour }
						onChange={ ( val ) =>
							setAttributes( { pillTextColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Resting pill border', 'sgs-blocks' ) }
						value={ pillBorderColour }
						onChange={ ( val ) =>
							setAttributes( { pillBorderColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'Selected pill background',
							'sgs-blocks'
						) }
						value={ pillSelectedBgColour }
						onChange={ ( val ) =>
							setAttributes( { pillSelectedBgColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Selected pill text', 'sgs-blocks' ) }
						value={ pillSelectedTextColour }
						onChange={ ( val ) =>
							setAttributes( {
								pillSelectedTextColour: val,
							} )
						}
					/>
				</PanelBody>

				{ /* Width / spacing (WS-4 container mirror) */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>

				{ /* Converter metadata */ }
				<PanelBody
					title={ __( 'Converter metadata', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Type key', 'sgs-blocks' ) }
						help={ __(
							'Machine-readable identifier for the picker type (e.g. pack-size, flavour, colour). Included in the sgs:option-selected event detail.',
							'sgs-blocks'
						) }
						value={ attributes.typeKey }
						onChange={ ( val ) =>
							setAttributes( { typeKey: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Content-impact slots', 'sgs-blocks' ) }
						help={ __(
							'Comma-separated card slot names this picker controls (e.g. price,description). Included in the event detail for parent blocks.',
							'sgs-blocks'
						) }
						value={ ( attributes.contentImpact || [] ).join( ', ' ) }
						onChange={ ( val ) =>
							setAttributes( {
								contentImpact: val
									.split( ',' )
									.map( ( s ) => s.trim() )
									.filter( Boolean ),
							} )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Canvas preview ───────────────────────────────────── */ }
			<fieldset { ...blockProps } style={ { ...blockProps.style, ...previewVars } }>
				{ showLabel ? (
					<legend
						className="sgs-option-picker__label"
						style={ {
							...( labelFontSize    ? { fontSize:     labelFontSize }             : {} ),
							...( labelFontWeight  ? { fontWeight:   labelFontWeight }            : {} ),
							...( labelColour      ? { color:        colourVar( labelColour ) }   : {} ),
							...( labelMarginBottom ? { marginBottom: labelMarginBottom }          : {} ),
						} }
					>
						{ label || __( 'Choose an option', 'sgs-blocks' ) }
					</legend>
				) : (
					<legend className="sgs-sr-only">
						{ label || __( 'Choose an option', 'sgs-blocks' ) }
					</legend>
				) }
				<div className="sgs-option-picker__options" role="group">
					{ renderPills() }
				</div>
			</fieldset>
		</>
	);
}
