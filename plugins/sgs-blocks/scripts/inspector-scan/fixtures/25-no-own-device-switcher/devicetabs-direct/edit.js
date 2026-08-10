import { useState } from '@wordpress/element';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { DeviceTabs } from '../../../../../src/components';
import { desktop, tablet, mobile } from '@wordpress/icons';

export default function Edit( { attributes, setAttributes } ) {
	const [ tier, setTier ] = useState( 'desktop' );
	return (
		<InspectorControls>
			<PanelBody title="Spacing">
				<DeviceTabs
					tiers={ [
						{ key: 'desktop', icon: desktop, label: 'Desktop' },
						{ key: 'tablet', icon: tablet, label: 'Tablet' },
						{ key: 'mobile', icon: mobile, label: 'Mobile' },
					] }
					active={ tier }
					onChange={ ( key ) => setTier( key ) }
					ariaLabel="Device"
				/>
			</PanelBody>
		</InspectorControls>
	);
}
