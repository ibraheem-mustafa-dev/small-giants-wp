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
	__experimentalNumberControl as NumberControl,
} from '@wordpress/components';

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

const THEME_OPTIONS = [
	{ label: __( 'Light', 'sgs-blocks' ), value: 'light' },
	{ label: __( 'Dark', 'sgs-blocks' ), value: 'dark' },
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
		dataSource,
		businessUnitUrl,
		reviews,
		trustScore,
		trustScoreLabel,
		totalReviews,
		showSourceHeader,
		showSubtitle,
		subtitleText,
		showTrustpilotLogo,
		showVerifiedBadge,
		showDate,
		showAuthor,
		showSchema,
		columns,
		columnsTablet,
		columnsMobile,
		theme,
		cardStyle,
		autoplay,
		autoplaySpeed,
		showDots,
		showArrows,
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
			<InspectorControls>
				<PanelBody title={ __( 'Source', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Data source', 'sgs-blocks' ) }
						value={ dataSource }
						options={ DATA_SOURCE_OPTIONS }
						onChange={ ( value ) => setAttributes( { dataSource: value } ) }
						help={ __( 'Synced reads reviews from the SGS Trustpilot Sync settings (configurable in next-session build).', 'sgs-blocks' ) }
					/>
					<TextControl
						label={ __( 'Trustpilot business URL', 'sgs-blocks' ) }
						value={ businessUnitUrl }
						onChange={ ( value ) => setAttributes( { businessUnitUrl: value } ) }
						placeholder="https://uk.trustpilot.com/review/example.com"
					/>
				</PanelBody>

				<PanelBody title={ __( 'Header', 'sgs-blocks' ) }>
					<ToggleControl
						label={ __( 'Show source header', 'sgs-blocks' ) }
						checked={ showSourceHeader }
						onChange={ ( value ) => setAttributes( { showSourceHeader: value } ) }
					/>
					<ToggleControl
						label={ __( 'Show Trustpilot logo', 'sgs-blocks' ) }
						checked={ showTrustpilotLogo }
						onChange={ ( value ) => setAttributes( { showTrustpilotLogo: value } ) }
					/>
					<NumberControl
						label={ __( 'TrustScore (0-5)', 'sgs-blocks' ) }
						value={ trustScore }
						min={ 0 }
						max={ 5 }
						step={ 0.1 }
						onChange={ ( value ) => setAttributes( { trustScore: parseFloat( value ) || 0 } ) }
						help={ __( 'Leave 0 to auto-derive from reviews average.', 'sgs-blocks' ) }
					/>
					<TextControl
						label={ __( 'Score label override', 'sgs-blocks' ) }
						value={ trustScoreLabel }
						onChange={ ( value ) => setAttributes( { trustScoreLabel: value } ) }
						placeholder={ __( 'Auto: Excellent / Great / Good / Average / Poor / Bad', 'sgs-blocks' ) }
					/>
					<NumberControl
						label={ __( 'Total reviews', 'sgs-blocks' ) }
						value={ totalReviews }
						min={ 0 }
						onChange={ ( value ) => setAttributes( { totalReviews: parseInt( value, 10 ) || 0 } ) }
						help={ __( 'Leave 0 to auto-derive from the reviews list.', 'sgs-blocks' ) }
					/>
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
						/>
					) }
				</PanelBody>

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
					/>
					<RangeControl
						label={ __( 'Columns (desktop)', 'sgs-blocks' ) }
						value={ columns }
						onChange={ ( value ) => setAttributes( { columns: value } ) }
						min={ 1 }
						max={ 6 }
					/>
					<RangeControl
						label={ __( 'Columns (tablet)', 'sgs-blocks' ) }
						value={ columnsTablet }
						onChange={ ( value ) => setAttributes( { columnsTablet: value } ) }
						min={ 1 }
						max={ 4 }
					/>
					<RangeControl
						label={ __( 'Columns (mobile)', 'sgs-blocks' ) }
						value={ columnsMobile }
						onChange={ ( value ) => setAttributes( { columnsMobile: value } ) }
						min={ 1 }
						max={ 2 }
					/>
					<SelectControl
						label={ __( 'Theme', 'sgs-blocks' ) }
						value={ theme }
						options={ THEME_OPTIONS }
						onChange={ ( value ) => setAttributes( { theme: value } ) }
					/>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ CARD_STYLE_OPTIONS }
						onChange={ ( value ) => setAttributes( { cardStyle: value } ) }
					/>
				</PanelBody>

				{ ( variant === 'carousel' || variant === 'mini-carousel' ) && (
					<PanelBody title={ __( 'Carousel options', 'sgs-blocks' ) } initialOpen={ false }>
						<ToggleControl
							label={ __( 'Show arrows', 'sgs-blocks' ) }
							checked={ showArrows }
							onChange={ ( value ) => setAttributes( { showArrows: value } ) }
						/>
						<ToggleControl
							label={ __( 'Show dots', 'sgs-blocks' ) }
							checked={ showDots }
							onChange={ ( value ) => setAttributes( { showDots: value } ) }
						/>
						<ToggleControl
							label={ __( 'Autoplay', 'sgs-blocks' ) }
							checked={ autoplay }
							onChange={ ( value ) => setAttributes( { autoplay: value } ) }
						/>
						{ autoplay && (
							<RangeControl
								label={ __( 'Autoplay speed (ms)', 'sgs-blocks' ) }
								value={ autoplaySpeed }
								onChange={ ( value ) => setAttributes( { autoplaySpeed: value } ) }
								min={ 2000 }
								max={ 15000 }
								step={ 500 }
							/>
						) }
					</PanelBody>
				) }

				{ dataSource === 'inline' && (
					<PanelBody title={ __( 'Reviews (inline)', 'sgs-blocks' ) } initialOpen={ false }>
						{ ( reviews || [] ).map( ( r, idx ) => (
							<div
								key={ idx }
								className="sgs-trustpilot-reviews-editor__review-row"
							>
								<TextControl
									label={ __( 'Author', 'sgs-blocks' ) }
									value={ r.author || '' }
									onChange={ ( value ) => updateReview( idx, { author: value } ) }
								/>
								<NumberControl
									label={ __( 'Rating (1-5)', 'sgs-blocks' ) }
									value={ r.rating || 5 }
									min={ 1 }
									max={ 5 }
									step={ 0.5 }
									onChange={ ( value ) => updateReview( idx, { rating: parseFloat( value ) || 5 } ) }
								/>
								<TextControl
									label={ __( 'Date (ISO 8601)', 'sgs-blocks' ) }
									value={ r.datePublished || '' }
									onChange={ ( value ) => updateReview( idx, { datePublished: value } ) }
								/>
								<TextControl
									label={ __( 'Title (optional)', 'sgs-blocks' ) }
									value={ r.title || '' }
									onChange={ ( value ) => updateReview( idx, { title: value } ) }
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
					</PanelBody>
				) }
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
