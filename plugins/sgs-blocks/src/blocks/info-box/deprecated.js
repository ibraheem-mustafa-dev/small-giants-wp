import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

/**
 * V1 deprecation: static save with full HTML output.
 *
 * Migrates to dynamic render (save returns null) — render.php
 * now handles all frontend output. Attributes are preserved
 * in the block comment delimiter JSON.
 */
const v1 = {
	attributes: {
		icon: { type: 'string', default: 'star-filled' },
		heading: {
			type: 'string',
			source: 'html',
			selector: '.sgs-info-box__heading',
		},
		description: {
			type: 'string',
			source: 'html',
			selector: '.sgs-info-box__description',
		},
		link: { type: 'string' },
		linkOpensNewTab: { type: 'boolean', default: false },
		iconColour: { type: 'string', default: 'primary' },
		iconBackgroundColour: { type: 'string', default: 'accent-light' },
		iconSize: { type: 'string', default: 'medium' },
		headingColour: { type: 'string' },
		headingFontSize: { type: 'string' },
		descriptionColour: { type: 'string' },
		cardStyle: { type: 'string', default: 'elevated' },
		hoverEffect: { type: 'string', default: 'lift' },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour: { type: 'string', default: '' },
		hoverBorderColour: { type: 'string', default: '' },
	},
	supports: {
		align: false,
		anchor: true,
		html: false,
		color: { background: true, text: true, link: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width: true,
			color: true,
			style: true,
		},
	},
	save( { attributes } ) {
		const {
			icon,
			heading,
			description,
			link,
			linkOpensNewTab,
			iconColour,
			iconBackgroundColour,
			iconSize,
			headingColour,
			headingFontSize,
			descriptionColour,
			cardStyle,
			hoverEffect,
		} = attributes;

		const className = [
			'sgs-info-box',
			`sgs-info-box--${ cardStyle }`,
			`sgs-info-box--hover-${ hoverEffect }`,
		].join( ' ' );

		const blockProps = useBlockProps.save( { className } );

		const iconStyle = {
			color: colourVar( iconColour ),
			backgroundColor: colourVar( iconBackgroundColour ),
		};

		const headingStyle = {
			color: colourVar( headingColour ) || undefined,
			fontSize: fontSizeVar( headingFontSize ) || undefined,
		};

		const descriptionStyle = {
			color: colourVar( descriptionColour ) || undefined,
		};

		const cardContent = (
			<>
				<span
					className={ `sgs-info-box__icon sgs-info-box__icon--${ iconSize }` }
					style={ iconStyle }
					data-icon={ icon }
					aria-hidden="true"
				/>
				<RichText.Content
					tagName="h3"
					className="sgs-info-box__heading"
					value={ heading }
					style={ headingStyle }
				/>
				<RichText.Content
					tagName="p"
					className="sgs-info-box__description"
					value={ description }
					style={ descriptionStyle }
				/>
			</>
		);

		if ( link ) {
			return (
				<div { ...blockProps }>
					<a
						href={ link }
						className="sgs-info-box__link"
						{ ...( linkOpensNewTab
							? {
									target: '_blank',
									rel: 'noopener noreferrer',
							  }
							: {} ) }
					>
						{ cardContent }
					</a>
				</div>
			);
		}

		return <div { ...blockProps }>{ cardContent }</div>;
	},
	migrate( attributes ) {
		return attributes;
	},
};

export default [ v1 ];
