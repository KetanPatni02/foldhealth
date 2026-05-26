import { useState, useEffect } from 'react';
import { Button } from '../../../components/Button/Button';
import { useAppStore } from '../../../store/useAppStore';
import { KpiCard, InsightBanner, Card, ProgressBar, safeBarItems, safeTableRows, EmptyState, KpiSkeleton, TableSkeleton, ProgressBarSkeleton } from './shared';
import { Icon } from '../../../components/Icon/Icon';
import s from '../AnalyticsLayout.module.css';

export function PopulationView({ showToast }) {
  const fetchViewKpis = useAppStore(st => st.fetchViewKpis);
  const fetchProgressBars = useAppStore(st => st.fetchProgressBars);
  const fetchViewTable = useAppStore(st => st.fetchViewTable);
  const period = useAppStore(st => st.analyticsPeriod);

  const [kpiData, setKpiData] = useState(null);
  const [riskTiers, setRiskTiers] = useState(null);
  const [chronicConditions, setChronicConditions] = useState(null);
  const [memberLists, setMemberLists] = useState(null);
  const [sdohScreening, setSdohScreening] = useState(null);

  useEffect(() => {
    fetchViewKpis('population').then(d => setKpiData(d || { kpis: [], insight: null }));
    fetchProgressBars('population', 'risk_tiers').then(d => setRiskTiers(d || []));
    fetchProgressBars('population', 'chronic_conditions').then(d => setChronicConditions(d || []));
    fetchViewTable('population', 'actionable_member_lists').then(d => setMemberLists(d || { columns: [], rows: [] }));
    fetchProgressBars('population', 'sdoh_screening').then(d => setSdohScreening(d || []));
  }, [period]);

  const kpis = kpiData?.kpis || [];
  const insight = kpiData?.insight || null;
  const memberRows = safeTableRows(memberLists);
  const riskTierItems = safeBarItems(riskTiers);
  const chronicItems = safeBarItems(chronicConditions);
  const sdohItems = safeBarItems(sdohScreening);

  const bookmarks = [
    { icon: 'solar:calendar-search-linear', label: 'Missing AWV', count: 847, toast: 'Opening AWV drill-down' },
    { icon: 'solar:hospital-linear', label: 'Recent IP Discharges', count: 124, toast: 'Opening TCM drill-down' },
    { icon: 'solar:danger-triangle-linear', label: 'High ED Utilizers', count: 221, toast: 'Opening ED drill-down' },
  ];

  return (
    <>
      {insight && (
        <InsightBanner
          icon={insight.icon}
          title={insight.title}
          variant={insight.variant}
          text={insight.text}
          buttons={insight.buttons || []}
          showToast={showToast}
        />
      )}

      {kpiData === null ? (
        <KpiSkeleton count={4} />
      ) : (
        <div className={s.kpiGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {kpis.map(k => (
            <KpiCard key={k.key} value={k.value} label={k.label} delta={k.delta} deltaType={k.deltaType} sub={k.sub} accentColor={k.accentColor} />
          ))}
        </div>
      )}

      <div className={s.g2}>
        <Card title="Risk Stratification">
          {riskTiers === null ? (
            <ProgressBarSkeleton count={5} />
          ) : riskTierItems.length === 0 ? (
            <EmptyState message="No risk stratification data for this period." icon="solar:graph-up-linear" />
          ) : (
            riskTierItems.map(r => (
              <ProgressBar key={r.label} label={r.label} value={r.value} pct={r.pct} color={r.color} />
            ))
          )}
        </Card>

        <Card title="Chronic Condition Distribution">
          {chronicConditions === null ? (
            <ProgressBarSkeleton count={5} />
          ) : chronicItems.length === 0 ? (
            <EmptyState message="No chronic condition data for this period." icon="solar:heart-pulse-linear" />
          ) : (
            chronicItems.map(c => (
              <ProgressBar key={c.label} label={c.label} value={c.value} pct={c.pct} color={c.color} />
            ))
          )}
        </Card>
      </div>

      {/* Actionable Member Lists — Bookmark Cards */}
      <Card title="Actionable Member Lists">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 4 }}>
          {bookmarks.map((bm, i) => (
            <div key={i} style={{ background: 'var(--neutral-0)', border: '1px solid var(--neutral-150)', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name={bm.icon} size={18} color="var(--primary-300)" />
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-400)' }}>{bm.label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--neutral-500)' }}>{bm.count.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: 'var(--neutral-200)' }}>members</div>
              <Button variant="ghost" size="S" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => showToast?.(bm.toast)}>
                View List &rarr;
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* SDOH Risk Screening */}
      <Card title="SDoH Risk Screening" sub="Progress toward screening targets">
        {sdohScreening === null ? (
          <ProgressBarSkeleton count={4} />
        ) : sdohItems.length === 0 ? (
          <EmptyState message="No SDoH screening data for this period." icon="solar:user-heart-rounded-linear" />
        ) : (
          sdohItems.map(item => (
            <ProgressBar key={item.label} label={item.label} value={item.value} pct={item.pct} color={item.color} sub={item.sub} />
          ))
        )}
      </Card>

      <Card title="Actionable Member Lists — Detail" flush>
        <div className={s.tblWrap}>
          <table className={s.tbl}>
            <thead>
              <tr><th>Cohort</th><th className={s.r}>Members</th><th className={s.r}>Avg TCOC</th><th className={s.r}>Avg RAF</th><th>Top Conditions</th></tr>
            </thead>
            <tbody>
              {memberLists === null && (
                <tr><td colSpan={5} style={{ padding: 0 }}><TableSkeleton rows={5} cols={5} /></td></tr>
              )}
              {memberLists !== null && memberRows.length === 0 && (
                <EmptyState colSpan={5} message="No actionable member lists for this period." icon="solar:users-group-rounded-linear" />
              )}
              {memberRows.map((row, i) => (
                <tr key={i}>
                  <td className={s.fw600}>{row.cohort}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.members}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.avg_tcoc}</td>
                  <td className={s.r}>{row.avg_raf}</td>
                  <td>{row.conditions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
