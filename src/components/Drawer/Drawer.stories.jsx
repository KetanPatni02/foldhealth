import { useState } from "react";
import { Drawer } from "./Drawer";
import { PatientBanner } from "../PatientBanner/PatientBanner";
import { Button } from "../Button/Button";

export default {
  title: "Layout/Drawer",
  parameters: { layout: "fullscreen" },
};

/**
 * Stories render the Drawer open by default so the panel is visible in the
 * canvas. Closing it reveals a "Reopen Drawer" button to demo the open path.
 */
function DrawerDemo({ title = "Drawer Title", children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ padding: 24, minHeight: "100vh" }}>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Reopen Drawer
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
      <div style={{ padding: 16 }}>
        <p
          style={{ color: "var(--neutral-400)", fontSize: 14, lineHeight: 1.6 }}
        >
          This is the shared Drawer component — 700px wide, 8px inset, 16px
          border-radius. Used across the entire app for all side panels (call
          queue, detail view, preferences, HCC diagnosis review, etc.).
        </p>
        <p style={{ color: "var(--neutral-300)", fontSize: 13, marginTop: 12 }}>
          Click the overlay or the close button to dismiss.
        </p>
      </div>
    </DrawerDemo>
  ),
};

export const WithPatientBanner = {
  render: () => (
    <DrawerDemo title="Patient Detail">
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
      <div style={{ padding: 16 }}>
        <p
          style={{ color: "var(--neutral-400)", fontSize: 14, lineHeight: 1.6 }}
        >
          The same Drawer shell with a <strong>PatientBanner</strong> composed
          at the top of the body — the canonical layout for patient-context
          drawers (call queue, care-gap review, HCC). Use the expand chevron on
          the banner to reveal patient details and synopsis.
        </p>
      </div>
    </DrawerDemo>
  ),
};
