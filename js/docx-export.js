// ============================================================
//  WaxFrame — docx-export.js
//  Build: 20260529-015
//  Real .docx export for the help pages. Replaces the fragile
//  HTML-as-.doc approach (which only LINKED images, so Word showed
//  broken-image boxes). Builds a true OOXML .docx via the vendored
//  `docx` library (lib/docx.min.js → window.docx), walking the page's
//  content DOM into Word elements and EMBEDDING image bytes so the
//  file works offline and survives emailing. Dependency-free at
//  runtime (docx lib + JSZip are bundled in lib/docx.min.js).
//
//  Public: downloadPageAsDocx()  — wired to the help-page button.
//  Walks .doc-main (sidebar pages) or .page-main (simple pages).
// ============================================================

(function () {
  'use strict';

  // Page-content width to scale images into (px @ ~96dpi ≈ 6.25in usable).
  var MAX_IMG_W = 600;

  // ── Inline runs: text + bold/italic/code/links/breaks ──────────────
  function inlineRuns(el, opts) {
    var docx = window.docx;
    var TextRun = docx.TextRun;
    var runs = [];
    if (!el || !el.childNodes) return runs;
    el.childNodes.forEach(function (n) {
      if (n.nodeType === 3) {
        var t = n.textContent;
        if (t && t.length) {
          var cfg = Object.assign({ text: t }, opts);
          runs.push(new TextRun(cfg));
        }
        return;
      }
      if (n.nodeType !== 1) return;
      var tag = n.tagName.toLowerCase();
      if (tag === 'br') { runs.push(new TextRun({ break: 1 })); return; }
      if (tag === 'script' || tag === 'style' || tag === 'button') return;
      if (tag === 'strong' || tag === 'b') { push(runs, inlineRuns(n, Object.assign({}, opts, { bold: true }))); return; }
      if (tag === 'em' || tag === 'i') { push(runs, inlineRuns(n, Object.assign({}, opts, { italics: true }))); return; }
      if (tag === 'code' || tag === 'kbd' || tag === 'samp') {
        push(runs, inlineRuns(n, Object.assign({}, opts, { font: 'Courier New', shading: { fill: 'F0F0F0' } })));
        return;
      }
      // anchors, spans, and any other inline wrapper: keep the text.
      push(runs, inlineRuns(n, opts));
    });
    return runs;
  }
  function push(arr, items) { for (var i = 0; i < items.length; i++) arr.push(items[i]); }

  function textOf(el) { return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim(); }

  function isHidden(el) {
    var st = (el.getAttribute && el.getAttribute('style') || '').replace(/\s+/g, '').toLowerCase();
    if (st.indexOf('display:none') !== -1 || st.indexOf('visibility:hidden') !== -1) return true;
    if (el.classList && (el.classList.contains('doc-sidebar') || el.classList.contains('wh-back-top') ||
        el.classList.contains('nav-panel') || el.classList.contains('nav-backdrop'))) return true;
    return false;
  }

  // ── Table → docx Table ─────────────────────────────────────────────
  function buildTable(tableEl, imgMap) {
    var docx = window.docx;
    var b = { style: docx.BorderStyle.SINGLE, size: 4, color: '999999' };
    var borders = { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b };
    var rows = [];
    Array.prototype.forEach.call(tableEl.querySelectorAll('tr'), function (tr) {
      var cells = [];
      Array.prototype.forEach.call(tr.querySelectorAll('th,td'), function (td) {
        var isHead = td.tagName.toLowerCase() === 'th';
        var cellBlocks = [];
        blocksFromNode(td, cellBlocks, imgMap, { bold: isHead });
        if (!cellBlocks.length) cellBlocks.push(new docx.Paragraph({ children: inlineRuns(td, { bold: isHead }) }));
        cells.push(new docx.TableCell({
          children: cellBlocks,
          shading: isHead ? { fill: 'EFEFEF' } : undefined,
          margins: { top: 40, bottom: 40, left: 80, right: 80 }
        }));
      });
      if (cells.length) rows.push(new docx.TableRow({ children: cells }));
    });
    if (!rows.length) return null;
    return new docx.Table({ width: { size: 100, type: docx.WidthType.PERCENTAGE }, borders: borders, rows: rows });
  }

  // ── Block-level walk: emit Paragraph/Table/Image elements ──────────
  function blocksFromNode(node, out, imgMap, ctx) {
    var docx = window.docx;
    var H = docx.HeadingLevel;
    if (!node || !node.childNodes) return;
    node.childNodes.forEach(function (el) {
      if (el.nodeType === 3) {
        var t = el.textContent;
        if (t && t.trim()) out.push(new docx.Paragraph({ children: [new docx.TextRun(Object.assign({ text: t.trim() }, ctx))] }));
        return;
      }
      if (el.nodeType !== 1) return;
      var tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'button' || tag === 'noscript') return;
      if (isHidden(el)) return;
      var cl = el.classList || { contains: function () { return false; } };

      // Class-driven headings (WaxFrame help-page primitives).
      if (cl.contains('wh-section-icon')) return; // icon glyph; folded into title text elsewhere
      if (cl.contains('wh-section-title')) { out.push(new docx.Paragraph({ text: textOf(el), heading: H.HEADING_1 })); return; }
      if (cl.contains('wh-block-title')) { out.push(new docx.Paragraph({ text: textOf(el), heading: H.HEADING_2 })); return; }

      switch (tag) {
        case 'h1': out.push(new docx.Paragraph({ children: inlineRuns(el, ctx), heading: H.HEADING_1 })); return;
        case 'h2': out.push(new docx.Paragraph({ children: inlineRuns(el, ctx), heading: H.HEADING_2 })); return;
        case 'h3': out.push(new docx.Paragraph({ children: inlineRuns(el, ctx), heading: H.HEADING_3 })); return;
        case 'h4': case 'h5': case 'h6': out.push(new docx.Paragraph({ children: inlineRuns(el, ctx), heading: H.HEADING_4 })); return;
        case 'p': out.push(new docx.Paragraph({ children: inlineRuns(el, ctx), spacing: { after: 120 } })); return;
        case 'ul':
          Array.prototype.forEach.call(el.children, function (li) {
            if (li.tagName && li.tagName.toLowerCase() === 'li')
              out.push(new docx.Paragraph({ children: inlineRuns(li, ctx), bullet: { level: 0 } }));
          });
          return;
        case 'ol':
          var i = 1;
          Array.prototype.forEach.call(el.children, function (li) {
            if (li.tagName && li.tagName.toLowerCase() === 'li') {
              var runs = [new docx.TextRun({ text: (i++) + '.  ', bold: true })];
              push(runs, inlineRuns(li, ctx));
              out.push(new docx.Paragraph({ children: runs, indent: { left: 360, hanging: 360 } }));
            }
          });
          return;
        case 'table':
          var tbl = buildTable(el, imgMap);
          if (tbl) { out.push(tbl); out.push(new docx.Paragraph({ text: '' })); }
          return;
        case 'pre':
          out.push(new docx.Paragraph({
            children: [new docx.TextRun({ text: el.textContent || '', font: 'Courier New' })],
            shading: { fill: 'F4F4F4' }, spacing: { after: 120 }
          }));
          return;
        case 'blockquote':
          out.push(new docx.Paragraph({ children: inlineRuns(el, Object.assign({}, ctx, { italics: true })), indent: { left: 360 } }));
          return;
        case 'img':
          emitImage(el, out, imgMap);
          return;
        case 'br': case 'hr': return;
        default:
          // Container (div/section/header/span/etc.): recurse, but capture
          // a leading inline image inside an otherwise-block element.
          if (cl.contains('wh-warn') || cl.contains('wh-tip')) {
            // Callout: render its inner blocks with a light shaded paragraph feel.
            blocksFromNode(el, out, imgMap, ctx);
            return;
          }
          // If this node has a direct <img> child plus text, emitImage handles imgs in recursion.
          blocksFromNode(el, out, imgMap, ctx);
          return;
      }
    });
  }

  function emitImage(imgEl, out, imgMap) {
    var docx = window.docx;
    var src;
    try { src = new URL(imgEl.getAttribute('src'), document.baseURI).href; } catch (e) { return; }
    var info = imgMap.get(src);
    if (!info) return;
    out.push(new docx.Paragraph({
      children: [new docx.ImageRun({ type: info.type, data: info.data, transformation: { width: info.width, height: info.height } })],
      spacing: { after: 120 }
    }));
  }

  // ── Pre-fetch + embed all images (async) ───────────────────────────
  function prefetchImages(root) {
    var imgs = Array.prototype.slice.call(root.querySelectorAll('img[src]'));
    var map = new Map();
    return Promise.all(imgs.map(function (img) {
      var src;
      try { src = new URL(img.getAttribute('src'), document.baseURI).href; } catch (e) { return Promise.resolve(); }
      if (map.has(src)) return Promise.resolve();
      return fetch(src).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) {
        if (!ab) return;
        var type = /\.png(\?|$)/i.test(src) ? 'png'
                 : /\.jpe?g(\?|$)/i.test(src) ? 'jpg'
                 : /\.gif(\?|$)/i.test(src) ? 'gif'
                 : /\.bmp(\?|$)/i.test(src) ? 'bmp'
                 : 'png';
        var nw = img.naturalWidth || 0, nh = img.naturalHeight || 0;
        var w = nw || MAX_IMG_W, h = nh || Math.round((nw ? nw : MAX_IMG_W) * 0.6);
        if (w > MAX_IMG_W) { h = Math.round(h * (MAX_IMG_W / w)); w = MAX_IMG_W; }
        map.set(src, { data: new Uint8Array(ab), type: type, width: w, height: h });
      }).catch(function () { /* skip unfetchable image */ });
    })).then(function () { return map; });
  }

  // ── Public entry point ─────────────────────────────────────────────
  window.downloadPageAsDocx = async function downloadPageAsDocx() {
    if (!window.docx || !window.docx.Document) {
      if (typeof toast === 'function') toast('\u26a0\ufe0f Word export library not loaded \u2014 reload and try again');
      return;
    }
    var root = document.querySelector('.doc-main') || document.querySelector('.page-main');
    if (!root) { if (typeof toast === 'function') toast('\u26a0\ufe0f Nothing to export'); return; }
    if (typeof toast === 'function') toast('\u23f3 Building Word document\u2026');
    try {
      var docx = window.docx;
      var imgMap = await prefetchImages(root);
      var blocks = [new docx.Paragraph({ text: document.title || 'WaxFrame', heading: docx.HeadingLevel.TITLE })];
      blocksFromNode(root, blocks, imgMap, {});
      if (blocks.length < 2) blocks.push(new docx.Paragraph({ text: '' }));
      var doc = new docx.Document({
        styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
        sections: [{ properties: {}, children: blocks }]
      });
      var blob = await docx.Packer.toBlob(doc);
      var safe = (document.title || 'WaxFrame').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'WaxFrame';
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = safe + '.docx';
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { document.body.removeChild(a); } catch (e) {} URL.revokeObjectURL(url); }, 1000);
      if (typeof toast === 'function') toast('\u2705 Word document downloaded');
    } catch (e) {
      console.error('[docx-export] failed:', e);
      if (typeof toast === 'function') toast('\u26a0\ufe0f Word export failed \u2014 see console');
    }
  };
})();
