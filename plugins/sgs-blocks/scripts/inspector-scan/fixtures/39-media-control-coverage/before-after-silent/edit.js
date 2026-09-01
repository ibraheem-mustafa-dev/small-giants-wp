// Mirrors sgs/before-after's real shape (edit.js:551,567): TWO direct
// `<MediaElementPanel` mounts, one per comparison slot.
import MediaElementPanel from '../../components/MediaElementPanel.js';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<MediaElementPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				atoms={ [ 'object-fit', 'focal-point' ] }
				blockSlug="sgs/before-after"
				prefix="before"
			/>
			<MediaElementPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				atoms={ [ 'object-fit', 'focal-point' ] }
				blockSlug="sgs/before-after"
				prefix="after"
			/>
		</>
	);
}
