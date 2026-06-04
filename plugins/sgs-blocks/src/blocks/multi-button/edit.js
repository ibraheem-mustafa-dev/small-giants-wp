import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
// WS-4: shared sgs/container wrapper editor controls (layout kind).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';

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

const GAP_UNIT_OPTIONS = [
	{ value: 'px', label: 'px' },
	{ value: 'em', label: 'em' },
	{ value: 'rem', label: 'rem' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		direction,
		directionTablet,
		directionMobile,
		gap,
		gapTablet,
		gapMobile,
		gapUnit,
		justifyContent,
		justifyContentTablet,
		justifyContentMobile,
		wrap,
		wrapTablet,
		wrapMobile,
		alignItems,
	} = attributes;

	// Preview the desktop layout in the editor.
	const editorStyle = {
		display: 'flex',
		flexDirection: direction,
		flexWrap: wrap,
		gap: `${ gap }${ gapUnit }`,
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
				{ /* WS-4: mirrored sgs/container wrapper controls (layout kind). */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="layout"
				/>
				{ /* ── Layout panel ── */ }
				<PanelBody
					title={ __( 'Layout', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					<p style={ { fontWeight: 600, marginBottom: 4 } }>
						{ __( 'Direction', 'sgs-blocks' ) }
					</p>
					<SelectControl
						label={ __( 'Desktop', 'sgs-blocks' ) }
						value={ direction }
						options={ DIRECTION_OPTIONS }
						onChange={ ( val ) => setAttributes( { direction: val } ) }
					/>
					<SelectControl
						label={ __( 'Tablet', 'sgs-blocks' ) }
						value={ directionTablet }
						options={ DIRECTION_OPTIONS_WITH_INHERIT }
						onChange={ ( val ) => setAttributes( { directionTablet: val } ) }
					/>
					<SelectControl
						label={ __( 'Mobile', 'sgs-blocks' ) }
						value={ directionMobile }
						options={ DIRECTION_OPTIONS_WITH_INHERIT }
						onChange={ ( val ) => setAttributes( { directionMobile: val } ) }
					/>

					<hr style={ { margin: '12px 0' } } />

					<p style={ { fontWeight: 600, marginBottom: 4 } }>
						{ __( 'Gap', 'sgs-blocks' ) }
					</p>

					<p style={ { fontSize: 11, color: '#757575', marginBottom: 4 } }>
						{ __( 'Desktop', 'sgs-blocks' ) }
					</p>
					<RangeControl
						value={ gap ?? 12 }
						onChange={ ( val ) => setAttributes( { gap: val } ) }
						min={ 0 }
						max={ 80 }
					/>

					<p style={ { fontSize: 11, color: '#757575', marginBottom: 4 } }>
						{ __( 'Tablet', 'sgs-blocks' ) }
					</p>
					<RangeControl
						value={ gapTablet ?? '' }
						onChange={ ( val ) => setAttributes( { gapTablet: val ?? null } ) }
						min={ 0 }
						max={ 80 }
						allowReset
						resetFallbackValue={ null }
					/>

					<p style={ { fontSize: 11, color: '#757575', marginBottom: 4 } }>
						{ __( 'Mobile', 'sgs-blocks' ) }
					</p>
					<RangeControl
						value={ gapMobile ?? 8 }
						onChange={ ( val ) => setAttributes( { gapMobile: val } ) }
						min={ 0 }
						max={ 80 }
					/>

					<SelectControl
						label={ __( 'Gap unit', 'sgs-blocks' ) }
						value={ gapUnit }
						options={ GAP_UNIT_OPTIONS }
						onChange={ ( val ) => setAttributes( { gapUnit: val } ) }
					/>

					<hr style={ { margin: '12px 0' } } />

					<p style={ { fontWeight: 600, marginBottom: 4 } }>
						{ __( 'Wrap', 'sgs-blocks' ) }
					</p>
					<SelectControl
						label={ __( 'Desktop', 'sgs-blocks' ) }
						value={ wrap }
						options={ WRAP_OPTIONS }
						onChange={ ( val ) => setAttributes( { wrap: val } ) }
					/>
					<SelectControl
						label={ __( 'Tablet', 'sgs-blocks' ) }
						value={ wrapTablet }
						options={ WRAP_OPTIONS_WITH_INHERIT }
						onChange={ ( val ) => setAttributes( { wrapTablet: val } ) }
					/>
					<SelectControl
						label={ __( 'Mobile', 'sgs-blocks' ) }
						value={ wrapMobile }
						options={ WRAP_OPTIONS_WITH_INHERIT }
						onChange={ ( val ) => setAttributes( { wrapMobile: val } ) }
					/>
				</PanelBody>

				{ /* ── Alignment panel ── */ }
				<PanelBody
					title={ __( 'Alignment', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p style={ { fontWeight: 600, marginBottom: 4 } }>
						{ __( 'Justify Content (main axis)', 'sgs-blocks' ) }
					</p>
					<SelectControl
						label={ __( 'Desktop', 'sgs-blocks' ) }
						value={ justifyContent }
						options={ JUSTIFY_OPTIONS }
						onChange={ ( val ) => setAttributes( { justifyContent: val } ) }
					/>
					<SelectControl
						label={ __( 'Tablet', 'sgs-blocks' ) }
						value={ justifyContentTablet }
						options={ JUSTIFY_OPTIONS_WITH_INHERIT }
						onChange={ ( val ) =>
							setAttributes( { justifyContentTablet: val } )
						}
					/>
					<SelectControl
						label={ __( 'Mobile', 'sgs-blocks' ) }
						value={ justifyContentMobile }
						options={ JUSTIFY_OPTIONS_WITH_INHERIT }
						onChange={ ( val ) =>
							setAttributes( { justifyContentMobile: val } )
						}
					/>

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
