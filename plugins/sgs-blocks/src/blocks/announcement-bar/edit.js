/**
 * Announcement Bar — Editor Component
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	RichText,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	RangeControl,
	TextControl,
	Button,
	__experimentalBoxControl as BoxControl,
} from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const {
		messages,
		variant,
		backgroundColour,
		textColour,
		ctaStyle,
		ctaColour,
		position,
		sticky,
		dismissible,
		closeBehaviour,
		cookieDays,
		targetDate,
		showDays,
		showHours,
		showMinutes,
		showSeconds,
		countdownEndAction,
		countdownEndMessage,
		rotationInterval,
		rotationType,
		startDate,
		endDate,
		icon,
		fontSize,
	} = attributes;

	const blockProps = useBlockProps( {
		className: `sgs-announcement-bar sgs-announcement-bar--${ variant } has-${ backgroundColour }-background-color has-${ textColour }-color`,
		style: {
			position: sticky ? 'sticky' : 'relative',
			[ position ]: 0,
		},
	} );

	const updateMessage = ( index, field, value ) => {
		const newMessages = [ ...messages ];
		newMessages[ index ] = { ...newMessages[ index ], [ field ]: value };
		setAttributes( { messages: newMessages } );
	};

	const addMessage = () => {
		setAttributes( {
			messages: [
				...messages,
				{ text: 'New announcement', ctaText: '', ctaUrl: '' },
			],
		} );
	};

	const removeMessage = ( index ) => {
		const newMessages = messages.filter( ( _, i ) => i !== index );
		setAttributes( { messages: newMessages } );
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Variant', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Type', 'sgs-blocks' ) }
						value={ variant }
						options={ [
							{ label: __( 'Standard', 'sgs-blocks' ), value: 'standard' },
							{ label: __( 'Countdown Timer', 'sgs-blocks' ), value: 'countdown' },
							{ label: __( 'Rotating Messages', 'sgs-blocks' ), value: 'rotating' },
						] }
						onChange={ ( value ) => setAttributes( { variant: value } ) }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Appearance', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Background Colour', 'sgs-blocks' ) }
						value={ backgroundColour }
						options={ [
							{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
							{ label: __( 'Primary Dark', 'sgs-blocks' ), value: 'primary-dark' },
							{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
							{ label: __( 'Success', 'sgs-blocks' ), value: 'success' },
						] }
						onChange={ ( value ) => setAttributes( { backgroundColour: value } ) }
					/>

					<SelectControl
						label={ __( 'Text Colour', 'sgs-blocks' ) }
						value={ textColour }
						options={ [
							{ label: __( 'Text Inverse', 'sgs-blocks' ), value: 'text-inverse' },
							{ label: __( 'Surface', 'sgs-blocks' ), value: 'surface' },
							{ label: __( 'Text', 'sgs-blocks' ), value: 'text' },
						] }
						onChange={ ( value ) => setAttributes( { textColour: value } ) }
					/>

					<SelectControl
						label={ __( 'Font Size', 'sgs-blocks' ) }
						value={ fontSize }
						options={ [
							{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
							{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
							{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
						] }
						onChange={ ( value ) => setAttributes( { fontSize: value } ) }
					/>

					<TextControl
						label={ __( 'Icon (emoji or SVG slug)', 'sgs-blocks' ) }
						value={ icon }
						onChange={ ( value ) => setAttributes( { icon: value } ) }
						help={ __( 'E.g., 🎉 or icon-megaphone', 'sgs-blocks' ) }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Position & Behaviour', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Position', 'sgs-blocks' ) }
						value={ position }
						options={ [
							{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
							{ label: __( 'Bottom', 'sgs-blocks' ), value: 'bottom' },
						] }
						onChange={ ( value ) => setAttributes( { position: value } ) }
					/>

					<ToggleControl
						label={ __( 'Sticky (fixed on scroll)', 'sgs-blocks' ) }
						checked={ sticky }
						onChange={ ( value ) => setAttributes( { sticky: value } ) }
					/>

					<ToggleControl
						label={ __( 'Dismissible', 'sgs-blocks' ) }
						checked={ dismissible }
						onChange={ ( value ) => setAttributes( { dismissible: value } ) }
					/>

					{ dismissible && (
						<>
							<SelectControl
								label={ __( 'Close Behaviour', 'sgs-blocks' ) }
								value={ closeBehaviour }
								options={ [
									{ label: __( 'Session (current visit)', 'sgs-blocks' ), value: 'session' },
									{ label: __( 'Persistent (remember for days)', 'sgs-blocks' ), value: 'persistent' },
									{ label: __( 'None (cannot dismiss)', 'sgs-blocks' ), value: 'none' },
								] }
								onChange={ ( value ) => setAttributes( { closeBehaviour: value } ) }
							/>

							{ closeBehaviour === 'persistent' && (
								<RangeControl
									label={ __( 'Remember dismissal for (days)', 'sgs-blocks' ) }
									value={ cookieDays }
									onChange={ ( value ) => setAttributes( { cookieDays: value } ) }
									min={ 1 }
									max={ 90 }
								/>
							) }
						</>
					) }
				</PanelBody>

				<PanelBody title={ __( 'CTA Button', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Style', 'sgs-blocks' ) }
						value={ ctaStyle }
						options={ [
							{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
							{ label: __( 'Outline', 'sgs-blocks' ), value: 'outline' },
							{ label: __( 'Text Link', 'sgs-blocks' ), value: 'text-link' },
						] }
						onChange={ ( value ) => setAttributes( { ctaStyle: value } ) }
					/>

					<SelectControl
						label={ __( 'Colour', 'sgs-blocks' ) }
						value={ ctaColour }
						options={ [
							{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
							{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
							{ label: __( 'Success', 'sgs-blocks' ), value: 'success' },
							{ label: __( 'Surface', 'sgs-blocks' ), value: 'surface' },
						] }
						onChange={ ( value ) => setAttributes( { ctaColour: value } ) }
					/>
				</PanelBody>

				{ variant === 'countdown' && (
					<PanelBody title={ __( 'Countdown Settings', 'sgs-blocks' ) }>
						<TextControl
							label={ __( 'Target Date/Time', 'sgs-blocks' ) }
							value={ targetDate }
							onChange={ ( value ) => setAttributes( { targetDate: value } ) }
							help={ __( 'ISO 8601 format: 2026-12-31T23:59:59', 'sgs-blocks' ) }
							type="datetime-local"
						/>

						<ToggleControl
							label={ __( 'Show Days', 'sgs-blocks' ) }
							checked={ showDays }
							onChange={ ( value ) => setAttributes( { showDays: value } ) }
						/>

						<ToggleControl
							label={ __( 'Show Hours', 'sgs-blocks' ) }
							checked={ showHours }
							onChange={ ( value ) => setAttributes( { showHours: value } ) }
						/>

						<ToggleControl
							label={ __( 'Show Minutes', 'sgs-blocks' ) }
							checked={ showMinutes }
							onChange={ ( value ) => setAttributes( { showMinutes: value } ) }
						/>

						<ToggleControl
							label={ __( 'Show Seconds', 'sgs-blocks' ) }
							checked={ showSeconds }
							onChange={ ( value ) => setAttributes( { showSeconds: value } ) }
						/>

						<SelectControl
							label={ __( 'When countdown ends', 'sgs-blocks' ) }
							value={ countdownEndAction }
							options={ [
								{ label: __( 'Hide bar', 'sgs-blocks' ), value: 'hide' },
								{ label: __( 'Show message', 'sgs-blocks' ), value: 'show-message' },
							] }
							onChange={ ( value ) => setAttributes( { countdownEndAction: value } ) }
						/>

						{ countdownEndAction === 'show-message' && (
							<TextControl
								label={ __( 'End Message', 'sgs-blocks' ) }
								value={ countdownEndMessage }
								onChange={ ( value ) => setAttributes( { countdownEndMessage: value } ) }
							/>
						) }
					</PanelBody>
				) }

				{ variant === 'rotating' && (
					<PanelBody title={ __( 'Rotation Settings', 'sgs-blocks' ) }>
						<RangeControl
							label={ __( 'Rotation Interval (ms)', 'sgs-blocks' ) }
							value={ rotationInterval }
							onChange={ ( value ) => setAttributes( { rotationInterval: value } ) }
							min={ 2000 }
							max={ 15000 }
							step={ 500 }
						/>

						<SelectControl
							label={ __( 'Transition Type', 'sgs-blocks' ) }
							value={ rotationType }
							options={ [
								{ label: __( 'Fade', 'sgs-blocks' ), value: 'fade' },
								{ label: __( 'Slide', 'sgs-blocks' ), value: 'slide' },
							] }
							onChange={ ( value ) => setAttributes( { rotationType: value } ) }
						/>
					</PanelBody>
				) }

				<PanelBody title={ __( 'Scheduling (Optional)', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Start Date', 'sgs-blocks' ) }
						value={ startDate }
						onChange={ ( value ) => setAttributes( { startDate: value } ) }
						help={ __( 'Bar hidden before this date', 'sgs-blocks' ) }
						type="date"
					/>

					<TextControl
						label={ __( 'End Date', 'sgs-blocks' ) }
						value={ endDate }
						onChange={ ( value ) => setAttributes( { endDate: value } ) }
						help={ __( 'Bar hidden after this date', 'sgs-blocks' ) }
						type="date"
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="sgs-announcement-bar__content">
					{ icon && (
						<span className="sgs-announcement-bar__icon" aria-hidden="true">
							{ icon }
						</span>
					) }

					<div className="sgs-announcement-bar__messages">
						{ messages.map( ( message, index ) => (
							<div key={ index } className="sgs-announcement-bar__message-editor">
								<RichText
									tagName="div"
									value={ message.text }
									onChange={ ( value ) => updateMessage( index, 'text', value ) }
									placeholder={ __( 'Announcement text…', 'sgs-blocks' ) }
									className="sgs-announcement-bar__text"
								/>

								<div className="sgs-announcement-bar__cta-inputs">
									<TextControl
										label={ __( 'CTA Text', 'sgs-blocks' ) }
										value={ message.ctaText }
										onChange={ ( value ) => updateMessage( index, 'ctaText', value ) }
										placeholder={ __( 'Shop Now', 'sgs-blocks' ) }
									/>

									<TextControl
										label={ __( 'CTA URL', 'sgs-blocks' ) }
										value={ message.ctaUrl }
										onChange={ ( value ) => updateMessage( index, 'ctaUrl', value ) }
										placeholder={ __( 'https://…', 'sgs-blocks' ) }
										type="url"
									/>
								</div>

								{ variant === 'rotating' && messages.length > 1 && (
									<Button
										isDestructive
										onClick={ () => removeMessage( index ) }
									>
										{ __( 'Remove Message', 'sgs-blocks' ) }
									</Button>
								) }
							</div>
						) ) }

						{ variant === 'rotating' && (
							<Button isPrimary onClick={ addMessage }>
								{ __( 'Add Message', 'sgs-blocks' ) }
							</Button>
						) }
					</div>

					{ dismissible && closeBehaviour !== 'none' && (
						<button
							type="button"
							className="sgs-announcement-bar__close"
							aria-label={ __( 'Dismiss announcement', 'sgs-blocks' ) }
							disabled
						>
							×
						</button>
					) }
				</div>

				{ variant === 'countdown' && targetDate && (
					<div className="sgs-announcement-bar__countdown" aria-hidden="true">
						{ showDays && <span className="sgs-countdown-digit">30<small>d</small></span> }
						{ showHours && <span className="sgs-countdown-digit">12<small>h</small></span> }
						{ showMinutes && <span className="sgs-countdown-digit">45<small>m</small></span> }
						{ showSeconds && <span className="sgs-countdown-digit">30<small>s</small></span> }
					</div>
				) }
			</div>
		</>
	);
}
