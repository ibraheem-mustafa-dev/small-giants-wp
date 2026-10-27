/* Test store: the records every page reads. */
(function () {
  if (window.SHOPDATA) return;
  var A = 'assets/';
  var items = [
    { id: 'jar', name: 'Honey Jar', kind: 'build', blurb: 'Raw honey from one valley, poured to order in the size you pick.', from: 4, label: 'from £4', img: A + 'jar.png', gallery: [A + 'jar.png', A + 'jar-side.png'], tags: ['pantry', 'sweet'], origin: 'hills' },
    { id: 'box', name: 'Tea Box', kind: 'plain', blurb: 'Twelve loose-leaf teas in a tin box, posted through the letterbox.', from: 12, label: '£12', img: A + 'box.png', gallery: [A + 'box.png'], tags: ['gifts'], origin: 'coast' },
    { id: 'voucher', name: 'Gift Voucher', kind: 'amount', blurb: 'A voucher the person you give it to spends when they choose to.', from: 10, label: 'from £10', img: A + 'card.png', gallery: [A + 'card.png'], tags: ['gifts'], origin: 'coast' }
  ];
  var reviews = [
    { id: 'r1', name: 'Ann', stars: 5 },
    { id: 'r2', name: 'Bo', stars: 4 }
  ];
  var packs = [
    { n: 6, price: 4, tag: '' },
    { n: 12, price: 7.5, tag: 'Popular' }
  ];
  var grains = [{ id: 'fine', name: 'Fine set', dot: '#E8C468', add: 0 }, { id: 'coarse', name: 'Coarse set', dot: '#B8862B', add: 1 }];
  var toppings = [{ id: 'nuts', name: 'Nuts' }, { id: 'seeds', name: 'Seeds' }, { id: 'comb', name: 'Comb' }];
  var tagNames = [['all', 'All'], ['pantry', 'Pantry'], ['sweet', 'Sweet things'], ['gifts', 'Gifts']];
  var lines = [];
  window.SHOPDATA = {
    items: items, reviews: reviews, packs: packs, grains: grains, toppings: toppings, tagNames: tagNames,
    item: function (id) { return items.filter(function (p) { return p.id === id; })[0] || items[0]; },
    basket: { add: function (it) { lines.push(Object.assign({ qty: 1 }, it)); } }
  };
})();
