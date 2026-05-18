// Release Notes email template — modeled on the Figma "Release Notes" design
// (DOB file, node 2001:8780). Produces a Reader-compatible email document that
// the email builder can render and edit. Imported by the seed SQL generator
// (scripts/generate-release-notes-seed.mjs) so the JSON in the seed file and
// the live builder stay in sync.

const BRAND = '#8C5AE2';
const BRAND_DARK = '#5020A0';
const HERO_BG = 'linear-gradient(135deg, #5020A0 0%, #8C5AE2 100%)';
const TEXT_DARK = '#3A485F';
const TEXT_MUTED = '#6F7A90';

// Feature sections — each becomes a heading + paragraph + thumbnail row in
// the body. Keeping them in one array makes it trivial to add/remove without
// hand-editing block ids.
const FEATURES = [
  {
    title: 'Bulk Archive Functionality',
    body: 'Quickly clear your inbox by selecting and archiving multiple emails at once. Save time and stay organized without the hassle of one-by-one actions.',
  },
  {
    title: 'Separate "Sent" Folder for Emails',
    body: 'Keep track of every email you send with a dedicated Sent folder. Easily review past communications, organize them by recipient, and ensure no message goes missing.',
  },
  {
    title: 'Notification Options for Emails',
    body: 'Customize how you stay informed — choose desktop alerts, sound notifications, or in-app banners so the right messages reach you at the right time.',
  },
  {
    title: 'Enhanced Email Handling and Contact Management',
    body: 'Easily organize, group, and reach out to contacts. Streamline your communication with smarter recipient suggestions and lightweight CRM-style tagging.',
  },
  {
    title: 'Home Showcasing Widget – Pro Beta Features',
    body: 'Get an at-a-glance view of your most important workflows. Surface care gaps, follow-ups, and key metrics directly on your home screen.',
  },
  {
    title: 'Imaging Documents from EHR to Print',
    body: 'Pull imaging documents from connected EHRs and send them straight to print — no manual export or conversion required.',
  },
  {
    title: 'Pop-Ups and Submissions for Wearable Data',
    body: 'Capture wearable-device readings through guided pop-ups, then submit them straight into the patient record.',
  },
];

export function buildReleaseNotesDocument({ month = 'JULY-2024', headline = 'Release Notes' } = {}) {
  let n = 0;
  const id = () => `rn-${++n}`;

  const blocks = {};
  const childIds = [];

  // ── Header (gradient hero) ─────────────────────────────────────
  const headerHeadingId = id();
  const headerEyebrowId = id();
  const headerIntroId   = id();
  const headerId        = id();

  blocks[headerEyebrowId] = {
    type: 'Text',
    data: {
      props: { text: headline.toUpperCase() },
      style: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        letterSpacing: 8,
        padding: { top: 24, bottom: 4, left: 24, right: 24 },
      },
    },
  };
  blocks[headerHeadingId] = {
    type: 'Heading',
    data: {
      props: { text: month, level: 'h1' },
      style: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        letterSpacing: 4,
        padding: { top: 0, bottom: 8, left: 24, right: 24 },
      },
    },
  };
  blocks[headerIntroId] = {
    type: 'Text',
    data: {
      props: { text: 'Welcome to the July edition of the Fold Health newsletter. Here\'s what\'s new in your tablespace this month.' },
      style: {
        color: '#FFFFFF',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 1.5,
        padding: { top: 4, bottom: 40, left: 32, right: 32 },
      },
    },
  };
  blocks[headerId] = {
    type: 'Container',
    data: {
      role: 'header',
      style: {
        backgroundImage: HERO_BG,
        backgroundColor: BRAND_DARK,
        padding: { top: 24, bottom: 24, left: 0, right: 0 },
      },
      props: { childrenIds: [headerEyebrowId, headerHeadingId, headerIntroId] },
    },
  };
  childIds.push(headerId);

  // ── Featured "Introducing Fold Sidecar" block ─────────────────
  const sidecarBadgeId = id();
  const sidecarHeadingId = id();
  const sidecarBodyId = id();
  const sidecarCtaId = id();
  const sidecarSpacerId = id();
  const sidecarContainerId = id();

  blocks[sidecarBadgeId] = {
    type: 'Text',
    data: {
      props: { text: '✨ NEW' },
      style: {
        color: BRAND_DARK,
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'left',
        letterSpacing: 4,
        padding: { top: 24, bottom: 4, left: 24, right: 24 },
      },
    },
  };
  blocks[sidecarHeadingId] = {
    type: 'Heading',
    data: {
      props: { text: 'Introducing Fold Sidecar', level: 'h2' },
      style: {
        color: TEXT_DARK,
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'left',
        padding: { top: 4, bottom: 8, left: 24, right: 24 },
      },
    },
  };
  blocks[sidecarBodyId] = {
    type: 'Text',
    data: {
      props: { text: 'This feature aims to integrate essential insights and functionalities from Fold directly into the EHR interface, so that providers can perform necessary tasks without disruption to their workflow.' },
      style: {
        color: TEXT_MUTED,
        fontSize: 14,
        textAlign: 'left',
        lineHeight: 1.6,
        padding: { top: 0, bottom: 16, left: 24, right: 24 },
      },
    },
  };
  blocks[sidecarCtaId] = {
    type: 'Button',
    data: {
      props: {
        text: 'Learn More',
        url: 'https://fold.health',
        size: 'small',
        buttonStyle: 'rounded',
        buttonBackgroundColor: BRAND,
        buttonTextColor: '#FFFFFF',
      },
      style: { padding: { top: 0, bottom: 24, left: 24, right: 24 }, textAlign: 'left' },
    },
  };
  blocks[sidecarSpacerId] = { type: 'Spacer', data: { props: { height: 32 }, style: {} } };
  blocks[sidecarContainerId] = {
    type: 'Container',
    data: {
      style: {
        backgroundColor: '#F2EEFE',
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
      },
      props: { childrenIds: [sidecarBadgeId, sidecarHeadingId, sidecarBodyId, sidecarCtaId, sidecarSpacerId] },
    },
  };
  childIds.push(sidecarContainerId);

  // ── Feature sections ──────────────────────────────────────────
  for (const feature of FEATURES) {
    const featHeading = id();
    const featBody = id();
    const featLink = id();
    const featDivider = id();
    blocks[featHeading] = {
      type: 'Heading',
      data: {
        props: { text: feature.title, level: 'h3' },
        style: {
          color: TEXT_DARK,
          fontSize: 16,
          fontWeight: 'bold',
          textAlign: 'left',
          padding: { top: 24, bottom: 8, left: 24, right: 24 },
        },
      },
    };
    blocks[featBody] = {
      type: 'Text',
      data: {
        props: { text: feature.body },
        style: {
          color: TEXT_MUTED,
          fontSize: 14,
          textAlign: 'left',
          lineHeight: 1.6,
          padding: { top: 0, bottom: 8, left: 24, right: 24 },
        },
      },
    };
    blocks[featLink] = {
      type: 'Text',
      data: {
        props: { text: 'Learn More →' },
        style: {
          color: BRAND,
          fontSize: 13,
          fontWeight: 'bold',
          textAlign: 'left',
          padding: { top: 0, bottom: 16, left: 24, right: 24 },
        },
      },
    };
    blocks[featDivider] = {
      type: 'Divider',
      data: {
        props: { lineColor: '#E9ECF1', lineHeight: 1 },
        style: { padding: { top: 0, bottom: 0, left: 24, right: 24 } },
      },
    };
    childIds.push(featHeading, featBody, featLink, featDivider);
  }

  // ── Additional Features card ──────────────────────────────────
  const addlEyebrowId = id();
  const addlHeadingId = id();
  const addlListId = id();
  const addlContainerId = id();

  blocks[addlEyebrowId] = {
    type: 'Text',
    data: {
      props: { text: 'ALSO IN THIS RELEASE' },
      style: {
        color: BRAND_DARK,
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'left',
        letterSpacing: 4,
        padding: { top: 24, bottom: 4, left: 24, right: 24 },
      },
    },
  };
  blocks[addlHeadingId] = {
    type: 'Heading',
    data: {
      props: { text: 'Additional Features', level: 'h3' },
      style: {
        color: TEXT_DARK,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'left',
        padding: { top: 4, bottom: 8, left: 24, right: 24 },
      },
    },
  };
  blocks[addlListId] = {
    type: 'Text',
    data: {
      props: { text: '• Inbox auto-categorization based on patient context\n• Smart reply suggestions for routine outreach\n• Faster cold-start performance on first sign-in\n• Improved keyboard shortcuts across the app\n• Theme picker — light, dark, and high-contrast' },
      style: {
        color: TEXT_MUTED,
        fontSize: 14,
        textAlign: 'left',
        lineHeight: 1.8,
        padding: { top: 0, bottom: 24, left: 24, right: 24 },
      },
    },
  };
  blocks[addlContainerId] = {
    type: 'Container',
    data: {
      style: {
        backgroundColor: '#FCFAFF',
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
      },
      props: { childrenIds: [addlEyebrowId, addlHeadingId, addlListId] },
    },
  };
  childIds.push(addlContainerId);

  // ── Footer (gradient sign-off) ─────────────────────────────────
  const footerEyebrowId = id();
  const footerHeadingId = id();
  const footerTextId = id();
  const footerId = id();
  blocks[footerEyebrowId] = {
    type: 'Text',
    data: {
      props: { text: 'FROM TEAM' },
      style: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
        letterSpacing: 4,
        padding: { top: 32, bottom: 4, left: 24, right: 24 },
      },
    },
  };
  blocks[footerHeadingId] = {
    type: 'Heading',
    data: {
      props: { text: 'Fold Health', level: 'h3' },
      style: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        padding: { top: 0, bottom: 12, left: 24, right: 24 },
      },
    },
  };
  blocks[footerTextId] = {
    type: 'Text',
    data: {
      props: { text: 'Need help? Our support team is here for you at customers@fold.care.' },
      style: {
        color: '#FFFFFF',
        fontSize: 13,
        textAlign: 'center',
        padding: { top: 0, bottom: 32, left: 32, right: 32 },
      },
    },
  };
  blocks[footerId] = {
    type: 'Container',
    data: {
      role: 'footer',
      style: {
        backgroundImage: HERO_BG,
        backgroundColor: BRAND_DARK,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
      },
      props: { childrenIds: [footerEyebrowId, footerHeadingId, footerTextId] },
    },
  };
  childIds.push(footerId);

  // ── Root ──────────────────────────────────────────────────────
  return {
    root: {
      type: 'EmailLayout',
      data: {
        backdropColor: '#F2EEFE',
        canvasColor: '#FFFFFF',
        textColor: TEXT_DARK,
        fontFamily: 'MODERN_SANS',
        childrenIds: childIds,
      },
    },
    ...blocks,
  };
}
