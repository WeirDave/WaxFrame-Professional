// ============================================================
//  WaxFrame — docx-export.js
// Build: 20260616-004
//  Real .docx export for helper/document pages. Builds a true
//  OOXML document through the vendored `docx` library, walking
//  WaxFrame's page primitives into Word paragraphs, tables,
//  callouts, and embedded images.
// ============================================================

(function () {
  'use strict';

  var MAX_IMG_W = 560;
  var MAX_SECTION_IMG_W = 220;
  var MAX_ICON_IMG_W = 42;
  var COLOR_TEXT = '111111';
  var COLOR_DIM = '444444';
  var COLOR_ACCENT = 'B87A00';
  var COLOR_BLUE = '1E5BB0';
  var COLOR_BORDER = 'C9A23A';

  function docxLib() { return window.docx; }

  function push(arr, items) {
    for (var i = 0; i < items.length; i++) arr.push(items[i]);
  }

  function textOf(el) {
    return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim();
  }

  function normalizeSpace(s) {
    return String(s || '').replace(/\s+/g, ' ');
  }

  function hasText(el) {
    return !!textOf(el);
  }

  function hasBlockChild(el) {
    if (!el || !el.children) return false;
    for (var i = 0; i < el.children.length; i++) {
      if (isBlockish(el.children[i])) return true;
    }
    return false;
  }

  function isBlockish(el) {
    if (!el || el.nodeType !== 1) return false;
    var tag = el.tagName.toLowerCase();
    if (/^(div|section|article|aside|header|footer|main|p|h[1-6]|ul|ol|li|table|tr|td|th|pre|blockquote|textarea|hr)$/.test(tag)) return true;
    var cl = el.classList;
    return !!(cl && (
      cl.contains('hp-section') ||
      cl.contains('hp-section-header') ||
      cl.contains('hp-section-body') ||
      cl.contains('wf-card') ||
      cl.contains('wf-tip') ||
      cl.contains('wh-section') ||
      cl.contains('wh-block') ||
      cl.contains('goal-info-row') ||
      cl.contains('kyh-card') ||
      cl.contains('kyh-section') ||
      cl.contains('prompt-block')
    ));
  }

  function isHidden(el) {
    if (!el || el.nodeType !== 1) return false;
    var st = (el.getAttribute('style') || '').replace(/\s+/g, '').toLowerCase();
    if (st.indexOf('display:none') !== -1 || st.indexOf('visibility:hidden') !== -1) return true;
    if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return true;
    var cl = el.classList;
    return !!(cl && (
      cl.contains('doc-sidebar') ||
      cl.contains('wh-back-top') ||
      cl.contains('nav-panel') ||
      cl.contains('nav-backdrop') ||
      cl.contains('page-footer') ||
      cl.contains('finish-modal-overlay') ||
      cl.contains('license-modal-overlay') ||
      cl.contains('modal-overlay')
    ));
  }

  function imageRole(img) {
    if (!img || img.nodeType !== 1 || img.tagName.toLowerCase() !== 'img') return false;
    var cl = img.classList;
    var alt = img.getAttribute('alt');
    var src = img.getAttribute('src') || '';
    if (cl && (
      cl.contains('helper-tip-icon-img') ||
      cl.contains('wf-tip-icon-img') ||
      cl.contains('helper-info-img')
    )) return 'decorative';
    if (cl && cl.contains('hp-section-bee')) return 'section';
    if (cl && (
      cl.contains('kyh-card-icon') ||
      cl.contains('nav-panel-logo') ||
      cl.contains('page-header-logo') ||
      cl.contains('about-modal-logo') ||
      cl.contains('license-modal-logo')
    )) return 'icon';
    if (/\/icon-[^/]+\.png(\?|#|$)/i.test(src) || /google\.com\/s2\/favicons/i.test(src)) return 'icon';
    if (!alt && cl && cl.contains('wf-tip-icon')) return 'decorative';
    return alt ? 'content' : 'content';
  }

  function isDecorativeImage(img) {
    return imageRole(img) === 'decorative';
  }

  function para(options) {
    var docx = docxLib();
    return new docx.Paragraph(Object.assign({
      spacing: { after: 120 },
      children: []
    }, options || {}));
  }

  function textRun(text, opts) {
    var docx = docxLib();
    return new docx.TextRun(Object.assign({
      text: text || '',
      color: COLOR_TEXT
    }, opts || {}));
  }

  function inlineRuns(el, opts) {
    var docx = docxLib();
    var runs = [];
    opts = opts || {};
    if (!el || !el.childNodes) return runs;

    el.childNodes.forEach(function (n) {
      if (n.nodeType === 3) {
        var t = normalizeSpace(n.textContent);
        if (t) runs.push(textRun(t, opts));
        return;
      }
      if (n.nodeType !== 1 || isHidden(n)) return;

      var tag = n.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'button' || tag === 'noscript') return;
      if (tag === 'br') { runs.push(new docx.TextRun({ break: 1 })); return; }
      if (tag === 'img') {
        if (isDecorativeImage(n)) return;
        var alt = n.getAttribute('alt') || '';
        if (alt) runs.push(textRun(alt, opts));
        return;
      }
      if (tag === 'textarea') {
        var value = n.value || n.textContent || '';
        if (value) runs.push(textRun(value, Object.assign({}, opts, { font: 'Courier New' })));
        return;
      }
      if (tag === 'strong' || tag === 'b') {
        push(runs, inlineRuns(n, Object.assign({}, opts, { bold: true })));
        return;
      }
      if (tag === 'em' || tag === 'i') {
        push(runs, inlineRuns(n, Object.assign({}, opts, { italics: true })));
        return;
      }
      if (tag === 'code' || tag === 'kbd' || tag === 'samp') {
        push(runs, inlineRuns(n, Object.assign({}, opts, { font: 'Courier New', shading: { fill: 'F0F0F0' } })));
        return;
      }
      if (tag === 'a') {
        var labelRuns = inlineRuns(n, Object.assign({}, opts, { color: COLOR_BLUE, underline: {} }));
        push(runs, labelRuns);
        var href = n.getAttribute('href') || '';
        if (href && href.charAt(0) !== '#') {
          try { href = new URL(href, document.baseURI).href; } catch (e) {}
          runs.push(textRun(' (' + href + ')', Object.assign({}, opts, { color: COLOR_BLUE })));
        }
        return;
      }
      push(runs, inlineRuns(n, opts));
    });

    return runs;
  }

  function paragraphFromInline(el, out, opts) {
    var runs = inlineRuns(el, opts || {});
    if (runs.length) out.push(para({ children: runs }));
  }

  function headingPara(el, level) {
    var docx = docxLib();
    var size = level === docx.HeadingLevel.HEADING_1 ? 34 : (level === docx.HeadingLevel.HEADING_2 ? 28 : 24);
    var color = level === docx.HeadingLevel.HEADING_1 ? COLOR_ACCENT : COLOR_TEXT;
    return para({
      children: inlineRuns(el, { bold: true, size: size, color: color }),
      heading: level,
      spacing: { before: level === docx.HeadingLevel.HEADING_1 ? 0 : 220, after: 120 }
    });
  }

  function headingText(text, level) {
    var docx = docxLib();
    var size = level === docx.HeadingLevel.HEADING_2 ? 28 : 24;
    return para({
      children: [textRun(text, { bold: true, size: size, color: level === docx.HeadingLevel.HEADING_2 ? COLOR_ACCENT : COLOR_TEXT })],
      heading: level,
      spacing: { before: 220, after: 120 }
    });
  }

  function imageKey(imgEl) {
    try { return new URL(imgEl.getAttribute('src'), document.baseURI).href; } catch (e) { return ''; }
  }

  function emitImage(imgEl, out, imgMap) {
    var docx = docxLib();
    if (isDecorativeImage(imgEl)) return;
    var key = imageKey(imgEl);
    if (!key) return;
    var info = imgMap.get(key);
    if (!info) {
      var alt = imgEl.getAttribute('alt') || '';
      if (alt) out.push(para({ children: [textRun(alt, { italics: true, color: COLOR_DIM })] }));
      return;
    }
    out.push(para({
      children: [new docx.ImageRun({
        type: info.type,
        data: info.data,
        transformation: { width: info.width, height: info.height }
      })],
      alignment: docx.AlignmentType.CENTER,
      spacing: { before: 60, after: 160 }
    }));
  }

  function calloutBlocks(el, out, imgMap, fill, border) {
    var runs = [textRun('Note: ', { bold: true, color: COLOR_ACCENT })];
    push(runs, inlineRuns(el, {}));
    if (runs.length < 2) return;
    out.push(para({
      children: runs,
      shading: { fill: fill || 'FFFBEA' },
      spacing: { before: 80, after: 140 }
    }));
  }

  function buildTable(tableEl, imgMap) {
    var docx = docxLib();
    var b = { style: docx.BorderStyle.SINGLE, size: 4, color: '999999' };
    var borders = { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b };
    var rows = [];

    Array.prototype.forEach.call(tableEl.querySelectorAll('tr'), function (tr) {
      var cells = [];
      Array.prototype.forEach.call(tr.children, function (td) {
        if (!td.tagName || !/^(th|td)$/i.test(td.tagName)) return;
        var isHead = td.tagName.toLowerCase() === 'th';
        var cellBlocks = [];
        if (hasBlockChild(td)) blocksFromNode(td, cellBlocks, imgMap, { bold: isHead });
        else paragraphFromInline(td, cellBlocks, { bold: isHead });
        if (!cellBlocks.length) cellBlocks.push(para({ text: '' }));
        cells.push(new docx.TableCell({
          children: cellBlocks,
          shading: isHead ? { fill: 'EFEFEF' } : undefined,
          margins: { top: 80, bottom: 80, left: 100, right: 100 }
        }));
      });
      if (cells.length) rows.push(new docx.TableRow({ children: cells }));
    });

    if (!rows.length) return null;
    return new docx.Table({
      width: { size: 9000, type: docx.WidthType.DXA },
      borders: borders,
      rows: rows
    });
  }

  function emitDefinitionRow(el, out) {
    var label = el.querySelector('.info-label, .goal-info-phase, .kyh-section-title, .prompt-block-label');
    var desc = el.querySelector('.goal-info-desc, .prompt-block-desc');
    if (!label || !desc) return false;
    var runs = inlineRuns(label, { bold: true });
    runs.push(textRun(': ', { bold: true }));
    push(runs, inlineRuns(desc, {}));
    out.push(para({ children: runs }));
    return true;
  }

  function emitBadgeLine(el, out) {
    if (!hasText(el)) return false;
    out.push(para({
      children: [textRun(textOf(el), { italics: true, color: COLOR_DIM })],
      spacing: { after: 60 }
    }));
    return true;
  }

  function blocksFromNode(node, out, imgMap, ctx) {
    var docx = docxLib();
    var H = docx.HeadingLevel;
    ctx = ctx || {};
    if (!node || !node.childNodes) return;

    node.childNodes.forEach(function (el) {
      if (el.nodeType === 3) {
        var t = normalizeSpace(el.textContent).trim();
        if (t) out.push(para({ children: [textRun(t, ctx)] }));
        return;
      }
      if (el.nodeType !== 1 || isHidden(el)) return;

      var tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'button' || tag === 'noscript' || tag === 'input') return;
      var cl = el.classList || { contains: function () { return false; } };

      if (cl.contains('print-header') || cl.contains('page-header-controls') || cl.contains('prompt-editor-actions')) return;
      if (cl.contains('wh-section-icon')) return;
      if (cl.contains('wf-tip-icon')) return;

      if (cl.contains('hp-section-bee') || tag === 'img') { emitImage(el, out, imgMap); return; }
      if (cl.contains('hp-section-title')) { out.push(headingPara(el, tag === 'h1' ? H.HEADING_1 : H.HEADING_2)); return; }
      if (cl.contains('wh-section-title')) { out.push(headingText(textOf(el), H.HEADING_2)); return; }
      if (cl.contains('wh-block-title') || cl.contains('wf-card-title') || cl.contains('kyh-card-name') || cl.contains('prompt-group-title')) {
        out.push(headingText(textOf(el), H.HEADING_3));
        return;
      }
      if (cl.contains('kyh-card-model') || cl.contains('prompt-group-sub') || cl.contains('prompt-block-desc')) {
        out.push(para({ children: [textRun(textOf(el), { italics: true, color: COLOR_DIM })] }));
        return;
      }
      if (cl.contains('goal-info-row') || cl.contains('prompt-block-header')) {
        if (emitDefinitionRow(el, out)) return;
      }
      if (cl.contains('kyh-badges') || cl.contains('kyh-pills')) {
        if (emitBadgeLine(el, out)) return;
      }
      if (cl.contains('wf-tip') || cl.contains('wh-tip')) { calloutBlocks(el, out, imgMap, 'FFFBEA', 'E5C84A'); return; }
      if (cl.contains('wh-warn') || cl.contains('is-amber')) { calloutBlocks(el, out, imgMap, 'FFF4E5', 'C99A2B'); return; }
      if (cl.contains('is-green')) { calloutBlocks(el, out, imgMap, 'ECFDF3', '5CB85C'); return; }
      if (cl.contains('is-blue')) { calloutBlocks(el, out, imgMap, 'EEF6FF', '5AA2E8'); return; }
      if (cl.contains('is-red')) { calloutBlocks(el, out, imgMap, 'FFF0F0', 'D99A9A'); return; }
      if (cl.contains('wf-card') || cl.contains('kyh-card') || cl.contains('prompt-group') || cl.contains('prompt-block')) {
        blocksFromNode(el, out, imgMap, ctx);
        out.push(para({ text: '' }));
        return;
      }

      switch (tag) {
        case 'h1': out.push(headingPara(el, H.HEADING_1)); return;
        case 'h2': out.push(headingPara(el, H.HEADING_2)); return;
        case 'h3': out.push(headingPara(el, H.HEADING_3)); return;
        case 'h4':
        case 'h5':
        case 'h6': out.push(headingPara(el, H.HEADING_4)); return;
        case 'p':
          paragraphFromInline(el, out, ctx);
          return;
        case 'ul':
          Array.prototype.forEach.call(el.children, function (li) {
            if (li.tagName && li.tagName.toLowerCase() === 'li') {
              out.push(para({ children: inlineRuns(li, ctx), bullet: { level: 0 } }));
            }
          });
          return;
        case 'ol':
          var i = 1;
          Array.prototype.forEach.call(el.children, function (li) {
            if (li.tagName && li.tagName.toLowerCase() === 'li') {
              var runs = [textRun((i++) + '.  ', { bold: true })];
              push(runs, inlineRuns(li, ctx));
              out.push(para({ children: runs, indent: { left: 360, hanging: 360 } }));
            }
          });
          return;
        case 'table':
          var tbl = buildTable(el, imgMap);
          if (tbl) {
            out.push(tbl);
            out.push(para({ text: '' }));
          }
          return;
        case 'pre':
        case 'textarea':
          out.push(para({
            children: [textRun(el.value || el.textContent || '', { font: 'Courier New' })],
            shading: { fill: 'F4F4F4' },
            spacing: { after: 160 }
          }));
          return;
        case 'blockquote':
          out.push(para({ children: inlineRuns(el, Object.assign({}, ctx, { italics: true })), indent: { left: 360 } }));
          return;
        case 'hr':
          out.push(para({ text: '' }));
          return;
        case 'br':
          return;
        default:
          if (!hasBlockChild(el) && hasText(el)) {
            paragraphFromInline(el, out, ctx);
            return;
          }
          blocksFromNode(el, out, imgMap, ctx);
      }
    });
  }

  function imageTypeFromMime(mime, src) {
    mime = (mime || '').toLowerCase();
    if (mime.indexOf('jpeg') !== -1 || mime.indexOf('jpg') !== -1) return 'jpg';
    if (mime.indexOf('png') !== -1) return 'png';
    if (mime.indexOf('gif') !== -1) return 'gif';
    if (mime.indexOf('bmp') !== -1) return 'bmp';
    if (mime.indexOf('svg') !== -1) return 'svg';
    if (/\.jpe?g(\?|#|$)/i.test(src)) return 'jpg';
    if (/\.gif(\?|#|$)/i.test(src)) return 'gif';
    if (/\.bmp(\?|#|$)/i.test(src)) return 'bmp';
    if (/\.svg(\?|#|$)/i.test(src)) return 'svg';
    return 'png';
  }

  function maxWidthForImage(img) {
    var role = imageRole(img);
    if (role === 'section') return MAX_SECTION_IMG_W;
    if (role === 'icon') return MAX_ICON_IMG_W;
    return MAX_IMG_W;
  }

  function dimensionsFor(img, widthFallback) {
    var nw = img.naturalWidth || widthFallback || MAX_IMG_W;
    var nh = img.naturalHeight || Math.round(nw * 0.6);
    var w = nw;
    var h = nh;
    var maxW = maxWidthForImage(img);
    if (w > maxW) {
      h = Math.round(h * (maxW / w));
      w = maxW;
    }
    return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) };
  }

  function imageFromCanvas(img) {
    return new Promise(function (resolve) {
      try {
        var dims = dimensionsFor(img, img.naturalWidth || MAX_IMG_W);
        var canvas = document.createElement('canvas');
        canvas.width = dims.width;
        canvas.height = dims.height;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, dims.width, dims.height);
        ctx.drawImage(img, 0, 0, dims.width, dims.height);
        canvas.toBlob(function (blob) {
          if (!blob) { resolve(null); return; }
          blob.arrayBuffer().then(function (ab) {
            resolve({ data: new Uint8Array(ab), type: 'jpg', width: dims.width, height: dims.height });
          }).catch(function () { resolve(null); });
        }, 'image/jpeg', 0.92);
      } catch (e) {
        resolve(null);
      }
    });
  }

  function fetchImage(img, src) {
    return imageFromCanvas(img).then(function (canvasInfo) {
      if (canvasInfo) return canvasInfo;
      return fetch(src).then(function (r) {
        if (!r.ok) return null;
        var mime = r.headers.get('content-type') || '';
        return r.arrayBuffer().then(function (ab) {
          var dims = dimensionsFor(img, MAX_IMG_W);
          return {
            data: new Uint8Array(ab),
            type: imageTypeFromMime(mime, src),
            width: dims.width,
            height: dims.height
          };
        });
      }).catch(function () {
        return null;
      });
    });
  }

  function prefetchImages(root) {
    var imgs = Array.prototype.slice.call(root.querySelectorAll('img[src]')).filter(function (img) {
      return !isHidden(img) && !isDecorativeImage(img);
    });
    var map = new Map();
    var jobs = imgs.map(function (img) {
      var src = imageKey(img);
      if (!src || map.has(src)) return Promise.resolve();
      map.set(src, null);
      return fetchImage(img, src).then(function (info) {
        if (info) map.set(src, info);
        else map.delete(src);
      });
    });
    return Promise.all(jobs).then(function () { return map; });
  }

  function contentsBlocks(root) {
    var docx = docxLib();
    var seen = {};
    var items = [];
    Array.prototype.forEach.call(root.querySelectorAll('h2.hp-section-title, h2, .wh-section-title'), function (el) {
      if (isHidden(el)) return;
      var label = textOf(el);
      if (!label || seen[label]) return;
      seen[label] = true;
      items.push(label);
    });
    if (items.length < 5) return [];
    var blocks = [headingText('Contents', docx.HeadingLevel.HEADING_2)];
    items.forEach(function (label) {
      blocks.push(para({
        children: [textRun(label, { color: COLOR_BLUE })],
        bullet: { level: 0 },
        spacing: { after: 40 }
      }));
    });
    blocks.push(para({ text: '' }));
    return blocks;
  }

  function exportRoot() {
    return document.querySelector('.page-main') || document.querySelector('.doc-main') || document.body;
  }

  window.downloadPageAsDocx = async function downloadPageAsDocx() {
    if (!window.docx || !window.docx.Document) {
      if (typeof toast === 'function') toast('\u26a0\ufe0f Word export library not loaded - reload and try again');
      return;
    }

    var root = exportRoot();
    if (!root) {
      if (typeof toast === 'function') toast('\u26a0\ufe0f Nothing to export');
      return;
    }

    if (typeof toast === 'function') toast('\u23f3 Building Word document...');
    try {
      var docx = docxLib();
      var imgMap = await prefetchImages(root);
      var blocks = [];
      blocksFromNode(root, blocks, imgMap, {});
      var toc = contentsBlocks(root);
      if (toc.length) {
        var insertAt = Math.min(blocks.length, 2);
        Array.prototype.splice.apply(blocks, [insertAt, 0].concat(toc));
      }
      if (!blocks.length) {
        blocks.unshift(para({ text: document.title || 'WaxFrame', heading: docx.HeadingLevel.TITLE }));
      }
      if (blocks.length < 2) blocks.push(para({ text: '' }));

      var doc = new docx.Document({
        styles: {
          default: {
            document: { run: { font: 'Calibri', size: 22, color: COLOR_TEXT } }
          }
        },
        sections: [{
          properties: {
            page: {
              margin: { top: 720, right: 720, bottom: 720, left: 720 }
            }
          },
          children: blocks
        }]
      });

      var blob = await docx.Packer.toBlob(doc);
      var safe = (document.title || 'WaxFrame').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'WaxFrame';
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = safe + '.docx';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        try { document.body.removeChild(a); } catch (e) {}
        URL.revokeObjectURL(url);
      }, 1000);
      if (typeof toast === 'function') toast('\u2705 Word document downloaded');
    } catch (e) {
      console.error('[docx-export] failed:', e);
      if (typeof toast === 'function') toast('\u26a0\ufe0f Word export failed - see console');
    }
  };
})();
