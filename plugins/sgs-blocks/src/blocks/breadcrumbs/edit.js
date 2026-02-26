import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
} from '@wordpress/components';

const SEPARATOR_OPTIONS = [
	{ label: '/', value: '/' },
	{ label: '›', value: '›' },
	{ label: '»', value: '»' },
	{ label: '→', value: '→' },
	{ label: '|', value: '|' },
];

export default function Edit( { attributes, setAttributes } ) {
	const { separator, showHome, homeLabel } = attributes;

	const blockProps = useBlockProps( { className: 'sgs-breadcrumbs' } );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Breadcrumbs Settings', 'sgs-blocks' ) }>
					<ToggleControl
						label={ __( 'Show home link', 'sgs-blocks' ) }
						checked={ showHome }
						onChange={ ( val ) => setAttributes( { showHome: val } ) }
						__nextHasNoMarginBottom
					/>
					{ showHome && (
						<TextControl
							label={ __( 'Home label', 'sgs-blocks' ) }
							value={ homeLabel }
							onChange={ ( val ) => setAttributes( { homeLabel: val } ) }
							__nextHasNoMarginBottom
						/>
					) }
					<SelectControl
						label={ __( 'Separator', 'sgs-blocks' ) }
						value={ separator }
						options={ SEPARATOR_OPTIONS }
						onChange={ ( val ) => setAttributes( { separator: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<nav { ...blockProps } aria-label={ __( 'Breadcrumbs', 'sgs-blocks' ) }>
				<ol className="sgs-breadcrumbs__list">
					{ showHome && (
						<li className="sgs-breadcrumbs__item">
							<a href="#">{ homeLabel }</a>
							<span className="sgs-breadcrumbs__separator" aria-hidden="true">{ separator }</span>
						</li>
					) }
					<li className="sgs-breadcrumbs__item">
						<a href="#">{ __( 'Parent Page', 'sgs-blocks' ) }</a>
						<span className="sgs-breadcrumbs__separator" aria-hidden="true">{ separator }</span>
					</li>
					<li className="sgs-breadcrumbs__item sgs-breadcrumbs__item--current" aria-current="page">
						{ __( 'Current Page', 'sgs-blocks' ) }
					</li>
				</ol>
			</nav>
		</>
	);
}
