/**
 * A panel's title with the closed-panel dots (Spec 49 §9.2): one shape per device (Tablet a diamond, Mobile a circle)
 * that holds its own value somewhere inside, each with an accessible name.
 *
 * @package SGS\Blocks
 */
import { __, sprintf } from '@wordpress/i18n';

import { deviceName } from '../deviceValues.js';
import '../../ResponsiveOverride.css';

/**
 * @param {Object}   props
 * @param {string}   props.title   The panel title.
 * @param {string[]} props.devices 'tablet' and / or 'mobile' with their own value inside the panel.
 * @return {JSX.Element} The title.
 */
export default function PanelTitle( { title, devices } ) {
	if ( ! devices.length ) {
		return title;
	}
	return (
		<span className="sgs-media-panel__title">
			{ title }
			<span className="sgs-responsive-override__dots">
				{ devices.map( ( device ) => (
					<span
						key={ device }
						role="img"
						className={ `sgs-responsive-override__dot sgs-responsive-override__dot--${ device }` }
						aria-label={ sprintf(
							/* translators: 1: device name, 2: the panel title. */
							__( '%1$s has its own value in %2$s', 'sgs-blocks' ),
							deviceName( device ),
							title
						) }
					/>
				) ) }
			</span>
		</span>
	);
}
