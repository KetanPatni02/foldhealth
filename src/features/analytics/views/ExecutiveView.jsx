import { useState, useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { safeTableRows, safeBarItems, safeConfigData } from './shared.utils';
import { EditableGrid } from './EditableGrid';
import {
  ExecutiveInsightSection,
  ExecutiveKpiRowSection,
  ExecutiveDriversSection,
  ExecutiveTcocSection,
  ExecutiveQualitySection,
  ExecutiveCareSection,
  ExecutiveSavingsSection,
  ExecutiveCostTableSection,
} from './ExecutiveViewSections';

const STORAGE_KEY = 'analytics-executive-layout-v2';

const DEFAULT_LAYOUT = [
  { i: 'insight',   x: 0, y: 0,  w: 12, h: 3, minW: 4, minH: 2, maxW: 12, maxH: 5  },
  { i: 'kpi1',      x: 0, y: 3,  w: 12, h: 3, minW: 6, minH: 3, maxW: 12, maxH: 5  },
  { i: 'kpi2',      x: 0, y: 6,  w: 12, h: 3, minW: 6, minH: 3, maxW: 12, maxH: 5  },
  { i: 'drivers',   x: 0, y: 9,  w: 12, h: 3, minW: 4, minH: 2, maxW: 12, maxH: 5  },
  { i: 'tcoc',      x: 0, y: 12, w: 12, h: 7, minW: 6, minH: 5, maxW: 12, maxH: 20 },
  { i: 'quality',   x: 0, y: 19, w: 6,  h: 7, minW: 3, minH: 5, maxW: 12, maxH: 16 },
  { i: 'care',      x: 6, y: 19, w: 6,  h: 7, minW: 3, minH: 5, maxW: 12, maxH: 16 },
  { i: 'savings',   x: 0, y: 26, w: 12, h: 7, minW: 6, minH: 5, maxW: 12, maxH: 16 },
  { i: 'costTable', x: 0, y: 33, w: 12, h: 5, minW: 6, minH: 4, maxW: 12, maxH: 14 },
];

export function ExecutiveView({ showToast, editing = false, resetTick = 0 }) {
  const fetchViewKpis = useAppStore(st => st.fetchViewKpis);
  const fetchTimeSeries = useAppStore(st => st.fetchTimeSeries);
  const fetchViewTable = useAppStore(st => st.fetchViewTable);
  const fetchProgressBars = useAppStore(st => st.fetchProgressBars);
  const fetchConfig = useAppStore(st => st.fetchConfig);
  const period = useAppStore(st => st.analyticsPeriod);
  const periodMode = useAppStore(st => st.analyticsPeriodMode);

  const [kpiData, setKpiData] = useState(null);
  const [tcocData, setTcocData] = useState(null);
  const [costData, setCostData] = useState(null);
  const [qualitySummary, setQualitySummary] = useState(null);
  const [tcocTab, setTcocTab] = useState('all');
  const [tcocMode, setTcocMode] = useState('pmpm');
  const [costInlineData, setCostInlineData] = useState(null);
  const [savingsData, setSavingsData] = useState(null);
  const [careProgramData, setCareProgramData] = useState(null);

  useEffect(() => {
    fetchViewKpis('executive').then(d => setKpiData(d || { kpis: [], insight: null }));
    fetchTimeSeries(['tcoc_all','tcoc_ip','tcoc_op','tcoc_ed','tcoc_rx','tcoc_pac']).then(d => setTcocData(d || {}));
    fetchViewTable('executive', 'cost_by_setting_benchmark').then(d => setCostData(d || { columns: [], rows: [] }));
    fetchProgressBars('executive', 'executive_quality_summary').then(d => setQualitySummary(d || []));
    fetchConfig('exec_cost_by_setting_inline').then(d => setCostInlineData(d || {}));
    fetchConfig('exec_savings_trajectory').then(d => setSavingsData(d || {}));
    fetchConfig('exec_care_programs').then(d => setCareProgramData(d || {}));
  }, [period, periodMode]);

  const kpis = kpiData?.kpis || [];
  const insight = kpiData?.insight || null;
  const costRows = safeTableRows(costData);
  const qualityItems = safeBarItems(qualitySummary);

  const qualFallback = qualityItems.length > 0 ? qualityItems : [
    { label: 'AWV Completion', value: '61%', pct: 61, color: 'amber', sub: 'Target 80% · 847 unscheduled' },
    { label: 'Diabetes HbA1c Control', value: '72%', pct: 72, color: 'teal', sub: 'Target 70% ✓' },
    { label: 'BP Control (<140/90)', value: '64%', pct: 64, color: 'purple', sub: 'Target 70%' },
    { label: 'Colorectal Screening', value: '58%', pct: 58, color: 'red', sub: 'Target 65%' },
    { label: 'Depression Screening', value: '83%', pct: 83, color: 'green', sub: 'Target 80% ✓' },
  ];

  const costInline = safeConfigData(costInlineData);
  const savings = safeConfigData(savingsData);
  const carePrograms = safeConfigData(careProgramData)?.rows || [];

  const costBySettingInline = costInline?.items || [];

  const rawSavings = savings?.data_points || [];
  const savingsTrajectory = periodMode === 'r12'
    ? rawSavings.map(v => v != null ? +(v * 1.15).toFixed(2) : null)
    : rawSavings;

  const periodLabel = periodMode === 'ytd' ? 'YTD 2025' : 'Rolling 12M';

  const RENDERERS = {
    insight: () => <ExecutiveInsightSection insight={insight} showToast={showToast} />,
    kpi1: () => <ExecutiveKpiRowSection kpiData={kpiData} kpis={kpis} start={0} end={4} />,
    kpi2: () => <ExecutiveKpiRowSection kpiData={kpiData} kpis={kpis} start={4} end={8} />,
    drivers: () => <ExecutiveDriversSection showToast={showToast} />,
    tcoc: () => (
      <ExecutiveTcocSection
        periodLabel={periodLabel}
        tcocMode={tcocMode}
        tcocTab={tcocTab}
        tcocData={tcocData}
        costBySettingInline={costBySettingInline}
        onTcocModeChange={setTcocMode}
        onTcocTabChange={setTcocTab}
      />
    ),
    quality: () => (
      <ExecutiveQualitySection
        qualitySummary={qualitySummary}
        qualFallback={qualFallback}
        showToast={showToast}
      />
    ),
    care: () => (
      <ExecutiveCareSection
        careProgramData={careProgramData}
        carePrograms={carePrograms}
        showToast={showToast}
      />
    ),
    savings: () => (
      <ExecutiveSavingsSection
        periodLabel={periodLabel}
        periodMode={periodMode}
        savingsData={savingsData}
        savingsTrajectory={savingsTrajectory}
        showToast={showToast}
      />
    ),
    costTable: () => <ExecutiveCostTableSection costData={costData} costRows={costRows} />,
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
