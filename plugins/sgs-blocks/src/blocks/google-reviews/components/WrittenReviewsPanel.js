/**
 * Google Reviews — "Written reviews" inspector panels.
 *
 * Shown when `dataSource` is `auto` or `inline`: the client types the reviews into the block
 * instead of reading them from Google (Google's API returns at most five). One panel
 * for the business summary (average, count, name), one for the reviews themselves,
 * each collapsible so thirteen reviews do not become a wall of fields.
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import {
	PanelBody,
	SelectControl,
	TextControl,
	TextareaControl,
	Button,
	BaseControl,
	ColorPalette,
} from '@wordpress/components';
import { useSettings } from '@wordpress/block-editor';
import { NumberControl } from '../../../components/primitives';
import MediaPicker from '../../../components/MediaPicker';
import { generateItemKey } from '../../../utils';

const RATING_OPTIONS = [
	{ label: __( 'No rating (no stars)', 'sgs-blocks' ), value: '' },
	{ label: '5', value: '5' },
	{ label: '4.5', value: '4.5' },
	{ label: '4', value: '4' },
	{ label: '3.5', value: '3.5' },
	{ label: '3', value: '3' },
	{ label: '2.5', value: '2.5' },
	{ label: '2', value: '2' },
	{ label: '1.5', value: '1.5' },
	{ label: '1', value: '1' },
];

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 */
export default function WrittenReviewsPanel( { attributes, setAttributes } ) {
	const { reviews = [], averageRating, reviewCount, businessName } = attributes;
	const [ palette ] = useSettings( 'color.palette' );

	const update = ( index, patch ) =>
		setAttributes( {
			reviews: reviews.map( ( review, i ) => ( i === index ? { ...review, ...patch } : review ) ),
		} );

	const remove = ( index ) =>
		setAttributes( { reviews: reviews.filter( ( _, i ) => i !== index ) } );

	const move = ( index, by ) => {
		const target = index + by;
		if ( target < 0 || target >= reviews.length ) {
			return;
		}
		const next = [ ...reviews ];
		[ next[ index ], next[ target ] ] = [ next[ target ], next[ index ] ];
		setAttributes( { reviews: next } );
	};

	const add = () =>
		setAttributes( { reviews: [ ...reviews, { author: '', text: '', rating: 5, _key: generateItemKey() } ] } );

	return (
		<>
			<PanelBody title={ __( 'Business summary', 'sgs-blocks' ) }>
				<TextControl
					label={ __( 'Business name', 'sgs-blocks' ) }
					value={ businessName || '' }
					onChange={ ( value ) => setAttributes( { businessName: value } ) }
					__next40pxDefaultSize
				/>
				<NumberControl
					label={ __( 'Average rating', 'sgs-blocks' ) }
					value={ averageRating || '' }
					min={ 0 }
					max={ 5 }
					step={ 0.1 }
					onChange={ ( value ) => setAttributes( { averageRating: parseFloat( value ) || 0 } ) }
					help={ __( 'Leave empty to work it out from the reviews below.', 'sgs-blocks' ) }
					__next40pxDefaultSize
				/>
				<NumberControl
					label={ __( 'Total review count', 'sgs-blocks' ) }
					value={ reviewCount || '' }
					min={ 0 }
					step={ 1 }
					onChange={ ( value ) => setAttributes( { reviewCount: parseInt( value, 10 ) || 0 } ) }
					help={ __( 'Your full count on Google. Leave empty to use the number of reviews below.', 'sgs-blocks' ) }
					__next40pxDefaultSize
				/>
			</PanelBody>

			<PanelBody title={ sprintf( /* translators: %d: number of reviews. */ __( 'Written reviews (%d)', 'sgs-blocks' ), reviews.length ) }>
				{ reviews.map( ( review, index ) => (
					<PanelBody
						key={ review._key || index }
						title={ review.author || sprintf( /* translators: %d: review number. */ __( 'Review %d', 'sgs-blocks' ), index + 1 ) }
						initialOpen={ false }
					>
						<TextControl
							label={ __( 'Reviewer name', 'sgs-blocks' ) }
							value={ review.author || '' }
							onChange={ ( value ) => update( index, { author: value } ) }
							__next40pxDefaultSize
						/>
						<TextareaControl
							label={ __( 'Review text', 'sgs-blocks' ) }
							value={ review.text || '' }
							onChange={ ( value ) => update( index, { text: value } ) }
							rows={ 5 }
						/>
						<SelectControl
							label={ __( 'Rating', 'sgs-blocks' ) }
							value={ review.rating === undefined || review.rating === null ? '' : String( review.rating ) }
							options={ RATING_OPTIONS }
							onChange={ ( value ) => update( index, { rating: value === '' ? undefined : parseFloat( value ) } ) }
							__next40pxDefaultSize
						/>
						<TextControl
							label={ __( 'Date, as shown', 'sgs-blocks' ) }
							value={ review.date || '' }
							onChange={ ( value ) => update( index, { date: value } ) }
							help={ __( 'For example "2 years ago" or "March 2026". Shown exactly as typed.', 'sgs-blocks' ) }
							__next40pxDefaultSize
						/>
						<TextControl
							label={ __( 'Date published (optional)', 'sgs-blocks' ) }
							type="date"
							value={ review.datePublished || '' }
							onChange={ ( value ) => update( index, { datePublished: value } ) }
							__next40pxDefaultSize
						/>
						<TextControl
							label={ __( 'Reviewer detail (optional)', 'sgs-blocks' ) }
							value={ review.meta || '' }
							onChange={ ( value ) => update( index, { meta: value } ) }
							help={ __( 'For example "Local Guide · 11 reviews".', 'sgs-blocks' ) }
							__next40pxDefaultSize
						/>
						<TextControl
							label={ __( 'Link to the original review (optional)', 'sgs-blocks' ) }
							type="url"
							value={ review.url || '' }
							onChange={ ( value ) => update( index, { url: value } ) }
							__next40pxDefaultSize
						/>
						<MediaPicker
							value={ review.photo || null }
							onChange={ ( media ) => update( index, { photo: media } ) }
							onRemove={ () => update( index, { photo: undefined } ) }
							allowedTypes={ [ 'image' ] }
							label={ __( 'Reviewer photo (optional)', 'sgs-blocks' ) }
							instructionsImage={ __( 'Shown instead of the initial.', 'sgs-blocks' ) }
						/>
						<BaseControl label={ __( 'Initial background colour', 'sgs-blocks' ) } __nextHasNoMarginBottom>
							<ColorPalette
								colors={ palette || [] }
								value={ review.avatarColour || undefined }
								onChange={ ( value ) => update( index, { avatarColour: value || '' } ) }
								enableAlpha={ false }
								clearable
							/>
						</BaseControl>
						<div className="sgs-google-reviews-editor__row-actions">
							<Button variant="link" onClick={ () => move( index, -1 ) } disabled={ index === 0 }>
								{ __( 'Move up', 'sgs-blocks' ) }
							</Button>
							<Button variant="link" onClick={ () => move( index, 1 ) } disabled={ index === reviews.length - 1 }>
								{ __( 'Move down', 'sgs-blocks' ) }
							</Button>
							<Button isDestructive variant="link" onClick={ () => remove( index ) }>
								{ __( 'Remove', 'sgs-blocks' ) }
							</Button>
						</div>
					</PanelBody>
				) ) }
				<Button variant="secondary" onClick={ add }>
					{ __( 'Add review', 'sgs-blocks' ) }
				</Button>
			</PanelBody>
		</>
	);
}
