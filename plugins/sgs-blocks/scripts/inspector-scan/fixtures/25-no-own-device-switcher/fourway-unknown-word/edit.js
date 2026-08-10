/**
 * REGRESSION FIXTURE for the false POSITIVE found by the 2026-08-10 QC council.
 *
 * A genuine four-value picker. Under the original closed TIER_WORD_UNIVERSE
 * {desktop,tablet,mobile,always,custom}, the word "print" was invisible, so the
 * collected set truncated to exactly {desktop,tablet,mobile} and this control
 * was flagged as a device switcher when it is nothing of the kind. Any future
 * unanticipated value word would have reproduced it.
 */
import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { visibleOn } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Visibility">
				<ToggleGroupControl
					label="Show this on"
					value={ visibleOn || 'desktop' }
					isBlock
					onChange={ ( value ) => setAttributes( { visibleOn: value } ) }
				>
					<ToggleGroupControlOption value="desktop" label="Desktop" />
					<ToggleGroupControlOption value="tablet" label="Tablet" />
					<ToggleGroupControlOption value="mobile" label="Mobile" />
					<ToggleGroupControlOption value="print" label="Print" />
				</ToggleGroupControl>
			</PanelBody>
		</InspectorControls>
	);
}
