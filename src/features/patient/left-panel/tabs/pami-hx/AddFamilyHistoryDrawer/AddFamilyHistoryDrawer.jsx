import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '../../../../../../components/Drawer/Drawer';
import { Select } from '../../../../../../components/Select/Select';
import { CardSkeleton } from '../../../../../../components/CardSkeleton/CardSkeleton';
import { RingEmptyState } from '../../../../../../components/RingEmptyState/RingEmptyState';
import { Link } from '../../../../../../components/Link/Link';
import { AddIconMinimalist } from '../../../../../../components/Icon/AddIconMinimalist';
import { ChronicConditionSelect } from '../../../../../settings/care-plan-library/shared/ChronicConditionSelect/ChronicConditionSelect';
import { useAppStore } from '../../../../../../store/useAppStore';
import { toast } from '../../../../../../components/Toast/sonnerToast';
import { FAMILY_RELATIONS, groupByRelation } from '../../../../../../reference-data/familyRelations';
import { HistoryTable, HistoryDelete, HISTORY_ACTIONS_COLUMN, historyRowClass, historyCellClass } from '../HistoryTable';
import styles from '../AddProblemsDrawer/AddProblemsDrawer.module.css';

const KIND = 'family';

const FAMILY_COLUMNS = [
  { key: 'relation', label: 'Relationship', width: '30%' },
  { key: 'conditions', label: 'Conditions' },
  HISTORY_ACTIONS_COLUMN,
];

/**
 * The table's rows: each condition is its own row, so its delete sits in the
 * Actions column, and each relation ends with a row for Add Condition. The
 * relation is drawn once, on its first row, spanning the rest.
 */
function tableRows(groups) {
  return groups.flatMap(group => [
    ...group.entries.map((entry, i) => ({ id: entry.id, type: 'condition', group, entry, first: i === 0 })),
    { id: `${group.relation}:add`, type: 'add', group, first: group.entries.length === 0 },
  ]);
}

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * A relation's condition search, opened from Add Condition (or by adding the
 * relation) with its menu open, ready to type. Picking saves;
 * Escape or a click anywhere outside it closes it without adding anything.
 * The menu renders inside the wrapper, so picking an option is not a click
 * away.
 */
function ConditionSearch({ onPick, onDismiss }) {
  const ref = useRef(null);
  const dismiss = useRef(onDismiss);
  useEffect(() => { dismiss.current = onDismiss; });

  // Closes on a finished click, not on mousedown: closing on mousedown moves
  // the rows below up before the button is released, so a click on another
  // relation's Add Condition would land somewhere else and do nothing.
  // Listening starts on the next tick, so the click that opened this search
  // doesn't also close it.
  useEffect(() => {
    // The event's path, not contains(): picking an option re-renders the
    // menu away before the click reaches the document, and a detached
    // target would otherwise read as a click outside.
    const onClick = (e) => { if (!e.composedPath().includes(ref.current)) dismiss.current(); };
    const onKey = (e) => { if (e.key === 'Escape') dismiss.current(); };
    const timer = setTimeout(() => {
      document.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey);
    });
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div ref={ref}>
      <ChronicConditionSelect
        label=""
        multiple={false}
        leadingIcon="solar:magnifer-linear"
        placeholder="Search And Add Condition"
        value=""
        defaultOpen
        onChange={onPick}
      />
    </div>
  );
}

/**
 * Add Family History: conditions grouped by relation. Add New Relation puts a
 * relation in the table; each relation then takes conditions from the same
 * NLM conditions lookup as Problems (chronic conditions), and every pick saves
 * as its own entry.
 *
 * A relation is only stored through its conditions, so one just added with
 * none yet lives in this drawer until its first condition is picked.
 *
 * @param {string}   props.patientId
 * @param {function} props.onClose
 */
export function AddFamilyHistoryDrawer({ patientId, onClose }) {
  const records = useAppStore(s => (patientId ? s.patientPamiRecords[patientId] : null));
  const loadedFor = useAppStore(s => (patientId ? s.patientPamiRecordsLoadedFor[patientId] : false));
  const fetchPatientPamiRecords = useAppStore(s => s.fetchPatientPamiRecords);
  const addPatientHistoryEntry = useAppStore(s => s.addPatientHistoryEntry);
  const removePatientHistoryEntry = useAppStore(s => s.removePatientHistoryEntry);
  const [pending, setPending] = useState([]); // relations added, no condition yet
  const [searching, setSearching] = useState(() => new Set()); // relations with the search open
  const openSearch = (relation) => setSearching(s => new Set(s).add(relation));
  const closeSearch = (relation) => setSearching((s) => { const next = new Set(s); next.delete(relation); return next; });

  useEffect(() => {
    if (patientId) fetchPatientPamiRecords(patientId);
  }, [patientId, fetchPatientPamiRecords]);

  const loading = !!patientId && !loadedFor;
  const groups = useMemo(() => {
    const saved = groupByRelation((records?.history || []).filter(h => h.kind === KIND));
    const extra = pending
      .filter(r => !saved.some(g => g.relation === r))
      .map(relation => ({ relation, entries: [] }));
    return [...saved, ...extra];
  }, [records, pending]);

  const relationOptions = FAMILY_RELATIONS
    .filter(r => !groups.some(g => g.relation === r))
    .map(r => ({ value: r, label: r }));

  // Closing a just-added relation's search with nothing picked drops the
  // relation too: it has nothing to keep.
  const dismissSearch = (relation) => {
    closeSearch(relation);
    setPending(p => p.filter(r => r !== relation));
  };

  const addRelation = (relation) => {
    if (!relation) return;
    setPending(p => [...p, relation]);
    openSearch(relation);
  };

  const addCondition = async (relation, name) => {
    if (!name) return;
    const group = groups.find(g => g.relation === relation);
    if (group?.entries.some(e => sameName(e.title, name))) {
      toast.info(`Already in ${relation}'s History`);
      return;
    }
    const ok = await addPatientHistoryEntry(patientId, KIND, { relation, title: name });
    if (!ok) return;
    closeSearch(relation);
    toast.success('Family History Added');
  };

  const remove = (entry) => removePatientHistoryEntry(patientId, entry.id);

  return (
    <Drawer title="Add Family History" onClose={onClose}>
      <div className={styles.body}>
        <div className={styles.addBlock}>
          <span className={styles.addLabel}>Add New Relation</span>
          {/* Always empty: each pick becomes a row in the table below. */}
          <Select
            portal
            searchable
            placeholder="Add New Relation"
            options={relationOptions}
            value=""
            onChange={addRelation}
          />
        </div>

        {loading ? (
          <CardSkeleton rows={3} />
        ) : groups.length === 0 ? (
          <div className={styles.emptyCard}>
            <RingEmptyState icon="custom:family-history" label="No Family History" iconSize={31} />
          </div>
        ) : (
          <HistoryTable
            label="Family history"
            columns={FAMILY_COLUMNS}
            rows={tableRows(groups)}
            renderRow={(row) => {
              const { group } = row;
              const relationCell = row.first && (
                <td rowSpan={group.entries.length + 1} className={`${historyCellClass} ${styles.historyCellTop}`}>
                  {group.relation}
                </td>
              );
              if (row.type === 'condition') {
                return (
                  <tr key={row.id} className={`${historyRowClass} ${styles.famInnerRow}`}>
                    {relationCell}
                    <td className={historyCellClass}>{row.entry.title}</td>
                    <td className={historyCellClass}>
                      <HistoryDelete
                        name={row.entry.title}
                        description={`This removes it from the ${group.relation.toLowerCase()}'s history and can't be undone.`}
                        onRemove={() => remove(row.entry)}
                      />
                    </td>
                  </tr>
                );
              }
              const open = searching.has(group.relation);
              return (
                <tr key={row.id} className={historyRowClass}>
                  {relationCell}
                  <td colSpan={2} className={historyCellClass}>
                    {/* The search opens in place of the link, which drops
                        below it and stays disabled until a condition is
                        picked, or the search is closed (Escape, or a click
                        away). A relation just added starts with it open. */}
                    <div className={styles.famAddCell}>
                      {open && (
                        <ConditionSearch
                          onPick={name => addCondition(group.relation, name)}
                          onDismiss={() => dismissSearch(group.relation)}
                        />
                      )}
                      <span>
                        <Link
                          className={styles.famAddLink}
                          role="button"
                          tabIndex={0}
                          disabled={open}
                          onClick={() => openSearch(group.relation)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSearch(group.relation); } }}
                        >
                          <AddIconMinimalist size={12} color="currentColor" />
                          Add Condition
                        </Link>
                      </span>
                    </div>
                  </td>
                </tr>
              );
            }}
          />
        )}
      </div>
    </Drawer>
  );
}
