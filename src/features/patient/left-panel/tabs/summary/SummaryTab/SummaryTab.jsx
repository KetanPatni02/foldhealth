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

const WIDGETS = {
  'health-map': HealthMapWidget,
  synopsis: PatientSynopsisWidget,
  utilization: CareUtilizationWidget,
  'prior-auth': PriorAuthWidget,
  'population-groups': PopulationGroupsWidget,
  'care-journeys': CareJourneysWidget,
  subscription: SubscriptionWidget,
  automations: ActiveAutomationsWidget,
  insurance: InsuranceWidget,
};
const ALL_WIDGETS = Object.keys(WIDGETS);

/** `widgets`: the keys to show, in order (More > Customize); all by default. */
export function SummaryTab({ widgets = ALL_WIDGETS }) {
  return (
    <div className={styles.wrapper}>
      {widgets.map((key) => {
        const Widget = WIDGETS[key];
        return Widget ? <Widget key={key} /> : null;
      })}
    </div>
  );
}
