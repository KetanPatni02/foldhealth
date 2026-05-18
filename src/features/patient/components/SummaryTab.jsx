import { HealthMapWidget } from './HealthMapWidget';
import { PatientSynopsisWidget } from './PatientSynopsisWidget';
import { CareUtilizationWidget } from './CareUtilizationWidget';
import { PriorAuthWidget } from './PriorAuthWidget';
import { PopulationGroupsWidget } from './PopulationGroupsWidget';
import { CareJourneysWidget } from './CareJourneysWidget';
import { SubscriptionWidget } from './SubscriptionWidget';
import { ActiveAutomationsWidget } from './ActiveAutomationsWidget';
import { InsuranceWidget } from './InsuranceWidget';
import styles from './SummaryTab.module.css';

export function SummaryTab() {
  return (
    <div className={styles.wrapper}>
      <HealthMapWidget />
      <PatientSynopsisWidget />
      <CareUtilizationWidget />
      <PriorAuthWidget />
      <PopulationGroupsWidget />
      <CareJourneysWidget />
      <SubscriptionWidget />
      <ActiveAutomationsWidget />
      <InsuranceWidget />
    </div>
  );
}
