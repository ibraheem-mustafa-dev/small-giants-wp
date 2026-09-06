import { TypographyControls } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<TypographyControls
			prefix="title"
			attributes={ attributes }
			setAttributes={ setAttributes }
		/>
	);
}
