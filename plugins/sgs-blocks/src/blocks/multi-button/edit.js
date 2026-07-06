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
import { ResponsiveControl, SpacingControl } from '../../components';
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

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		direction,
		directionTablet,
		directionMobile,
		gap,
		justifyContent,
		justifyContentTablet,
		justifyContentMobile,
		wrap,
		wrapTablet,
		wrapMobile,
		alignItems,
	} = attributes;

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
		gap: gap || undefined,
		justifyContent,
		alignItems,
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
					<ResponsiveControl label={ __( 'Direction', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'direction',
								tablet:  'directionTablet',
								mobile:  'directionMobile',
							};
							return (
								<SelectControl
									value={ attributes[ attrMap[ breakpoint ] ] }
									options={ breakpoint === 'desktop' ? DIRECTION_OPTIONS : DIRECTION_OPTIONS_WITH_INHERIT }
									onChange={ ( val ) => setAttributes( { [ attrMap[ breakpoint ] ]: val } ) }
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>

					<hr style={ { margin: '12px 0' } } />

					<ResponsiveControl label={ __( 'Gap', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'gap',
								tablet:  'gapTablet',
								mobile:  'gapMobile',
							};
							return (
								<SpacingControl
									freeInput
									value={ attributes[ attrMap[ breakpoint ] ] || '' }
									onChange={ ( val ) => setAttributes( { [ attrMap[ breakpoint ] ]: val } ) }
								/>
							);
						} }
					</ResponsiveControl>

					<hr style={ { margin: '12px 0' } } />

					<ResponsiveControl label={ __( 'Wrap', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'wrap',
								tablet:  'wrapTablet',
								mobile:  'wrapMobile',
							};
							return (
								<SelectControl
									value={ attributes[ attrMap[ breakpoint ] ] }
									options={ breakpoint === 'desktop' ? WRAP_OPTIONS : WRAP_OPTIONS_WITH_INHERIT }
									onChange={ ( val ) => setAttributes( { [ attrMap[ breakpoint ] ]: val } ) }
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>
				</PanelBody>

				{ /* ── Alignment panel ── */ }
				<PanelBody
					title={ __( 'Alignment', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveControl label={ __( 'Justify Content (main axis)', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'justifyContent',
								tablet:  'justifyContentTablet',
								mobile:  'justifyContentMobile',
							};
							return (
								<SelectControl
									value={ attributes[ attrMap[ breakpoint ] ] }
									options={ breakpoint === 'desktop' ? JUSTIFY_OPTIONS : JUSTIFY_OPTIONS_WITH_INHERIT }
									onChange={ ( val ) => setAttributes( { [ attrMap[ breakpoint ] ]: val } ) }
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>

					<hr style={ { margin: '12px 0' } } />

					<SelectControl
						label={ __( 'Align Items (cross axis)', 'sgs-blocks' ) }
						value={ alignItems }
						options={ ALIGN_ITEMS_OPTIONS }
						onChange={ ( val ) => setAttributes( { alignItems: val } ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...innerBlocksProps } />
		</>
	);
}
