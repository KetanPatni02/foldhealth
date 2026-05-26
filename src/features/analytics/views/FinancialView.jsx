import { useState, useEffect } from 'react';
import { Button } from '../../../components/Button/Button';
import { useAppStore } from '../../../store/useAppStore';
import { KpiCard, InsightBanner, Card, ProgressBar, StatusPill, safeBarItems, safeTableRows, EmptyState, KpiSkeleton, TableSkeleton, ProgressBarSkeleton } from './shared';
import s from '../AnalyticsLayout.module.css';

const TABS = ['TCOC', 'Inpatient', 'Readmissions', 'ED & Outpatient', 'SNF & Post-Acute', 'Pharmacy'];

export function FinancialView({ showToast }) {
  const fetchViewKpis = useAppStore(st => st.fetchViewKpis);
  const fetchViewTable = useAppStore(st => st.fetchViewTable);
  const fetchProgressBars = useAppStore(st => st.fetchProgressBars);
  const period = useAppStore(st => st.analyticsPeriod);

  const [kpiData, setKpiData] = useState(null);
  const [costByProvider, setCostByProvider] = useState(null);
  const [ipCostDetail, setIpCostDetail] = useState(null);
  const [opEdUtil, setOpEdUtil] = useState(null);
  const [snfSpending, setSnfSpending] = useState(null);
  const [readmissionRates, setReadmissionRates] = useState(null);
  const [pharmacyCost, setPharmacyCost] = useState(null);
  const [highCostClaimants, setHighCostClaimants] = useState(null);
  const [topDrgs, setTopDrgs] = useState(null);
  const [topFacilitiesReadmit, setTopFacilitiesReadmit] = useState(null);
  const [edChiefComplaints, setEdChiefComplaints] = useState(null);
  const [edTopFacilities, setEdTopFacilities] = useState(null);
  const [opEdOrgHierarchy, setOpEdOrgHierarchy] = useState(null);
  const [snfQualityScorecard, setSnfQualityScorecard] = useState(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    fetchViewKpis('financial').then(d => setKpiData(d || { kpis: [], insight: null }));
    fetchViewTable('financial', 'cost_by_provider').then(d => setCostByProvider(d || { columns: [], rows: [] }));
    fetchViewTable('financial', 'ip_cost_detail', 'inpatient').then(d => setIpCostDetail(d || { columns: [], rows: [] }));
    fetchViewTable('financial', 'op_ed_utilization', 'op_ed').then(d => setOpEdUtil(d || { columns: [], rows: [] }));
    fetchViewTable('financial', 'snf_spending', 'snf').then(d => setSnfSpending(d || { columns: [], rows: [] }));
    fetchProgressBars('financial', 'readmission_rates').then(d => setReadmissionRates(d || []));
    fetchProgressBars('financial', 'pharmacy_cost').then(d => setPharmacyCost(d || []));
    fetchViewTable('financial', 'high_cost_claimants').then(d => setHighCostClaimants(d || { columns: [], rows: [] }));
    fetchViewTable('financial', 'top_drgs').then(d => setTopDrgs(d || { columns: [], rows: [] }));
    fetchViewTable('financial', 'top_facilities_readmit').then(d => setTopFacilitiesReadmit(d || { columns: [], rows: [] }));
    fetchViewTable('financial', 'ed_chief_complaints').then(d => setEdChiefComplaints(d || { columns: [], rows: [] }));
    fetchViewTable('financial', 'ed_top_facilities').then(d => setEdTopFacilities(d || { columns: [], rows: [] }));
    fetchViewTable('financial', 'op_ed_org_hierarchy').then(d => setOpEdOrgHierarchy(d || { columns: [], rows: [] }));
    fetchViewTable('financial', 'snf_quality_scorecard').then(d => setSnfQualityScorecard(d || { columns: [], rows: [] }));
  }, [period]);

  const kpis = kpiData?.kpis || [];
  const insight = kpiData?.insight || null;

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
        <KpiSkeleton count={5} />
      ) : (
        <div className={s.kpiGrid} style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {kpis.map(k => (
            <KpiCard key={k.key} value={k.value} label={k.label} delta={k.delta} deltaType={k.deltaType} sub={k.sub} accentColor={k.accentColor} />
          ))}
        </div>
      )}

      <div className={s.tabRow}>
        {TABS.map((t, i) => (
          <button key={t} className={`${s.tab} ${tab === i ? s.active : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {tab === 0 && <TcocTab data={costByProvider} highCost={highCostClaimants} showToast={showToast} />}
      {tab === 1 && <InpatientTab data={ipCostDetail} />}
      {tab === 2 && <ReadmissionsTab bars={readmissionRates} topDrgs={topDrgs} topFacilities={topFacilitiesReadmit} showToast={showToast} />}
      {tab === 3 && <EdOutpatientTab complaints={edChiefComplaints} facilities={edTopFacilities} orgHierarchy={opEdOrgHierarchy} opEdUtil={opEdUtil} showToast={showToast} />}
      {tab === 4 && <SnfPostAcuteTab data={snfSpending} scorecard={snfQualityScorecard} showToast={showToast} />}
      {tab === 5 && <PharmacyTab bars={pharmacyCost} />}
    </>
  );
}

function TcocTab({ data, highCost, showToast }) {
  const rows = safeTableRows(data);
  const hcRows = safeTableRows(highCost);
  return (
    <>
      <Card title="Cost by Setting — Provider Hierarchy" flush>
        <div className={s.tblWrap}>
          <table className={s.tbl}>
            <thead>
              <tr><th>Practice / Provider</th><th className={s.r}>Members</th><th className={s.r}>TCOC PMPM</th><th className={s.r}>IP PMPM</th><th className={s.r}>ED PMPM</th><th className={s.r}>Rx PMPM</th><th className={s.r}>vs Benchmark</th></tr>
            </thead>
            <tbody>
              {data === null && (
                <tr><td colSpan={7} style={{ padding: 0 }}><TableSkeleton rows={5} cols={7} /></td></tr>
              )}
              {data !== null && rows.length === 0 && (
                <EmptyState colSpan={7} message="No cost-by-provider data for this period." icon="solar:wallet-money-linear" />
              )}
              {rows.map((row, i) => (
                <tr key={i}>
                  <td className={s.fw600}>{row.name}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.members}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.tcoc}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.ip}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.ed}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.rx}</td>
                  <td className={`${s.r} ${(row.vs_bench || '').startsWith('+') ? s.valR : s.valG}`}>{row.vs_bench}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="High-Cost Claimants" flush actions={<Button variant="ghost" size="S" onClick={() => showToast?.('Exporting high-cost claimant list...')}>Export</Button>}>
        <div className={s.tblWrap}>
          <table className={s.tbl}>
            <thead>
              <tr><th>Member ID</th><th>Diagnosis</th><th className={s.r}>Total Cost</th><th className={s.r}>IP Admits</th><th>Status</th></tr>
            </thead>
            <tbody>
              {highCost === null && (
                <tr><td colSpan={5} style={{ padding: 0 }}><TableSkeleton rows={5} cols={5} /></td></tr>
              )}
              {highCost !== null && hcRows.length === 0 && (
                <EmptyState colSpan={5} message="No high-cost claimants for this period." icon="solar:user-circle-linear" />
              )}
              {hcRows.map((row, i) => {
                const st = row.status === 'red' ? 'red' : row.status === 'amber' ? 'amber' : 'green';
                return (
                  <tr key={i}>
                    <td className={s.fw600}>{row.member_id}</td>
                    <td>{row.diagnosis}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.total_cost}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.ip_admits}</td>
                    <td><span className={`${s.stPill} ${st === 'red' ? s.stRed : st === 'amber' ? s.stAmber : s.stGreen}`}>{st === 'red' ? 'Critical' : st === 'amber' ? 'High' : 'Monitor'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function InpatientTab({ data }) {
  const rows = safeTableRows(data);
  return (
    <Card title="Inpatient Cost Detail" flush>
      <div className={s.tblWrap}>
        <table className={s.tbl}>
          <thead><tr><th>DRG Category</th><th className={s.r}>Admits</th><th className={s.r}>Avg LOS</th><th className={s.r}>Avg Cost</th><th className={s.r}>Total PMPM</th></tr></thead>
          <tbody>
            {data === null && (
              <tr><td colSpan={5} style={{ padding: 0 }}><TableSkeleton rows={5} cols={5} /></td></tr>
            )}
            {data !== null && rows.length === 0 && (
              <EmptyState colSpan={5} message="No inpatient cost detail for this period." icon="solar:hospital-linear" />
            )}
            {rows.map((row, i) => (
              <tr key={i}>
                <td className={s.fw600}>{row.category}</td>
                <td className={`${s.r} ${s.mono}`}>{row.admits}</td>
                <td className={`${s.r} ${s.mono}`}>{row.avg_los}</td>
                <td className={`${s.r} ${s.mono}`}>{row.avg_cost}</td>
                <td className={`${s.r} ${s.mono}`}>{row.total_pmpm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ReadmissionsTab({ bars, topDrgs, topFacilities, showToast }) {
  const items = safeBarItems(bars);
  const drgRows = safeTableRows(topDrgs);
  const facRows = safeTableRows(topFacilities);

  return (
    <>
      {/* KPIs */}
      <div className={s.kpiGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiCard value="18.4%" label="30-Day Readmit Rate" delta="+2.8pp vs Q3" deltaType="neg" sub="Benchmark: 15.2%" accentColor="var(--status-error)" />
        <KpiCard value="42" label="Avoidable Readmits" delta="This period" deltaType="neg" sub="62% of all readmits" accentColor="var(--status-warning)" />
        <KpiCard value="$18,200" label="Avg Cost / Readmit" delta="+$1,400 YoY" deltaType="neg" sub="Per readmission episode" accentColor="var(--status-error)" />
        <KpiCard value="72%" label="7-Day Follow-up Rate" delta="+4pp QoQ" deltaType="pos" sub="Target: 85%" accentColor="var(--primary-300)" />
      </div>

      <Card title="30-Day Readmission Analysis">
        {bars === null ? (
          <ProgressBarSkeleton count={4} />
        ) : items.length === 0 ? (
          <EmptyState message="No readmission analysis for this period." icon="solar:graph-up-linear" />
        ) : (
          items.map(b => (
            <ProgressBar key={b.label} label={b.label} value={b.value} pct={b.pct} color={b.color} sub={b.sub} />
          ))
        )}
      </Card>

      <div className={s.g2}>
        <Card title="Top 5 Admission DRGs" flush>
          <div className={s.tblWrap}>
            <table className={s.tbl}>
              <thead><tr><th>DRG</th><th>Description</th><th className={s.r}>Admits</th><th className={s.r}>Readmit%</th></tr></thead>
              <tbody>
                {topDrgs === null && (
                  <tr><td colSpan={4} style={{ padding: 0 }}><TableSkeleton rows={5} cols={4} /></td></tr>
                )}
                {topDrgs !== null && drgRows.length === 0 && (
                  <EmptyState colSpan={4} message="No DRG data for this period." icon="solar:document-text-linear" />
                )}
                {drgRows.map((row, i) => (
                  <tr key={i}>
                    <td className={s.fw600}>{row.drg}</td>
                    <td>{row.description}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.admits}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.readmit_pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Top 5 Facilities" flush>
          <div className={s.tblWrap}>
            <table className={s.tbl}>
              <thead><tr><th>Facility</th><th className={s.r}>Discharges</th><th className={s.r}>Readmit%</th><th className={s.r}>vs Avg</th></tr></thead>
              <tbody>
                {topFacilities === null && (
                  <tr><td colSpan={4} style={{ padding: 0 }}><TableSkeleton rows={5} cols={4} /></td></tr>
                )}
                {topFacilities !== null && facRows.length === 0 && (
                  <EmptyState colSpan={4} message="No facility data for this period." icon="solar:hospital-linear" />
                )}
                {facRows.map((row, i) => {
                  const isOver = (row.vs_avg || '').startsWith('+');
                  return (
                    <tr key={i}>
                      <td className={s.fw600}>{row.facility}</td>
                      <td className={`${s.r} ${s.mono}`}>{row.discharges}</td>
                      <td className={`${s.r} ${s.mono}`}>{row.readmit_pct}</td>
                      <td className={`${s.r} ${isOver ? s.valR : s.valG}`}>{row.vs_avg}</td>
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

function EdOutpatientTab({ complaints, facilities, orgHierarchy, opEdUtil, showToast }) {
  const complaintRows = safeTableRows(complaints);
  const facRows = safeTableRows(facilities);
  const orgRows = safeTableRows(orgHierarchy);
  const utilRows = safeTableRows(opEdUtil);

  return (
    <>
      <div className={s.g2}>
        <Card title="Top 5 ED Chief Complaints" flush>
          <div className={s.tblWrap}>
            <table className={s.tbl}>
              <thead><tr><th>Chief Complaint</th><th className={s.r}>Visits</th><th className={s.r}>Share%</th><th className={s.r}>Avoidable%</th></tr></thead>
              <tbody>
                {complaints === null && (
                  <tr><td colSpan={4} style={{ padding: 0 }}><TableSkeleton rows={5} cols={4} /></td></tr>
                )}
                {complaints !== null && complaintRows.length === 0 && (
                  <EmptyState colSpan={4} message="No ED chief complaint data." icon="solar:medical-kit-linear" />
                )}
                {complaintRows.map((row, i) => (
                  <tr key={i}>
                    <td className={s.fw600}>{row.complaint}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.visits}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.share_pct}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.avoidable_pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Top ED Facilities" flush>
          <div className={s.tblWrap}>
            <table className={s.tbl}>
              <thead><tr><th>Facility</th><th className={s.r}>ED Visits</th><th className={s.r}>Avoid%</th><th className={s.r}>Avg Cost</th></tr></thead>
              <tbody>
                {facilities === null && (
                  <tr><td colSpan={4} style={{ padding: 0 }}><TableSkeleton rows={5} cols={4} /></td></tr>
                )}
                {facilities !== null && facRows.length === 0 && (
                  <EmptyState colSpan={4} message="No ED facility data." icon="solar:hospital-linear" />
                )}
                {facRows.map((row, i) => (
                  <tr key={i}>
                    <td className={s.fw600}>{row.facility}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.visits}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.avoid_pct}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.avg_cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Org Hierarchy OP/ED" flush>
        <div className={s.tblWrap}>
          <table className={s.tbl}>
            <thead><tr><th>Practice</th><th className={s.r}>ED/1K</th><th className={s.r}>Avoid%</th><th className={s.r}>OP/1K</th><th className={s.r}>AWV%</th></tr></thead>
            <tbody>
              {orgHierarchy === null && (
                <tr><td colSpan={5} style={{ padding: 0 }}><TableSkeleton rows={5} cols={5} /></td></tr>
              )}
              {orgHierarchy !== null && orgRows.length === 0 && (
                <EmptyState colSpan={5} message="No org hierarchy data for this period." icon="solar:buildings-linear" />
              )}
              {orgRows.map((row, i) => (
                <tr key={i}>
                  <td className={s.fw600}>{row.practice}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.ed_per_1k}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.avoid_pct}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.op_per_1k}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.awv_pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Keep original OP/ED utilization table */}
      <Card title="Outpatient & ED Utilization" flush>
        <div className={s.tblWrap}>
          <table className={s.tbl}>
            <thead><tr><th>Category</th><th className={s.r}>Visits/1000</th><th className={s.r}>Benchmark</th><th className={s.r}>PMPM</th><th>Trend</th></tr></thead>
            <tbody>
              {opEdUtil === null && (
                <tr><td colSpan={5} style={{ padding: 0 }}><TableSkeleton rows={5} cols={5} /></td></tr>
              )}
              {opEdUtil !== null && utilRows.length === 0 && (
                <EmptyState colSpan={5} message="No OP/ED utilization for this period." icon="solar:chart-2-linear" />
              )}
              {utilRows.map((row, i) => (
                <tr key={i}>
                  <td className={s.fw600}>{row.category}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.visits_per_1k}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.benchmark}</td>
                  <td className={`${s.r} ${s.mono}`}>{row.pmpm}</td>
                  <td>{row.trend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function SnfPostAcuteTab({ data, scorecard, showToast }) {
  const rows = safeTableRows(data);
  const scorecardRows = safeTableRows(scorecard);

  return (
    <>
      <Card title="SNF / Post-Acute Spending" flush>
        <div className={s.tblWrap}>
          <table className={s.tbl}>
            <thead><tr><th>Facility</th><th className={s.r}>Admits</th><th className={s.r}>Avg LOS</th><th className={s.r}>Readmit %</th><th className={s.r}>Cost/Stay</th><th>Quality</th></tr></thead>
            <tbody>
              {data === null && (
                <tr><td colSpan={6} style={{ padding: 0 }}><TableSkeleton rows={5} cols={6} /></td></tr>
              )}
              {data !== null && rows.length === 0 && (
                <EmptyState colSpan={6} message="No SNF spending data for this period." icon="solar:hospital-linear" />
              )}
              {rows.map((row, i) => {
                const st = row.quality === 'Flagged' ? 'red' : row.quality === 'Monitor' ? 'amber' : 'green';
                return (
                  <tr key={i}>
                    <td className={s.fw600}>{row.facility}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.admits}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.avg_los}</td>
                    <td className={`${s.r} ${st === 'red' ? s.valR : st === 'green' ? s.valG : s.valA}`}>{row.readmit}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.cost_per_stay}</td>
                    <td><span className={`${s.stPill} ${st === 'red' ? s.stRed : st === 'green' ? s.stGreen : s.stAmber}`}>{row.quality}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="SNF Quality Scorecard" flush actions={<Button variant="ghost" size="S" onClick={() => showToast?.('Exporting SNF scorecard...')}>Export</Button>}>
        <div className={s.tblWrap}>
          <table className={s.tbl}>
            <thead><tr><th>SNF</th><th className={s.r}>Admits</th><th className={s.r}>Readmit%</th><th className={s.r}>Avg LOS</th><th className={s.r}>CMS Stars</th><th>Status</th></tr></thead>
            <tbody>
              {scorecard === null && (
                <tr><td colSpan={6} style={{ padding: 0 }}><TableSkeleton rows={5} cols={6} /></td></tr>
              )}
              {scorecard !== null && scorecardRows.length === 0 && (
                <EmptyState colSpan={6} message="No SNF quality scorecard data." icon="solar:medal-ribbon-linear" />
              )}
              {scorecardRows.map((row, i) => {
                const st = row.status;
                return (
                  <tr key={i}>
                    <td className={s.fw600}>{row.snf}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.admits}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.readmit_pct}</td>
                    <td className={`${s.r} ${s.mono}`}>{row.avg_los}</td>
                    <td className={`${s.r} ${s.mono}`}>{'★'.repeat(row.cms_stars || 0)}{'☆'.repeat(5 - (row.cms_stars || 0))}</td>
                    <td><StatusPill label={st === 'red' ? 'Flagged' : st === 'amber' ? 'Monitor' : 'Preferred'} variant={st} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function PharmacyTab({ bars }) {
  const items = safeBarItems(bars);
  return (
    <Card title="Pharmacy Cost Trend">
      {bars === null ? (
        <ProgressBarSkeleton count={4} />
      ) : items.length === 0 ? (
        <EmptyState message="No pharmacy cost data for this period." icon="solar:pill-linear" />
      ) : (
        items.map(b => (
          <ProgressBar key={b.label} label={b.label} value={b.value} pct={b.pct} color={b.color} sub={b.sub} />
        ))
      )}
    </Card>
  );
}
