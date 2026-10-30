// The draft element a form block stands on (Spec 48 §3.4, one draft element is one node's). A form record's root is the
// element the handoff names for the form; when one of its block children holds every control the form draws and is not a
// control itself, and its other children hold none (an aside or a bar the page draws beside the form: a grid of a form card
// and a 340px aside), the root is the page's layout around the form and the form block is that one child. Otherwise (a
// control straight in the root, or controls spread over several children) the root is the form. The page's linked form
// (lib/skeleton-form-link.mjs) and the form surface's own form block (rules.formHost) both stand on this element, so the
// page lays out what is beside the form and the saved form holds only the form.
const CONTROLS = [ 'input', 'select', 'textarea' ];
// What a form draws for the visitor to answer or send with, besides its text controls: a pressed-state option (a chip or
// tile), a radio, checkbox or option role, and a submit button.
const answers = ( e ) => CONTROLS.includes( e.tag ) || undefined !== e.attrs?.[ 'aria-pressed' ] || [ 'radio', 'checkbox', 'option' ].includes( e.attrs?.role ) || ( 'button' === e.tag && 'submit' === e.attrs?.type );

// What a visitor fills in: a text control (an input of a type that takes an entry, a select or a textarea), a pressed-state
// option, or a radio, checkbox or option role; never a button or link that only submits or leads elsewhere.
const NOT_ENTRY = new Set( [ 'hidden', 'submit', 'button', 'reset', 'image' ] );
const isField = ( e ) => ( CONTROLS.includes( e.tag ) && ! NOT_ENTRY.has( String( e.attrs?.type ?? '' ).toLowerCase() ) ) || undefined !== e.attrs?.[ 'aria-pressed' ] || [ 'radio', 'checkbox', 'option' ].includes( e.attrs?.role );

// Whether the element `el` is or holds a field (FR-48-57): a form block stands only on an element holding one, so a lone
// button or link a form record names is that control, never a form with nothing to fill in.
export function holdsField( m, el ) {
	if ( ! el ) {
		return false;
	}
	for ( const e of m.els ) {
		for ( let x = e; x; x = m.byKey[ x.parentKey ] ) {
			if ( x === el ) {
				if ( isField( e ) ) {
					return true;
				}
				break;
			}
		}
	}
	return false;
}

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
	const controls = m.els.filter( ( e ) => answers( e ) && under( root, e ) );
	const kids = m.blockKids( root );
	const holders = kids.filter( ( k ) => controls.some( ( c ) => under( k, c ) ) );
	const one = 1 === holders.length && ! answers( holders[ 0 ] ) && controls.every( ( c ) => under( holders[ 0 ], c ) );
	return controls.some( ( e ) => CONTROLS.includes( e.tag ) ) && kids.length > 1 && one ? holders[ 0 ] : root;
}
