/**
 * sgs/diagram-dimension — the Line panel (type, ends, direction, endpoints,
 * extension lines). Split from edit.js; every value is written straight to
 * the child's own attributes.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';
import { ToggleGroupControl, ToggleGroupControlOption, ToolsPanel, ToolsPanelItem } from '../../components/primitives';

const LINE_DEFAULTS = {
	kind: 'dimension',
	endStyle: 'tick',
	orientation: 'horizontal',
	startX: 20,
	startY: 50,
	endX: 80,
	endY: 50,
	extReach: 0,
	extReachEnd: undefined,
	extOvershoot: 0,
};

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Child attributes.
 * @param {Function} props.setAttributes Child setter.
 * @param {Object}   props.endpoints     Locked endpoints {sx, sy, ex, ey}.
 * @param {Function} props.onOrientation Applies a direction and snaps the end.
 * @return {Element} The panel.
 */
export default function LinePanel( { attributes, setAttributes, endpoints, onOrientation } ) {
	const { kind, endStyle, orientation, extReach, extReachEnd, extOvershoot } = attributes;
	const { sx, sy, ex, ey } = endpoints;
	const setOrientation = onOrientation;

	const range = ( attr, label, current, min = 0, max = 100, step = 0.1 ) => (
		<ToolsPanelItem
			label={ label }
			hasValue={ () => current !== LINE_DEFAULTS[ attr ] }
			onDeselect={ () => setAttributes( { [ attr ]: LINE_DEFAULTS[ attr ] } ) }
			isShownByDefault
		>
			<RangeControl
				label={ label }
				value={ current }
				onChange={ ( v ) => setAttributes( { [ attr ]: v } ) }
				min={ min }
				max={ max }
				step={ step }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</ToolsPanelItem>
	);

	return (
			<PanelBody title={ __( 'Line', 'sgs-blocks' ) } initialOpen={ false }>
				<ToolsPanel
					label={ __( 'Line', 'sgs-blocks' ) }
					resetAll={ () => setAttributes( { ...LINE_DEFAULTS } ) }
				>
					<ToolsPanelItem
						label={ __( 'Type', 'sgs-blocks' ) }
						hasValue={ () => kind !== LINE_DEFAULTS.kind }
						onDeselect={ () => setAttributes( { kind: LINE_DEFAULTS.kind } ) }
						isShownByDefault
					>
						<ToggleGroupControl
							label={ __( 'Type', 'sgs-blocks' ) }
							value={ kind || 'dimension' }
							onChange={ ( v ) => setAttributes( { kind: v } ) }
							isBlock
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						>
							<ToggleGroupControlOption value="dimension" label={ __( 'Dimension', 'sgs-blocks' ) } />
							<ToggleGroupControlOption value="leader" label={ __( 'Leader', 'sgs-blocks' ) } />
						</ToggleGroupControl>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Line ends', 'sgs-blocks' ) }
						hasValue={ () => endStyle !== LINE_DEFAULTS.endStyle }
						onDeselect={ () => setAttributes( { endStyle: LINE_DEFAULTS.endStyle } ) }
						isShownByDefault
					>
						<SelectControl
							label={ __( 'Line ends', 'sgs-blocks' ) }
							value={ endStyle || 'tick' }
							options={ [
								{ value: 'tick', label: __( 'Tick', 'sgs-blocks' ) },
								{ value: 'arrow', label: __( 'Arrow', 'sgs-blocks' ) },
								{ value: 'dot', label: __( 'Dot', 'sgs-blocks' ) },
								{ value: 'none', label: __( 'None', 'sgs-blocks' ) },
							] }
							onChange={ ( v ) => setAttributes( { endStyle: v } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Direction', 'sgs-blocks' ) }
						hasValue={ () => orientation !== LINE_DEFAULTS.orientation }
						onDeselect={ () => setOrientation( LINE_DEFAULTS.orientation ) }
						isShownByDefault
					>
						<ToggleGroupControl
							label={ __( 'Direction', 'sgs-blocks' ) }
							value={ orientation || 'horizontal' }
							onChange={ setOrientation }
							isBlock
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						>
							<ToggleGroupControlOption value="horizontal" label={ __( 'Horizontal', 'sgs-blocks' ) } />
							<ToggleGroupControlOption value="vertical" label={ __( 'Vertical', 'sgs-blocks' ) } />
							<ToggleGroupControlOption value="free" label={ __( 'Free', 'sgs-blocks' ) } />
						</ToggleGroupControl>
					</ToolsPanelItem>
					{ range( 'startX', __( 'Start across (%)', 'sgs-blocks' ), sx ) }
					{ range( 'startY', __( 'Start down (%)', 'sgs-blocks' ), sy ) }
					{ 'vertical' !== orientation && range( 'endX', __( 'End across (%)', 'sgs-blocks' ), ex ) }
					{ 'horizontal' !== orientation && range( 'endY', __( 'End down (%)', 'sgs-blocks' ), ey ) }
					{ 'dimension' === ( kind || 'dimension' ) &&
						range( 'extReach', __( 'Extension line reach (% of width)', 'sgs-blocks' ), extReach ?? 0, -50, 50 ) }
					{ 'dimension' === ( kind || 'dimension' ) && (
						<ToolsPanelItem
							label={ __( 'End extension reach', 'sgs-blocks' ) }
							hasValue={ () => undefined !== extReachEnd && null !== extReachEnd }
							onDeselect={ () => setAttributes( { extReachEnd: undefined } ) }
						>
							<RangeControl
								label={ __( 'End extension reach (% of width)', 'sgs-blocks' ) }
								help={ __( 'Leave unset to match the start.', 'sgs-blocks' ) }
								value={ extReachEnd }
								onChange={ ( v ) => setAttributes( { extReachEnd: v } ) }
								min={ -50 }
								max={ 50 }
								step={ 0.1 }
								allowReset
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					) }
					{ 'dimension' === ( kind || 'dimension' ) &&
						range( 'extOvershoot', __( 'Extension overshoot (% of width)', 'sgs-blocks' ), extOvershoot ?? 0, 0, 20 ) }
				</ToolsPanel>
			</PanelBody>
	);
}
