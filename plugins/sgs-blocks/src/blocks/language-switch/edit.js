/**
 * SGS Language Switch — editor component.
 *
 * The `languages` repeater is hand-set (code, URL, optional custom label) —
 * no automatic language detection in the editor either. The canvas preview
 * approximates the server's PHP-intl label resolution with the browser's
 * `Intl.DisplayNames` where available, purely for a live preview; render.php
 * is the single source of truth for the frontend.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleGroupControl,
	ToggleGroupControlOption,
	Button,
	Flex,
	FlexItem,
	FlexBlock,
	Notice,
} from '@wordpress/components';
import {
	TypographyControls,
	ResponsiveControl,
	ResponsiveBoxControl,
	SgsColourPanel,
	textRow,
	SgsLengthControl,
	LinkPopoverField,
} from '../../components';

const LENGTH_UNITS = [
	{ value: 'px', label: 'px', default: 8 },
	{ value: 'rem', label: 'rem', default: 0.5 },
	{ value: 'em', label: 'em', default: 0.5 },
];

/**
 * Editor-only preview of the visible label — approximates render.php's
 * PHP-intl resolution using the browser's Intl API. Never used for output;
 * render.php always wins on the frontend.
 */
function previewLabel( code, labelStyle, customLabel ) {
	const primarySubtag = ( code || '' ).trim().split( /[-_]/ )[ 0 ] || '';
	const codeLabel = primarySubtag.toUpperCase();

	if ( 'custom' === labelStyle ) {
		return customLabel || codeLabel || __( '(no code)', 'sgs-blocks' );
	}
	if ( 'code' === labelStyle ) {
		return codeLabel || __( '(no code)', 'sgs-blocks' );
	}
	// autonym.
	if ( primarySubtag && 'undefined' !== typeof Intl && Intl.DisplayNames ) {
		try {
			const dn = new Intl.DisplayNames( [ primarySubtag ], { type: 'language' } );
			const name = dn.of( primarySubtag );
			if ( name ) {
				return name.charAt( 0 ).toUpperCase() + name.slice( 1 );
			}
		} catch ( e ) {
			// Fall through to the fallback chain below.
		}
	}
	return customLabel || codeLabel || __( '(no code)', 'sgs-blocks' );
}

function previewAutonym( code, customLabel ) {
	return previewLabel( code, 'autonym', customLabel );
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		display,
		prefixLabel,
		labelStyle,
		separator,
		languages,
		linkColour,
		linkColourHover,
		linkColourGradient,
		linkColourHoverGradient,
		currentColour,
		separatorColour,
		panelBackground,
		gap,
		panelPadding,
	} = attributes;

	const blockProps = useBlockProps( {
		className: [ 'sgs-language-switch', `sgs-language-switch--${ display }` ].join( ' ' ),
	} );

	/* ── languages repeater handlers ─────────────────────────────────── */

	function addLanguage() {
		setAttributes( {
			languages: [
				...languages,
				{ code: '', url: '', customLabel: '' },
			],
		} );
	}

	function updateLanguage( index, field, value ) {
		setAttributes( {
			languages: languages.map( ( item, i ) =>
				i === index ? { ...item, [ field ]: value } : item
			),
		} );
	}

	function removeLanguage( index ) {
		setAttributes( {
			languages: languages.filter( ( _, i ) => i !== index ),
		} );
	}

	function moveLanguage( fromIndex, direction ) {
		const toIndex = fromIndex + direction;
		if ( toIndex < 0 || toIndex >= languages.length ) {
			return;
		}
		const updated = [ ...languages ];
		[ updated[ fromIndex ], updated[ toIndex ] ] = [ updated[ toIndex ], updated[ fromIndex ] ];
		setAttributes( { languages: updated } );
	}

	const duplicateCodesExist = ( () => {
		const codes = languages.map( ( it ) => ( it.code || '' ).trim().toLowerCase() ).filter( Boolean );
		return new Set( codes ).size !== codes.length;
	} )();

	/* ── canvas preview ──────────────────────────────────────────────── */

	function renderPreviewItems() {
		if ( languages.length === 0 ) {
			return (
				<p className="sgs-language-switch-editor__empty">
					{ __( 'Add languages in the sidebar to preview links.', 'sgs-blocks' ) }
				</p>
			);
		}

		return languages
			.filter( ( item ) => item.code )
			.map( ( item, index, arr ) => (
				<span key={ index } className="sgs-language-switch__item-wrap">
					<span className="sgs-language-switch__link">
						{ previewLabel( item.code, labelStyle, item.customLabel ) }
					</span>
					{ 'inline' === display && index < arr.length - 1 && !! separator && (
						<span className="sgs-language-switch__separator" aria-hidden="true">
							{ separator }
						</span>
					) }
				</span>
			) );
	}

	const colourRows = [
		textRow( {
			key: 'link',
			label: __( 'Link colour', 'sgs-blocks' ),
			attrs: {
				base: 'linkColour',
				hover: 'linkColourHover',
				gradient: 'linkColourGradient',
				hoverGradient: 'linkColourHoverGradient',
			},
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'current',
			label: __( 'Current language colour', 'sgs-blocks' ),
			attrs: { base: 'currentColour' },
			attributes,
			setAttributes,
		} ),
		'inline' === display &&
			textRow( {
				key: 'separator',
				label: __( 'Separator colour', 'sgs-blocks' ),
				attrs: { base: 'separatorColour' },
				attributes,
				setAttributes,
			} ),
		'disclosure' === display &&
			textRow( {
				key: 'panelBackground',
				label: __( 'Panel background', 'sgs-blocks' ),
				attrs: { base: 'panelBackground' },
				attributes,
				setAttributes,
			} ),
	].filter( Boolean );

	return (
		<>
			<SgsColourPanel rows={ colourRows } />

			<InspectorControls>
				<PanelBody title={ __( 'Language Switch Settings', 'sgs-blocks' ) } initialOpen={ true }>
					<ToggleGroupControl
						label={ __( 'Display', 'sgs-blocks' ) }
						value={ display }
						onChange={ ( val ) => setAttributes( { display: val } ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="inline" label={ __( 'Inline', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="single-link" label={ __( 'Single link', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="disclosure" label={ __( 'Disclosure', 'sgs-blocks' ) } />
					</ToggleGroupControl>

					<ToggleGroupControl
						label={ __( 'Label style', 'sgs-blocks' ) }
						value={ labelStyle }
						onChange={ ( val ) => setAttributes( { labelStyle: val } ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="autonym" label={ __( 'Autonym', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="code" label={ __( 'Code', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="custom" label={ __( 'Custom', 'sgs-blocks' ) } />
					</ToggleGroupControl>

					<TextControl
						label={ __( 'Prefix label', 'sgs-blocks' ) }
						help={ __( 'e.g. "Language:" — shown before the list/trigger. Leave blank for none.', 'sgs-blocks' ) }
						value={ prefixLabel }
						onChange={ ( val ) => setAttributes( { prefixLabel: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>

					{ 'inline' === display && (
						<TextControl
							label={ __( 'Separator', 'sgs-blocks' ) }
							help={ __( 'Printed between languages, e.g. "/" or ",".', 'sgs-blocks' ) }
							value={ separator }
							onChange={ ( val ) => setAttributes( { separator: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Languages', 'sgs-blocks' ) } initialOpen={ true }>
					{ duplicateCodesExist && (
						<Notice status="warning" isDismissible={ false }>
							{ __( 'Duplicate language codes detected — the current-language match uses the first one found.', 'sgs-blocks' ) }
						</Notice>
					) }

					{ languages.map( ( item, index ) => (
						<div key={ index } className="sgs-language-switch-editor__row">
							<Flex align="flex-start" gap={ 1 }>
								<FlexBlock>
									<TextControl
										label={ __( 'Language code', 'sgs-blocks' ) }
										help={ __( 'e.g. "es", "en_GB", "nl".', 'sgs-blocks' ) }
										value={ item.code }
										onChange={ ( val ) => updateLanguage( index, 'code', val ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									{ /* Spec 35 §2 LINK standard, searchOnly mode — a language's
									   url is a bare string with no target/rel concept (mirrors
									   sgs/product-card's ctaUrl / sgs/store-selector's store url). */ }
									<LinkPopoverField
										label={ __( 'URL', 'sgs-blocks' ) }
										value={ item.url }
										onChange={ ( val ) => updateLanguage( index, 'url', val || '' ) }
										searchOnly
									/>
									<TextControl
										label={ __( 'Custom label', 'sgs-blocks' ) }
										help={ __( 'Used when label style is "Custom", and as the fallback if intl cannot resolve a name.', 'sgs-blocks' ) }
										value={ item.customLabel }
										onChange={ ( val ) => updateLanguage( index, 'customLabel', val ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									{ item.code && (
										<p className="sgs-language-switch-editor__preview">
											{ __( 'Preview:', 'sgs-blocks' ) }{ ' ' }
											{ previewLabel( item.code, labelStyle, item.customLabel ) }
											{ 'code' === labelStyle &&
												` (${ __( 'accessible name', 'sgs-blocks' ) }: ${ previewAutonym( item.code, item.customLabel ) })` }
										</p>
									) }
								</FlexBlock>
								<FlexItem>
									<Button
										icon="arrow-up"
										label={ __( 'Move up', 'sgs-blocks' ) }
										size="small"
										disabled={ index === 0 }
										onClick={ () => moveLanguage( index, -1 ) }
									/>
									<Button
										icon="arrow-down"
										label={ __( 'Move down', 'sgs-blocks' ) }
										size="small"
										disabled={ index === languages.length - 1 }
										onClick={ () => moveLanguage( index, 1 ) }
									/>
									<Button
										icon="trash"
										label={ __( 'Remove language', 'sgs-blocks' ) }
										size="small"
										isDestructive
										onClick={ () => removeLanguage( index ) }
									/>
								</FlexItem>
							</Flex>
						</div>
					) ) }

					<Button variant="secondary" onClick={ addLanguage }>
						{ __( '+ Add language', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="styles">
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						fontSizePresets
						showFontFamily
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
					/>
				</PanelBody>
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveControl label={ __( 'Gap', 'sgs-blocks' ) }>
						{ ( bp ) => (
							<SgsLengthControl
								label={ __( 'Gap', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ gap?.[ bp ] ?? '' }
								units={ LENGTH_UNITS }
								onChange={ ( val ) =>
									setAttributes( { gap: { ...gap, [ bp ]: val ?? '' } } )
								}
								help={ __( 'Space between languages. Leave blank for the framework default.', 'sgs-blocks' ) }
								presets={ false }
							/>
						) }
					</ResponsiveControl>
					{ 'disclosure' === display && (
						<ResponsiveBoxControl
							label={ __( 'Panel padding', 'sgs-blocks' ) }
							presets
							values={ {
								base: panelPadding?.desktop ?? {},
								tablet: panelPadding?.tablet ?? {},
								mobile: panelPadding?.mobile ?? {},
							} }
							onChange={ ( tier, next ) => {
								const tierKey = { base: 'desktop', tablet: 'tablet', mobile: 'mobile' }[ tier ];
								setAttributes( { panelPadding: { ...panelPadding, [ tierKey ]: next } } );
							} }
						/>
					) }
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ !! prefixLabel && (
					<span className="sgs-language-switch__prefix">{ prefixLabel }</span>
				) }
				{ 'disclosure' === display ? (
					<>
						<button type="button" className="sgs-language-switch__trigger" disabled>
							{ languages[ 0 ]
								? previewLabel( languages[ 0 ].code, labelStyle, languages[ 0 ].customLabel )
								: __( 'Language', 'sgs-blocks' ) }
						</button>
						<div className="sgs-language-switch__panel">
							<span className="sgs-language-switch__list">{ renderPreviewItems() }</span>
						</div>
					</>
				) : (
					<span className="sgs-language-switch__list">{ renderPreviewItems() }</span>
				) }
			</div>
		</>
	);
}
