import { HealthMapWidget } from '../../../../shared/widgets/HealthMapWidget/HealthMapWidget.jsx';
import { PatientSynopsisWidget } from '../../../../shared/widgets/PatientSynopsisWidget/PatientSynopsisWidget.jsx';
import { CareUtilizationWidget } from '../../../../shared/widgets/CareUtilizationWidget/CareUtilizationWidget.jsx';
import { PriorAuthWidget } from '../../../../shared/widgets/PriorAuthWidget/PriorAuthWidget.jsx';
import { PopulationGroupsWidget } from '../../../../shared/widgets/PopulationGroupsWidget/PopulationGroupsWidget.jsx';
import { CareJourneysWidget } from '../../../../shared/widgets/CareJourneysWidget/CareJourneysWidget.jsx';
import { SubscriptionWidget } from '../../../../shared/widgets/SubscriptionWidget/SubscriptionWidget.jsx';
import { ActiveAutomationsWidget } from '../../../../shared/widgets/ActiveAutomationsWidget/ActiveAutomationsWidget.jsx';
import { InsuranceWidget } from '../../../../shared/widgets/InsuranceWidget/InsuranceWidget.jsx';
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
