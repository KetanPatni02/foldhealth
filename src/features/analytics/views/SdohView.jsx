import { useState, useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { KpiCard, InsightBanner, Card, StatusPill, safeTableRows, EmptyState, KpiSkeleton, TableSkeleton } from './shared';
import { EditableGrid } from './EditableGrid';
import s from '../AnalyticsLayout.module.css';

const STORAGE_KEY = 'analytics-sdoh-layout-v2';

const DEFAULT_LAYOUT = [
  { i: 'insight',   x: 0, y: 0,  w: 12, h: 3, minW: 4, minH: 2, maxW: 12, maxH: 5  },
  { i: 'kpis',      x: 0, y: 3,  w: 12, h: 3, minW: 6, minH: 3, maxW: 12, maxH: 5  },
  { i: 'equity',    x: 0, y: 6,  w: 12, h: 8, minW: 6, minH: 5, maxW: 12, maxH: 16 },
  { i: 'risks',     x: 0, y: 14, w: 6,  h: 8, minW: 4, minH: 5, maxW: 12, maxH: 16 },
  { i: 'referrals', x: 6, y: 14, w: 6,  h: 8, minW: 4, minH: 5, maxW: 12, maxH: 16 },
];

export function SdohView({ showToast, editing = false, resetTick = 0 }) {
  const fetchViewKpis = useAppStore(st => st.fetchViewKpis);
  const fetchViewTable = useAppStore(st => st.fetchViewTable);
  const period = useAppStore(st => st.analyticsPeriod);

  const [kpiData, setKpiData] = useState(null);
  const [equityByRace, setEquityByRace] = useState(null);
  const [sdohRiskFactors, setSdohRiskFactors] = useState(null);
  const [communityReferrals, setCommunityReferrals] = useState(null);

  useEffect(() => {
    fetchViewKpis('sdoh').then(d => setKpiData(d || { kpis: [], insight: null }));
    fetchViewTable('sdoh', 'equity_by_race').then(d => setEquityByRace(d || { columns: [], rows: [] }));
    fetchViewTable('sdoh', 'sdoh_risk_factors').then(d => setSdohRiskFactors(d || { columns: [], rows: [] }));
    fetchViewTable('sdoh', 'community_referrals').then(d => setCommunityReferrals(d || { columns: [], rows: [] }));
  }, [period]);

  const kpis = kpiData?.kpis || [];
  const insight = kpiData?.insight || null;
  const equityRows = safeTableRows(equityByRace);
  const riskRows = safeTableRows(sdohRiskFactors);
  const referralRows = safeTableRows(communityReferrals);

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

  const renderEquity = () => (
    <Card title="Health Equity Dashboard" sub="Quality measures by race/ethnicity" flush>
      <div className={s.tblWrap}>
        <table className={s.tbl}>
          <thead>
            <tr><th>Measure</th><th className={s.r}>Overall Rate</th><th className={s.r}>White</th><th className={s.r}>Black</th><th className={s.r}>Hispanic</th><th className={s.r}>Asian</th><th className={s.r}>Disparity Gap</th><th>Status</th></tr>
          </thead>
          <tbody>
            {equityByRace === null && (
              <tr><td colSpan={8} style={{ padding: 0 }}><TableSkeleton rows={5} cols={8} /></td></tr>
            )}
            {equityByRace !== null && equityRows.length === 0 && (
              <EmptyState colSpan={8} message="No equity-by-race data for this period." icon="solar:users-group-rounded-linear" />
            )}
            {equityRows.map((row, i) => {
              const gapNum = parseInt((row.gap || '').replace('pp', ''));
              const st = gapNum >= 16 ? 'red' : gapNum >= 12 ? 'amber' : 'green';
              const nums = [row.white, row.black, row.hispanic, row.asian, row.other].map(v => parseInt((v || '0').replace('%', '')));
              const overall = Math.round(nums.reduce((a, b) => a + b, 0) / nums.filter(n => !isNaN(n)).length);
              return (
                <tr key={i}>
                  <td className={s.fw600}>{row.measure}</td>
                  <td className={`${s.r} ${s.mono}`}>{overall}%</td>
                  <td className={`${s.r} ${s.mono}`}>{row.white}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.black}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.hispanic}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.asian}</td>
                  <td className={`${s.r} ${s.valR}`}>{row.gap}</td>
                  <td><StatusPill label={st === 'red' ? 'Action Needed' : st === 'amber' ? 'Monitor' : 'On Track'} variant={st} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const renderRisks = () => (
    <Card title="SDoH Risk Factors" flush>
      <div className={s.tblWrap}>
        <table className={s.tbl}>
          <thead>
            <tr><th>Risk Factor</th><th className={s.r}>Members</th><th className={s.r}>% of Pop</th><th className={s.r}>TCOC Impact</th><th className={s.r}>Referral Rate</th></tr>
          </thead>
          <tbody>
            {sdohRiskFactors === null && (
              <tr><td colSpan={5} style={{ padding: 0 }}><TableSkeleton rows={5} cols={5} /></td></tr>
            )}
            {sdohRiskFactors !== null && riskRows.length === 0 && (
              <EmptyState colSpan={5} message="No SDoH risk factors for this period." icon="solar:danger-triangle-linear" />
            )}
            {riskRows.map((row, i) => (
              <tr key={i}>
                <td className={s.fw600}>{row.factor}</td>
                <td className={`${s.r} ${s.mono}`}>{row.members}</td>
                <td className={`${s.r} ${s.mono}`}>{row.pct}</td>
                <td className={`${s.r} ${s.valR}`}>{row.tcoc_impact}</td>
                <td className={`${s.r} ${s.mono}`}>{row.referral_rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const renderReferrals = () => (
    <Card title="Community Referral Network" flush>
      <div className={s.tblWrap}>
        <table className={s.tbl}>
          <thead>
            <tr><th>Organization</th><th>Service</th><th className={s.r}>Referrals</th><th className={s.r}>Completion</th><th>Status</th></tr>
          </thead>
          <tbody>
            {communityReferrals === null && (
              <tr><td colSpan={5} style={{ padding: 0 }}><TableSkeleton rows={5} cols={5} /></td></tr>
            )}
            {communityReferrals !== null && referralRows.length === 0 && (
              <EmptyState colSpan={5} message="No community referral data for this period." icon="solar:hand-heart-linear" />
            )}
            {referralRows.map((row, i) => {
              const st = row.status;
              return (
                <tr key={i}>
                  <td className={s.fw600}>{row.org}</td>
                  <td>{row.service}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.referrals}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.completion}</td>
                  <td><StatusPill label={st === 'green' ? 'Active' : st === 'amber' ? 'Moderate' : 'Low'} variant={st} /></td>
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
    equity: renderEquity,
    risks: renderRisks,
    referrals: renderReferrals,
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
