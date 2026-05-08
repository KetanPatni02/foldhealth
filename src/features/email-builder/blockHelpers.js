// ── Default style/props for every block type the editor exposes. ──
// Each factory returns a fresh object so blocks can be safely mutated.
// `createBlock` returns a single block; `createBlockTree` may return many
// (e.g. Hero = Container wrapping a Heading) so the editor can drop a
// preconfigured composite onto the canvas in one click.

const baseStyle = () => ({
  padding: { top: 16, bottom: 16, left: 24, right: 24 },
});

const FACTORIES = {
  Heading: () => ({
    type: 'Heading',
    data: {
      props: { text: 'Write title here', level: 'h2' },
      style: { ...baseStyle(), color: '#3A485F', textAlign: 'center' },
    },
  }),
  Text: () => ({
    type: 'Text',
    data: {
      props: { text: 'Write your email body…' },
      style: {
        ...baseStyle(),
        color: '#3A485F',
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'left',
        fontFamily: 'MODERN_SANS',
      },
    },
  }),
  Button: () => ({
    type: 'Button',
    data: {
      props: { text: 'Click me', url: 'https://example.com', size: 'medium', fullWidth: false, buttonStyle: 'rectangle', buttonBackgroundColor: '#7C5CFA', buttonTextColor: '#FFFFFF' },
      style: { padding: { top: 12, bottom: 12, left: 24, right: 24 }, textAlign: 'center' },
    },
  }),
  Image: () => ({
    type: 'Image',
    data: {
      props: { url: 'https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=480', alt: 'Placeholder', linkHref: null, contentAlignment: 'middle' },
      style: { padding: { top: 16, bottom: 16, left: 24, right: 24 }, textAlign: 'center' },
    },
  }),
  Avatar: () => ({
    type: 'Avatar',
    data: {
      props: { imageUrl: 'https://i.pravatar.cc/96', alt: 'Avatar', shape: 'circle', size: 64 },
      style: { padding: { top: 16, bottom: 16, left: 24, right: 24 }, textAlign: 'center' },
    },
  }),
  Divider: () => ({
    type: 'Divider',
    data: {
      props: { lineColor: '#E1E4EA', lineHeight: 1 },
      style: { padding: { top: 12, bottom: 12, left: 24, right: 24 } },
    },
  }),
  Spacer: () => ({
    type: 'Spacer',
    data: {
      props: { height: 32 },
      style: { padding: { top: 0, bottom: 0, left: 0, right: 0 } },
    },
  }),
  Container: () => ({
    type: 'Container',
    data: {
      style: { ...baseStyle(), backgroundColor: '#F6F4FF' },
      props: { childrenIds: [] },
    },
  }),
  ColumnsContainer: () => ({
    type: 'ColumnsContainer',
    data: {
      style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
      props: {
        columnsCount: 2,
        columnsGap: 16,
        contentAlignment: 'top',
        columns: [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }],
      },
    },
  }),
};

export function createBlock(type) {
  const factory = FACTORIES[type];
  if (!factory) throw new Error(`Unknown block type: ${type}`);
  return factory();
}

export const SUPPORTED_BLOCK_TYPES = Object.keys(FACTORIES);

// ── Composite & layout factories ──────────────────────────────────────────
// Returns { rootId, blocks } so the caller can drop several linked blocks at
// once. The library natively supports Heading/Text/Button/Image/Avatar/
// Divider/Spacer/Container/ColumnsContainer; everything else (Hero, Social,
// Nav Bar, Group, Section, layout presets) is composed from those primitives.

export function createBlockTree(type, genId) {
  // Simple, single-block types fall through to createBlock.
  if (FACTORIES[type]) {
    const id = genId();
    return { rootId: id, blocks: { [id]: createBlock(type) } };
  }

  switch (type) {
    case 'Hero': {
      const headingId = genId();
      const textId = genId();
      const containerId = genId();
      return {
        rootId: containerId,
        blocks: {
          [headingId]: {
            type: 'Heading',
            data: {
              props: { text: 'Hero headline', level: 'h1' },
              style: { color: '#3A485F', textAlign: 'center', padding: { top: 16, bottom: 8, left: 24, right: 24 } },
            },
          },
          [textId]: {
            type: 'Text',
            data: {
              props: { text: 'Add a short tagline here.' },
              style: { color: '#6B7280', fontSize: 14, textAlign: 'center', padding: { top: 0, bottom: 16, left: 24, right: 24 } },
            },
          },
          [containerId]: {
            type: 'Container',
            data: {
              style: { backgroundColor: '#F2EEFE', padding: { top: 32, bottom: 32, left: 24, right: 24 } },
              props: { childrenIds: [headingId, textId] },
            },
          },
        },
      };
    }

    case 'Social': {
      const a = genId(), b = genId(), c = genId();
      const root = genId();
      const mkIcon = (alt) => ({
        type: 'Image',
        data: {
          props: { url: 'https://i.imgur.com/IkVnRaD.png', alt, contentAlignment: 'middle' },
          style: { padding: { top: 8, bottom: 8, left: 8, right: 8 }, textAlign: 'center' },
        },
      });
      return {
        rootId: root,
        blocks: {
          [a]: mkIcon('Twitter'),
          [b]: mkIcon('LinkedIn'),
          [c]: mkIcon('Instagram'),
          [root]: {
            type: 'ColumnsContainer',
            data: {
              style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
              props: { columnsCount: 3, columnsGap: 12, contentAlignment: 'middle', columns: [{ childrenIds: [a] }, { childrenIds: [b] }, { childrenIds: [c] }] },
            },
          },
        },
      };
    }

    case 'NavBar': {
      const a = genId(), b = genId(), c = genId();
      const root = genId();
      const mkLink = (text) => ({
        type: 'Text',
        data: {
          props: { text },
          style: { color: '#7C5CFA', fontSize: 14, fontWeight: 'bold', textAlign: 'center', padding: { top: 8, bottom: 8, left: 8, right: 8 } },
        },
      });
      return {
        rootId: root,
        blocks: {
          [a]: mkLink('Home'),
          [b]: mkLink('About'),
          [c]: mkLink('Contact'),
          [root]: {
            type: 'ColumnsContainer',
            data: {
              style: { padding: { top: 12, bottom: 12, left: 16, right: 16 }, backgroundColor: '#FFFFFF' },
              props: { columnsCount: 3, columnsGap: 8, contentAlignment: 'middle', columns: [{ childrenIds: [a] }, { childrenIds: [b] }, { childrenIds: [c] }] },
            },
          },
        },
      };
    }

    case 'Group': {
      const id = genId();
      return {
        rootId: id,
        blocks: {
          [id]: {
            type: 'Container',
            data: {
              style: { padding: { top: 8, bottom: 8, left: 8, right: 8 } },
              props: { childrenIds: [] },
            },
          },
        },
      };
    }

    case 'Section': {
      const id = genId();
      return {
        rootId: id,
        blocks: {
          [id]: {
            type: 'Container',
            data: {
              style: { backgroundColor: '#F8F9FB', padding: { top: 32, bottom: 32, left: 32, right: 32 } },
              props: { childrenIds: [] },
            },
          },
        },
      };
    }

    case 'Column': {
      // single-column variant: just a Container; for multi-col use Layouts.
      const id = genId();
      return {
        rootId: id,
        blocks: {
          [id]: {
            type: 'Container',
            data: {
              style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
              props: { childrenIds: [] },
            },
          },
        },
      };
    }

    // ── Layout presets — preconfigured ColumnsContainer ──
    case 'Layout-2-equal':   return makeColumns(genId, 2, null);
    case 'Layout-1-2':       return makeColumns(genId, 2, [200, 400]);
    case 'Layout-2-1':       return makeColumns(genId, 2, [400, 200]);
    case 'Layout-3-equal':   return makeColumns(genId, 3, null);
    case 'Layout-1-1-2':     return makeColumns(genId, 3, [120, 120, 360]);
    default:
      return null;
  }
}

// Walk the whole document and produce a parent map:
//   { blockId: { parentId: 'root' | string, columnIdx?: 0|1|2, index } }
// Used by the DnD layer to figure out where each draggable block lives so we
// can compute the right insert target on drop.
export function buildParentMap(doc) {
  const map = {};
  const walk = (parentId, childrenIds, columnIdx) => {
    childrenIds.forEach((id, index) => {
      map[id] = { parentId, columnIdx, index };
      const block = doc[id];
      if (!block) return;
      const props = block.data?.props || {};
      if (Array.isArray(props.childrenIds)) {
        walk(id, props.childrenIds);
      } else if (Array.isArray(props.columns)) {
        props.columns.forEach((col, idx) => walk(id, col.childrenIds || [], idx));
      }
    });
  };
  if (doc?.root) walk('root', doc.root.data.childrenIds || []);
  return map;
}

// Deep-clone a block subtree with fresh ids. Returns { rootId, blocks } in the
// same shape as createBlockTree so the caller can reuse insert logic.
export function cloneBlockTree(doc, sourceId, genId) {
  const blocks = {};
  const cloneOne = (id) => {
    const src = doc[id];
    if (!src) return null;
    const newId = genId();
    const clone = JSON.parse(JSON.stringify(src));
    const data = clone.data || {};
    const props = data.props || {};
    if (Array.isArray(props.childrenIds)) {
      props.childrenIds = props.childrenIds.map(cid => cloneOne(cid)).filter(Boolean);
    }
    if (Array.isArray(props.columns)) {
      props.columns = props.columns.map(col => ({
        ...col,
        childrenIds: (col.childrenIds || []).map(cid => cloneOne(cid)).filter(Boolean),
      }));
    }
    blocks[newId] = clone;
    return newId;
  };
  const rootId = cloneOne(sourceId);
  return rootId ? { rootId, blocks } : null;
}

// Walk a block + descendants and return all ids that belong to the subtree.
// Used when we need to remove a header/footer cleanly without orphan blocks.
export function collectBlockTree(doc, rootId) {
  const ids = [];
  const visit = (id) => {
    if (!id || !doc[id] || ids.includes(id)) return;
    ids.push(id);
    const block = doc[id];
    const data = block.data || {};
    const props = data.props || {};
    if (Array.isArray(props.childrenIds)) props.childrenIds.forEach(visit);
    if (Array.isArray(props.columns)) props.columns.forEach(c => (c.childrenIds || []).forEach(visit));
  };
  visit(rootId);
  return ids;
}

function makeColumns(genId, count, fixedWidths) {
  const root = genId();
  const empty = { childrenIds: [] };
  return {
    rootId: root,
    blocks: {
      [root]: {
        type: 'ColumnsContainer',
        data: {
          style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
          props: {
            columnsCount: count,
            columnsGap: 16,
            contentAlignment: 'top',
            columns: [empty, empty, empty],
            ...(fixedWidths ? { fixedWidths: [...fixedWidths, undefined].slice(0, 3) } : {}),
          },
        },
      },
    },
  };
}
