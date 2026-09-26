/**
 * sgs/choice-flow — the showcase option cards' picture size per device
 * (`optionMediaSize`, % of each picture band's width). The cards' '?' toggle
 * and header step-name colours are rows in ShowcasePanel's colour panel.
 * Consumed by includes/choice-flow-showcase.php::sgs_choice_flow_showcase_css.
 *
 * Mounted by ShowcasePanel (inside its InspectorControls).
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import { PanelBody, RangeControl } from '@wordpress/components';
import { ResponsiveControl } from '../../components';

const TIER_LABEL = {
	desktop: __( 'desktop', 'sgs-blocks' ),
	tablet: __( 'tablet', 'sgs-blocks' ),
	mobile: __( 'mobile', 'sgs-blocks' ),
};

/**
 * @param {Object}   o
 * @param {Object}   o.attributes    Block attributes.
 * @param {Function} o.setAttributes Block setAttributes.
 * @return {JSX.Element} The panel.
 */
export default function OptionCardsPanel( { attributes, setAttributes } ) {
	const sizes = attributes.optionMediaSize && ! Array.isArray( attributes.optionMediaSize ) ? attributes.optionMediaSize : {};
	const setSize = ( tier, val ) => {
		const next = { ...sizes };
		if ( val === undefined || val === null || val === '' ) {
			delete next[ tier ];
		} else {
			next[ tier ] = val;
		}
		setAttributes( { optionMediaSize: next } );
	};
	const inherited = ( tier ) => {
		const order = [ 'desktop', 'tablet', 'mobile' ];
		for ( let i = order.indexOf( tier ); i >= 0; i-- ) {
			if ( sizes[ order[ i ] ] ) {
				return sizes[ order[ i ] ];
			}
		}
		return 100;
	};

	return (
		<PanelBody title={ __( 'Option cards', 'sgs-blocks' ) } initialOpen={ false }>
			<ResponsiveControl
				label={ __( 'Picture size', 'sgs-blocks' ) }
				value={ sizes }
				isInherited={ ( tier ) => 'desktop' !== tier && ! sizes[ tier ] }
				resolvedValue={ ( tier ) => `${ inherited( tier ) }%` }
				onReset={ ( tier ) => setSize( tier, null ) }
			>
				{ ( tier ) => (
					<RangeControl
						label={ sprintf(
							/* translators: %s: device name */
							__( 'Picture size on %s (%% of the picture band)', 'sgs-blocks' ),
							TIER_LABEL[ tier ]
						) }
						value={ sizes[ tier ] ?? inherited( tier ) }
						onChange={ ( val ) => setSize( tier, val ) }
						min={ 20 }
						max={ 200 }
						allowReset
						resetFallbackValue={ undefined }
						help={ __(
							'100 fills the band. Smaller shows the stage colour around the picture; larger crops it. Set each device so a drawn picture reads the same size on every screen. A finish card’s frame photo is not scaled.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
			</ResponsiveControl>
		</PanelBody>
	);
}
