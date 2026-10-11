/* Mama's Munches prototype store: catalogue, basket, bake schedule. Shared by every page. */
(function () {
  if (window.MM) return;
  var LS = 'mm_cart_v2', LSG = 'mm_gift_v2', LSO = 'mm_order_v2', LSA = 'mm_account_v1', LSOS = 'mm_orders_v1', A = 'assets/';

  var sizes = [
    { n: 8, price: 9.5, each: '£1.19 each', tag: '' },
    { n: 20, price: 21.5, each: '£1.08 each', tag: 'Most popular' },
    { n: 40, price: 38, each: '£0.95 each', tag: 'Best value' }
  ];
  var flavours = [
    { id: 'classic', name: 'Classic Oat & Choc Chip', dot: '#C8925E', note: 'The original' },
    { id: 'strawberry', name: 'Strawberry & Milk Choc', dot: '#EE8088', note: 'A favourite' },
    { id: 'marshmallow', name: 'Marshmallow & Raisin', dot: '#F4E4C6', note: '' },
    { id: 'chocolate', name: 'Double Chocolate', dot: '#6B4130', note: '' },
    { id: 'vegan', name: 'Vegan Oat & Dark Choc', dot: '#8C9A5E', note: 'No eggs or dairy' }
  ];
  var products = [
    { id: 'zookies', name: 'Zookies', kind: 'zookies', short: 'Our giant lactation cookie, baked to order in the flavour you pick.', from: 9.5, priceLabel: 'from £9.50', unit: '£1.19 a cookie', img: A + 'photo-pair-love.jpg', gallery: [A + 'photo-pair-love.jpg', A + 'photo-bags-pink.jpg', A + 'photo-hero-mug.jpg', A + 'photo-tray-love.jpg'], badge: 'Build your own', cats: ['zookies', 'vegan', 'subscribe'], occ: ['born', 'far', 'forty'], cta: 'Choose flavour' },
    { id: 'trial', name: 'Taster Trio', kind: 'simple', short: '3 Classic Zookies to try. Postage included, fits through the letterbox.', from: 5, priceLabel: '£5', unit: 'postage included', img: A + 'photo-bun-case.jpg', gallery: [A + 'photo-bun-case.jpg', A + 'photo-pair-love.jpg'], badge: 'New? Start here', cats: ['trial'], occ: ['far', 'born'], cta: 'Add to basket' },
    { id: 'giftbox', name: 'New Baby Gift Box', kind: 'simple', short: 'A mix of Zookies in a gift box, sent with your message.', from: 15, priceLabel: '£15', unit: 'gift-boxed', img: A + 'photo-gift-heart.jpg', gallery: [A + 'photo-gift-heart.jpg', A + 'photo-hero-mug.jpg', A + 'photo-tray-love.jpg'], badge: 'Gift favourite', cats: ['gifts'], occ: ['born', 'hospital', 'far', 'shower'], cta: 'Add to basket' },
    { id: 'care40', name: '40-Day Care Bundle', kind: 'simple', short: 'Six weekly deliveries for the 40-day postnatal window.', from: 42, priceLabel: '£42', unit: '6 deliveries', img: A + 'photo-hero-mug.jpg', gallery: [A + 'photo-hero-mug.jpg', A + 'photo-bags-pink.jpg'], badge: 'Most thoughtful', cats: ['gifts', 'bundles'], occ: ['forty', 'born', 'far'], cta: 'Add to basket' },
    { id: 'giftcard', name: 'Baby Shower Gift Card', kind: 'card', short: 'Give it at the shower. She redeems it once baby arrives, so every cookie is fresh.', from: 15, priceLabel: 'from £15', unit: '£15 · £25 · £40', img: A + 'logo-round.png', fit: 'contain', imgBg: '#F9D5D3', gallery: [A + 'logo-round.png'], badge: 'For baby showers', cats: ['gifts'], occ: ['shower'], cta: 'Choose amount' }
  ];
  var reviews = [
    { name: 'KA', date: 'June 2026', title: 'Healthy and filling snack', text: 'I received the strawberry and milk chocolate chip cookies. I gave half of them to my SIL, who is also postpartum. They were fresh, soft and delicious! … I think these would be lovely to gift a new Mum.' },
    { name: 'mariahzaini', date: 'January 2026', title: 'Sweet, soft, addictive', text: 'Sweet, soft oat cookies that are seriously addictive—and perfect for a lactating mum who’s constantly hungry. … The cookies are generously sized, so one was usually enough to keep me full.' },
    { name: 'Mrs MIM', date: 'January 2026', title: 'Works like magic!', text: 'I was gifted these lactation cookies right after giving birth … They were such a comforting treat during those early postpartum days and made me feel really supported as a new mum.' },
    { name: 'Tamanna', date: 'July 2026', title: 'I met Mama’s Munches at the Summer Souk', text: 'The cookies were absolutely delicious! I had my stall next to hers and I swear I ate half of her strawberry and chocolate cookies ahaha! … What a treat for postpartum mums' },
    { name: 'Lisha Mehmood', date: 'July 2026', title: 'Such a healthy and yummy treat', text: 'We bought the marshmallow and raisin one and my little one absolutely demolished them! Will deffo be buying more in the future!' },
    { name: 'R B', date: 'February 2026', title: 'Soo delicious and filling', text: 'The cookies were soo delicious and filling! I have nearly finished half the box and I only bought them two days ago!' }
  ];
  var occasions = [
    { id: 'shower', name: 'Baby shower' },
    { id: 'born', name: 'Just had a baby' },
    { id: 'far', name: 'Sending love from afar' },
    { id: 'forty', name: 'The first 40 days' }
  ];
  var methods = {
    t48: { id: 't48', name: 'Royal Mail Tracked 48', eta: 'Arrives 2–3 days after the bake', price: 3.95 },
    t24: { id: 't24', name: 'Royal Mail Tracked 24', eta: 'Arrives the day after the bake', price: 5.45 }
  };
  var FREE = 35;
  var builder = {
    bases: [{ id: 'oat', name: 'Classic oat', dot: '#D9A86C' }, { id: 'vegan', name: 'Vegan oat', dot: '#CDAA72', note: 'No eggs or dairy' }],
    chips: [{ id: 'milk', name: 'Milk choc' }, { id: 'white', name: 'White choc' }, { id: 'dark', name: 'Dark choc' }, { id: 'none', name: 'No chips' }],
    flavours: [{ id: 'vanilla', name: 'Vanilla', c: '#F6E7B8' }, { id: 'chocolate', name: 'Chocolate', c: '#5A3522' }, { id: 'strawberry', name: 'Strawberry', c: '#E8505B' }, { id: 'mango', name: 'Mango', c: '#F5A623' }, { id: 'banana', name: 'Banana', c: '#F4D35E' }, { id: 'coffee', name: 'Coffee', c: '#8A5A3B' }, { id: 'mint', name: 'Mint', c: '#8FD1A8' }, { id: 'caramel', name: 'Caramel', c: '#C98A3A' }, { id: 'coconut', name: 'Coconut', c: '#FFFFFF' }, { id: 'pistachio', name: 'Pistachio', c: '#9DBF6B' }, { id: 'honey', name: 'Honey', c: '#E8B230' }]
  };
  var subscribe = { freqs: [{ w: 2, label: 'Every 2 weeks' }, { w: 4, label: 'Every 4 weeks' }], off: 0.1, perks: ['10% off every box', 'Free delivery on 20 and 40 packs', 'A guaranteed slot in every bake', 'Skip, swap flavours or cancel online'] };

  function read(k, f) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? f : v; } catch (e) { return f; } }
  function emit() { window.dispatchEvent(new CustomEvent('mm:cart')); }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} emit(); }
  function money(n) { return '£' + (Math.round(n * 100) / 100).toFixed(2); }
  function short(n) { return n % 1 ? money(n) : '£' + n; }

  var DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmt(d) { return DN[d.getDay()] + ' ' + d.getDate() + ' ' + MN[d.getMonth()]; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fromIso(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function bakeOf(b) { return { date: fmt(b), dow: DN[b.getDay()], day: b.getDate(), mon: MN[b.getMonth()], orderBy: fmt(addDays(b, -1)) + ', 8pm', arrive: fmt(addDays(b, 2)), iso: iso(b) }; }
  function bakes(n) {
    var now = new Date(), day = now.getDay(), add = (8 - day) % 7 || 7;
    if (day === 0 && now.getHours() >= 20) add = 8;
    var first = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), add), out = [];
    for (var i = 0; i < (n || 1); i++) {
      out.push(Object.assign({ i: i }, bakeOf(addDays(first, i * 7))));
    }
    return out;
  }

  function eta() { return 'in 3–5 days'; }
  var cart = {
    items: function () { return read(LS, []); },
    count: function () { return cart.items().reduce(function (a, x) { return a + x.qty; }, 0); },
    subtotal: function () { return cart.items().reduce(function (a, x) { return a + x.qty * x.price; }, 0); },
    add: function (it) {
      var items = cart.items(), ex = items.filter(function (x) { return x.key === it.key; })[0];
      if (ex) ex.qty += it.qty || 1; else items.push(Object.assign({ qty: 1 }, it));
      write(LS, items);
    },
    setQty: function (key, q) {
      var items = cart.items().map(function (x) { if (x.key === key) x.qty = q; return x; }).filter(function (x) { return x.qty > 0; });
      write(LS, items);
    },
    remove: function (key) { cart.setQty(key, 0); },
    clear: function () { write(LS, []); },
    gift: function () { return read(LSG, { on: false, to: '', message: '', from: '', hide: true, wrap: false }); },
    setGift: function (p) { write(LSG, Object.assign(cart.gift(), p)); },
    seed: function () {
      if (localStorage.getItem('mm_seeded_v2')) return;
      localStorage.setItem('mm_seeded_v2', '1');
      write(LS, [
        { key: 'zookies-20-oat-milk-strawberry', id: 'zookies', name: 'Zookies · 20 pack', variant: 'Oat · Milk choc · Strawberry', price: 21.5, qty: 1, img: A + 'photo-pair-love.jpg' },
        { key: 'trial', id: 'trial', name: 'Taster Trio', variant: '3 Classic Zookies', price: 5, qty: 1, img: A + 'photo-bun-case.jpg' }
      ]);
    }
  };

  function delivery(method, sub) {
    var m = methods[method || 't48'];
    var onlyTrial = cart.items().length && cart.items().every(function (x) { return x.id === 'trial' || x.id === 'giftcard'; });
    if (m.id === 't48' && (sub >= FREE || onlyTrial)) return 0;
    return m.price;
  }

  function demoAccount(email) {
    var b = bakes(1)[0];
    return {
      signedIn: true, first: 'Aisha', last: 'Khan', email: email || 'aisha@example.com', phone: '07700 900123', marketing: true,
      addresses: [
        { id: 'a1', name: 'Aisha Khan', line1: '12 Rose Lane', line2: '', town: 'Birmingham', postcode: 'B13 9AB', def: true },
        { id: 'a2', name: 'Sara Ahmed', line1: '4 Elm Court', line2: 'Flat 2', town: 'Leicester', postcode: 'LE2 1QT', def: false }
      ],
      subs: [{ id: 's1', name: 'Zookies · 20 pack', variant: 'Classic oat · milk choc chips · strawberry & mango', price: 19.35, freq: 4, nextIso: b.iso, status: 'active', skipped: false, img: A + 'photo-pair-love.jpg' }]
    };
  }
  function demoOrders() {
    var mon = fromIso(bakes(1)[0].iso);
    var past = function (no, weeks, items, total) { var b = addDays(mon, -7 * weeks); return { no: no, placed: fmt(addDays(b, -2)), bake: bakeOf(b), items: items, total: total, delivery: 0, method: 't48', status: 'delivered', gift: { on: false }, address: { name: 'Aisha Khan', line1: '12 Rose Lane', line2: '', town: 'Birmingham', postcode: 'B13 9AB' } }; };
    return [
      past('MM-1031', 2, [{ key: 'z', name: 'Zookies · 20 pack', variant: 'Classic oat · milk choc chips · strawberry & mango · every 4 weeks', qty: 1, price: 19.35, img: A + 'photo-pair-love.jpg' }], 19.35),
      past('MM-1012', 6, [{ key: 'g', name: 'New Baby Gift Box', variant: 'gift-boxed', qty: 1, price: 15, img: A + 'photo-gift-heart.jpg' }, { key: 't', name: 'Taster Trio', variant: '3 Classic Zookies', qty: 2, price: 5, img: A + 'photo-bun-case.jpg' }], 28.95)
    ];
  }
  var account = {
    get: function () { return read(LSA, null); },
    signedIn: function () { var a = account.get(); return !!(a && a.signedIn); },
    update: function (p) { var a = account.get(); if (a) write(LSA, Object.assign(a, p)); },
    register: function (p) { var a = { signedIn: true, first: p.first || '', last: p.last || '', email: p.email || '', phone: '', marketing: !!p.marketing, addresses: [], subs: [] }; write(LSA, a); localStorage.setItem(LSOS, '[]'); return a; },
    signIn: function (email) { var a = account.get(); if (!a) { a = demoAccount(email); localStorage.setItem(LSOS, JSON.stringify(demoOrders())); } a.signedIn = true; write(LSA, a); return a; },
    signOut: function () { account.update({ signedIn: false }); },
    setSub: function (id, p) { var a = account.get(); if (!a) return; a.subs = a.subs.map(function (s) { return s.id === id ? Object.assign(s, p) : s; }); write(LSA, a); },
    orders: function () { return read(LSOS, []); },
    order: function (no) { return account.orders().filter(function (o) { return o.no === no; })[0] || null; }
  };

  window.MM = {
    sizes: sizes, flavours: flavours, products: products, reviews: reviews, occasions: occasions, methods: methods, FREE: FREE,
    builder: builder, subscribe: subscribe, eta: eta, cart: cart, money: money, short: short, bakes: bakes, delivery: delivery, account: account,
    fmtIso: function (s) { return fmt(fromIso(s)); }, addWeeksIso: function (s, w) { return iso(addDays(fromIso(s), 7 * w)); }, bakeOn: function (s) { return bakeOf(fromIso(s)); },
    product: function (id) { return products.filter(function (p) { return p.id === id; })[0] || products[0]; },
    qs: function (k) { return new URLSearchParams(location.search).get(k); },
    on: function (cb) { window.addEventListener('mm:cart', cb); window.addEventListener('storage', cb); return function () { window.removeEventListener('mm:cart', cb); window.removeEventListener('storage', cb); }; },
    openBasket: function () { window.dispatchEvent(new CustomEvent('mm:open-basket')); },
    order: function () { return read(LSO, null); },
    placeOrder: function (o) {
      o.no = 'MM-' + (1040 + Math.floor(Math.random() * 900)); o.bake = bakes(1)[0]; o.items = cart.items(); o.gift = cart.gift(); o.placed = fmt(new Date()); o.status = 'placed';
      if (o.createAccount) account.register(o.createAccount);
      var a = account.get();
      if (a && a.signedIn) {
        o.account = true;
        var subs = o.items.filter(function (x) { return /-sub\d+$/.test(x.key); }).map(function (x, i) { var w = +x.key.match(/-sub(\d+)$/)[1]; return { id: 's' + Date.now() + i, name: x.name, variant: x.variant.replace(/ · every \d+ weeks$/, ''), price: x.price, freq: w, nextIso: iso(addDays(fromIso(o.bake.iso), 7 * w)), status: 'active', skipped: false, img: x.img }; });
        if (subs.length) account.update({ subs: a.subs.concat(subs) });
        localStorage.setItem(LSOS, JSON.stringify([o].concat(account.orders())));
      }
      localStorage.setItem(LSO, JSON.stringify(o)); cart.clear(); return o;
    }
  };
  window.dispatchEvent(new CustomEvent('mm:ready'));
})();
