import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { useSelect, useDispatch } from '@wordpress/data';
// WS-4: shared sgs/container wrapper editor controls (layout kind).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { ResponsiveOverride, SpacingControl } from '../../components';
import {
	PanelBody,
	SelectControl,
	Button,
} from '@wordpress/components';
import { BUTTON_PRESETS } from '../button/presets';

const CHILD_PRESET_OPTIONS = [
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
	{ label: __( 'Secondary', 'sgs-blocks' ), value: 'secondary' },
	{ label: __( 'Outline', 'sgs-blocks' ), value: 'outline' },
];

const TEMPLATE = [
	[ 'sgs/button', { inheritStyle: 'primary', label: 'Primary Action' } ],
	[ 'sgs/button', { inheritStyle: 'secondary', label: 'Secondary Action' } ],
];

const DIRECTION_OPTIONS = [
	{ label: __( 'Row (horizontal)', 'sgs-blocks' ), value: 'row' },
	{ label: __( 'Column (vertical)', 'sgs-blocks' ), value: 'column' },
];

const DIRECTION_OPTIONS_WITH_INHERIT = [
	{ label: __( '— inherit desktop —', 'sgs-blocks' ), value: '' },
	...DIRECTION_OPTIONS,
];

const JUSTIFY_OPTIONS = [
	{ label: __( 'Start', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Space Between', 'sgs-blocks' ), value: 'space-between' },
];

const JUSTIFY_OPTIONS_WITH_INHERIT = [
	{ label: __( '— inherit desktop —', 'sgs-blocks' ), value: '' },
	...JUSTIFY_OPTIONS,
];

const WRAP_OPTIONS = [
	{ label: __( 'Wrap', 'sgs-blocks' ), value: 'wrap' },
	{ label: __( 'No Wrap', 'sgs-blocks' ), value: 'nowrap' },
];

const WRAP_OPTIONS_WITH_INHERIT = [
	{ label: __( '— inherit desktop —', 'sgs-blocks' ), value: '' },
	...WRAP_OPTIONS,
];

const ALIGN_ITEMS_OPTIONS = [
	{ label: __( 'Start', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
];

const ALIGN_ITEMS_OPTIONS_WITH_INHERIT = [
	{ label: __( 'Inherit', 'sgs-blocks' ), value: '' },
	...ALIGN_ITEMS_OPTIONS,
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		// `flexDirection`/`flexWrap`/`justifyContent`/`alignItems` are now TIER
		// OBJECTS (Spec 35 pass, {desktop,tablet,mobile}) — the legacy
		// `direction`/`wrap` names and the flat `…Tablet`/`…Mobile` siblings are
		// no longer declared by block.json (folded into the object).
		flexDirection,
		gap,
		justifyContent,
		flexWrap,
		alignItems,
	} = attributes;

	// Only the DESKTOP tier is read here (the editorStyle preview below). The
	// tier controls read/write the object directly via ResponsiveOverride.
	const direction = flexDirection?.desktop || 'row';
	const wrap      = flexWrap?.desktop || 'nowrap';
	const justify   = justifyContent?.desktop || 'flex-start';
	const align     = alignItems?.desktop || 'center';

	// "Apply to all buttons" — bulk preset-as-seed for every sgs/button child.
	const [ groupPreset, setGroupPreset ] = useState( 'primary' );
	const childButtons = useSelect(
		( select ) =>
			( select( 'core/block-editor' ).getBlock( clientId )?.innerBlocks || [] ).filter(
				( block ) => 'sgs/button' === block.name
			),
		[ clientId ]
	);
	const { updateBlockAttributes } = useDispatch( 'core/block-editor' );

	const applyPresetToAllButtons = () => {
		const presetValues = BUTTON_PRESETS[ groupPreset ];
		childButtons.forEach( ( child ) => {
			updateBlockAttributes( child.clientId, { ...presetValues, inheritStyle: groupPreset } );
		} );
	};

	// Preview the desktop layout in the editor.
	// Gap comes from the block's own Layout panel Gap control (raw CSS string).
	const editorStyle = {
		display: 'flex',
		flexDirection: direction,
		flexWrap: wrap,
		gap: gap?.desktop || undefined,
		justifyContent: justify,
		alignItems: align,
	};

	const blockProps = useBlockProps( { style: editorStyle } );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: [ 'sgs/button' ],
		template: TEMPLATE,
		templateLock: false,
	} );

	return (
		<>
			<InspectorControls>
				{ /* H6 fix (2026-07-05, STOP-43): kind='content' only (width/contentWidth +
				    padding/spacing). The block owns its own responsive flex layout
				    (direction/gap/wrap/justify/align, rendered via its own scoped <style>
				    in render.php at SGS_Container_Wrapper::render(..., 'content', ...)) —
				    kind='layout' would additionally make the shared wrapper emit its own
				    non-responsive grid/flex + inline style, which always beats this
				    block's @media-scoped rules. See render.php for the full note. */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>

				{ /* ── Bulk style preset ── */ }
				<PanelBody
					title={ __( 'Button styles', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Style preset', 'sgs-blocks' ) }
						value={ groupPreset }
						options={ CHILD_PRESET_OPTIONS }
						onChange={ setGroupPreset }
						help={ __( 'Apply a preset style to every button in this group at once.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<Button
						variant="secondary"
						style={ { marginTop: '8px' } }
						onClick={ applyPresetToAllButtons }
						disabled={ ! childButtons.length }
					>
						{ __( 'Apply to all buttons', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

				{ /* ── Layout panel ── */ }
				<PanelBody
					title={ __( 'Layout', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					{ /*
						  `flexDirection` is a TIER OBJECT — ONE attr holding
						  {desktop,tablet,mobile} (Spec 35 pass), same shape as
						  `gap` below. `flexDirectionTablet`/`…Mobile` are no
						  longer declared in block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Direction', 'sgs-blocks' ) }
						value={ flexDirection }
						onChange={ ( obj ) => setAttributes( { flexDirection: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ tier === 'desktop' ? DIRECTION_OPTIONS : DIRECTION_OPTIONS_WITH_INHERIT }
								onChange={ ( val ) => setOwnValue( val ) }
								__nextHasNoMarginBottom
							/>
						) }
					</ResponsiveOverride>

					<hr style={ { margin: '12px 0' } } />

					{ /*
						  Gap is a TIER OBJECT — ONE attr holding
						  {desktop,tablet,mobile} (Spec 35 pass 1, 2026-08-10).
						  ⛔ Do NOT revert to `ResponsiveControl` + an attrMap of
						  `gap`/`gapTablet`/`gapMobile`: the latter two are no
						  longer declared in block.json and WordPress silently
						  discards an undeclared attribute (D338), while the
						  desktop branch wrote a STRING into an object-typed
						  attr, which coerces to the default and loses the lot.
					*/ }
					<ResponsiveOverride
						label={ __( 'Gap', 'sgs-blocks' ) }
						value={ attributes.gap }
						onChange={ ( obj ) => setAttributes( { gap: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<SpacingControl
								freeInput
								value={ ownValue }
								placeholder={ inherited ? effectiveValue : '' }
								onChange={ setOwnValue }
							/>
						) }
					</ResponsiveOverride>

					<hr style={ { margin: '12px 0' } } />

					{ /*
						  `flexWrap` is a TIER OBJECT — same shape as `flexDirection`
						  above. `flexWrapTablet`/`…Mobile` are no longer declared
						  in block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Wrap', 'sgs-blocks' ) }
						value={ flexWrap }
						onChange={ ( obj ) => setAttributes( { flexWrap: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ tier === 'desktop' ? WRAP_OPTIONS : WRAP_OPTIONS_WITH_INHERIT }
								onChange={ ( val ) => setOwnValue( val ) }
								__nextHasNoMarginBottom
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				{ /* ── Alignment panel ── */ }
				<PanelBody
					title={ __( 'Alignment', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /*
						  `justifyContent` is a TIER OBJECT — same shape as
						  `flexDirection` above. `justifyContentTablet`/`…Mobile`
						  are no longer declared in block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Justify Content (main axis)', 'sgs-blocks' ) }
						value={ justifyContent }
						onChange={ ( obj ) => setAttributes( { justifyContent: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ tier === 'desktop' ? JUSTIFY_OPTIONS : JUSTIFY_OPTIONS_WITH_INHERIT }
								onChange={ ( val ) => setOwnValue( val ) }
								__nextHasNoMarginBottom
							/>
						) }
					</ResponsiveOverride>

					<hr style={ { margin: '12px 0' } } />

					{ /*
						  `alignItems` is a TIER OBJECT — same shape as
						  `flexDirection` above. `alignItemsTablet`/`…Mobile` are
						  no longer declared in block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Align Items (cross axis)', 'sgs-blocks' ) }
						value={ alignItems }
						onChange={ ( obj ) => setAttributes( { alignItems: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ tier === 'desktop' ? ALIGN_ITEMS_OPTIONS : ALIGN_ITEMS_OPTIONS_WITH_INHERIT }
								onChange={ ( val ) => setOwnValue( val ) }
								help={ tier === 'mobile' ? __( 'Mobile stacks buttons full-width by default (stretch).', 'sgs-blocks' ) : undefined }
								__nextHasNoMarginBottom
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>
			</InspectorControls>

			<div { ...innerBlocksProps } />
		</>
	);
}
