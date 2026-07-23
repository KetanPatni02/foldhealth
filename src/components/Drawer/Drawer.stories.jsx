import { useState } from "react";
import { Drawer } from "./Drawer";
import { PatientBanner } from "../PatientBanner/PatientBanner";
import { Button } from "../Button/Button";

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
