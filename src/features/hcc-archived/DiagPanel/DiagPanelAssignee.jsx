import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../../store/useAppStore';
import { Icon } from '../../../components/Icon/Icon';
import { Avatar } from '../../../components/Avatar/Avatar';
import { RoleAssigneePicker } from '../RoleAssigneePicker';
import { ROLE_LABEL } from '../assignment/astranaStaff';
import styles from './DiagPanel.module.css';

  const [pos, setPos] = useState(null);
  const teams = useAppStore(s => s.hccCareTeams);
  const reassign = useAppStore(s => s.hccReassignRole);
  const showToast = useAppStore(s => s.showToast);

  const candidates = useMemo(
    () => buildAssignCandidates(teams, role),
    [teams, role],
  );

  useEffect(() => {
    if (!pos) return;
    const onDoc = (e) => {
      if (!btnRef.current?.contains(e.target)
          && !e.target.closest?.('[data-assign-menu]')) setPos(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setPos(null); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [pos]);

  const open = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 4, left: Math.max(8, r.right - 280) });
  };
  const onPick = (cand) => {
    if (!memberId || !dosDate) {
      showToast('Cannot assign — missing DOS context.');
      setPos(null);
      return;
    }
    reassign(memberId, dosDate, role, cand.id, 'current-user', 'Assigned from DiagPanel');
    showToast(`${cand.name} assigned as ${ROLE_LABEL[role]}.`);
    setPos(null);
  };

  return (
    <RoleTooltip
      name="Unassigned"
      role={`Awaiting ${ROLE_LABEL[role] || role} — click to assign`}
      initials="—"
      variant="staff"
    >
      <button
        type="button"
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); pos ? setPos(null) : open(); }}
        style={{
          width: 24, height: 24, borderRadius: 6,
          background: 'var(--neutral-50)',
          border: '0.5px dashed var(--neutral-200)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, cursor: 'pointer', padding: 0,
        }}
      >
        <Icon name="solar:user-plus-rounded-linear" size={14} color="var(--neutral-300)" />
      </button>
      {pos && createPortal(
        <div
          data-assign-menu
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
            minWidth: 280, maxHeight: 280, overflowY: 'auto',
            background: 'var(--neutral-0)',
            border: '0.5px solid var(--neutral-150)',
            borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            padding: 4, fontFamily: 'Inter, sans-serif',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            fontSize: 12, fontWeight: 500, color: 'var(--neutral-400)',
            padding: '6px 8px', borderBottom: '0.5px solid var(--neutral-100)',
            marginBottom: 4,
          }}>
            Assign {ROLE_LABEL[role]}
          </div>
          {candidates.length === 0 ? (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--neutral-300)', textAlign: 'center' }}>
              No candidates available.
            </div>
          ) : candidates.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 8px', border: 'none', background: 'transparent',
                borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                width: '100%', fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-50)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Avatar variant="assignee" initials={c.initials} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--neutral-500)' }}>
                {c.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--neutral-300)' }}>
                {c.source === 'team' ? `Team: ${c.teamName}` : c.roles}
              </span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </RoleTooltip>
  );
}

export function AssigneeAvatar({ member, dosState, currentDos }) {
  const a = resolveCurrentAssignee(member, dosState);
  if (!a) return null;
  // Unassigned slot is interactive — opens a candidate picker so the user
  // can assign someone from this exact spot. Lives in its own subcomponent
  // because of the portal + outside-click bookkeeping.
  if (a.kind === 'unassigned') {
    return <UnassignedAssignTrigger role={a.role} memberId={member?.id} dosDate={currentDos} />;
  }

  // Billing Ready — every stage completed. Green check chip, no person.
  if (a.kind === 'billing') {
    return (
      <RoleTooltip name="Billing Ready" role="All reviews complete" initials="✓" variant="staff">
        <span
          style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'var(--status-success-light)',
            border: '0.5px solid rgba(0, 155, 83, 0.3)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: 'var(--status-success)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <Icon name="solar:check-circle-bold" size={14} color="var(--status-success)" />
        </span>
      </RoleTooltip>
    );
  }

  // Active assignee — colour the chip per role (Coder/Reviewers = orange
  // provider palette, Support stays purple to match the worklist's coder
  // vs support distinction).
  const isSupport = a.role === 'support';
  const bg = isSupport ? 'var(--primary-50)'  : 'var(--secondary-100)';
  const border = isSupport ? 'var(--primary-200)' : 'var(--secondary-200)';
  const color = isSupport ? 'var(--primary-300)' : 'var(--secondary-300)';
  return (
    <RoleTooltip
      name={a.name}
      role={ROLE_LABEL[a.role] || a.role}
      initials={a.initials}
      variant={isSupport ? 'patient' : 'provider'}
    >
      <span
        style={{
          width: 24, height: 24, borderRadius: 6,
          background: bg, border: `0.5px solid ${border}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 10, fontWeight: 500, color,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {a.initials}
      </span>
    </RoleTooltip>
  );
}

const isAISuggested = (icd) => ['Suspect', 'Recapture'].includes(icd.type || '');

const groupAllIcds = (g) => [...g.assoc, ...g.unlinked];
const isGroupIcdOpen = (i) => !['Dismissed', 'Accepted'].includes(i.status);

export function buildAssignCandidates(teams, role) {