/**
 * sgs/choice-flow — navigation-model inspector panel (D1/D2, Bean's
 * 2026-09-26 review).
 *
 * Kept as its OWN component (never inlined into edit.js) — edit.js is at its
 * size cap and the build contract forbids adding logic to it; the main
 * thread wires this in with one import + one render line, matching the
 * `ChromePanel`/`PricingSettingsPanel`/`LinkedFlowPanel` precedent already
 * set in this directory.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl } from '@wordpress/components';

/**
 * @param {Object}   o
 * @param {Object}   o.attributes    Block attributes.
 * @param {Function} o.setAttributes Block setAttributes.
 * @return {JSX.Element} The panel, mounted inside its own InspectorControls.
 */
export default function FlowNavigationPanel( { attributes, setAttributes } ) {
	const { advanceMode, continueLabel } = attributes;

	return (
		<InspectorControls>
			<PanelBody title={ __( 'Navigation', 'sgs-blocks' ) } initialOpen={ false }>
				<SelectControl
					label={ __( 'On answering a question', 'sgs-blocks' ) }
					value={ advanceMode || 'continue' }
					options={ [
						{ label: __( 'Select, then Continue', 'sgs-blocks' ), value: 'continue' },
						{ label: __( 'Advance straight away', 'sgs-blocks' ), value: 'tap' },
					] }
					onChange={ ( val ) => setAttributes( { advanceMode: val } ) }
					help={ __(
						'"Select, then Continue" shows the choice as picked and waits for the footer’s Continue button — the shopper can change their mind first. "Advance straight away" keeps the original quick-quiz behaviour.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				{ 'tap' !== ( advanceMode || 'continue' ) && (
					<TextControl
						label={ __( 'Continue button label', 'sgs-blocks' ) }
						value={ continueLabel }
						onChange={ ( val ) => setAttributes( { continueLabel: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
			</PanelBody>
		</InspectorControls>
	);
}
