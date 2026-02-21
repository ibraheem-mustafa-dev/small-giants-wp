import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	Button,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

const TEMPLATE = [
	[ 'sgs/tab', { label: __( 'Tab 1', 'sgs-blocks' ) } ],
	[ 'sgs/tab', { label: __( 'Tab 2', 'sgs-blocks' ) } ],
	[ 'sgs/tab', { label: __( 'Tab 3', 'sgs-blocks' ) } ],
];

const ORIENTATION_OPTIONS = [
	{ label: __( 'Horizontal', 'sgs-blocks' ), value: 'horizontal' },
	{ label: __( 'Vertical', 'sgs-blocks' ), value: 'vertical' },
];

const ALIGNMENT_OPTIONS = [
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'centre' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
];

const STYLE_OPTIONS = [
	{ label: __( 'Underline', 'sgs-blocks' ), value: 'underline' },
	{ label: __( 'Boxed', 'sgs-blocks' ), value: 'boxed' },
	{ label: __( 'Pills', 'sgs-blocks' ), value: 'pills' },
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		orientation,
		tabAlignment,
		tabStyle,
		tabTextColour,
		tabActiveTextColour,
		tabActiveBgColour,
		tabActiveIndicatorColour,
		tabHoverBgColour,
		panelBgColour,
		panelBorderColour,
		transitionDuration,
	} = attributes;

	const [ activeEditorTab, setActiveEditorTab ] = useState( 0 );

	// Read inner block (tab) labels from the store so the nav stays in sync.
	const tabLabels = useSelect(
		( select ) => {
			const innerBlocks =
				select( 'core/block-editor' ).getBlocks( clientId );
			return innerBlocks.map(
				( block ) => block.attributes?.label || __( 'Tab', 'sgs-blocks' )
			);
		},
		[ clientId ]
	);

	const wrapperClassName = [
		'sgs-tabs',
		`sgs-tabs--${ orientation }`,
		`sgs-tabs--style-${ tabStyle }`,
		`sgs-tabs--align-${ tabAlignment }`,
	].join( ' ' );

	const cssVars = {};
	if ( tabTextColour ) {
		cssVars[ '--sgs-tab-text' ] = colourVar( tabTextColour );
	}
	if ( tabActiveTextColour ) {
		cssVars[ '--sgs-tab-active-text' ] = colourVar( tabActiveTextColour );
	}
	if ( tabActiveBgColour ) {
		cssVars[ '--sgs-tab-active-bg' ] = colourVar( tabActiveBgColour );
	}
	if ( tabActiveIndicatorColour ) {
		cssVars[ '--sgs-tab-active-indicator' ] = colourVar(
			tabActiveIndicatorColour
		);
	}
	if ( tabHoverBgColour ) {
		cssVars[ '--sgs-tab-hover-bg' ] = colourVar( tabHoverBgColour );
	}
	if ( panelBgColour ) {
		cssVars[ '--sgs-panel-bg' ] = colourVar( panelBgColour );
	}
	if ( panelBorderColour ) {
		cssVars[ '--sgs-panel-border' ] = colourVar( panelBorderColour );
	}
	if ( transitionDuration ) {
		cssVars[ '--sgs-transition-duration' ] = `${ transitionDuration }ms`;
	}

	const blockProps = useBlockProps( {
		className: wrapperClassName,
		style: cssVars,
	} );

	// Inner blocks must be children of the wrapper element (not the nav).
	// We render them conditionally via CSS display — only show the active tab.
	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'sgs-tabs__panels',
			'data-active-tab': activeEditorTab,
		},
		{
			allowedBlocks: [ 'sgs/tab' ],
			template: TEMPLATE,
			renderAppender: false,
		}
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Orientation', 'sgs-blocks' ) }
						value={ orientation }
						options={ ORIENTATION_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { orientation: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Tab alignment', 'sgs-blocks' ) }
						value={ tabAlignment }
						options={ ALIGNMENT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { tabAlignment: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Tab style', 'sgs-blocks' ) }
						value={ tabStyle }
						options={ STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { tabStyle: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Colours', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Tab text colour', 'sgs-blocks' ) }
						value={ tabTextColour }
						onChange={ ( val ) =>
							setAttributes( { tabTextColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'Active tab text colour',
							'sgs-blocks'
						) }
						value={ tabActiveTextColour }
						onChange={ ( val ) =>
							setAttributes( { tabActiveTextColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'Active tab background',
							'sgs-blocks'
						) }
						value={ tabActiveBgColour }
						onChange={ ( val ) =>
							setAttributes( { tabActiveBgColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'Active tab indicator colour',
							'sgs-blocks'
						) }
						value={ tabActiveIndicatorColour }
						onChange={ ( val ) =>
							setAttributes( {
								tabActiveIndicatorColour: val,
							} )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Tab hover background', 'sgs-blocks' ) }
						value={ tabHoverBgColour }
						onChange={ ( val ) =>
							setAttributes( { tabHoverBgColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Panel background', 'sgs-blocks' ) }
						value={ panelBgColour }
						onChange={ ( val ) =>
							setAttributes( { panelBgColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Panel border colour', 'sgs-blocks' ) }
						value={ panelBorderColour }
						onChange={ ( val ) =>
							setAttributes( { panelBorderColour: val } )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Animation', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<RangeControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ transitionDuration }
						onChange={ ( val ) =>
							setAttributes( { transitionDuration: val } )
						}
						min={ 100 }
						max={ 500 }
						step={ 50 }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ /* Tab navigation bar — editor preview */ }
				<div
					className="sgs-tabs__nav"
					role="tablist"
					aria-label={ __( 'Content tabs', 'sgs-blocks' ) }
					aria-orientation={ orientation }
				>
					{ tabLabels.map( ( label, index ) => (
						<Button
							key={ index }
							className={ [
								'sgs-tabs__tab',
								index === activeEditorTab
									? 'sgs-tabs__tab--active'
									: '',
							]
								.filter( Boolean )
								.join( ' ' ) }
							aria-selected={ index === activeEditorTab }
							onClick={ () => setActiveEditorTab( index ) }
						>
							{ label }
						</Button>
					) ) }
				</div>

				{ /* Tab panels — only active tab's InnerBlocks are visible */ }
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
