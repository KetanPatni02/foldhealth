import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../../components/Button/Button';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Badge } from '../../../components/Badge/Badge';
import { Icon } from '../../../components/Icon/Icon';
import { Select } from '../../../components/Select/Select';
import { SegmentedControl } from '../../../components/SegmentedControl/SegmentedControl';
import { CloseButton } from '../../../components/CloseButton/CloseButton';
import { ASTRANA_STAFF, ROLE_LABEL } from '../assignment/astranaStaff';
import { HccLogOutreachDrawer } from '../HccLogOutreachDrawer';
import { PcpOutreachDrawer } from './PcpOutreachDrawer';
import { PCP_CALL_OUR_LINES } from './pcpOutreach';
import { callTargets } from './callTargets';
import styles from './HccCallWidget.module.css';

const KINDS = [
  { key: 'member', label: 'Member' },
  { key: 'pcp', label: 'PCP' },
  { key: 'user', label: 'User' },
];
const KIND_LABEL = { member: 'Member', pcp: 'PCP', user: 'User' };

const clock = (secs) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

/**
 * HCC worklist call widget (bottom right). The phone button opens Make a
 * Call: pick a Member, a PCP or a User and our line, then Call. The call card
 * (drag it anywhere) has Mute, Hold, End Call and, for a Member or PCP, Log
 * Outreach, which opens that outreach drawer on the call; the card then moves
 * to the drawer's left. Ending fills the form's Duration so the outreach can
 * be finished and saved. Calls here are simulated (no dialer).
 */
export function HccCallWidget() {
  const members = useAppStore(s => s.hccMembers);
  const call = useAppStore(s => s.hccLiveCall);
  const startCall = useAppStore(s => s.startHccLiveCall);
  const endCall = useAppStore(s => s.endHccLiveCall);
  const clearCall = useAppStore(s => s.clearHccLiveCall);

  const [panelOpen, setPanelOpen] = useState(false);
  const [kind, setKind] = useState('member');
  const [target, setTarget] = useState('');
  const [via, setVia] = useState(PCP_CALL_OUR_LINES[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  // Where the call card was dragged to ({ x, y } from the top left), or null
  // for its dock: bottom right, or left of the outreach drawer when open.
  const [cardPos, setCardPos] = useState(null);
  const cardRef = useRef(null);
  const startDrag = (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const rect = cardRef.current.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    const move = (ev) => {
      const x = Math.min(Math.max(0, ev.clientX - dx), window.innerWidth - rect.width);
      const y = Math.min(Math.max(0, ev.clientY - dy), window.innerHeight - rect.height);
      setCardPos({ x, y });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    e.preventDefault();
  };
  const openDrawer = () => {
    setDrawerOpen(true);
    setCardPos(null); // back to its dock, now beside the drawer
  };

  const staff = useMemo(() => ASTRANA_STAFF.filter(s => s.active).map(s => ({ ...s, roleLabel: ROLE_LABEL[s.role] })), []);
  const targets = useMemo(() => callTargets(kind, members, staff), [kind, members, staff]);
  const picked = targets.find(t => t.key === target);

  // The live call's clock: ticks while the call is on.
  const live = call && !call.endedAt;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live]);
  const elapsed = call ? Math.max(0, Math.round(((call.endedAt || now) - call.startedAt) / 1000)) : 0;

  const placeCall = () => {
    if (!picked) return;
    startCall({ kind, name: picked.name, number: picked.number, via, member: picked.member || null, pcp: picked.pcp || null });
    setNow(Date.now());
    setPanelOpen(false);
    setTarget('');
    setMuted(false);
    setHeld(false);
    setCardPos(null);
  };

  const hangUp = () => {
    endCall();
    // A call to a colleague isn't outreach: nothing to log, so it just ends.
    if (call?.kind === 'user') clearCall();
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    if (call?.endedAt) clearCall();
  };

  const liveCallEnd = call?.endedAt ? { id: call.id, durationSec: (call.endedAt - call.startedAt) / 1000 } : null;

  return (
    <>
      {drawerOpen && call?.kind === 'member' && call.member && (
        <HccLogOutreachDrawer
          member={call.member}
          onClose={closeDrawer}
          callPrefill={{ callType: 'Member', via: call.via, to: `${call.member.name} (Member)` }}
          liveCallEnd={liveCallEnd}
        />
      )}
      {drawerOpen && call?.kind === 'pcp' && (
        <PcpOutreachDrawer
          onClose={closeDrawer}
          initialPcp={call.pcp}
          callPrefill={{ via: call.via, to: `${call.pcp} (PCP)` }}
          liveCallEnd={liveCallEnd}
        />
      )}

      {live ? (
        <div
          ref={cardRef}
          className={`${styles.callCard} ${drawerOpen ? styles.callCardBesideDrawer : ''}`}
          style={cardPos ? { left: cardPos.x, top: cardPos.y, right: 'auto', bottom: 'auto' } : undefined}
          onPointerDown={startDrag}
          role="status"
          aria-live="polite"
        >
          <div className={styles.callHead}>
            <span className={styles.liveDot} aria-hidden="true" />
            <span className={styles.callStatus}>{held ? 'On Hold' : 'On Call'}</span>
            <span className={styles.callClock}>{clock(elapsed)}</span>
          </div>
          <div className={styles.callWho}>
            <span className={styles.callName}>{call.name}</span>
            <Badge size="sm" tone="neutral" label={KIND_LABEL[call.kind]} />
          </div>
          <span className={styles.callMeta}>{call.number} · Via {call.via}</span>
          <div className={styles.callActions}>
            <ActionButton icon="solar:microphone-3-linear" tooltip={muted ? 'Unmute' : 'Mute'} active={muted} onClick={() => setMuted(v => !v)} />
            <ActionButton icon={held ? 'solar:play-linear' : 'solar:pause-linear'} tooltip={held ? 'Resume' : 'Hold'} active={held} onClick={() => setHeld(v => !v)} />
            {call.kind !== 'user' && !drawerOpen && (
              <Button variant="ghost" size="sm" leadingIcon="custom:outreach" onClick={openDrawer}>Log Outreach</Button>
            )}
            <span className={styles.grow} />
            <Button tone="danger" size="sm" leadingIcon="solar:end-call-linear" onClick={hangUp}>End Call</Button>
          </div>
        </div>
      ) : (
        <>
          {panelOpen && (
            <div className={styles.panel} role="dialog" aria-label="Make a call">
              <div className={styles.panelHead}>
                <span className={styles.panelTitle}>Make a Call</span>
                <CloseButton size={14} onClick={() => setPanelOpen(false)} label="Close" />
              </div>
              <SegmentedControl items={KINDS} value={kind} onValueChange={(k) => { setKind(k); setTarget(''); }} size="sm" />
              <Select
                label="Call to"
                searchable
                placeholder={`Search ${KIND_LABEL[kind] === 'User' ? 'users' : `${KIND_LABEL[kind]}s`}`}
                options={targets.map(t => ({ value: t.key, label: `${t.name} · ${t.number}` }))}
                value={target}
                onValueChange={setTarget}
              />
              <Select label="Call via" options={PCP_CALL_OUR_LINES.map(l => ({ value: l, label: l }))} value={via} onValueChange={setVia} />
              <Button leadingIcon="solar:phone-calling-linear" disabled={!picked} onClick={placeCall}>Call</Button>
            </div>
          )}
          <button
            type="button"
            className={styles.fab}
            aria-label={panelOpen ? 'Close call panel' : 'Make a call'}
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen(v => !v)}
          >
            <Icon name={panelOpen ? 'solar:close-linear' : 'solar:phone-calling-linear'} size={22} color="var(--neutral-0)" />
          </button>
        </>
      )}
    </>
  );
}
