// The draft element a form block stands on (Spec 48 §3.4, one draft element is one node's). A form record's root is the
// element the handoff names for the form; when it holds the form's controls (input, select, textarea) in one of its block
// children and other children holding none (an aside or a bar the page draws beside the form, the trade application's grid
// of a form card and a 340px aside), the root is the page's layout around the form and the form block is that one child.
// Otherwise the root is the form. The page's linked form (lib/skeleton-form-link.mjs) and the form surface's own form
// block (rules.formHost) both stand on this element, so the page lays out what is beside the form and the saved form holds
// only the form.
const CONTROLS = [ 'input', 'select', 'textarea' ];

// m: the inventory model (lib/skeleton-model.mjs); root: the form record's root element. Returns the form's element.
export function formElement( m, root ) {
	const under = ( a, e ) => {
		for ( let x = e; x; x = m.byKey[ x.parentKey ] ) {
			if ( x === a ) {
				return true;
			}
		}
		return false;
	};
	const controls = m.els.filter( ( e ) => CONTROLS.includes( e.tag ) && under( root, e ) );
	const kids = m.blockKids( root );
	const holders = kids.filter( ( k ) => controls.some( ( c ) => under( k, c ) ) );
	return controls.length && kids.length > 1 && 1 === holders.length && controls.every( ( c ) => under( holders[ 0 ], c ) ) ? holders[ 0 ] : root;
}
