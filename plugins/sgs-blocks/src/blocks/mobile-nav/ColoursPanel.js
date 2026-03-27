/**
 * Colours Panel — DesignTokenPicker instances for all colour attributes.
 *
 * Shows 5 most-used colours by default. The remaining 12 are behind
 * a "Show all colours" toggle to reduce visual overwhelm.
 *
 * @package SGS\Blocks
 */

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { DesignTokenPicker } from '../../components';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes   Full block attributes object.
 * @param {Function} props.setAttributes Block setAttributes.
 */
export default function ColoursPanel( { attributes, setAttributes } ) {
	const [ showAll, setShowAll ] = useState( false );

	const {
		drawerBg,
		drawerText,
		drawerGradient,
		closeButtonBg,
		closeButtonColour,
		ctaBg,
		ctaTextColour,
		ctaBorderColour,
		secondaryCtaBg,
		secondaryCtaTextColour,
		linkColour,
		linkHoverColour,
		linkActiveColour,
		sublinkColour,
		sublinkHoverColour,
		backdropColour,
		focusColour,
	} = attributes;

	return (
		<>
			<p className="sgs-colours-panel__hint components-base-control__help">
				{ __( 'Leave empty to use CSS defaults from the style variation.', 'sgs-blocks' ) }
			</p>

			{ /* ── Primary colours (always visible) ── */ }
			<DesignTokenPicker
				label={ __( 'Drawer Background', 'sgs-blocks' ) }
				value={ drawerBg }
				onChange={ ( value ) => setAttributes( { drawerBg: value ?? '' } ) }
			/>
			<DesignTokenPicker
				label={ __( 'CTA Background', 'sgs-blocks' ) }
				value={ ctaBg }
				onChange={ ( value ) => setAttributes( { ctaBg: value ?? '' } ) }
			/>
			<DesignTokenPicker
				label={ __( 'Link Colour', 'sgs-blocks' ) }
				value={ linkColour }
				onChange={ ( value ) => setAttributes( { linkColour: value ?? '' } ) }
			/>
			<DesignTokenPicker
				label={ __( 'Divider Colour', 'sgs-blocks' ) }
				value={ attributes.dividerColour }
				onChange={ ( value ) => setAttributes( { dividerColour: value ?? '' } ) }
			/>
			<DesignTokenPicker
				label={ __( 'Accent Colour', 'sgs-blocks' ) }
				value={ attributes.accentColour }
				onChange={ ( value ) => setAttributes( { accentColour: value ?? '' } ) }
			/>

			{ /* ── Toggle for remaining colours ── */ }
			<Button
				variant="link"
				onClick={ () => setShowAll( ! showAll ) }
				style={ { marginTop: '8px', marginBottom: '12px' } }
			>
				{ showAll
					? __( 'Show fewer colours', 'sgs-blocks' )
					: __( 'Show all colours', 'sgs-blocks' )
				}
			</Button>

			{ showAll && (
				<>
					<strong className="sgs-colours-panel__group-label">
						{ __( 'Drawer', 'sgs-blocks' ) }
					</strong>
					<DesignTokenPicker
						label={ __( 'Text Colour', 'sgs-blocks' ) }
						value={ drawerText }
						onChange={ ( value ) => setAttributes( { drawerText: value ?? '' } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Gradient Background', 'sgs-blocks' ) }
						value={ drawerGradient }
						onChange={ ( value ) => setAttributes( { drawerGradient: value ?? '' } ) }
					/>

					<strong className="sgs-colours-panel__group-label">
						{ __( 'Close Button', 'sgs-blocks' ) }
					</strong>
					<DesignTokenPicker
						label={ __( 'Close Button Background', 'sgs-blocks' ) }
						value={ closeButtonBg }
						onChange={ ( value ) => setAttributes( { closeButtonBg: value ?? '' } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Close Button Icon Colour', 'sgs-blocks' ) }
						value={ closeButtonColour }
						onChange={ ( value ) => setAttributes( { closeButtonColour: value ?? '' } ) }
					/>

					<strong className="sgs-colours-panel__group-label">
						{ __( 'Primary CTA', 'sgs-blocks' ) }
					</strong>
					<DesignTokenPicker
						label={ __( 'CTA Text Colour', 'sgs-blocks' ) }
						value={ ctaTextColour }
						onChange={ ( value ) => setAttributes( { ctaTextColour: value ?? '' } ) }
					/>
					<DesignTokenPicker
						label={ __( 'CTA Border Colour', 'sgs-blocks' ) }
						value={ ctaBorderColour }
						onChange={ ( value ) => setAttributes( { ctaBorderColour: value ?? '' } ) }
					/>

					<strong className="sgs-colours-panel__group-label">
						{ __( 'Secondary CTA', 'sgs-blocks' ) }
					</strong>
					<DesignTokenPicker
						label={ __( 'Secondary CTA Background', 'sgs-blocks' ) }
						value={ secondaryCtaBg }
						onChange={ ( value ) => setAttributes( { secondaryCtaBg: value ?? '' } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Secondary CTA Text Colour', 'sgs-blocks' ) }
						value={ secondaryCtaTextColour }
						onChange={ ( value ) =>
							setAttributes( { secondaryCtaTextColour: value ?? '' } )
						}
					/>

					<strong className="sgs-colours-panel__group-label">
						{ __( 'Navigation Links', 'sgs-blocks' ) }
					</strong>
					<DesignTokenPicker
						label={ __( 'Link Hover Colour', 'sgs-blocks' ) }
						value={ linkHoverColour }
						onChange={ ( value ) => setAttributes( { linkHoverColour: value ?? '' } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Active Link Colour', 'sgs-blocks' ) }
						value={ linkActiveColour }
						onChange={ ( value ) => setAttributes( { linkActiveColour: value ?? '' } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Sub-link Colour', 'sgs-blocks' ) }
						value={ sublinkColour }
						onChange={ ( value ) => setAttributes( { sublinkColour: value ?? '' } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Sub-link Hover Colour', 'sgs-blocks' ) }
						value={ sublinkHoverColour }
						onChange={ ( value ) => setAttributes( { sublinkHoverColour: value ?? '' } ) }
					/>

					<strong className="sgs-colours-panel__group-label">
						{ __( 'Overlay & Focus', 'sgs-blocks' ) }
					</strong>
					<DesignTokenPicker
						label={ __( 'Backdrop Colour', 'sgs-blocks' ) }
						value={ backdropColour }
						onChange={ ( value ) => setAttributes( { backdropColour: value ?? '' } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Focus Ring Colour', 'sgs-blocks' ) }
						value={ focusColour }
						onChange={ ( value ) => setAttributes( { focusColour: value ?? '' } ) }
					/>
				</>
			) }
		</>
	);
}
