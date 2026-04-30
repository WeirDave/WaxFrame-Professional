// ============================================================
//  WaxFrame — docs-scrollspy.js
//  Shared scroll-spy for documentation pages (manual + playbooks).
//  Watches every section the sidebar links to and highlights the
//  link for the section nearest the top of the viewport.
//
//  Pages opt in by:
//    1. Using a .doc-sidebar aside with .doc-sidebar-link anchors
//    2. Loading this file AFTER theme.js / version.js
//
//  Pages with no .doc-sidebar (e.g. api-details, what-are-tokens)
//  no-op safely.
// ============================================================
(function () {
  'use strict';

  function init() {
    const sidebar = document.querySelector('.doc-sidebar');
    if (!sidebar) return;  // page doesn't use the sidebar pattern — no-op

    // Only track in-page anchors. External links (e.g. "API Key Guide ↗"
    // with href="api-details.html") have no leading '#' and are ignored.
    const links = Array.from(sidebar.querySelectorAll('a[href^="#"]'));
    const linkByTarget = new Map();

    links.forEach(link => {
      const id = link.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target) linkByTarget.set(target, link);
    });

    if (linkByTarget.size === 0) return;

    const intersecting = new Set();

    function clearActive() {
      links.forEach(l => l.classList.remove('is-active'));
    }

    function updateActive() {
      clearActive();
      if (intersecting.size === 0) return;
      // When multiple sections are on screen simultaneously (short
      // sections stacked), pick the one nearest the top — that's what
      // the reader is actually reading.
      const topmost = Array.from(intersecting).sort(function (a, b) {
        return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
      })[0];
      const link = linkByTarget.get(topmost);
      if (link) link.classList.add('is-active');
    }

    // rootMargin pulls the "active band" down 120px from the top
    // (clears the sticky page header) and crops the bottom 60% so a
    // section becomes active when its top enters the upper 40% of the
    // viewport — that matches reading position, not first-pixel-visible.
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) intersecting.add(entry.target);
        else intersecting.delete(entry.target);
      });
      updateActive();
    }, {
      rootMargin: '-120px 0px -60% 0px',
      threshold: 0
    });

    linkByTarget.forEach(function (_link, target) {
      observer.observe(target);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
