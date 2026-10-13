import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl, ToggleControl } from '@wordpress/components';
import { fillRow } from '../../components';

/**
 * "Guided layout" panel for sgs/buybox (Spec 43 FR-43-23, FR-43-25 peripherals).
 *
 * Turns the buy box into a one-decision-per-screen flow behind a segmented
 * progress meter instead of showing every axis picker at once. A NEW file,
 * not added to edit.js (over the 250-line cap) — the main thread wires it in
 * with one import + one JSX line (see the buybox report). The Back/Next
 * wording, meter style and meter colour are guided-buybox peripherals
 * (FR-43-25): they style the product's own attributes, never a saved flow.
 * The meter colour is a row in the block's Styles-tab colour panel
 * (`guidedColourRows`, added to edit.js's SgsColourPanel): a colour panel
 * nested in this Settings-tab fill never renders.
 */
export default function GuidedPanel( { attributes, setAttributes } ) {
	const {
		buyboxLayout,
		guidedAutoAdvance,
		guidedAnswerAttributes,
		guidedNextLabel,
		guidedBackLabel,
		guidedMeterStyle,
	} = attributes;
	const isGuided = 'guided' === ( buyboxLayout || 'standard' );

	return (
		<InspectorControls>
			<PanelBody title={ __( 'Guided layout', 'sgs-blocks' ) } initialOpen={ false }>
				<SelectControl
					label={ __( 'Layout', 'sgs-blocks' ) }
					value={ buyboxLayout || 'standard' }
					options={ [
						{ value: 'standard', label: __( 'Standard', 'sgs-blocks' ) },
						{ value: 'guided', label: __( 'Guided — one choice at a time', 'sgs-blocks' ) },
					] }
					onChange={ ( val ) => setAttributes( { buyboxLayout: val } ) }
					help={ __(
						'Guided walks the shopper through one attribute per screen behind a progress meter, instead of showing every option picker at once.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				{ isGuided && (
					<>
						<ToggleControl
							label={ __( 'Auto-advance', 'sgs-blocks' ) }
							checked={ guidedAutoAdvance !== false }
							onChange={ ( val ) => setAttributes( { guidedAutoAdvance: val } ) }
							help={ __(
								'Move to the next group a short beat after a choice is made (instant with reduced motion). Off — the shopper always presses Next.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
						<ToggleControl
							label={ __( 'Include other attributes', 'sgs-blocks' ) }
							checked={ guidedAnswerAttributes !== false }
							onChange={ ( val ) => setAttributes( { guidedAnswerAttributes: val } ) }
							help={ __(
								'Also walk the product’s other visible attributes that do not change price (e.g. Topping, Dietary) as answer groups. Off — only the priced axes appear.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Back button label', 'sgs-blocks' ) }
							value={ guidedBackLabel || '' }
							placeholder={ __( 'Back', 'sgs-blocks' ) }
							onChange={ ( val ) => setAttributes( { guidedBackLabel: val } ) }
							maxLength={ 20 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<TextControl
							label={ __( 'Next button label', 'sgs-blocks' ) }
							value={ guidedNextLabel || '' }
							placeholder={ __( 'Next', 'sgs-blocks' ) }
							onChange={ ( val ) => setAttributes( { guidedNextLabel: val } ) }
							maxLength={ 20 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<SelectControl
							label={ __( 'Meter style', 'sgs-blocks' ) }
							value={ guidedMeterStyle || 'segments' }
							options={ [
								{ value: 'segments', label: __( 'Segments — index and chosen value', 'sgs-blocks' ) },
								{ value: 'bar', label: __( 'Bar — a single filled progress track', 'sgs-blocks' ) },
								{ value: 'dots', label: __( 'Dots — compact, always', 'sgs-blocks' ) },
							] }
							onChange={ ( val ) => setAttributes( { guidedMeterStyle: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</>
				) }
			</PanelBody>
		</InspectorControls>
	);
}

/**
 * The guided layout's colour rows for the block's one SgsColourPanel; empty
 * unless the layout is guided.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Array} Colour rows.
 */
export function guidedColourRows( { attributes, setAttributes } ) {
	if ( 'guided' !== ( attributes.buyboxLayout || 'standard' ) ) {
		return [];
	}
	return [
		fillRow( {
			key: 'guidedMeter',
			label: __( 'Meter colour', 'sgs-blocks' ),
			attrs: { base: 'guidedMeterColour' },
			attributes,
			setAttributes,
		} ),
	];
}
