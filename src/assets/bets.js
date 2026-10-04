// Portfolio filters and "show more" toggles for /bets.
// Cards are rendered at build time; this only shows/hides them.
(function () {
  var form = document.querySelector('[data-filters]');
  var list = document.querySelector('[data-bets]');
  if (!form || !list) return;

  var cards = Array.prototype.slice.call(list.querySelectorAll('.bet'));
  var count = document.querySelector('[data-count]');
  var empty = document.querySelector('[data-empty]');
  var keys = ['status', 'fund', 'sector', 'stage'];

  function current() {
    var f = {};
    keys.forEach(function (k) { f[k] = form.elements[k].value; });
    return f;
  }

  function apply() {
    var f = current();
    var shown = 0;
    cards.forEach(function (card) {
      var match = keys.every(function (k) { return !f[k] || card.dataset[k] === f[k]; });
      card.hidden = !match;
      if (match) shown++;
    });
    count.textContent = 'Showing ' + shown + ' of ' + cards.length + ' startups';
    empty.hidden = shown !== 0;

    // Keep filters in the URL so a filtered view can be shared.
    var params = new URLSearchParams();
    keys.forEach(function (k) { if (f[k]) params.set(k, f[k]); });
    var qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  // Restore filters from the URL.
  var initial = new URLSearchParams(location.search);
  keys.forEach(function (k) {
    var v = initial.get(k);
    var select = form.elements[k];
    if (v && Array.prototype.some.call(select.options, function (o) { return o.value === v; })) {
      select.value = v;
    }
  });

  form.addEventListener('change', apply);
  form.addEventListener('reset', function () { setTimeout(apply, 0); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  apply();

  // Show more / less (descriptions are only clamped once JS is running).
  list.querySelectorAll('.bet__more').forEach(function (btn) {
    var desc = document.getElementById(btn.getAttribute('aria-controls'));
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      desc.classList.toggle('is-clamped', !open);
      btn.textContent = open ? 'Show less' : 'Show more';
    });
  });
})();
