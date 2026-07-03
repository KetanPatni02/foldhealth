import { useState, useMemo, useEffect } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { Badge } from '../../../components/Badge/Badge';
import { Drawer } from '../../../components/Drawer/Drawer';
import { TimelineEntry, groupByMonth } from '../../../components/Timeline/Timeline';
import { useAppStore } from '../../../store/useAppStore';
import { supabase } from '../../../lib/supabase';

// TimelineEntry's `details` falls back from the explicit field to a
// composed string. Audit-log entries set `details` already; the inline
// computation that used to live here ("created Foo") is now a per-entry
// concern handled before the entries reach the timeline.

/* ── Main Drawer ── */
/**
 * AuditLogContent — reusable audit log timeline with filters.
 * Can be embedded inside any container (drawer tab, panel, etc.)
 */
export function AuditLogContent({ entityType, entityId }) {
  const fetchAuditLogs = useAppStore(s => s.fetchAuditLogs);
  const [filter, setFilter] = useState('all');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data?.user?.user_metadata || {};
      if (meta.first_name && meta.last_name) setCurrentUserName(`${meta.first_name} ${meta.last_name}`);
      else if (meta.full_name) setCurrentUserName(meta.full_name);
      else if (data?.user?.email) setCurrentUserName(data.user.email.split('@')[0]);
    });
  }, []);

  useEffect(() => {
    if (!entityType || !entityId) return;
    setLoading(true);
    fetchAuditLogs(entityType, entityId).then(logs => {
      setEntries(logs);
      setLoading(false);
    });
  }, [entityType, entityId, fetchAuditLogs]);

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter(e => e.action === filter);
  }, [entries, filter]);

  const monthGroups = useMemo(() => groupByMonth(filteredEntries), [filteredEntries]);
  const FILTERS = ['all', 'created', 'updated', 'enabled', 'disabled', 'deleted'];

  return (
    <div style={{ padding: '12px 0' }}>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <Icon name="custom:filter" size={16} color="var(--neutral-300)" />
        {FILTERS.map(f => {
          const active = filter === f;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '4px 8px', borderRadius: 4, fontSize: 12,
              border: `0.5px solid ${active ? 'var(--primary-300)' : 'var(--neutral-150)'}`,
              background: active ? 'var(--primary-50)' : 'var(--neutral-0)',
              color: active ? 'var(--primary-300)' : 'var(--neutral-300)',
              cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontWeight: active ? 500 : 400,
              textTransform: 'capitalize', whiteSpace: 'nowrap',
            }}>{f === 'all' ? 'All' : f}</button>
          );
        })}
        {filter !== 'all' && (
          <button onClick={() => setFilter('all')} style={{
            fontSize: 12, color: 'var(--primary-300)', background: 'none', border: 'none',
            cursor: 'pointer', fontFamily: "'Inter', sans-serif", padding: '4px 0',
          }}>Clear All</button>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--neutral-300)' }}>
          <div style={{ fontSize: 14 }}>Loading audit log...</div>
        </div>
      )}

      {!loading && (
        <div>
          {monthGroups.map((group, gi) => (
            <div key={gi}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 2px', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-400)' }}>{group.label}</span>
                <Icon name="solar:alt-arrow-down-linear" size={13} color="var(--neutral-200)" />
              </div>
              {group.entries.map((entry, ei) => (
                <TimelineEntry
                  key={entry.id}
                  entry={{ ...entry, details: entry.details || `${entry.action} ${entry.entityName}` }}
                  isFirst={gi === 0 && ei === 0}
                  isLast={gi === monthGroups.length - 1 && ei === group.entries.length - 1}
                  currentUserName={currentUserName}
                />
              ))}
            </div>
          ))}
          {filteredEntries.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 16px', color: 'var(--neutral-300)' }}>
              <Icon name="solar:history-linear" size={32} color="var(--neutral-150)" />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-300)' }}>No entries found</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  {filter !== 'all' ? 'Try adjusting your filter.' : 'Activity will appear here as actions are taken.'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AuditLogDrawer({ entity, onClose }) {
  const fetchAuditLogs = useAppStore(s => s.fetchAuditLogs);
  const [filter, setFilter] = useState('all');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState('');

  // Get current user name for "(Current User)" label
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data?.user?.user_metadata || {};
      if (meta.first_name && meta.last_name) setCurrentUserName(`${meta.first_name} ${meta.last_name}`);
      else if (meta.full_name) setCurrentUserName(meta.full_name);
      else if (data?.user?.email) setCurrentUserName(data.user.email.split('@')[0]);
    });
  }, []);

  // Fetch real audit log data from Supabase
  useEffect(() => {
    if (!entity) return;
    setLoading(true);
    fetchAuditLogs(entity.type, entity.id).then(logs => {
      setEntries(logs);
      setLoading(false);
    });
  }, [entity, fetchAuditLogs]);

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter(e => e.action === filter);
  }, [entries, filter]);

  const monthGroups = useMemo(() => groupByMonth(filteredEntries), [filteredEntries]);

  const FILTERS = ['all', 'created', 'updated', 'enabled', 'disabled', 'deleted', 'previewed'];

  const title = entity?.type === 'Domain'
    ? `Audit Log — ${entity.domain || entity.name}`
    : `Audit Log — ${entity?.name}`;

  return (
    <Drawer title={title} onClose={onClose}>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <Icon name="custom:filter" size={16} color="var(--neutral-300)" />
        {FILTERS.map(f => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 8px', borderRadius: 4, fontSize: 12,
                border: `0.5px solid ${active ? 'var(--primary-300)' : 'var(--neutral-150)'}`,
                background: active ? 'var(--primary-50)' : 'var(--neutral-0)',
                color: active ? 'var(--primary-300)' : 'var(--neutral-300)',
                cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontWeight: active ? 500 : 400,
                textTransform: 'capitalize', whiteSpace: 'nowrap',
              }}
            >
              {f === 'all' ? 'All' : f}
            </button>
          );
        })}
        {filter !== 'all' && (
          <button onClick={() => setFilter('all')} style={{
            fontSize: 12, color: 'var(--primary-300)', background: 'none', border: 'none',
            cursor: 'pointer', fontFamily: "'Inter', sans-serif", padding: '4px 0',
          }}>
            Clear All
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--neutral-300)' }}>
          <div style={{ fontSize: 14 }}>Loading audit log...</div>
        </div>
      )}

      {/* Timeline */}
      {!loading && (
        <div style={{ padding: '0 0 4px 0' }}>
          {monthGroups.map((group, gi) => (
            <div key={gi}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 2px', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-400)' }}>{group.label}</span>
                <Icon name="solar:alt-arrow-down-linear" size={13} color="var(--neutral-200)" />
              </div>
              {group.entries.map((entry, ei) => (
                <TimelineEntry
                  key={entry.id}
                  entry={{ ...entry, details: entry.details || `${entry.action} ${entry.entityName}` }}
                  isFirst={gi === 0 && ei === 0}
                  isLast={gi === monthGroups.length - 1 && ei === group.entries.length - 1}
                  currentUserName={currentUserName}
                />
              ))}
            </div>
          ))}

          {filteredEntries.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 16px', color: 'var(--neutral-300)' }}>
              <Icon name="solar:history-linear" size={32} color="var(--neutral-150)" />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-300)' }}>No entries found</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  {filter !== 'all' ? 'Try adjusting your filter.' : 'Activity will appear here as actions are taken.'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
