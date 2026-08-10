// React Doctor config. `defineConfig` from the package isn't resolvable
// through react-doctor's own config loader (CJS interop), so we export a
// plain object — it's just an identity helper anyway.
export default {
  ignore: {
    rules: [
      // ── Deferred migration-scale rules (2026-08) ────────────────────────
      // Each of these spans dozens-to-hundreds of sites; fixing them blind in
      // one pass is riskier than the warnings themselves. Re-enable one at a
      // time when there's appetite for a dedicated migration PR.
      'react-doctor/no-array-index-as-key',      // 204 sites — key changes alter list reconciliation
      'react-doctor/exhaustive-deps',            // 72 sites — dep additions can loop/change behavior
      'react-doctor/prefer-useReducer',          // pure refactor preference
      'react-doctor/prefer-use-effect-event',    // needs React experimental useEffectEvent
      // ── Accepted codebase patterns (verified by reading the sites) ──────
      // Deliberate orchestration idioms used consistently across the app:
      // reset-dialog-state-on-open, pagination reset → fetch effect,
      // publish-save-API-to-drawer-header, load state machines. Restructuring
      // them is architecture work, not a lint fix.
      'react-doctor/no-adjust-state-on-prop-change',
      'react-doctor/no-effect-chain',
      'react-doctor/no-reset-all-state-on-prop-change',
      'react-doctor/no-pass-live-state-to-parent',
      'react-doctor/no-pass-data-to-parent',
      'react-doctor/no-prop-callback-in-effect',
      // Every localStorage read in this repo goes through a try/catch +
      // shape-check helper with a default fallback (_readJson etc.), so a
      // payload shape change degrades to defaults instead of crashing —
      // version envelopes would add migration risk for no real safety gain.
      'react-doctor/client-localstorage-no-version',
    ],
    // Non-source paths that inflate the scan. `.claude/worktrees/**` holds
    // full duplicate copies of the repo (incl. raw supabase SQL), which is
    // what drags the score to 0. Matched relative to the repo root.
    files: [
      '.claude/**',
      '.kiro/**',
      '.agents/**',
      'dist/**',
      'storybook-static/**',
      'docs/**',
    ],
    // False positives for supabase-client-owned-authz-field, verified by
    // reading each site: a realtime typing-broadcast compare (no DB write),
    // a read/derive of `role` for display, and an HCC worklist column
    // selector also named `role` (not an auth role).
    overrides: [
      { files: ['src/features/messages/ChatArea.jsx'], rules: ['react-doctor/supabase-client-owned-authz-field'] },
      { files: ['src/features/settings/account/AccountPanel.jsx'], rules: ['react-doctor/supabase-client-owned-authz-field'] },
      { files: ['src/store/useAppStore.js'], rules: ['react-doctor/supabase-client-owned-authz-field'] },

      // no-impure-state-updater false positives: `onTriggerEnter(recordRect)`
      // is a custom hover-delay helper, not a React state setter — the rule
      // mis-flags `recordRect`'s getBoundingClientRect as an impure updater.
      {
        files: [
          'src/features/hcc/RowPopovers.jsx',
          'src/features/hcc-archived/RowPopovers.jsx',
        ],
        rules: ['react-doctor/no-impure-state-updater'],
      },

      // effect-needs-cleanup: each of these effects DOES clean up its timers
      // and listeners, but the allocation happens inside a nested callback
      // (a setTimeout/setInterval body), which the rule's static analysis
      // can't pair with the cleanup — so it flags correct code. Verified by
      // reading each: all return a cleanup that clears every timer/listener.
      // (PopulationGroupsView's interval lives in an upload event handler,
      // not an effect, and self-clears on completion.)
      // no-fetch-response-used-without-status-check false positives:
      // SendTestPopover reads the body first ON PURPOSE (to surface the error
      // payload) and checks res.ok right after; the vite dev plugin is a
      // proxy that forwards upstream status + body verbatim.
      { files: ['src/features/email-builder/SendTestPopover.jsx', 'vite-plugin-dev-api.js'], rules: ['react-doctor/no-fetch-response-used-without-status-check'] },

      // no-fetch-in-effect: WelcomeCard's geolocation→weather lookup is a
      // self-contained widget fetch with cancellation + fallback; the repo has
      // no data-fetching layer to move it into.
      { files: ['src/features/home/WelcomeCard.jsx'], rules: ['react-doctor/no-fetch-in-effect'] },

      // no-prevent-default: PreviewCanvas renders the email's own <a> markup
      // inside the WYSIWYG canvas — clicks must select the block, never
      // navigate. Sidebar's anchor is a functioning Help toggle (semantics
      // nit). ActiveCallCard's ↗ is a decorative link styled via a
      // `.patientName a` element selector.
      {
        files: [
          'src/features/email-builder/PreviewCanvas.jsx',
          'src/components/Sidebar/Sidebar.jsx',
          'src/components/ActiveCallCard/ActiveCallCard.jsx',
        ],
        rules: ['react-doctor/no-prevent-default'],
      },

      // ResetPasswordPage deliberately KEEPS loading=true on the success path
      // so the submit button stays disabled through the 900–1200ms redirect
      // timeout (prevents a double-submit that would burn the OTP token).
      // Every failure path resets it — the reset is in a finally, just gated
      // on a `redirecting` flag, which the rule reads as conditional.
      { files: ['src/features/auth/ResetPasswordPage.jsx'], rules: ['react-doctor/no-loading-flag-reset-outside-finally'] },

      // RangeSliderPopover re-seeds its slider values when reopened with a
      // different range — the standard controlled-reopen sync.
      { files: ['src/components/RangeSliderPopover/RangeSliderPopover.jsx'], rules: ['react-doctor/no-derived-state'] },

      {
        files: [
          'src/components/CreateNewPopover/CreateNewPopover.jsx',
          'src/components/HelpPopover/HelpPopover.jsx',
          'src/features/agent-builder/AgentCanvas.jsx',
          'src/features/calendar/CalendarView.jsx',
          'src/features/ccm-worklist/TimeFilterChip.jsx',
          'src/features/email-builder/PreviewCanvas.jsx',
          'src/features/hcc/DiagPanel/LeftWorkspace.jsx',
          'src/features/hcc-archived/DiagPanel/LeftWorkspace.jsx',
          'src/features/patient/shared/widgets/HealthMapWidget/HealthMapWidget.jsx',
          'src/features/population-groups/PopulationGroupsView.jsx',
          'src/features/settings/CreateAgentDrawer.jsx',
        ],
        rules: ['react-doctor/effect-needs-cleanup'],
      },
    ],
  },
};
