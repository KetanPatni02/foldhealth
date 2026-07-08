import { useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { ProgressRing } from '../../hcc/DiagPanel/ReviewProgressPopover';
import { CARE_PROGRAMS_MOCK, CP_SUB_TABS, CP_FILTERS } from '../data/programActivityMock';
import { useAppStore } from '../../../store/useAppStore';
import { ProgramDetailView } from './ProgramDetailView';
import styles from './CareProgramsTab.module.css';

export function CareProgramsTab() {
  const [activeSubTab, setActiveSubTab] = useState('All');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const showToast = useAppStore(s => s.showToast);

  if (selectedProgram) {
    return <ProgramDetailView program={selectedProgram} onClose={() => setSelectedProgram(null)} />;
  }

  return (
    <div className={styles.view}>
      {/* Sub-tab bar */}
      <div className={styles.subTabBar}>
        <div className={styles.subTabs}>
          <ActionButton icon="solar:magnifer-linear" size="S" tooltip="Search" />
          <span style={{ width: 0.5, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />
          {CP_SUB_TABS.map(tab => (
            <button
              key={tab}
              className={`${styles.subTab} ${activeSubTab === tab ? styles.subTabActive : ''}`}
              onClick={() => setActiveSubTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <button className={styles.newProgramBtn} onClick={() => showToast('New Program — coming soon')}>
          <Icon name="solar:add-circle-linear" size={16} color="var(--primary-300)" />
          New Program
        </button>
        <span style={{ width: 0.5, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />
        <ActionButton icon="solar:filter-linear" size="S" tooltip="Filter" />
      </div>

      {/* Filter badges */}
      <div className={styles.filterBar}>
        {CP_FILTERS.map(f => (
          <button key={f.key} className={styles.filterChip}>
            {f.label}
            <Icon name="solar:alt-arrow-down-linear" size={16} color="var(--neutral-300)" />
          </button>
        ))}
        <button className={styles.clearAll}>
          <Icon name="solar:backspace-linear" size={16} color="var(--primary-300)" />
          Clear All
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkCell}><input type="checkbox" className={styles.checkbox} /></th>
              <th className={styles.programCell}>Program Name</th>
              <th className={styles.statusCell}>Status</th>
              <th className={styles.dateCell}>Start Date</th>
              <th className={styles.dateCell}>End Date</th>
              <th className={styles.dateCell}>Last Updated</th>
              <th className={styles.assigneeCell}>Assignee</th>
              <th className={styles.pcpCell}>PCP</th>
            </tr>
          </thead>
          <tbody>
            {CARE_PROGRAMS_MOCK.map(p => (
              <tr key={p.id} className={styles.clickableRow} onClick={() => setSelectedProgram(p)}>
                <td className={styles.checkCell}><input type="checkbox" className={styles.checkbox} onClick={e => e.stopPropagation()} /></td>
                <td className={styles.programCell}>
                  <div className={styles.programName}>
                    <ProgressRing progress={p.progress} size={16} stroke={2} />
                    <div className={styles.nameBlock}>
                      <span className={styles.nameText}>{p.name}</span>
                      {p.acuity && <span className={styles.acuityText}>Acuity : {p.acuity}</span>}
                    </div>
                  </div>
                </td>
                <td className={styles.statusCell}>
                  <button className={styles.statusBtn} style={{ color: p.statusColor }}>
                    {p.status}
                    <Icon name="solar:alt-arrow-down-linear" size={16} color={p.statusColor} />
                  </button>
                </td>
                <td className={styles.dateCell}>{p.startDate}</td>
                <td className={styles.dateCell}>{p.endDate}</td>
                <td className={styles.dateCell}>{p.lastUpdated}</td>
                <td className={styles.assigneeCell}>{p.assignee}</td>
                <td className={styles.pcpCell}>{p.pcp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

