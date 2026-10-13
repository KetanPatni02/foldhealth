import { useMemo, useState } from 'react';
import { FilterChip } from '../../../components/FilterChip/FilterChip';
import { Icon } from '../../../components/Icon/Icon';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { BillingMemberTable } from './BillingMemberTable';
import { BillingReportDrawer } from './BillingReportDrawer';
import { money } from './careProgramBillingData';
import styles from './CareProgramBilling.module.css';

const DOS_RANGES = { 'Last 30 days': 30, 'Last 90 days': 90, 'Last 6 months': 182, 'Last 12 months': 365 };
const TODAY = new Date();
const daysAgo = (iso) => (TODAY - new Date(`${iso}T00:00:00`)) / 86400000;
const unique = (rows, key) => [...new Set(rows.map(r => r[key]).filter(Boolean))].sort();

/** Members with time logged this cycle that haven't been billed yet. */
export function BillableTab({ rows, loading }) {
  const [filters, setFilters] = useState({ programType: [], cptCode: [], provider: [], dos: [], memberName: [] });
  const [viewing, setViewing] = useState(null);
  const setFilter = (key) => (next) => setFilters(f => ({ ...f, [key]: next }));

  const shown = useMemo(() => rows.filter(r => (
    ['programType', 'cptCode', 'provider', 'memberName'].every(k => !filters[k].length || filters[k].includes(r[k]))
    && (!filters.dos.length || daysAgo(r.dateOfService) <= DOS_RANGES[filters.dos[0]])
  )), [rows, filters]);
  const total = shown.reduce((n, r) => n + (Number(r.bill) || 0), 0);

  return (
    <div className={styles.tab}>
      <div className={styles.top}>
        <div className={styles.filters}>
          <FilterChip label="Program Type" options={unique(rows, 'programType')} selected={filters.programType} onChange={setFilter('programType')} />
          <FilterChip label="CPT Code" options={unique(rows, 'cptCode')} selected={filters.cptCode} onChange={setFilter('cptCode')} />
          <FilterChip label="Provider" searchable options={unique(rows, 'provider')} selected={filters.provider} onChange={setFilter('provider')} />
          <FilterChip label="Date of Service" singleSelect options={Object.keys(DOS_RANGES)} selected={filters.dos} onChange={setFilter('dos')} />
          <FilterChip label="Members" searchable options={unique(rows, 'memberName')} selected={filters.memberName} onChange={setFilter('memberName')} />
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>
            Total Unbilled Amount
            <Tooltip label="Sum of the bills below that haven't been submitted yet">
              <Icon name="solar:info-circle-linear" size={14} color="var(--neutral-300)" />
            </Tooltip>
          </span>
          <span className={styles.statValue}>{money(total)}</span>
        </div>
      </div>

      <BillingMemberTable rows={shown} loading={loading} onView={setViewing} />

      {viewing && (
        <BillingReportDrawer
          title={`Billing Details - ${viewing.memberName}`}
          rows={[viewing]}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
