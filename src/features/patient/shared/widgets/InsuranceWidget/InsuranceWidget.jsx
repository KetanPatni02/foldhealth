import { ActionButton } from '../../../../../components/ActionButton/ActionButton';
import { Avatar } from '../../../../../components/Avatar/Avatar';
import { Badge } from '../../../../../components/Badge/Badge';
import { PanelSection, PanelSectionDivider, PanelSectionItem } from '../../../../../components/PanelSection/PanelSection';
import styles from './InsuranceWidget.module.css';

const POLICIES = [
  { id: 1, name: 'BlueCross Blue Shield', status: 'Insured', badgeVariant: 'toc-enrolled', relationship: 'Self' },
  { id: 2, name: 'American Heritage-Workplace Division', status: 'Expired', badgeVariant: 'status-failed', relationship: 'Mother' },
];

export function InsuranceWidget() {
  return (
    <PanelSection
      title="Insurance"
      actions={(
        <>
          <span className={styles.lastChecked}>Last checked 02/19/2024</span>
          <ActionButton icon="solar:refresh-linear" size="S" tooltip="Refresh" />
          <PanelSectionDivider />
          <ActionButton icon="solar:add-circle-linear" size="S" tooltip="Add Insurance" />
        </>
      )}
    >
      {POLICIES.map(p => (
        <PanelSectionItem
          key={p.id}
          leading={<Avatar type="icon" variant="patient" iconName="solar:umbrella-linear" size="M" />}
          title={p.name}
          meta={[p.relationship]}
          trailing={<Badge variant={p.badgeVariant} label={p.status} />}
        />
      ))}
    </PanelSection>
  );
}
