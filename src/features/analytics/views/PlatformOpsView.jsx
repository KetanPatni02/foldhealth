import { useState, useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { KpiCard, InsightBanner, Card, StatusPill, safeTableRows, safeConfigData, EmptyState, KpiSkeleton, TableSkeleton } from './shared';
import s from '../AnalyticsLayout.module.css';

export function PlatformOpsView({ showToast }) {
  const fetchViewKpis = useAppStore(st => st.fetchViewKpis);
  const fetchConfig = useAppStore(st => st.fetchConfig);
  const fetchViewTable = useAppStore(st => st.fetchViewTable);
  const period = useAppStore(st => st.analyticsPeriod);

  const [kpiData, setKpiData] = useState(null);
  const [pipelineHealth, setPipelineHealth] = useState(null);
  const [dataQuality, setDataQuality] = useState(null);
  const [integrationStatus, setIntegrationStatus] = useState(null);

  useEffect(() => {
    fetchViewKpis('platformops').then(d => setKpiData(d || { kpis: [], insight: null }));
    fetchConfig('pipeline_health').then(d => setPipelineHealth(d || {}));
    fetchViewTable('platformops', 'data_quality').then(d => setDataQuality(d || { columns: [], rows: [] }));
    fetchViewTable('platformops', 'integration_status').then(d => setIntegrationStatus(d || { columns: [], rows: [] }));
  }, [period]);

  const kpis = kpiData?.kpis || [];
  const insight = kpiData?.insight || null;
  const safePipeline = safeConfigData(pipelineHealth);
  const pipelines = safePipeline.pipelines || [];
  const dqRows = safeTableRows(dataQuality);
  const intRows = safeTableRows(integrationStatus);

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

      <Card title="Pipeline Health">
        <div style={{ padding: '4px 0' }}>
          {pipelines.map((p, i) => (
            <div key={i} className={s.pipelineRow}>
              <div className={`${s.pipelineDot} ${p.status === 'ok' ? s.ok : s.warn}`} />
              <div className={s.pipelineName}>{p.name}</div>
              <div className={s.pipelineInfo}>{p.info}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className={s.g2}>
        <Card title="Data Quality Scorecard" flush>
          <div className={s.tblWrap}>
            <table className={s.tbl}>
              <thead>
                <tr><th>Dimension</th><th className={s.r}>Score</th><th className={s.r}>Threshold</th><th>Status</th></tr>
              </thead>
              <tbody>
                {dataQuality === null && (
                  <tr><td colSpan={4} style={{ padding: 0 }}><TableSkeleton rows={4} cols={4} /></td></tr>
                )}
                {dataQuality !== null && dqRows.length === 0 && (
                  <EmptyState colSpan={4} message="No data quality metrics for this period." icon="solar:shield-check-linear" />
                )}
                {dqRows.map((row, i) => {
                  const st = row.status;
                  return (
                    <tr key={i}>
                      <td className={s.fw600}>{row.dimension}</td>
                      <td className={`${s.r} ${s.mono}`}>{row.score}</td>
                      <td className={`${s.r} ${s.mono}`}>{row.threshold}</td>
                      <td><StatusPill label={st === 'green' ? 'Pass' : 'Below'} variant={st} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Integration Status" flush>
          <div className={s.tblWrap}>
            <table className={s.tbl}>
              <thead>
                <tr><th>System</th><th>Type</th><th className={s.r}>Uptime</th><th className={s.r}>Errors (7d)</th><th>Status</th></tr>
              </thead>
              <tbody>
                {integrationStatus === null && (
                  <tr><td colSpan={5} style={{ padding: 0 }}><TableSkeleton rows={4} cols={5} /></td></tr>
                )}
                {integrationStatus !== null && intRows.length === 0 && (
                  <EmptyState colSpan={5} message="No integration status data for this period." icon="solar:plug-circle-linear" />
                )}
                {intRows.map((row, i) => {
                  const st = row.status;
                  return (
                    <tr key={i}>
                      <td className={s.fw600}>{row.system}</td>
                      <td>{row.type}</td>
                      <td className={`${s.r} ${s.mono}`}>{row.uptime}</td>
                      <td className={`${s.r} ${st === 'red' ? s.valR : s.mono}`}>{row.errors}</td>
                      <td><StatusPill label={st === 'green' ? 'Healthy' : 'Degraded'} variant={st} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
