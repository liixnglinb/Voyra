(function () {
      var REPO = 'liixnglinb/AI-Chronicle';
      var GH = 'https://github.com/' + REPO + '/releases';
      var MIRRORS = ['https://gh-proxy.com/', 'https://ghfast.top/'];
      var fallback = '0.6.8';

      /* hero chart bars */
      var bars = [34,52,41,68,49,86,63,77,56,91,69,83,58,74,46,88,65,79];
      var hot = [5, 9, 14];
      document.getElementById('win-chart').innerHTML = bars.map(function (h, i) {
        return '<i class="' + (hot.indexOf(i) >= 0 ? 'is-hot' : '') + '" style="height:' + h + '%;--i:' + i + '"></i>';
      }).join('');

      /* source ticker (12 sources, duplicated for seamless loop) */
      var sources = [
        ['Claude Code', '#D97757'], ['Codex', '#10A37F'], ['ZCode', '#7C6BF0'],
        ['OpenCode', '#3B9EFF'], ['WorkBuddy', '#2F9E77'], ['WorkBuddy AI', '#5BB98C'],
        ['CatPaw', '#F2B33D'], ['MHAgent', '#8B7CF6'], ['织流 Loom', '#3D8BFD'],
        ['Hermes', '#E8A33D'], ['Agnes', '#4FC3A1'], ['DSH', '#5B8DEF']
      ];
      var ticks = sources.map(function (s) {
        return '<span class="tick"><i style="--c:' + s[1] + '"></i>' + s[0] + '</span>';
      }).join('');
      document.getElementById('ticker-track').innerHTML = ticks + ticks;

      /* release data */
      function fmtSize(bytes) {
        if (!bytes) return null;
        return Math.round(bytes / 1048576);
      }
      function setLinks(prefix) {
        var file = prefix === 'Setup' ? 'AI-Chronicle-Setup.exe' : 'AI-Chronicle-Portable.exe';
        var base = GH + '/latest/download/' + file;
        document.getElementById('download-' + (prefix === 'Setup' ? 'setup' : 'portable')).href = base;
        MIRRORS.forEach(function (m, i) {
          document.getElementById('mirror-' + (prefix === 'Setup' ? 'setup' : 'portable') + '-' + (i + 1)).href = m + base;
        });
      }
      function applyVersion(version, assets) {
        version = String(version || fallback).replace(/^v/i, '');
        document.getElementById('version-pill').textContent = 'v' + version;
        document.getElementById('download-version').textContent = 'v' + version;
        document.getElementById('window-version').textContent = 'v' + version;
        document.title = 'AI 轨迹 v' + version + ' · 本地 AI 工作观测台 — Voyra';
        var setup = (assets || []).find(function (a) { return /Setup\.exe$/i.test(a.name || ''); });
        var portable = (assets || []).find(function (a) { return /Portable\.exe$/i.test(a.name || ''); });
        if (setup) {
          var s = fmtSize(setup.size);
          document.getElementById('setup-size').textContent = s;
          document.getElementById('hero-size').textContent = s + ' MB';
        }
        if (portable) document.getElementById('portable-size').textContent = fmtSize(portable.size);
        if (setup && setup.url) setLinks('Setup');
        if (portable && portable.url) setLinks('Portable');
      }
      fetch('/ac-api/latest', { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.version) applyVersion(d.version, d.assets); })
        .catch(function () {
          setLinks('Setup'); setLinks('Portable');
        });

      /* reveal on scroll */
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });

      /* count-up */
      var counted = false;
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting || counted) return;
          counted = true;
          document.querySelectorAll('[data-count]').forEach(function (el) {
            var end = parseInt(el.dataset.count, 10) || 0;
            var t0 = null;
            function tick(t) {
              if (!t0) t0 = t;
              var p = Math.min((t - t0) / 1100, 1);
              el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
              if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
          });
        });
      }, { threshold: 0.4 });
      var stats = document.querySelector('.hero-stats');
      if (stats) cio.observe(stats);

      /* spotlight on cards */
      document.addEventListener('pointermove', function (ev) {
        var card = ev.target.closest('.spot');
        if (!card) return;
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
        card.style.setProperty('--my', (ev.clientY - r.top) + 'px');
      }, { passive: true });
    })();
