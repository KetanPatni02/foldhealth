// Parse a raw HTML email body into the document shape used by the email
// builder so the imported HTML lands as editable blocks in the layers panel.
//
// We render the HTML into a hidden iframe first and read getComputedStyle so
// classes defined in <style> blocks, shorthand `background`, the inherited
// `color`/`font-family` chain, etc. are all resolved. Walking the parsed
// `style` attribute alone misses everything that isn't inline — which is
// most of what designers use.

const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
const TEXT_TAGS = new Set(['P', 'SPAN', 'BLOCKQUOTE', 'PRE', 'CODE', 'EM', 'STRONG', 'B', 'I', 'U']);
const ALLOWED_INLINE_TAGS = new Set(['STRONG', 'B', 'EM', 'I', 'U', 'S', 'A', 'BR', 'CODE', 'SPAN']);

// rgb(58, 72, 95) → #3A485F. We always store colors as hex so the color
// picker shows hex codes (the user explicitly wants this).
export function rgbToHex(value) {
  if (!value || typeof value !== 'string') return value;
  const v = value.trim();
  if (v.startsWith('#')) return v.toUpperCase();
  // Named "transparent" → leave it; the renderer treats it as no fill.
  if (v === 'transparent' || v === 'rgba(0, 0, 0, 0)') return null;
  const m = v.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)$/i);
  if (!m) return v;
  const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
  if (a === 0) return null;
  const toHex = n => parseInt(n, 10).toString(16).padStart(2, '0');
  return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`.toUpperCase();
}

function parsePxNumber(value) {
  if (value == null || value === '') return null;
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

function firstFontFamily(family) {
  if (!family) return null;
  const first = family.replace(/['"]/g, '').split(',')[0].trim();
  // Skip generic fallbacks so we don't overwrite the parent's choice.
  if (['sans-serif', 'serif', 'monospace', 'system-ui', '-apple-system'].includes(first)) return null;
  return first;
}

function readPadding(cs) {
  return {
    top: parsePxNumber(cs.paddingTop) || 0,
    right: parsePxNumber(cs.paddingRight) || 0,
    bottom: parsePxNumber(cs.paddingBottom) || 0,
    left: parsePxNumber(cs.paddingLeft) || 0,
  };
}

function readBackgroundImage(cs) {
  const bg = cs.backgroundImage;
  if (!bg || bg === 'none') return null;
  // Capture gradient values verbatim — our renderer accepts gradient strings.
  if (bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient')) return bg;
  const m = bg.match(/url\((['"]?)([^'")]+)\1\)/);
  return m ? m[2] : null;
}

function extractStyle(el, win) {
  const cs = win.getComputedStyle(el);
  const out = {};

  const pad = readPadding(cs);
  if (pad.top || pad.right || pad.bottom || pad.left) out.padding = pad;

  const color = rgbToHex(cs.color);
  if (color) out.color = color;

  const bgColor = rgbToHex(cs.backgroundColor);
  if (bgColor) out.backgroundColor = bgColor;

  const bgImage = readBackgroundImage(cs);
  if (bgImage) {
    if (bgImage.startsWith('linear-gradient') || bgImage.startsWith('radial-gradient')) {
      // Gradient → our renderer reads gradients off backgroundColor.
      out.backgroundColor = bgImage;
    } else {
      out.backgroundImage = bgImage;
      if (cs.backgroundSize && cs.backgroundSize !== 'auto') out.backgroundSize = cs.backgroundSize;
      if (cs.backgroundPosition && cs.backgroundPosition !== '0% 0%') out.backgroundPosition = cs.backgroundPosition;
      if (cs.backgroundRepeat && cs.backgroundRepeat !== 'repeat') out.backgroundRepeat = cs.backgroundRepeat;
    }
  }

  if (cs.textAlign && cs.textAlign !== 'start') out.textAlign = cs.textAlign;

  const ff = firstFontFamily(cs.fontFamily);
  if (ff) out.fontFamily = ff;

  const fs = parsePxNumber(cs.fontSize);
  if (fs != null) out.fontSize = fs;

  if (cs.fontWeight) {
    const w = parseInt(cs.fontWeight, 10);
    if (!Number.isNaN(w) && w !== 400) out.fontWeight = w;
  }
  if (cs.fontStyle && cs.fontStyle !== 'normal') out.fontStyle = cs.fontStyle;
  if (cs.textDecorationLine && cs.textDecorationLine !== 'none') out.textDecoration = cs.textDecorationLine;
  if (cs.textTransform && cs.textTransform !== 'none') out.textTransform = cs.textTransform;
  if (cs.letterSpacing && cs.letterSpacing !== 'normal') out.letterSpacing = cs.letterSpacing;
  if (cs.lineHeight && cs.lineHeight !== 'normal') {
    // getComputedStyle returns px; store as that. parseLineHeight in dimUnits
    // will treat the trailing "px" as the unit when the field renders.
    out.lineHeight = cs.lineHeight;
  }

  const br = parsePxNumber(cs.borderTopLeftRadius);
  if (br != null && br > 0) out.borderRadius = br;

  // Border — take the top side as representative; if any side differs the
  // user can refine inside the builder. Width 0 = no border.
  const bw = parsePxNumber(cs.borderTopWidth);
  if (bw != null && bw > 0) {
    out.borderWidth = bw;
    const bc = rgbToHex(cs.borderTopColor);
    if (bc) out.borderColor = bc;
    if (cs.borderTopStyle && cs.borderTopStyle !== 'none') out.borderStyle = cs.borderTopStyle;
  }

  return out;
}

function extractInlineHtml(el) {
  const parts = [];
  el.childNodes.forEach(node => {
    if (node.nodeType === 3 /* TEXT_NODE */) {
      parts.push(node.textContent);
    } else if (node.nodeType === 1 /* ELEMENT_NODE */) {
      const tag = node.tagName;
      if (ALLOWED_INLINE_TAGS.has(tag)) {
        const inner = extractInlineHtml(node);
        if (tag === 'BR') parts.push('<br>');
        else if (tag === 'A') {
          const href = node.getAttribute('href') || '#';
          parts.push(`<a href="${href}">${inner}</a>`);
        } else {
          parts.push(`<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`);
        }
      } else {
        parts.push(extractInlineHtml(node));
      }
    }
  });
  return parts.join('');
}

function hasVisualStyle(style) {
  return !!(style.backgroundColor || style.backgroundImage || style.borderWidth ||
            style.borderRadius || (style.padding && (style.padding.top || style.padding.right || style.padding.bottom || style.padding.left)));
}

function isAnchorButton(el, cs) {
  if (el.tagName !== 'A') return false;
  const hasPad = parsePxNumber(cs.paddingTop) > 0 || parsePxNumber(cs.paddingLeft) > 0;
  const hasBg = !!rgbToHex(cs.backgroundColor);
  const hasBorder = (parsePxNumber(cs.borderTopWidth) || 0) > 0;
  return hasPad && (hasBg || hasBorder);
}

function isColumnsRow(el) {
  if (el.tagName === 'TR') {
    const tds = Array.from(el.children).filter(c => c.tagName === 'TD');
    return tds.length >= 2;
  }
  if (el.tagName === 'DIV') {
    const cs = el.ownerDocument.defaultView.getComputedStyle(el);
    const display = cs.display;
    const childDivs = Array.from(el.children).filter(c => c.tagName === 'DIV');
    if (childDivs.length < 2) return false;
    // Side-by-side: flex/grid container, or each child is inline-block.
    if (display === 'flex' || display === 'grid') return true;
    const childDisplays = childDivs.map(c => el.ownerDocument.defaultView.getComputedStyle(c).display);
    return childDisplays.every(d => d === 'inline-block' || d.startsWith('table-cell'));
  }
  return false;
}

function makeIdGen() {
  let n = 1;
  const base = Date.now();
  return () => `block-${base}-${n++}`;
}

// Walk the body into a flat blocks map + root child list. The walker
// (`walk`) returns an array of block IDs the caller should treat as the
// element's contribution to its parent's child list — usually one ID, but
// pass-through wrappers can return their children's IDs directly so we
// don't generate empty Containers.
function buildDocFromDom(idoc, win) {
  const blocks = {};
  const genId = makeIdGen();
  const body = idoc.body;

  // Sentinel-strip elements with no editable representation.
  body.querySelectorAll('script, style, meta, link, noscript').forEach(el => el.remove());

  const bodyCs = win.getComputedStyle(body);
  const backdropColor = rgbToHex(bodyCs.backgroundColor) || '#F2EEFE';
  const rootFontFamily = firstFontFamily(bodyCs.fontFamily);
  const rootTextColor = rgbToHex(bodyCs.color) || '#3A485F';

  // Find the inner email container — usually a single child of body or the
  // first table/.email-container. Its background is the canvas color.
  let canvasColor = '#FFFFFF';
  const wrapper = body.querySelector('table[role="presentation"], .email-container, .container, [class*="email"]');
  if (wrapper) {
    const wcs = win.getComputedStyle(wrapper);
    const bg = rgbToHex(wcs.backgroundColor);
    if (bg) canvasColor = bg;
  }

  const walk = (el) => {
    const cs = win.getComputedStyle(el);

    // Skip hidden elements outright.
    if (cs.display === 'none' || cs.visibility === 'hidden') return [];

    // Buttons (anchors that look like buttons)
    if (isAnchorButton(el, cs)) {
      const id = genId();
      blocks[id] = {
        type: 'Button',
        data: {
          props: { text: el.textContent.trim() || 'Button', url: el.getAttribute('href') || '#' },
          style: extractStyle(el, win),
        },
      };
      return [id];
    }

    // Headings
    if (HEADING_TAGS.has(el.tagName)) {
      const id = genId();
      blocks[id] = {
        type: 'Heading',
        data: {
          props: { text: extractInlineHtml(el), level: el.tagName.toLowerCase() },
          style: extractStyle(el, win),
        },
      };
      return [id];
    }

    // Images
    if (el.tagName === 'IMG') {
      const id = genId();
      const w = parsePxNumber(el.getAttribute('width')) ?? parsePxNumber(cs.width);
      const h = parsePxNumber(el.getAttribute('height')) ?? parsePxNumber(cs.height);
      const props = { url: el.getAttribute('src') || '', alt: el.getAttribute('alt') || '' };
      if (w) props.width = w;
      if (h) props.height = h;
      blocks[id] = {
        type: 'Image',
        data: { props, style: extractStyle(el, win) },
      };
      return [id];
    }

    // Horizontal rule → Divider
    if (el.tagName === 'HR') {
      const id = genId();
      const lineColor = rgbToHex(cs.borderTopColor) || rgbToHex(cs.color) || '#E1E4EA';
      const lineHeight = parsePxNumber(cs.borderTopWidth) || 1;
      blocks[id] = {
        type: 'Divider',
        data: { props: { lineColor, lineHeight }, style: {} },
      };
      return [id];
    }

    // Columns row (TR with multiple TDs, or div with flex/grid children)
    if (isColumnsRow(el)) {
      const id = genId();
      const cols = (el.tagName === 'TR'
        ? Array.from(el.children).filter(c => c.tagName === 'TD')
        : Array.from(el.children).filter(c => c.tagName === 'DIV'));
      const columns = cols.map(col => {
        const childrenIds = [];
        Array.from(col.children).forEach(child => {
          const ids = walk(child);
          if (ids) childrenIds.push(...ids);
        });
        if (!childrenIds.length && col.textContent.trim()) {
          const tid = genId();
          blocks[tid] = {
            type: 'Text',
            data: { props: { text: extractInlineHtml(col) }, style: extractStyle(col, win) },
          };
          childrenIds.push(tid);
        }
        return { childrenIds };
      });
      blocks[id] = {
        type: 'ColumnsContainer',
        data: { props: { columns }, style: extractStyle(el, win) },
      };
      return [id];
    }

    // Wrappers with element children → Container (or hoist if pass-through).
    const elementChildren = Array.from(el.children);
    const isWrapperTag = ['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'NAV', 'TABLE', 'TBODY', 'TR', 'TD', 'UL', 'OL', 'LI', 'FIGURE'].includes(el.tagName);

    if (isWrapperTag && elementChildren.length > 0) {
      const childrenIds = [];
      Array.from(el.childNodes).forEach(node => {
        if (node.nodeType === 3) {
          const txt = node.textContent.trim();
          if (txt) {
            const tid = genId();
            blocks[tid] = {
              type: 'Text',
              data: { props: { text: txt }, style: {} },
            };
            childrenIds.push(tid);
          }
        } else if (node.nodeType === 1) {
          const ids = walk(node);
          if (ids) childrenIds.push(...ids);
        }
      });
      if (!childrenIds.length) return [];

      const style = extractStyle(el, win);
      // Pass-through wrappers (no visual style, single child) — hoist the
      // child up so we don't create a stack of nested empty Containers.
      if (!hasVisualStyle(style) && childrenIds.length === 1) {
        return childrenIds;
      }
      const id = genId();
      blocks[id] = {
        type: 'Container',
        data: {
          role: 'body',
          props: { childrenIds },
          style,
        },
      };
      return [id];
    }

    // Text-like leaves (P, SPAN, etc.) and DIVs with only text content
    if (TEXT_TAGS.has(el.tagName) || el.tagName === 'DIV' || el.tagName === 'A') {
      const text = extractInlineHtml(el);
      if (!text.trim()) return [];
      const id = genId();
      blocks[id] = {
        type: 'Text',
        data: { props: { text }, style: extractStyle(el, win) },
      };
      return [id];
    }

    // Final fallback — recurse into children, dropping the wrapper.
    const all = [];
    Array.from(el.children).forEach(c => {
      const ids = walk(c);
      if (ids) all.push(...ids);
    });
    return all;
  };

  const rootChildren = [];
  Array.from(body.children).forEach(child => {
    const ids = walk(child);
    if (ids) rootChildren.push(...ids);
  });
  // Bare text under body.
  body.childNodes.forEach(n => {
    if (n.nodeType === 3) {
      const txt = n.textContent.trim();
      if (txt) {
        const tid = genId();
        blocks[tid] = { type: 'Text', data: { props: { text: txt }, style: {} } };
        rootChildren.push(tid);
      }
    }
  });

  if (!rootChildren.length) return null;

  return {
    root: {
      type: 'EmailLayout',
      data: {
        backdropColor,
        canvasColor,
        textColor: rootTextColor,
        fontFamily: rootFontFamily || undefined,
        childrenIds: rootChildren,
      },
    },
    ...blocks,
  };
}

// Async because we render the HTML into a hidden iframe and wait for it to
// load before reading computed styles. Times out at 2000ms and returns null
// so the caller can fall back to a raw customHtml body.
export function parseHtmlToDocument(html) {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:absolute;left:-99999px;top:0;width:600px;height:1200px;visibility:hidden;pointer-events:none;border:0';
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      try { document.body.removeChild(iframe); } catch { /* already removed */ }
    };
    const finish = (value) => { cleanup(); resolve(value); };
    // Append first so contentDocument exists, then write the HTML via
    // document.open/write/close — this is more reliable than `srcdoc`,
    // which fires an extra `load` event for the initial empty document.
    document.body.appendChild(iframe);
    const idoc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!idoc || !win) return finish(null);
    try {
      idoc.open();
      idoc.write(html);
      idoc.close();
    } catch (err) {
      console.error('parseHtmlToDocument write failed:', err);
      return finish(null);
    }
    // Read after the next paint so the browser has applied <style> rules.
    const attempt = () => {
      try {
        if (!idoc.body) return finish(null);
        const result = buildDocFromDom(idoc, win);
        finish(result);
      } catch (err) {
        console.error('parseHtmlToDocument build failed:', err);
        finish(null);
      }
    };
    // Two rafs covers the case where styles haven't been applied on the
    // first paint of a freshly-written doc.
    requestAnimationFrame(() => requestAnimationFrame(attempt));
    setTimeout(() => finish(null), 2000);
  });
}
