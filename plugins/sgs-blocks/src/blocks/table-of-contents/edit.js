import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	RangeControl,
	CheckboxControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

const STYLE_OPTIONS = [
	{ label: __( 'Card', 'sgs-blocks' ), value: 'card' },
	{ label: __( 'Minimal', 'sgs-blocks' ), value: 'minimal' },
	{ label: __( 'Flush', 'sgs-blocks' ), value: 'flush' },
];

const LIST_STYLE_OPTIONS = [
	{ label: __( 'Numbered', 'sgs-blocks' ), value: 'numbered' },
	{ label: __( 'Bulleted', 'sgs-blocks' ), value: 'bulleted' },
	{ label: __( 'Plain', 'sgs-blocks' ), value: 'plain' },
];

const HEADING_LEVELS = [ 2, 3, 4, 5, 6 ];

/**
 * Generate a slug from heading text.
 *
 * @param {string} text Heading text content.
 * @return {string} URL-safe slug.
 */
function slugify( text ) {
	return text
		.toString()
		.toLowerCase()
		.trim()
		.replace( /&/g, '-and-' )
		.replace( /[\s\W-]+/g, '-' )
		.replace( /^-+|-+$/g, '' );
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		headingLevels,
		title,
		collapsible,
		defaultCollapsed,
		smoothScroll,
		scrollOffset,
		scrollSpy,
		listStyle,
		style: tocStyle,
		titleColour,
		linkColour,
		activeLinkColour,
	} = attributes;

	// Detect headings from the current post content in the editor.
	const headings = useSelect(
		( select ) => {
			const blocks = select( 'core/block-editor' ).getBlocks();
			const found = [];

			function findHeadings( blockList ) {
				for ( const block of blockList ) {
					if (
						block.name === 'core/heading' &&
						headingLevels.includes( block.attributes.level )
					) {
						const text = ( block.attributes.content || '' )
							.replace( /<[^>]+>/g, '' )
							.trim();
						if ( text ) {
							found.push( {
								level: block.attributes.level,
								text,
								anchor:
									block.attributes.anchor ||
									slugify( text ),
							} );
						}
					}
					// Recurse into inner blocks.
					if ( block.innerBlocks?.length ) {
						findHeadings( block.innerBlocks );
					}
				}
			}

			findHeadings( blocks );
			return found;
		},
		[ headingLevels ]
	);

	const className = [
		'sgs-toc',
		`sgs-toc--${ tocStyle }`,
		`sgs-toc--${ listStyle }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	const ListTag = listStyle === 'numbered' ? 'ol' : 'ul';

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Table of Contents', 'sgs-blocks' ) }
				>
					<SelectControl
						label={ __( 'Visual style', 'sgs-blocks' ) }
						value={ tocStyle }
						options={ STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { style: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'List style', 'sgs-blocks' ) }
						value={ listStyle }
						options={ LIST_STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { listStyle: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Title', 'sgs-blocks' ) }
						value={ title }
						onChange={ ( val ) =>
							setAttributes( { title: val } )
						}
						__nextHasNoMarginBottom
					/>
					<p className="components-base-control__label">
						{ __( 'Heading levels', 'sgs-blocks' ) }
					</p>
					{ HEADING_LEVELS.map( ( level ) => (
						<CheckboxControl
							key={ level }
							label={ `H${ level }` }
							checked={ headingLevels.includes( level ) }
							onChange={ ( checked ) => {
								const next = checked
									? [ ...headingLevels, level ].sort()
									: headingLevels.filter(
											( l ) => l !== level
									  );
								setAttributes( {
									headingLevels: next,
								} );
							} }
							__nextHasNoMarginBottom
						/>
					) ) }
				</PanelBody>

				<PanelBody
					title={ __( 'Behaviour', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Collapsible', 'sgs-blocks' ) }
						checked={ collapsible }
						onChange={ ( val ) =>
							setAttributes( { collapsible: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ collapsible && (
						<ToggleControl
							label={ __(
								'Collapsed by default',
								'sgs-blocks'
							) }
							checked={ defaultCollapsed }
							onChange={ ( val ) =>
								setAttributes( {
									defaultCollapsed: val,
								} )
							}
							__nextHasNoMarginBottom
						/>
					) }
					<ToggleControl
						label={ __( 'Smooth scroll', 'sgs-blocks' ) }
						checked={ smoothScroll }
						onChange={ ( val ) =>
							setAttributes( { smoothScroll: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ smoothScroll && (
						<RangeControl
							label={ __(
								'Scroll offset (px)',
								'sgs-blocks'
							) }
							help={ __(
								'Offset for sticky headers. 0 = no offset.',
								'sgs-blocks'
							) }
							value={ scrollOffset }
							onChange={ ( val ) =>
								setAttributes( { scrollOffset: val } )
							}
							min={ 0 }
							max={ 200 }
							step={ 10 }
							__nextHasNoMarginBottom
						/>
					) }
					<ToggleControl
						label={ __( 'Scroll spy', 'sgs-blocks' ) }
						help={ __(
							'Highlights the heading currently in view.',
							'sgs-blocks'
						) }
						checked={ scrollSpy }
						onChange={ ( val ) =>
							setAttributes( { scrollSpy: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Title colour', 'sgs-blocks' ) }
						value={ titleColour }
						onChange={ ( val ) =>
							setAttributes( { titleColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Link colour', 'sgs-blocks' ) }
						value={ linkColour }
						onChange={ ( val ) =>
							setAttributes( { linkColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'Active link colour',
							'sgs-blocks'
						) }
						value={ activeLinkColour }
						onChange={ ( val ) =>
							setAttributes( { activeLinkColour: val } )
						}
					/>
				</PanelBody>
			</InspectorControls>

			<nav { ...blockProps } aria-label={ title }>
				{ title && (
					<p
						className="sgs-toc__title"
						style={ {
							color:
								colourVar( titleColour ) || undefined,
						} }
					>
						{ title }
					</p>
				) }
				{ headings.length > 0 ? (
					<ListTag className="sgs-toc__list">
						{ headings.map( ( heading, i ) => (
							<li
								key={ i }
								className={ `sgs-toc__item sgs-toc__item--h${ heading.level }` }
								style={ {
									color:
										colourVar( linkColour ) ||
										undefined,
								} }
							>
								<span className="sgs-toc__link">
									{ heading.text }
								</span>
							</li>
						) ) }
					</ListTag>
				) : (
					<p className="sgs-toc__empty">
						{ __(
							'Add heading blocks to generate a table of contents.',
							'sgs-blocks'
						) }
					</p>
				) }
			</nav>
		</>
	);
}
