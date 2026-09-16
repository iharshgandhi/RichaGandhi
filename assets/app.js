'use strict';

var WA = 'https://wa.me/919767220055';

var $ = function (id) { return document.getElementById(id); };
var grid = $('grid'), hero = $('hero'), viewHead = $('view-head');
var backBtn = $('back'), menuBtn = $('menu'), drawer = $('drawer'), scrim = $('scrim');
var drawerList = $('drawer-list');
var lb = $('lb'), lbStage = lb.querySelector('.lb__stage'), lbImg = $('lb-img'), lbCount = $('lb-count');

var manifest = null;
var bySlug = {};
var current = null;      // active category, null on home
var lbItems = [];
var lbIndex = 0;
var lastFocus = null;

// Deep link (#/bridal) on a cold load: hide the home hero before first paint.
if (location.hash.replace(/^#\/?/, '')) hero.hidden = true;

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function altText(item, category) {
  var name = item.full.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
  return name + ' - ' + category.name + ' mehendi design';
}

function countLabel(category) {
  var count = category.images.length;
  if (!count) return 'photos coming soon';
  return count + (count === 1 ? ' design' : ' designs');
}

function photo(item, category, lazy) {
  var img = el('img', 'tile__img');
  img.src = encodePath(item.thumb);
  img.width = item.w;
  img.height = item.h;
  img.alt = altText(item, category);
  img.decoding = 'async';
  img.loading = lazy ? 'lazy' : 'eager';
  if (!lazy) img.fetchPriority = 'high';
  return img;
}

/* ---------- views ---------- */

function homeTile(category, index) {
  var link = el('a', 'tile');
  link.href = '#/' + category.slug;
  link.setAttribute('aria-label', category.name + ', ' + countLabel(category));
  if (category.cover === null) {
    var blank = el('div', 'tile__blank');
    blank.appendChild(el('span', null, '\u2740'));
    link.appendChild(blank);
  } else {
    link.appendChild(photo(category.images[category.cover], category, index > 1));
  }
  link.appendChild(el('span', 'tile__label', category.name));
  link.addEventListener('click', function () {
    document.documentElement.dataset.cameFrom = 'home';
  });
  return link;
}

function galleryTile(item, category, index) {
  var button = el('button', 'tile');
  button.type = 'button';
  button.appendChild(photo(item, category, index > 3));
  button.addEventListener('click', function () { openLightbox(index); });
  return button;
}

function renderHome() {
  hero.hidden = false;
  viewHead.textContent = '';
  document.title = 'Richa Gandhi \u2014 Freelance Mehendi Artist';
  grid.textContent = '';
  manifest.categories.forEach(function (category, index) {
    grid.appendChild(homeTile(category, index));
  });
}

function renderCategory(category) {
  hero.hidden = true;
  document.title = category.name + ' \u2014 Richa Gandhi Mehendi';
  viewHead.textContent = '';
  viewHead.appendChild(el('h1', null, category.name));
  var count = category.images.length;
  if (count) viewHead.appendChild(el('p', null, countLabel(category)));
  grid.textContent = '';
  if (!count) {
    grid.appendChild(el('p', 'empty', 'Photos coming soon. Message on WhatsApp and samples will be sent right away.'));
    return;
  }
  category.images.forEach(function (item, index) {
    grid.appendChild(galleryTile(item, category, index));
  });
}

function renderMissing() {
  hero.hidden = true;
  viewHead.textContent = '';
  document.title = 'Not found \u2014 Richa Gandhi Mehendi';
  grid.textContent = '';
  var text = el('p', 'empty');
  text.appendChild(document.createTextNode('That style does not exist. '));
  var link = el('a', null, 'See all styles');
  link.href = '#/';
  text.appendChild(link);
  grid.appendChild(text);
}

function setBack(show) {
  backBtn.classList.toggle('hdr__btn--off', !show);
}

/* ---------- router ---------- */

function route() {
  var slug = decodeURIComponent((location.hash || '').replace(/^#\/?/, '')).trim();
  var category = slug ? bySlug[slug] : null;
  current = category || null;
  setBack(!!category);
  if (slug && !category) renderMissing();
  else if (category) renderCategory(category);
  else renderHome();
  markDrawer();
  window.scrollTo(0, 0);
}

/* ---------- drawer ---------- */

function buildDrawer() {
  manifest.categories.forEach(function (category) {
    var item = el('li');
    var link = el('a', null, category.name);
    link.href = '#/' + category.slug;
    link.dataset.slug = category.slug;
    link.addEventListener('click', function () { setDrawer(false); });
    item.appendChild(link);
    drawerList.appendChild(item);
  });
}

function markDrawer() {
  var links = drawerList.querySelectorAll('a');
  for (var i = 0; i < links.length; i++) {
    if (current && links[i].dataset.slug === current.slug) links[i].setAttribute('aria-current', 'true');
    else links[i].removeAttribute('aria-current');
  }
}

// The drawer and the lightbox both lock scrolling; keep them in sync.
function syncLock() {
  var locked = drawer.classList.contains('is-open') || !lb.hidden;
  document.body.classList.toggle('is-locked', locked);
}

function setDrawer(open) {
  drawer.classList.toggle('is-open', open);
  drawer.inert = !open;
  scrim.hidden = !open;
  menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  syncLock();
  if (open) {
    var first = drawerList.querySelector('a');
    if (first) first.focus();
  } else if (drawer.contains(document.activeElement)) {
    menuBtn.focus();
  }
}

/* ---------- lightbox ---------- */

function openLightbox(index) {
  lbItems = current.images;
  lb.classList.toggle('lb--single', lbItems.length < 2);
  lastFocus = document.activeElement;
  lb.hidden = false;
  syncLock();
  showPhoto(index);
  $('lb-x').focus();
}

function closeLightbox() {
  lb.hidden = true;
  lbImg.removeAttribute('src');
  delete lbStage.dataset.loading;
  syncLock();
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function showPhoto(index) {
  lbIndex = (index + lbItems.length) % lbItems.length;
  var item = lbItems[lbIndex];
  lbStage.dataset.loading = 'true';
  lbImg.width = item.fw;      // reserves the real aspect ratio, no jump when it lands
  lbImg.height = item.fh;
  lbImg.alt = altText(item, current);
  lbImg.src = encodePath(item.full);
  lbCount.textContent = (lbIndex + 1) + ' / ' + lbItems.length;
}

function step(delta) {
  showPhoto(lbIndex + delta);
}

/* ---------- wiring ---------- */

lbImg.addEventListener('load', function () { delete lbStage.dataset.loading; });
lbImg.addEventListener('error', function () { delete lbStage.dataset.loading; });

var touchX = 0, touchY = 0;
lb.addEventListener('touchstart', function (event) {
  touchX = event.changedTouches[0].clientX;
  touchY = event.changedTouches[0].clientY;
}, { passive: true });
lb.addEventListener('touchend', function (event) {
  var dx = event.changedTouches[0].clientX - touchX;
  var dy = event.changedTouches[0].clientY - touchY;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
}, { passive: true });

$('lb-x').addEventListener('click', closeLightbox);
$('lb-prev').addEventListener('click', function () { step(-1); });
$('lb-next').addEventListener('click', function () { step(1); });

menuBtn.addEventListener('click', function () {
  setDrawer(!drawer.classList.contains('is-open'));
});
scrim.addEventListener('click', function () { setDrawer(false); });

backBtn.addEventListener('click', function () {
  if (document.documentElement.dataset.cameFrom === 'home') history.back();
  else location.hash = '#/';
});

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    if (!lb.hidden) closeLightbox();
    else if (drawer.classList.contains('is-open')) setDrawer(false);
    return;
  }
  if (lb.hidden) return;
  if (event.key === 'ArrowLeft') step(-1);
  else if (event.key === 'ArrowRight') step(1);
});

window.addEventListener('hashchange', route);

/* ---------- boot ---------- */

function skeleton() {
  var frag = document.createDocumentFragment();
  for (var i = 0; i < 6; i++) frag.appendChild(el('div', 'skel'));
  return frag;
}

function boot() {
  $('year').textContent = new Date().getFullYear();
  grid.appendChild(skeleton());

  // Relative to index.html: safe under /RichaGandhi/ now and at the apex later.
  fetch('data/manifest.json')
    .then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(function (data) {
      manifest = data;
      data.categories.forEach(function (category) { bySlug[category.slug] = category; });
      buildDrawer();
      grid.removeAttribute('aria-busy');
      route();
    })
    .catch(function (error) {
      grid.removeAttribute('aria-busy');
      grid.textContent = '';
      var text = el('p', 'empty');
      text.appendChild(document.createTextNode('Could not load the gallery (' + error.message + '). '));
      var link = el('a', null, 'Message on WhatsApp');
      link.href = WA;
      text.appendChild(link);
      text.appendChild(document.createTextNode(' and samples will be sent right away.'));
      grid.appendChild(text);
    });
}

boot();
