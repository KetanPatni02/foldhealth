import { useCallback, useRef, useState } from "react";
import { Drawer } from "./Drawer";
import { PatientBanner } from "../PatientBanner/PatientBanner";
import { Button } from "../Button/Button";
import { Badge } from "../Badge/Badge";
import splitStyles from "./Drawer.stories.module.css";

export default {
  title: "Layout/Drawer",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          'The shared side-panel used across the entire app — patient details, chart review, HCC diagnosis, call queue, preferences, and every other right-side workflow. Standard shape: 700px wide, 8px inset from the viewport edge, 16px border-radius, with a header (title + close button, and optional action buttons in `headerRight`) and a scrollable body. Renders via a portal so it always sits above sticky headers and z-indexed content.',
      },
    },
  },
};

const centerStage = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 };

/**
 * Drawer starts closed; the centered trigger opens it. Close via overlay
 * click or the close button — both play the slideOut + overlay fade before
 * unmounting.
 */
function DrawerDemo({ title = "Drawer Title", children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={centerStage}>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open Drawer
      </Button>
      {open && (
        <Drawer title={title} onClose={() => setOpen(false)}>
          {children}
        </Drawer>
      )}
    </div>
  );
}

export const Default = {
  render: () => (
    <DrawerDemo>
      <p style={{ color: "var(--neutral-400)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        This is the shared Drawer component — 700px wide, 8px inset, 16px
        border-radius. Used across the entire app for all side panels (call
        queue, detail view, preferences, HCC diagnosis review, etc.).
      </p>
      <p style={{ color: "var(--neutral-300)", fontSize: 13, marginTop: 12, marginBottom: 0 }}>
        Click the overlay or the close button to dismiss.
      </p>
    </DrawerDemo>
  ),
};

/**
 * Split two-pane body with a draggable divider — the layout the HCC
 * Diagnosis Gaps drawer uses (document workspace on the left, ICD cards on
 * the right). The resize interaction is a faithful copy of production:
 * pointer capture pins the drag to the handle, and the right pane is
 * clamped to [380px, 50% of the row].
 */
function SplitPanesDemo() {
  const [open, setOpen] = useState(false);
  // null = default 50/50 split (both panes flex:1); a number pins the RHS.
  const [rhsWidth, setRhsWidth] = useState(null);
  const rowRef = useRef(null);
  const MIN_RHS_PX = 380;

  const startResize = useCallback((e) => {
    e.preventDefault();
    const row = rowRef.current;
    if (!row) return;
    const rowRect = row.getBoundingClientRect();
    // Pointer capture pins the pointer stream to the handle for the whole
    // drag — survives the pointer leaving the window (same rationale as
    // DiagPanel's divider).
    const handle = e.currentTarget;
    const { pointerId } = e;
    try { handle.setPointerCapture(pointerId); } catch { /* ignore */ }

    const maxWidth = Math.floor(rowRect.width * 0.5);
    const onMove = (moveEvt) => {
      if (moveEvt.pointerId !== pointerId) return;
      const rawWidth = rowRect.right - moveEvt.clientX;
      setRhsWidth(Math.max(MIN_RHS_PX, Math.min(rawWidth, maxWidth)));
    };
    const onUp = (upEvt) => {
      if (upEvt.pointerId !== pointerId) return;
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      try { handle.releasePointerCapture(pointerId); } catch { /* ignore */ }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }, []);

  return (
    <div style={centerStage}>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open Split Drawer
      </Button>
      {open && (
        <Drawer
          title="Diagnosis Gaps Details"
          onClose={() => { setOpen(false); setRhsWidth(null); }}
          width={1100}
          bodyClassName={splitStyles.splitBody}
        >
          <div ref={rowRef} style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0 }}>
            <div className={splitStyles.leftPane}>
              <span>Document workspace (LHS)</span>
              <span style={{ fontSize: 12 }}>Grows as you drag the divider right</span>
            </div>
            <div
              className={splitStyles.resizeHandle}
              onPointerDown={startResize}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panes"
            />
            <div
              className={splitStyles.rightPane}
              style={rhsWidth != null ? { flex: `0 0 ${rhsWidth}px` } : undefined}
            >
              {/* Banner pinned at the top of the RHS, outside the scrollable
                  body — matches the production DiagPanel layout. */}
              <PatientBanner
                initials="DA"
                name="Devon Alexander"
                gender="Male"
                age="67y 9m"
                memberId="M-1771-3975"
                raf="3.245"
                rafChange="0.221"
              />
              <div className={splitStyles.rightPaneBody}>
                {['E11.65 Type 2 diabetes mellitus', 'N18.3 Chronic kidney disease, stage 3', 'I10 Essential hypertension'].map((title, i) => (
                  <div key={title} className={splitStyles.placeholderCard}>
                    <span className={splitStyles.placeholderTitle}>{title}</span>
                    <Badge variant={i === 0 ? 'toc-oncall' : 'toc-new'} label={i === 0 ? 'Suspect' : 'HCC Linked'} />
                    <span className={splitStyles.placeholderLine} style={{ width: '80%' }} />
                    <span className={splitStyles.placeholderLine} style={{ width: '55%' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}

export const SplitPanesWithDragHandle = {
  name: 'Split Panes (LHS / RHS + Drag Handle)',
  parameters: {
    docs: {
      description: {
        story:
          'Two-pane drawer body with a draggable divider — the layout used by the HCC worklist’s Diagnosis Gaps drawer (document workspace left, ICD cards right). Drag the 1px divider to resize: the drag uses pointer capture so it survives leaving the window, and the right pane is clamped between 380px and half the drawer. Hovering the divider shows the grip; the visible line stays 1px so the panes sit flush.',
      },
    },
  },
  render: () => <SplitPanesDemo />,
};

export const WithPatientBanner = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div style={centerStage}>
        <Button variant="primary" onClick={() => setOpen(true)}>
          Open Drawer
        </Button>
        {open && (
          <Drawer
            title="Patient Detail"
            onClose={() => setOpen(false)}
            banner={
              <PatientBanner
                initials="JD"
                name="Jane Doe"
                gender="Female"
                age="67y 2m"
                memberId="#219384756102"
                raf="4.234"
                rafChange="0.512"
                onCall={() => {}}
              />
            }
          >
            <p style={{ color: "var(--neutral-400)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              The same Drawer shell with a <strong>PatientBanner</strong>
              passed via the <code>banner</code> prop — it stacks between the
              header and the body, full-width, hugging the drawer edges. This
              is the canonical layout for patient-context drawers (call queue,
              care-gap review, HCC).
            </p>
          </Drawer>
        )}
      </div>
    );
  },
};
