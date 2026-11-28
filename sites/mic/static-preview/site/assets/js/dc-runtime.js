/*!
 * MIC site runtime (Small Giants Studio)
 * Renders the Design Component (.dc.html) pages in /dc with Preact.
 * Each page is: an <x-dc> template ({{holes}}, <sc-for>, <sc-if>, <dc-import>)
 * plus a `class Component extends DCLogic` script whose renderVals() feeds the template.
 */
(function () {
  'use strict';
  var P = window.preact;
  if (!P) { console.error('[MIC] Preact failed to load'); return; }
  var h = P.h, render = P.render, Component = P.Component, Fragment = P.Fragment;
  var me = document.currentScript;
  var BASE = (me && me.getAttribute('data-base')) || 'dc/';
  var registry = {}, loading = {};
  var BOOL = { checked: 1, disabled: 1, required: 1, selected: 1, readonly: 1, multiple: 1, hidden: 1, autofocus: 1, novalidate: 1 };
  var NOLIT = {};
  var HOLE = /\{\{([^}]+)\}\}/g;
  var WHOLE = /^\s*\{\{([^}]+)\}\}\s*$/;

  function literal(e) {
    e = e.trim();
    if (e === 'true') return true;
    if (e === 'false') return false;
    if (e === 'null') return null;
    if (e === 'undefined') return undefined;
    if (/^-?\d+(\.\d+)?$/.test(e)) return +e;
    if (/^(['"]).*\1$/.test(e)) return e.slice(1, -1);
    return NOLIT;
  }
  function lookup(expr, scope) {
    var lit = literal(expr);
    if (lit !== NOLIT) return lit;
    var parts = expr.trim().split('.'), head = parts[0], v, i;
    for (i = scope.length - 1; i >= 0; i--) {
      if (scope[i] && Object.prototype.hasOwnProperty.call(scope[i], head)) { v = scope[i][head]; break; }
    }
    for (i = 1; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function interp(str, scope) {
    var m = str.match(WHOLE);
    if (m) return lookup(m[1], scope);
    return str.replace(HOLE, function (_, e) { var v = lookup(e, scope); return v == null ? '' : String(v); });
  }
  function kids(node) { return Array.prototype.slice.call(node.childNodes); }
  function renderNodes(nodes, scope) {
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var r = renderNode(nodes[i], scope);
      if (Array.isArray(r)) { for (var j = 0; j < r.length; j++) out.push(r[j]); }
      else if (r != null) out.push(r);
    }
    return out;
  }
  function renderNode(n, scope) {
    if (n.nodeType === 3) {
      var t = n.nodeValue;
      if (t.indexOf('{{') < 0) return t;
      var tv = interp(t, scope);
      return tv == null ? '' : String(tv);
    }
    if (n.nodeType !== 1) return null;
    var tag = n.localName;
    if (tag === 'helmet') return null;
    if (tag === 'sc-for') {
      var list = interp(n.getAttribute('list') || '', scope);
      var as = n.getAttribute('as') || 'item', ch = kids(n), out = [];
      if (!Array.isArray(list)) return null;
      list.forEach(function (it, idx) { var fr = {}; fr[as] = it; fr.$index = idx; out = out.concat(renderNodes(ch, scope.concat([fr]))); });
      return out;
    }
    if (tag === 'sc-if') {
      return interp(n.getAttribute('value') || '', scope) ? renderNodes(kids(n), scope) : null;
    }
    if (tag === 'dc-import') {
      var C = registry[n.getAttribute('name')];
      if (!C) return null;
      var cp = {};
      Array.prototype.forEach.call(n.attributes, function (a) {
        if (a.name === 'name' || a.name.indexOf('hint-') === 0) return;
        cp[a.name.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); })] = a.value.indexOf('{{') >= 0 ? interp(a.value, scope) : a.value;
      });
      return h(C, cp);
    }
    var props = {};
    Array.prototype.forEach.call(n.attributes, function (a) {
      var name = a.name;
      if (name.indexOf('hint-') === 0) return;
      var v = a.value.indexOf('{{') >= 0 ? interp(a.value, scope) : a.value;
      if (BOOL[name] && v === '') v = true;
      if (name === 'ref') { if (typeof v === 'function') props.ref = v; return; }
      if (name.indexOf('on') === 0) { if (typeof v === 'function') props[name] = v; return; }
      props[name] = v;
    });
    return h.apply(null, [tag, props].concat(renderNodes(kids(n), scope)));
  }

  function DCLogic(props) { Component.call(this, props); }
  DCLogic.prototype = Object.create(Component.prototype);
  DCLogic.prototype.constructor = DCLogic;
  DCLogic.prototype.render = function () {
    var vals = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h.apply(null, [Fragment, null].concat(renderNodes(this.constructor.__tpl, [vals])));
  };

  function adoptHelmet(helmet) {
    Array.prototype.forEach.call(helmet.children, function (el) {
      var key = el.localName === 'link' ? 'link:' + el.getAttribute('href') : 'style:' + el.textContent;
      if (document.head.querySelector('[data-dc-key="' + CSS.escape(key) + '"]')) return;
      var c = document.createElement(el.localName);
      Array.prototype.forEach.call(el.attributes, function (a) { c.setAttribute(a.name, a.value); });
      c.textContent = el.textContent;
      c.setAttribute('data-dc-key', key);
      document.head.appendChild(c);
    });
  }

  function load(name) {
    if (loading[name]) return loading[name];
    loading[name] = fetch(BASE + name + '.dc.html', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('Could not load ' + name + ' (' + r.status + ')');
      return r.text();
    }).then(function (txt) {
      var doc = new DOMParser().parseFromString(txt, 'text/html');
      var xdc = doc.querySelector('x-dc');
      var helmet = xdc.querySelector('helmet');
      if (helmet) adoptHelmet(helmet);
      var code = doc.querySelector('script[data-dc-script]').textContent;
      var Comp = new Function('DCLogic', code + '\n;return Component;')(DCLogic);
      Comp.__tpl = kids(xdc);
      registry[name] = Comp;
      var deps = {};
      Array.prototype.forEach.call(xdc.querySelectorAll('dc-import'), function (e) { deps[e.getAttribute('name')] = 1; });
      return Promise.all(Object.keys(deps).map(load)).then(function () { return Comp; });
    });
    return loading[name];
  }

  function boot() {
    var mount = document.getElementById('app');
    if (!mount) return;
    var page = mount.getAttribute('data-page');
    load(page).then(function (Comp) {
      mount.innerHTML = '';
      render(h(Comp, {}), mount);
      if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(function () { t.scrollIntoView(); }, 300); }
    }).catch(function (err) {
      console.error('[MIC]', err);
      mount.innerHTML = '<p style="font:16px system-ui;padding:40px">Sorry, this page could not load. Please refresh.</p>';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
