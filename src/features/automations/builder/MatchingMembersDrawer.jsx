import { useMemo, useState } from 'react';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Input } from '../../../components/Input/Input';
import { Avatar } from '../../../components/Avatar/Avatar';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import { initialsOf } from '../analytics/analyticsUi';
import styles from './AutomationBuilder.module.css';

const LIMIT = 200;

/**
 * The members the condition's filters currently keep, opened from the
 * "N of M members match" count. Read-only: it shows who the automation
 * would continue for, so the filters can be checked before saving.
 */
export function MatchingMembersDrawer({ members, total, sample, onClose }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => (q
    ? members.filter(p => [p.name, p.memberId, p.email].some(v => String(v || '').toLowerCase().includes(q)))
    : members), [members, q]);

  return (
    <Drawer title="Matching members" onClose={onClose}>
      <div className={styles.drawerBody}>
        <Input
          type="search"
          leadingIcon="solar:magnifer-linear"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, member ID or email"
          aria-label="Search by name, member ID or email"
        />
        <span className={styles.membersMeta}>
          {members.length.toLocaleString()} of {total.toLocaleString()} members match
          {sample && ' (sample data)'}
          {q && ` · ${shown.length.toLocaleString()} found`}
        </span>
        {shown.length === 0 ? (
          <EmptyState
            size="sm"
            icon="solar:user-cross-linear"
            title={q ? `No matching members found for “${query.trim()}”` : 'No members match these filters'}
          />
        ) : (
          <ul className={styles.membersList}>
            {shown.slice(0, LIMIT).map(p => (
              <li key={p.id} className={styles.memberRow}>
                <Avatar variant="patient" size="M" initials={p.initials || initialsOf(p.name)} />
                <span className={styles.memberText}>
                  <span className={styles.memberName}>{p.name || 'Unknown member'}</span>
                  <span className={styles.memberSub}>
                    {[p.memberId, [p.gender, p.age != null ? `${p.age}y` : null].filter(Boolean).join(', '), p.city || p.location]
                      .filter(Boolean).join(' • ')}
                  </span>
                </span>
              </li>
            ))}
            {shown.length > LIMIT && (
              <li className={styles.membersMeta}>Showing the first {LIMIT}. Search to find others.</li>
            )}
          </ul>
        )}
      </div>
    </Drawer>
  );
}
