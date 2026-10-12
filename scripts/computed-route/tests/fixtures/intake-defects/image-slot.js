// A stand-in for Claude Design's image-slot element: a drop target that shows its placeholder label. The runtime may
// run a helmet script more than once, so it defines the element once.
( () => {
  if ( customElements.get( 'image-slot' ) ) {
    return;
  }
  customElements.define( 'image-slot', class extends HTMLElement {
    connectedCallback() {
      this.textContent = this.getAttribute( 'placeholder' ) || '';
    }

    startDrag() {
      setTimeout( () => {}, 5 );
    }
  } );
} )();
