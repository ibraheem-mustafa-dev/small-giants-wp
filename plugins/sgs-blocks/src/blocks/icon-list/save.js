import { useBlockProps } from '@wordpress/block-editor';
import { colourVar, spacingVar } from '../../utils';

export default function Save( { attributes } ) {
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
}
