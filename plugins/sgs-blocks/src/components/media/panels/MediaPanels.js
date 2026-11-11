/**
 * The media panels for an adopted slot (Spec 49 §9.1, §9.4): collapsible
 * panels built from the atoms' disclosure rules, grouped by each setting's
 * `control.panel` and ordered by `control.order`.
 *
 * Settings panels go to the Settings tab, the rest to Styles; a container
 * background mounts one Background panel. `panelContent` lets the caller fill
 * panels this module has no atom for (typography, hover, effects, the motion
 * line under Background).
 *
 * @package SGS\Blocks
 */
import { InspectorControls, useBlockEditContext } from '@wordpress/block-editor';
import { DropdownMenu, MenuGroup, MenuItem, PanelBody } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { moreVertical } from '@wordpress/icons';

import { getBlockType } from '@wordpress/blocks';
import { blockHasMotion } from '../../../blocks/extensions/motion/support-cache.js';
import { SizingSummary } from '../SizingFields.js';
import MotionLine from './MotionLine.js';
import PanelRow from './PanelRow.js';
import { createContext, REASONS } from './disclosure-context.js';
import { buildPanelModel } from './panel-model.js';
import PanelTitle from './PanelTitle.js';
import { translateReason } from './reasons.js';
import { pinnedBlockers } from './pinned-blockers.js';
import { panelOwnDevices, resetPatch } from './row-io.js';

const DEVICE_TO_KEY = { Desktop: 'desktop', Tablet: 'tablet', Mobile: 'mobile' };
const DEVICE_NAMES = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' };

/** The editor's active device, from the one global toggle. */
function useActiveDevice() {
	return useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		const device = ed && 'function' === typeof ed.getDeviceType ? ed.getDeviceType() : null;
		return DEVICE_TO_KEY[ device ] || 'desktop';
	}, [] );
}

/**
 * @param {Object}   props
 * @param {Object}   props.attributes     Block attributes.
 * @param {Function} props.setAttributes  Block `setAttributes`.
 * @param {string}   [props.prefix]       Surface prefix.
 * @param {string}   [props.blockSlug]    Block slug.
 * @param {string[]} props.atomIds        The slot's atoms.
 * @param {string[]} props.kinds          The slot's allowed kinds.
 * @param {string}   [props.context]      'element' | 'background'.
 * @param {boolean}  [props.parallax]     Parallax is on for this background.
 * @param {Object}   [props.panelContent] Panel id to caller-supplied content.
 * @param {string}   [props.device]       Overrides the editor's active device.
 * @param {string}   [props.label]        Names the slot in each panel title ("Before: Media") when a block mounts more than one.
 * @return {JSX.Element} The panels.
 */
export default function MediaPanels( {
	attributes,
	setAttributes,
	prefix = '',
	blockSlug = '',
	atomIds,
	kinds,
	context = 'element',
	parallax: parallaxProp,
	panelContent = {},
	device: deviceOverride,
	label = '',
} ) {
	const activeDevice = useActiveDevice();
	const device = deviceOverride || activeDevice;
	const { clientId, name } = useBlockEditContext();
	// A background's Pinned setting is refused beside Parallax on the background or a transform entrance or hover on the
	// block (§10.3). A caller that already knows passes `parallax`; otherwise the block's stored motion says.
	const blockers = 'background' === context ? pinnedBlockers( attributes?.sgsMotion, getBlockType( name )?.supports?.sgs?.elements ) : {};
	const parallax = undefined === parallaxProp ? !! blockers.parallax : parallaxProp;
	const opts = { blockSlug, kinds, context, parallax, transformMotion: !! blockers.transformMotion, adopted: true };
	const kind = createContext( attributes, device, prefix, opts ).kind;
	// A background's notes and motion line (§9.6): why Pinned is not offered, then what moves the background. The motion
	// line shows only on a block that has the Effects panel; a caller's own `panelContent.background` comes first.
	const pinnedWhy = 'background' === context && 'image' === kind ? ( parallax ? REASONS.pinnedParallax : blockers.transformMotion ? REASONS.pinnedTransform : '' ) : '';
	const content =
		'background' === context
			? {
					...panelContent,
					background: (
						<>
							{ panelContent.background || null }
							{ pinnedWhy && <p className="components-base-control__help sgs-media-panel__note">{ translateReason( pinnedWhy ) }</p> }
							{ blockHasMotion( name ) && <MotionLine clientId={ clientId } attributes={ attributes } kind={ kind } /> }
						</>
					),
			  }
			: panelContent;
	const model = buildPanelModel( {
		atomIds,
		attrs: attributes,
		device,
		prefix,
		opts,
		extraPanelIds: Object.keys( content ),
		adopted: true,
	} );
	const slot = { prefix, kinds, context };

	const resetLabel =
		'desktop' === device
			? __( 'Reset this panel', 'sgs-blocks' )
			: /* translators: %s: Tablet or Mobile. */
			  sprintf( __( 'Reset %s in this panel', 'sgs-blocks' ), DEVICE_NAMES[ device ] );

	const mount = ( group ) =>
		model
			.filter( ( entry ) => entry.panel.group === group )
			.map( ( { panel, rows } ) => (
				<PanelBody
					key={ panel.id }
					title={ <PanelTitle title={ label ? /* translators: 1: the slot's name, 2: the panel title. */ sprintf( __( '%1$s: %2$s', 'sgs-blocks' ), label, panel.title() ) : panel.title() } devices={ panelOwnDevices( rows, attributes, prefix, blockSlug ) } /> }
					initialOpen={ panel.open }
					className={ `sgs-media-panel sgs-media-panel--${ panel.id }` }
				>
					{ 'size-and-crop' === panel.id && 'background' !== context && (
						<SizingSummary attributes={ attributes } setAttributes={ setAttributes } prefix={ prefix } />
					) }
					{ rows.length > 0 && (
						<div className="sgs-media-panel__menu">
							<DropdownMenu
								icon={ moreVertical }
								label={ __( 'Panel options', 'sgs-blocks' ) }
								toggleProps={ { size: 'compact' } }
							>
								{ ( { onClose } ) => (
									<MenuGroup>
										<MenuItem
											onClick={ () => {
												setAttributes( resetPatch( rows, attributes, device, prefix, blockSlug ) );
												onClose();
											} }
										>
											{ resetLabel }
										</MenuItem>
									</MenuGroup>
								) }
							</DropdownMenu>
						</div>
					) }
					{ rows.map( ( row ) => (
						<PanelRow
							key={ `${ row.atomId }-${ row.setting.base }` }
							row={ row }
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix={ prefix }
							blockSlug={ blockSlug }
							device={ device }
							kind={ kind }
							slot={ slot }
						/>
					) ) }
					{ content[ panel.id ] || null }
				</PanelBody>
			) );

	return (
		<>
			<InspectorControls group="settings">{ mount( 'settings' ) }</InspectorControls>
			<InspectorControls group="styles">{ mount( 'styles' ) }</InspectorControls>
		</>
	);
}
