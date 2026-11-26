// The draft element a form block stands on (Spec 48 §3.4, one draft element is one node's). A form record's root is the
// element the handoff names for the form; when one of its block children holds every control the form draws and is not a
// control itself, its other children hold none, and one of them sits beside it at some width (an aside or a bar the page draws
// next to the form: a grid of a form card and a 340px aside) or no width has a box to tell (a draft captured inside a closed
// modal or drawer), the root is the page's layout around the form and the form block is that one child. Otherwise (a control
// straight in the root, controls spread over several children, or a title and intro stacked above the fields, which are the
// form's own) the root is the form. The page's linked form (lib/skeleton-form-link.mjs) and the form surface's own form block
// (rules.formHost) both stand on this element, so the page lays out what is beside the form and the saved form holds only the form.
const CONTROLS = [ 'input', 'select', 'textarea' ];
// What a form draws for the visitor to answer or send with, besides its text controls: a pressed-state option (a chip or
// tile), a radio, checkbox or option role, and a submit button.
const answers = ( e ) => CONTROLS.includes( e.tag ) || undefined !== e.attrs?.[ 'aria-pressed' ] || [ 'radio', 'checkbox', 'option' ].includes( e.attrs?.role ) || ( 'button' === e.tag && 'submit' === e.attrs?.type );

// Whether element e is shown with a box of some size at width w.
const measured = ( e, w ) => {
	const b = e.box?.[ w ];
	return !! b && false !== e.visible?.[ w ] && b.w > 0 && b.h > 0;
};

// Whether element a is shown beside element b at width w: both shown with a box, their rows overlap and their columns do not.
const besideAt = ( a, b, w ) => {
	if ( ! measured( a, w ) || ! measured( b, w ) ) {
		return false;
	}
	const [ p, q ] = [ a.box[ w ], b.box[ w ] ];
	return p.y < q.y + q.h && q.y < p.y + p.h && ( p.x + p.w <= q.x || q.x + q.w <= p.x );
};

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
	// A draft captured where nothing has a box (a form inside a closed modal or drawer: every box empty or zero-sized at every width)
	// cannot say whether a child sits beside the form, so the one child holding every control is the form, as when no box is read.
	const others = kids.filter( ( k ) => k !== holders[ 0 ] );
	const widths = [ ...new Set( kids.flatMap( ( k ) => Object.keys( k.box || {} ) ) ) ];
	const measurable = one && widths.some( ( w ) => measured( holders[ 0 ], w ) && others.some( ( k ) => measured( k, w ) ) );
	const beside = one && ( ! measurable || others.some( ( k ) => Object.keys( holders[ 0 ].box || {} ).some( ( w ) => besideAt( k, holders[ 0 ], w ) ) ) );
	return controls.some( ( e ) => CONTROLS.includes( e.tag ) ) && kids.length > 1 && beside ? holders[ 0 ] : root;
}
