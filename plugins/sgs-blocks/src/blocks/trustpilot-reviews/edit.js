/**
 * Trustpilot Reviews -- Editor Component
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import {
	InspectorControls,
	useBlockProps,
} from '@wordpress/block-editor';
import { ResponsiveOverride, SgsColourPanel, fillRow,
	SgsBorderControl,
	resolveColourToken,
} from '../../components';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import ServerSideRender from '@wordpress/server-side-render';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	RangeControl,
	TextControl,
	TextareaControl,
	Button,
	Notice,
} from '@wordpress/components';
import { NumberControl, ToggleGroupControl, ToggleGroupControlOption, ToolsPanel, ToolsPanelItem } from '../../components/primitives';

// D649 — no JSON `enum` reliance in the UI list order; mirrors sgs/icon-list's
// allow-list exactly (render.php validates the same set independently).
const HEADING_LEVEL_OPTIONS = [
	{ label: __( 'Heading 2', 'sgs-blocks' ), value: 'h2' },
	{ label: __( 'Heading 3', 'sgs-blocks' ), value: 'h3' },
	{ label: __( 'Heading 4', 'sgs-blocks' ), value: 'h4' },
	{ label: __( 'Heading 5', 'sgs-blocks' ), value: 'h5' },
	{ label: __( 'Heading 6', 'sgs-blocks' ), value: 'h6' },
	{ label: __( 'Paragraph (not a heading)', 'sgs-blocks' ), value: 'p' },
];

const VARIANT_OPTIONS = [
	{ label: __( 'Carousel', 'sgs-blocks' ), value: 'carousel' },
	{ label: __( 'Grid', 'sgs-blocks' ), value: 'grid' },
	{ label: __( 'List', 'sgs-blocks' ), value: 'list' },
	{ label: __( 'Mini (aggregate bar only)', 'sgs-blocks' ), value: 'mini' },
	{ label: __( 'Mini Carousel', 'sgs-blocks' ), value: 'mini-carousel' },
];

const DATA_SOURCE_OPTIONS = [
	{ label: __( 'Inline (entered here)', 'sgs-blocks' ), value: 'inline' },
	{ label: __( 'Synced (read from site sync settings)', 'sgs-blocks' ), value: 'synced' },
	{ label: __( 'Placeholder (demo content)', 'sgs-blocks' ), value: 'placeholder' },
];

const EMPTY_STATE_OPTIONS = [
	{ label: __( 'Hide section (no gap)', 'sgs-blocks' ), value: 'hide' },
	{ label: __( 'Show "Reviews coming soon"', 'sgs-blocks' ), value: 'coming-soon' },
];

const CARD_STYLE_OPTIONS = [
	{ label: __( 'Elevated (drop shadow)', 'sgs-blocks' ), value: 'elevated' },
	{ label: __( 'Bordered', 'sgs-blocks' ), value: 'bordered' },
	{ label: __( 'Flat (no card)', 'sgs-blocks' ), value: 'flat' },
];

const newReview = () => ( {
	author: '',
	rating: 5,
	datePublished: new Date().toISOString(),
	reviewBody: '',
	title: '',
	isVerified: true,
} );

export default function Edit( { attributes, setAttributes } ) {
	const {
		variant,
		headingLevel,
		dataSource,
		emptyState,
		businessUnitUrl,
		reviews,
		trustScore,
		trustScoreLabel,
		totalReviews,
		reviewsAverage,
		showSourceHeader,
		showSubtitle,
		subtitleText,
		showTrustpilotLogo,
		showVerifiedBadge,
		showDate,
		showAuthor,
		showSchema,
		columns,
		theme,
		cardStyle,
		autoplay,
		autoplaySpeed,
		showDots,
		showArrows,
		dragToScroll,
		dragMomentum,
		loopCarousel,
		backgroundColour,
		backgroundColourGradient,
		textColour,
		textColourGradient,
	} = attributes;

	const blockProps = useBlockProps();
	const [ importText, setImportText ] = useState( '' );
	const [ importError, setImportError ] = useState( '' );

	const updateReview = ( idx, patch ) => {
		const next = ( reviews || [] ).map( ( r, i ) => ( i === idx ? { ...r, ...patch } : r ) );
		setAttributes( { reviews: next } );
	};

	const addReview = () => {
		setAttributes( { reviews: [ ...( reviews || [] ), newReview() ] } );
	};

	const removeReview = ( idx ) => {
		setAttributes( { reviews: ( reviews || [] ).filter( ( _, i ) => i !== idx ) } );
	};

	const handleImport = () => {
		setImportError( '' );
		try {
			const parsed = JSON.parse( importText );
			let imported;
			let derivedTrustScore = trustScore;
			let derivedTrustLabel = trustScoreLabel;
			let derivedTotal = totalReviews;
			let derivedUrl = businessUnitUrl;

			if ( Array.isArray( parsed ) ) {
				imported = parsed;
			} else if ( parsed && Array.isArray( parsed.reviews ) ) {
				imported = parsed.reviews;
				if ( parsed.trust_score ) {
					derivedTrustScore = parseFloat( parsed.trust_score );
				}
				if ( parsed.trust_score_label ) {
					derivedTrustLabel = parsed.trust_score_label;
				}
				if ( parsed.review_count ) {
					derivedTotal = parseInt( parsed.review_count, 10 );
				}
				if ( parsed.source_url ) {
					derivedUrl = parsed.source_url;
				}
			} else {
				throw new Error(
					__( 'Expected an array of reviews or an object with a "reviews" array.', 'sgs-blocks' )
				);
			}

			const normalised = imported.map( ( r ) => ( {
				author: r.author || '',
				rating: parseFloat( r.rating ) || 5,
				datePublished: r.datePublished || new Date().toISOString(),
				reviewBody: r.reviewBody || r.text || '',
				title: r.title || '',
				isVerified: r.isVerified !== false,
			} ) );

			setAttributes( {
				reviews: normalised,
				trustScore: derivedTrustScore,
				trustScoreLabel: derivedTrustLabel,
				totalReviews: derivedTotal,
				businessUnitUrl: derivedUrl,
			} );
			setImportText( '' );
		} catch ( err ) {
			setImportError( err.message || __( 'Invalid JSON.', 'sgs-blocks' ) );
		}
	};

	return (
		<>
			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						attrs: {
							base: 'backgroundColour',
							hover: 'backgroundColourHover',
							gradient: 'backgroundColourGradient',
							hoverGradient: 'backgroundColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) =>
									setAttributes( { textColour: val ?? '' } ),
								linked: true,
								gradientValue: textColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<ContainerWrapperControls attributes={ attributes } setAttributes={ setAttributes } kind="layout" />
				<PanelBody title={ __( 'Source', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Data source', 'sgs-blocks' ) }
						value={ dataSource }
						options={ DATA_SOURCE_OPTIONS }
						onChange={ ( value ) => setAttributes( { dataSource: value } ) }
						help={ __( 'Synced reads from wp_options[sgs_trustpilot_data], populated by Settings > SGS Trustpilot Sync.', 'sgs-blocks' ) }
						__next40pxDefaultSize
					/>
					{ dataSource === 'synced' && (
						<SelectControl
							label={ __( 'When no reviews are available', 'sgs-blocks' ) }
							value={ emptyState }
							options={ EMPTY_STATE_OPTIONS }
							onChange={ ( value ) => setAttributes( { emptyState: value } ) }
							help={ __( 'Controls what shows when the synced source is empty or unreachable. "Hide" leaves no gap; "Reviews coming soon" shows a placeholder message.', 'sgs-blocks' ) }
							__next40pxDefaultSize
						/>
					) }
					<TextControl
						label={ __( 'Trustpilot business URL', 'sgs-blocks' ) }
						value={ businessUnitUrl }
						onChange={ ( value ) => setAttributes( { businessUnitUrl: value } ) }
						placeholder="https://uk.trustpilot.com/review/example.com"
						type="url"
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ /* Outer PanelBody removed 2026-08-13 — it duplicated this
				   ToolsPanel's own "Header" title with no initialOpen, so
				   the client saw the same words twice for no collapse
				   benefit (Spec 35 A5 note). */ }
					<ToolsPanel
						label={ __( 'Header', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								showSourceHeader: true,
								showTrustpilotLogo: true,
								trustScore: 0,
								trustScoreLabel: '',
								totalReviews: 0,
								reviewsAverage: 0,
								showSubtitle: false,
								subtitleText: 'Showing our latest reviews',
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Show source header', 'sgs-blocks' ) }
							hasValue={ () => showSourceHeader !== true }
							onDeselect={ () =>
								setAttributes( { showSourceHeader: true } )
							}
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Show source header', 'sgs-blocks' ) }
								checked={ showSourceHeader }
								onChange={ ( value ) => setAttributes( { showSourceHeader: value } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Show Trustpilot logo', 'sgs-blocks' ) }
							hasValue={ () => showTrustpilotLogo !== true }
							onDeselect={ () =>
								setAttributes( { showTrustpilotLogo: true } )
							}
						>
							<ToggleControl
								label={ __( 'Show Trustpilot logo', 'sgs-blocks' ) }
								checked={ showTrustpilotLogo }
								onChange={ ( value ) => setAttributes( { showTrustpilotLogo: value } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'TrustScore (0-5)', 'sgs-blocks' ) }
							hasValue={ () => trustScore !== 0 }
							onDeselect={ () => setAttributes( { trustScore: 0 } ) }
							isShownByDefault
						>
							<NumberControl
								label={ __( 'TrustScore (0-5)', 'sgs-blocks' ) }
								value={ trustScore }
								min={ 0 }
								max={ 5 }
								step={ 0.1 }
								onChange={ ( value ) => setAttributes( { trustScore: parseFloat( value ) || 0 } ) }
								help={ __( 'Leave 0 to auto-derive from reviews average.', 'sgs-blocks' ) }
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Score label override', 'sgs-blocks' ) }
							hasValue={ () => !! trustScoreLabel }
							onDeselect={ () => setAttributes( { trustScoreLabel: '' } ) }
						>
							<TextControl
								label={ __( 'Score label override', 'sgs-blocks' ) }
								value={ trustScoreLabel }
								onChange={ ( value ) => setAttributes( { trustScoreLabel: value } ) }
								placeholder={ __( 'Auto: Excellent / Great / Good / Average / Poor / Bad', 'sgs-blocks' ) }
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Total reviews', 'sgs-blocks' ) }
							hasValue={ () => totalReviews !== 0 }
							onDeselect={ () => setAttributes( { totalReviews: 0 } ) }
						>
							<NumberControl
								label={ __( 'Total reviews', 'sgs-blocks' ) }
								value={ totalReviews }
								min={ 0 }
								onChange={ ( value ) => setAttributes( { totalReviews: parseInt( value, 10 ) || 0 } ) }
								help={ __( 'Leave 0 to auto-derive from the reviews list.', 'sgs-blocks' ) }
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Reviews average (Schema.org)', 'sgs-blocks' ) }
							hasValue={ () => reviewsAverage !== 0 }
							onDeselect={ () => setAttributes( { reviewsAverage: 0 } ) }
						>
							<NumberControl
								label={ __( 'Reviews average (Schema.org)', 'sgs-blocks' ) }
								value={ reviewsAverage }
								min={ 0 }
								max={ 5 }
								step={ 0.1 }
								onChange={ ( value ) => setAttributes( { reviewsAverage: parseFloat( value ) || 0 } ) }
								help={ __( 'Rating value used in the review structured data. Leave 0 to calculate automatically from your reviews.', 'sgs-blocks' ) }
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Show subtitle', 'sgs-blocks' ) }
							hasValue={ () =>
								showSubtitle !== false ||
								subtitleText !== 'Showing our latest reviews'
							}
							onDeselect={ () =>
								setAttributes( {
									showSubtitle: false,
									subtitleText: 'Showing our latest reviews',
								} )
							}
						>
							<ToggleControl
								label={ __( 'Show subtitle', 'sgs-blocks' ) }
								checked={ showSubtitle }
								onChange={ ( value ) => setAttributes( { showSubtitle: value } ) }
							/>
							{ showSubtitle && (
								<TextControl
									label={ __( 'Subtitle text', 'sgs-blocks' ) }
									value={ subtitleText }
									onChange={ ( value ) => setAttributes( { subtitleText: value } ) }
									__next40pxDefaultSize
								/>
							) }
						</ToolsPanelItem>
					</ToolsPanel>

				<PanelBody title={ __( 'Card display', 'sgs-blocks' ) }>
					<ToggleControl
						label={ __( 'Show Verified badge', 'sgs-blocks' ) }
						checked={ showVerifiedBadge }
						onChange={ ( value ) => setAttributes( { showVerifiedBadge: value } ) }
					/>
					<ToggleControl
						label={ __( 'Show author', 'sgs-blocks' ) }
						checked={ showAuthor }
						onChange={ ( value ) => setAttributes( { showAuthor: value } ) }
					/>
					<ToggleControl
						label={ __( 'Show date', 'sgs-blocks' ) }
						checked={ showDate }
						onChange={ ( value ) => setAttributes( { showDate: value } ) }
					/>
					<ToggleControl
						label={ __( 'Output Schema.org JSON-LD', 'sgs-blocks' ) }
						checked={ showSchema }
						onChange={ ( value ) => setAttributes( { showSchema: value } ) }
						help={ __( 'Embeds structured review data for SEO.', 'sgs-blocks' ) }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Variant', 'sgs-blocks' ) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( value ) => setAttributes( { variant: value } ) }
						__next40pxDefaultSize
					/>
					{ /*
						  columns is a TIER OBJECT — ONE attr holding
						  {desktop,tablet,mobile} (Spec 35 pass 4). It must
						  therefore use ResponsiveOverride, which reads and
						  writes the object, NOT ResponsiveControl, which
						  writes one flat attr per tier.

						  ⛔ Do NOT revert this to `ResponsiveControl` + an
						  attrMap of `{desktop:'columns',
						  tablet:'columnsTablet', mobile:'columnsMobile'}`.
						  Those siblings are no longer declared by block.json
						  (D338 silent-discard), and a raw number written to
						  `columns` itself coerces the object-typed attr to
						  its default, dropping the whole setting (D563 bug
						  class).
					*/ }
					<ResponsiveOverride
						label={ __( 'Columns', 'sgs-blocks' ) }
						value={ columns }
						onChange={ ( obj ) => setAttributes( { columns: obj } ) }
					>
						{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => {
							const maxMap = { desktop: 6, tablet: 4, mobile: 2 };
							return (
								<RangeControl
									value={
										ownValue !== ''
											? ownValue
											: ( effectiveValue !== '' ? effectiveValue : ( maxMap[ tier ] || 3 ) )
									}
									onChange={ setOwnValue }
									min={ 1 }
									max={ maxMap[ tier ] }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							);
						} }
					</ResponsiveOverride>
					<ToggleGroupControl
						label={ __( 'Theme', 'sgs-blocks' ) }
						value={ theme }
						onChange={ ( value ) => setAttributes( { theme: value } ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="light" label={ __( 'Light', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="dark" label={ __( 'Dark', 'sgs-blocks' ) } />
					</ToggleGroupControl>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ CARD_STYLE_OPTIONS }
						onChange={ ( value ) => setAttributes( { cardStyle: value } ) }
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ ( variant === 'carousel' || variant === 'mini-carousel' ) && (
					<ToolsPanel
						label={ __( 'Carousel options', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								showArrows: true,
								showDots: false,
								autoplay: false,
								autoplaySpeed: 5000,
								dragToScroll: false,
								dragMomentum: true,
								loopCarousel: false,
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Show arrows', 'sgs-blocks' ) }
							hasValue={ () => showArrows !== true }
							onDeselect={ () => setAttributes( { showArrows: true } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Show arrows', 'sgs-blocks' ) }
								checked={ showArrows }
								onChange={ ( value ) => setAttributes( { showArrows: value } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Show dots', 'sgs-blocks' ) }
							hasValue={ () => showDots !== false }
							onDeselect={ () => setAttributes( { showDots: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Show dots', 'sgs-blocks' ) }
								checked={ showDots }
								onChange={ ( value ) => setAttributes( { showDots: value } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Autoplay', 'sgs-blocks' ) }
							hasValue={ () => autoplay !== false }
							onDeselect={ () => setAttributes( { autoplay: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Autoplay', 'sgs-blocks' ) }
								checked={ autoplay }
								onChange={ ( value ) => setAttributes( { autoplay: value } ) }
							/>
						</ToolsPanelItem>
						{ autoplay && (
							<ToolsPanelItem
								label={ __( 'Autoplay speed (ms)', 'sgs-blocks' ) }
								hasValue={ () => autoplaySpeed !== 5000 }
								onDeselect={ () => setAttributes( { autoplaySpeed: 5000 } ) }
							>
								<RangeControl
									label={ __( 'Autoplay speed (ms)', 'sgs-blocks' ) }
									value={ autoplaySpeed }
									onChange={ ( value ) => setAttributes( { autoplaySpeed: value } ) }
									min={ 2000 }
									max={ 15000 }
									step={ 500 }
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						) }
						{ /*
						 * Draggable + Inertia opt-in (Spec 38 FR-38-13),
						 * mirroring sgs/gallery. Desktop-only click-and-drag
						 * layered over the CSS scroll-snap this variant already
						 * renders — touch keeps its native scroll either way,
						 * so no "touch" caveat belongs in the help text.
						 */ }
						<ToolsPanelItem
							label={ __( 'Drag to scroll (desktop)', 'sgs-blocks' ) }
							hasValue={ () => dragToScroll !== false }
							onDeselect={ () => setAttributes( { dragToScroll: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Drag to scroll (desktop)', 'sgs-blocks' ) }
								checked={ dragToScroll }
								onChange={ ( value ) =>
									setAttributes( { dragToScroll: value } )
								}
								help={ __(
									'Lets visitors click and drag with a mouse to scroll the reviews, on top of the usual arrows, dots, swipe and scrollbar.',
									'sgs-blocks'
								) }
							/>
						</ToolsPanelItem>
						{ dragToScroll && (
							<ToolsPanelItem
								label={ __( 'Momentum', 'sgs-blocks' ) }
								hasValue={ () => dragMomentum !== true }
								onDeselect={ () => setAttributes( { dragMomentum: true } ) }
							>
								<ToggleControl
									label={ __( 'Momentum', 'sgs-blocks' ) }
									checked={ dragMomentum }
									onChange={ ( value ) =>
										setAttributes( { dragMomentum: value } )
									}
									help={ __(
										'Carousel keeps coasting briefly after the visitor releases the drag, like a real scroll flick.',
										'sgs-blocks'
									) }
								/>
							</ToolsPanelItem>
						) }
						{ /*
						 * Infinite loop (Spec 38 §11 loop FR), mirroring
						 * sgs/gallery. Deliberately its OWN toggle, not
						 * gated behind "Drag to scroll" — Bean's ruling:
						 * looping is an independent control, combinable
						 * with drag or used entirely on its own (native
						 * swipe/scrollbar/keyboard still loop with drag
						 * off). Default off, same as drag.
						 */ }
						<ToolsPanelItem
							label={ __( 'Loop', 'sgs-blocks' ) }
							hasValue={ () => loopCarousel !== false }
							onDeselect={ () => setAttributes( { loopCarousel: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Loop', 'sgs-blocks' ) }
								checked={ loopCarousel }
								onChange={ ( value ) =>
									setAttributes( { loopCarousel: value } )
								}
								help={ __(
									'Scrolling or dragging past the last review continues into the first, and back again — never a dead end.',
									'sgs-blocks'
								) }
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				) }

				{ dataSource === 'inline' && (
					<ToolsPanel
						label={ __( 'Reviews (inline)', 'sgs-blocks' ) }
						resetAll={ () => setAttributes( { reviews: [] } ) }
					>
						{ ( reviews || [] ).map( ( r, idx ) => (
							<div
								key={ idx }
								className="sgs-trustpilot-reviews-editor__review-row"
							>
								<TextControl
									label={ __( 'Author', 'sgs-blocks' ) }
									value={ r.author || '' }
									onChange={ ( value ) => updateReview( idx, { author: value } ) }
									__next40pxDefaultSize
								/>
								<NumberControl
									label={ __( 'Rating (1-5)', 'sgs-blocks' ) }
									value={ r.rating || 5 }
									min={ 1 }
									max={ 5 }
									step={ 0.5 }
									onChange={ ( value ) => updateReview( idx, { rating: parseFloat( value ) || 5 } ) }
									__next40pxDefaultSize
								/>
								<TextControl
									label={ __( 'Date (ISO 8601)', 'sgs-blocks' ) }
									value={ r.datePublished || '' }
									onChange={ ( value ) => updateReview( idx, { datePublished: value } ) }
									__next40pxDefaultSize
								/>
								<TextControl
									label={ __( 'Title (optional)', 'sgs-blocks' ) }
									value={ r.title || '' }
									onChange={ ( value ) => updateReview( idx, { title: value } ) }
									__next40pxDefaultSize
								/>
								<TextareaControl
									label={ __( 'Review body', 'sgs-blocks' ) }
									value={ r.reviewBody || '' }
									onChange={ ( value ) => updateReview( idx, { reviewBody: value } ) }
									rows={ 4 }
								/>
								<ToggleControl
									label={ __( 'Verified', 'sgs-blocks' ) }
									checked={ r.isVerified !== false }
									onChange={ ( value ) => updateReview( idx, { isVerified: value } ) }
								/>
								<div className="sgs-trustpilot-reviews-editor__row-actions">
									<Button isDestructive variant="link" onClick={ () => removeReview( idx ) }>
										{ __( 'Remove', 'sgs-blocks' ) }
									</Button>
								</div>
							</div>
						) ) }
						<Button variant="secondary" onClick={ addReview }>
							{ __( 'Add review', 'sgs-blocks' ) }
						</Button>

						<div className="sgs-trustpilot-reviews-editor__import-area">
							<TextareaControl
								label={ __( 'Import JSON', 'sgs-blocks' ) }
								help={ __( 'Paste the contents of sites/<client>/research/trustpilot-reviews.json or an array of review objects.', 'sgs-blocks' ) }
								value={ importText }
								onChange={ setImportText }
								rows={ 6 }
							/>
							{ importError && (
								<Notice status="error" isDismissible={ false }>
									{ importError }
								</Notice>
							) }
							<Button
								variant="primary"
								disabled={ ! importText.trim() }
								onClick={ handleImport }
							>
								{ __( 'Import reviews', 'sgs-blocks' ) }
							</Button>
						</div>
					</ToolsPanel>
				) }
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Trustpilot Reviews Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Card title heading level', 'sgs-blocks' ) }
						value={ headingLevel || 'h3' }
						options={ HEADING_LEVEL_OPTIONS }
						onChange={ ( value ) => setAttributes( { headingLevel: value } ) }
						help={ __(
							'Pick the level that fits your page outline — usually H3 or H4 under a page-level H2.',
							'sgs-blocks'
						) }
						__next40pxDefaultSize
					/>
				</PanelBody>
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					{ (() => {
						const trustpilotReviewsContrastAgainst =
							backgroundColour && ! backgroundColourGradient
								? backgroundColour
								: '';
						return (
							<SgsBorderControl
								widthValues={ attributes.borderWidth ?? {} }
								onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
								widthPresets={ [ '10', '20', '30' ] }
								styleValue={ attributes.borderStyle }
								onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
								colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
								colourValue={ attributes.borderColour }
								onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
								colourGradientValue={ attributes.borderColourGradient }
								onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
								colourLinked={ true }
								contrastAgainst={ trustpilotReviewsContrastAgainst }
								radiusValues={ {
									base: attributes.borderRadius ?? {},
									tablet: attributes.borderRadiusTablet ?? {},
									mobile: attributes.borderRadiusMobile ?? {},
								} }
								onRadiusChange={ ( tier, next ) => {
									const radiusKey = tier === 'base' ? 'borderRadius' : tier === 'tablet' ? 'borderRadiusTablet' : 'borderRadiusMobile';
									setAttributes( { [ radiusKey ]: next } );
								} }
							/>
						);
					} )() }
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<ServerSideRender
					block="sgs/trustpilot-reviews"
					attributes={ attributes }
				/>
			</div>
		</>
	);
}
