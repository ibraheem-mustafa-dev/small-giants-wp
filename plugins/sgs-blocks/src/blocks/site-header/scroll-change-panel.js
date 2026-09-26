/**
 * "Scroll change" — sgs/site-header's scroll-trigger panel (Wave 3C U-13 M-03,
 * §4.4/§4.6, `.claude/reports/2026-09-26-u13-header-ink-design.md`).
 *
 * Independent of "Colour over sections" (section-ink-panel.js) and the
 * "Header behaviour" ToolsPanel — `scrolledTrigger`/`scrolledOffset` decide
 * WHEN `is-header-scrolled`/`is-header-shrunk` apply, not what they paint.
 * Render-side twin: `includes/sgs-header-scroll-trigger.php`.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl } from '@wordpress/components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {Element}
 */
export default function ScrollChangePanel( { attributes, setAttributes } ) {
	const { scrolledTrigger, scrolledOffset } = attributes;

	return (
		<PanelBody title={ __( 'Scroll change', 'sgs-blocks' ) } initialOpen={ false }>
			<ToggleGroupControl
				label={ __( 'Change based on', 'sgs-blocks' ) }
				help={ __(
					'Direction: the header changes while scrolling down and changes back as soon as the visitor scrolls up.',
					'sgs-blocks'
				) }
				value={ scrolledTrigger || 'position' }
				onChange={ ( value ) => setAttributes( { scrolledTrigger: value || 'position' } ) }
				isBlock
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			>
				<ToggleGroupControlOption value="position" label={ __( 'Scroll position', 'sgs-blocks' ) } />
				<ToggleGroupControlOption value="direction" label={ __( 'Scroll direction', 'sgs-blocks' ) } />
			</ToggleGroupControl>

			<RangeControl
				label={ __( 'Change after scrolling (px)', 'sgs-blocks' ) }
				value={ scrolledOffset ?? 50 }
				onChange={ ( value ) => setAttributes( { scrolledOffset: value ?? 50 } ) }
				min={ 0 }
				max={ 2000 }
				step={ 10 }
				allowReset
				resetFallbackValue={ 50 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</PanelBody>
	);
}
