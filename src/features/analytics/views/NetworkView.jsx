import { useState, useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { KpiCard, InsightBanner, Card, StatusPill, safeTableRows, EmptyState, KpiSkeleton, TableSkeleton } from './shared';
import { EditableGrid } from './EditableGrid';
import s from '../AnalyticsLayout.module.css';

const STORAGE_KEY = 'analytics-network-layout-v2';

const DEFAULT_LAYOUT = [
  { i: 'insight',  x: 0, y: 0, w: 12, h: 3, minW: 4, minH: 2, maxW: 12, maxH: 5  },
  { i: 'kpis',     x: 0, y: 3, w: 12, h: 3, minW: 6, minH: 3, maxW: 12, maxH: 5  },
  { i: 'leakage',  x: 0, y: 6, w: 6,  h: 9, minW: 4, minH: 5, maxW: 12, maxH: 20 },
  { i: 'snf',      x: 6, y: 6, w: 6,  h: 9, minW: 4, minH: 5, maxW: 12, maxH: 20 },
];

export function NetworkView({ showToast, editing = false, resetTick = 0 }) {
  const fetchViewKpis = useAppStore(st => st.fetchViewKpis);
  const fetchViewTable = useAppStore(st => st.fetchViewTable);
  const period = useAppStore(st => st.analyticsPeriod);

  const [kpiData, setKpiData] = useState(null);
  const [referralLeakage, setReferralLeakage] = useState(null);
  const [snfScorecard, setSnfScorecard] = useState(null);

  useEffect(() => {
    fetchViewKpis('network').then(d => setKpiData(d || { kpis: [], insight: null }));
    fetchViewTable('network', 'referral_leakage').then(d => setReferralLeakage(d || { columns: [], rows: [] }));
    fetchViewTable('network', 'snf_scorecard').then(d => setSnfScorecard(d || { columns: [], rows: [] }));
  }, [period]);

  const kpis = kpiData?.kpis || [];
  const insight = kpiData?.insight || null;
  const leakageRows = safeTableRows(referralLeakage);
  const snfRows = safeTableRows(snfScorecard);

  const renderInsight = () => insight ? (
    <InsightBanner
      icon={insight.icon}
      title={insight.title}
      variant={insight.variant}
      text={insight.text}
      buttons={insight.buttons || []}
      showToast={showToast}
    />
  ) : null;

  const renderKpis = () => {
    if (kpiData === null) return <KpiSkeleton count={4} />;
    return (
      <div className={s.kpiGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {kpis.map(k => (
          <KpiCard key={k.key} value={k.value} label={k.label} delta={k.delta} deltaType={k.deltaType} sub={k.sub} accentColor={k.accentColor} />
        ))}
      </div>
    );
  };

  const renderLeakage = () => (
    <Card title="Referral Leakage by Specialty" flush>
      <div className={s.tblWrap}>
        <table className={s.tbl}>
          <thead>
            <tr><th>Specialty</th><th className={s.r}>Total Referrals</th><th className={s.r}>Out-of-Network</th><th className={s.r}>Leakage %</th><th className={s.r}>Est. Cost Impact</th></tr>
          </thead>
          <tbody>
            {referralLeakage === null && (
              <tr><td colSpan={5} style={{ padding: 0 }}><TableSkeleton rows={5} cols={5} /></td></tr>
            )}
            {referralLeakage !== null && leakageRows.length === 0 && (
              <EmptyState colSpan={5} message="No referral leakage data for this period." icon="solar:arrow-right-up-linear" />
            )}
            {leakageRows.map((row, i) => (
              <tr key={i}>
                <td className={s.fw600}>{row.specialty}</td>
                <td className={`${s.r} ${s.mono}`}>{row.total}</td>
                <td className={`${s.r} ${s.mono}`}>{row.oon}</td>
                <td className={`${s.r} ${s.valR}`}>{row.leakage}</td>
                <td className={`${s.r} ${s.valA}`}>{row.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const renderSnf = () => (
    <Card title="SNF Quality Scorecard" flush>
      <div className={s.tblWrap}>
        <table className={s.tbl}>
          <thead>
            <tr><th>Facility</th><th className={s.r}>Admits</th><th className={s.r}>Avg LOS</th><th className={s.r}>Readmit %</th><th className={s.r}>Cost/Stay</th><th>Status</th></tr>
          </thead>
          <tbody>
            {snfScorecard === null && (
              <tr><td colSpan={6} style={{ padding: 0 }}><TableSkeleton rows={5} cols={6} /></td></tr>
            )}
            {snfScorecard !== null && snfRows.length === 0 && (
              <EmptyState colSpan={6} message="No SNF scorecard data for this period." icon="solar:hospital-linear" />
            )}
            {snfRows.map((row, i) => {
              const st = row.status;
              return (
                <tr key={i}>
                  <td className={s.fw600}>{row.facility}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.admits}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.avg_los}</td>
                  <td className={`${s.r} ${st === 'red' ? s.valR : st === 'amber' ? s.valA : s.valG}`}>{row.readmit}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.cost}</td>
                  <td>
                    <StatusPill
                      label={st === 'red' ? 'Flagged' : st === 'amber' ? 'Monitor' : 'Preferred'}
                      variant={st}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const RENDERERS = {
    insight: renderInsight,
    kpis: renderKpis,
    leakage: renderLeakage,
    snf: renderSnf,
  };

  return (
    <EditableGrid
      storageKey={STORAGE_KEY}
      defaultLayout={DEFAULT_LAYOUT}
      renderers={RENDERERS}
      editing={editing}
      resetTick={resetTick}
    />
  );
}
