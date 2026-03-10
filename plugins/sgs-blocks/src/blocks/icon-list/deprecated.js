import { useBlockProps } from '@wordpress/block-editor';
import { colourVar, spacingVar } from '../../utils';

/**
 * V2 deprecation: block used a static save.js that output <span data-icon="...">
 * elements rendered via CSS content/Unicode. Migrates cleanly — attributes unchanged,
 * WordPress will reserialise using the new dynamic (null) save on next editor save.
 */
const v2 = {
	attributes: {
		items: {
			type: 'array',
			default: [
				{ icon: 'check', text: 'First list item' },
				{ icon: 'check', text: 'Second list item' },
				{ icon: 'check', text: 'Third list item' },
			],
		},
		icon: { type: 'string', default: 'check' },
		iconColour: { type: 'string' },
		iconSize: { type: 'string', default: 'medium' },
		textColour: { type: 'string' },
		gap: { type: 'string', default: '20' },
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
			items,
			icon: defaultIcon,
			iconColour,
			iconSize,
			textColour,
			gap,
		} = attributes;

		const blockProps = useBlockProps.save( {
			className: `sgs-icon-list sgs-icon-list--icon-${ iconSize }`,
		} );

		const iconStyle = {
			color: colourVar( iconColour ) || undefined,
		};

		const textStyle = {
			color: colourVar( textColour ) || undefined,
		};

		const listStyle = {
			gap: spacingVar( gap ) || undefined,
		};

		return (
			<ul { ...blockProps } style={ { ...blockProps.style, ...listStyle } }>
				{ items.map( ( item, index ) => (
					<li key={ index } className="sgs-icon-list__item">
						<span
							className="sgs-icon-list__icon"
							style={ iconStyle }
							data-icon={ item.icon || defaultIcon }
							aria-hidden="true"
						/>
						<span
							className="sgs-icon-list__text"
							style={ textStyle }
						>
							{ item.text }
						</span>
					</li>
				) ) }
			</ul>
		);
	},
	migrate( attributes ) {
		return attributes;
	},
};

/**
 * V1 deprecation: block was inserted with empty innerHTML (before static save was
 * implemented). Stored innerHTML is empty — this entry matches that state.
 * WordPress migrates attributes unchanged and writes the current save.js HTML
 * on the next editor save.
 */
const v1 = {
	attributes: {
		items: {
			type: 'array',
			default: [
				{ icon: 'check', text: 'First list item' },
				{ icon: 'check', text: 'Second list item' },
				{ icon: 'check', text: 'Third list item' },
			],
		},
		icon: { type: 'string', default: 'check' },
		iconColour: { type: 'string' },
		iconSize: { type: 'string', default: 'medium' },
		textColour: { type: 'string' },
		gap: { type: 'string', default: '20' },
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
	save() {
		return null;
	},
	migrate( attributes ) {
		return attributes;
	},
};

export default [ v2, v1 ];
