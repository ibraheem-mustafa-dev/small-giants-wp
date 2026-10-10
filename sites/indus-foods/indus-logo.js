(() => {
  if (customElements.get('indus-logo')) return;
  const cache = {};
  const SRC = { horizontal: './assets/logo-horizontal-anim.svg', square: './assets/logo-square-anim.svg' };
  let uid = 0;
  const E = 'cubic-bezier(.16,.84,.32,1)', SPRING = 'cubic-bezier(.34,1.56,.64,1)';
  const rm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  class IndusLogo extends HTMLElement {
    static get observedAttributes() { return ['variant']; }
    connectedCallback() {
      this.style.display = this.style.display || 'block';
      this.setAttribute('role', 'img');
      if (!this.getAttribute('aria-label')) this.setAttribute('aria-label', 'Indus Foods Ltd');
      this.load();
      this._enter = () => this.play(true);
      this.addEventListener('mouseenter', this._enter);
    }
    disconnectedCallback() { this.removeEventListener('mouseenter', this._enter); if (this._io) this._io.disconnect(); }
    attributeChangedCallback() { if (this.isConnected) this.load(); }
    async load() {
      const v = this.getAttribute('variant') || 'horizontal';
      if (this._v === v) return; this._v = v;
      const url = SRC[v];
      if (!cache[url]) cache[url] = fetch(url).then((r) => r.text());
      let t = await cache[url];
      const p = 'il' + (++uid) + '_';
      t = t.replace(/<\?xml[^>]*>/, '').replace(/<metadata>[\s\S]*?<\/metadata>/, '')
        .replace(/\sid="([^"]+)"/g, (m, id) => ' id="' + p + id.replace(/\s+/g, '_') + '"')
        .replace(/url\(#([^)]+)\)/g, (m, id) => 'url(#' + p + id + ')')
        .replace(/xlink:href="#([^"]+)"/g, (m, id) => 'xlink:href="#' + p + id + '"');
      this.innerHTML = t;
      const svg = this.querySelector('svg');
      svg.removeAttribute('width'); svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'display:block;width:100%;height:100%;overflow:visible;';
      const q = (id) => svg.querySelector('#' + p + id);
      this._p = { spin: q('sunrays_spin'), expand: q('sunrays_expand'), mountain: q('Mountain_Block'), snow: q('snow'), road: q('darkpath'), text: q('logo_text') };
      [this._p.spin, this._p.expand].forEach((g) => { if (g && !g.hasAttribute('transform')) { g.style.transformBox = 'fill-box'; g.style.transformOrigin = '50% 50%'; } });
      if (this._p.spin && !rm()) this._spin = this._p.spin.animate([{ rotate: '0deg' }, { rotate: '360deg' }], { duration: 60000, iterations: Infinity });
      this._io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { this._io.disconnect(); this.play(false); } });
      this._io.observe(this);
    }
    play(hover) {
      const P = this._p; if (!P || rm()) return;
      if (hover) {
        if (this._busy) return; this._busy = true; setTimeout(() => (this._busy = false), 1400);
        if (this._spin) { this._spin.updatePlaybackRate(14); setTimeout(() => this._spin && this._spin.updatePlaybackRate(1), 900); }
        if (P.expand) P.expand.animate([{ scale: '1' }, { scale: '1.12' }, { scale: '1' }], { duration: 900, easing: SPRING });
        if (P.mountain) P.mountain.animate([{ translate: '0 0' }, { translate: '0 -24px' }, { translate: '0 0' }], { duration: 700, easing: E });
        if (P.text) [...P.text.children].forEach((c, i) => c.animate([{ translate: '0 0' }, { translate: '0 -40px' }, { translate: '0 0' }], { duration: 520, delay: i * 28, easing: E }));
        return;
      }
      if (P.expand) P.expand.animate([{ scale: '0', opacity: 0 }, { scale: '1', opacity: 1 }], { duration: 1200, delay: 150, easing: SPRING, fill: 'backwards' });
      if (P.mountain) P.mountain.animate([{ translate: '0 120px', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 1000, easing: E, fill: 'backwards' });
      if (P.snow) P.snow.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 650, easing: E, fill: 'backwards' });
      if (P.road) P.road.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 900, delay: 500, easing: E, fill: 'backwards' });
      if (P.text) [...P.text.children].forEach((c, i) => c.animate([{ opacity: 0, translate: '0 60px' }, { opacity: 1, translate: '0 0' }], { duration: 650, delay: 420 + i * 45, easing: E, fill: 'backwards' }));
    }
  }
  customElements.define('indus-logo', IndusLogo);
})();
