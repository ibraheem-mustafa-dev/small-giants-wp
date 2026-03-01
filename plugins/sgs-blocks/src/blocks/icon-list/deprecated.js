/**
 * Icon List block — deprecations.
 *
 * v2: Captures the static save output (data-icon attribute, no SVG rendered) before
 *     the block was converted to server-side rendering via render.php (which outputs
 *     Lucide SVGs directly).
 * v1: Pre-static-save era — block inserted with empty innerHTML.
 */
import { useBlockProps } from '@wordpress/block-editor';
import { colourVar, spacingVar } from '../../utils';

// v2 — static save function that existed before render.php conversion.
const v2 = {
	attributes: {
		items:      { type: 'array', default: [] },
		icon:       { type: 'string', default: 'check' },
		iconColour: { type: 'string' },
		iconSize:   { type: 'string', default: 'medium' },
		textColour: { type: 'string' },
		gap:        { type: 'string', default: '20' },
	},
	supports: {
		align:   false,
		anchor:  true,
		html:    false,
		color:   { background: true, text: true, link: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width:  true,
			color:  true,
			style:  true,
		},
	},
	save( { attributes } ) {
		const { items, icon: defaultIcon, iconColour, iconSize, textColour, gap } = attributes;

		const blockProps = useBlockProps.save( {
			className: `sgs-icon-list sgs-icon-list--icon-${ iconSize }`,
		} );

		const iconStyle = { color: colourVar( iconColour ) || undefined };
		const textStyle = { color: colourVar( textColour ) || undefined };
		const listStyle = { gap: spacingVar( gap ) || undefined };

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
						<span className="sgs-icon-list__text" style={ textStyle }>
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

// v1 — block inserted with empty innerHTML before static save existed.
const v1 = {
	attributes: {
		items:      {
			type:    'array',
			default: [
				{ icon: 'check', text: 'First list item' },
				{ icon: 'check', text: 'Second list item' },
				{ icon: 'check', text: 'Third list item' },
			],
		},
		icon:       { type: 'string', default: 'check' },
		iconColour: { type: 'string' },
		iconSize:   { type: 'string', default: 'medium' },
		textColour: { type: 'string' },
		gap:        { type: 'string', default: '20' },
	},
	supports: {
		align:   false,
		anchor:  true,
		html:    false,
		color:   { background: true, text: true, link: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width:  true,
			color:  true,
			style:  true,
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
