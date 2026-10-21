import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../../../../../store/useAppStore';
import { DashboardCardSkeleton } from '../../../../../../components/DashboardCard/DashboardCard';
import { ScheduleDrawer } from '../../../../../../components/ScheduleDrawer/ScheduleDrawer';
import { AddTaskDrawer } from '../../../../../tasks/AddTaskDrawer';
import { NonVisitNoteDrawer } from '../../notes/PatientNotesTab/NonVisitNoteDrawer';
import { SynopsisCard } from '../cards/SynopsisCard';
import { HealthChartCard } from '../cards/HealthChartCard';
import { HighlightsCard } from '../cards/HighlightsCard';
import { SuggestedActionsCard } from '../cards/SuggestedActionsCard';
import { CarePlanCard } from '../cards/CarePlanCard';
import { CareProgramsCard } from '../cards/CareProgramsCard';
import { GapsCard } from '../cards/GapsCard';
import { RecentNotesCard } from '../cards/RecentNotesCard';
import { QuickActionsCard } from '../cards/QuickActionsCard';
import { AppointmentsCard } from '../cards/AppointmentsCard';
import { TasksCard } from '../cards/TasksCard';
import { VitalsCard } from '../cards/VitalsCard';
import { OVERVIEW_COLUMNS, OVERVIEW_COLUMN_TEMPLATE, overviewColumnCount } from './overviewLayout';
import styles from './OverviewTab.module.css';

// Cards fed by the patient_overview row show their real header while it loads.
const OVERVIEW_SKELETONS = {
  synopsis: ['custom:ai', 'Patient Synopsis'],
  healthChart: ['solar:radar-2-linear', 'Health Chart'],
  highlights: ['solar:lightbulb-minimalistic-linear', 'Highlights'],
  suggestedActions: ['custom:ai', 'Suggested Actions'],
  gaps: ['solar:danger-triangle-linear', 'Gaps'],
  vitals: ['solar:heart-pulse-linear', 'Vitals'],
};

function useElementWidth(ref) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

export function OverviewTab({ patient, leftPanelOpen = true }) {
  const rootRef = useRef(null);
  const width = useElementWidth(rootRef);
  const columnCount = width ? overviewColumnCount(width, { leftPanelOpen }) : 1;

  const memberId = patient?.memberId ? String(patient.memberId) : null;
  const overview = useAppStore(s => (memberId ? s.patientOverview[memberId] : undefined));
  const fetchPatientOverview = useAppStore(s => s.fetchPatientOverview);
  const setPatientProfileTab = useAppStore(s => s.setPatientProfileTab);
  const setCareManagementTab = useAppStore(s => s.setCareManagementTab);

  useEffect(() => { if (memberId) fetchPatientOverview(memberId); }, [memberId, fetchPatientOverview]);

  // One open drawer at a time; `onSaved` lets a suggested action mark itself
  // accepted once the appointment is actually booked.
  const [drawer, setDrawer] = useState(null);
  const closeDrawer = useCallback(() => setDrawer(null), []);
  const actions = useMemo(() => ({
    addNote: () => setDrawer({ kind: 'note' }),
    addTask: () => setDrawer({ kind: 'task' }),
    schedule: (opts = {}) => setDrawer({ kind: 'schedule', onSaved: opts.onSaved }),
    openCarePlan: () => {
      setPatientProfileTab('Care Management');
      setCareManagementTab('Comprehensive Care Plan');
    },
  }), [setPatientProfileTab, setCareManagementTab]);

  if (!patient) return null;

  const overviewLoading = overview === undefined;
  const card = (key) => {
    if (overviewLoading && OVERVIEW_SKELETONS[key]) {
      const [icon, title] = OVERVIEW_SKELETONS[key];
      return <DashboardCardSkeleton key={key} icon={icon} title={title} />;
    }
    switch (key) {
      case 'synopsis': return <SynopsisCard key={key} overview={overview} />;
      case 'healthChart': return <HealthChartCard key={key} overview={overview} />;
      case 'highlights': return <HighlightsCard key={key} overview={overview} />;
      case 'suggestedActions': return <SuggestedActionsCard key={key} memberId={memberId} overview={overview} actions={actions} />;
      case 'carePlan': return <CarePlanCard key={key} patientId={patient.id} actions={actions} />;
      case 'carePrograms': return <CareProgramsCard key={key} patientId={patient.id} />;
      case 'gaps': return <GapsCard key={key} overview={overview} actions={actions} />;
      case 'notes': return <RecentNotesCard key={key} patientId={patient.id} actions={actions} />;
      case 'quickActions': return <QuickActionsCard key={key} overview={overview} actions={actions} />;
      case 'appointments': return <AppointmentsCard key={key} patientId={patient.id} />;
      case 'tasks': return <TasksCard key={key} patient={patient} actions={actions} />;
      case 'vitals': return <VitalsCard key={key} overview={overview} />;
      default: return null;
    }
  };

  return (
    <div ref={rootRef} className={styles.overview}>
      <div className={styles.grid} style={{ gridTemplateColumns: OVERVIEW_COLUMN_TEMPLATE[columnCount] }}>
        {OVERVIEW_COLUMNS[columnCount].map(column => (
          <div key={column[0]} className={styles.column}>
            {column.map(card)}
          </div>
        ))}
      </div>

      {drawer?.kind === 'note' && <NonVisitNoteDrawer patient={patient} onClose={closeDrawer} />}
      {drawer?.kind === 'task' && (
        <AddTaskDrawer initialMember={patient.name} onClose={closeDrawer} onTaskCreated={closeDrawer} />
      )}
      {drawer?.kind === 'schedule' && (
        <ScheduleDrawer
          initialPatientId={patient.id}
          source="patient_overview"
          onClose={closeDrawer}
          onSave={(row) => { if (row) drawer.onSaved?.(); }}
        />
      )}    </div>
  );
}
