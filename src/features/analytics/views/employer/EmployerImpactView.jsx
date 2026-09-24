import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../../../store/useAppStore';
import { Toggle } from '../../../../components/Toggle/Toggle';
import { Button } from '../../../../components/Button/Button';
import { FilterChip } from '../../../../components/FilterChip/FilterChip';
import { DatePicker } from '../../../../components/DatePicker/DatePicker';
import { Select } from '../../../../components/Select/Select';
import { Icon } from '../../../../components/Icon/Icon';
import { CheckboxListPopover } from '../../../../components/CheckboxListPopover/CheckboxListPopover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ShadcnDialog/ShadcnDialog';
import { ChartSkeleton } from '../shared';
import { ImpactCard } from './ImpactCard';
import { StackedBars, Lines, HBars, Donut, ChartLegend } from './EmployerCharts';
import { formatValue } from './employerImpactFormat';
import {
  SECTIONS, WIDGETS, SAVINGS_CATEGORIES, SAVINGS_METRIC, TIME_FRAMES,
} from './employerImpactConfig';
import {
  monthsBetween, addMonths, rangeLabel, toMonthKey, indexRows,
  buildSeriesData, buildStats, buildSavings, buildDuration, buildSatisfaction, surveyForms, toCsv,
} from './employerImpactData';
import { VIEW_TITLES } from '../../analyticsData';
import layout from '../../AnalyticsLayout.module.css';
import styles from './EmployerImpactView.module.css';

const HIDDEN_KEY = 'employer-impact-hidden-widgets';
const DEFAULT_SPAN_MONTHS = 7;

// Hidden widgets are a per-viewer convenience, so they live in this browser.
function readHidden() {
  try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]')); } catch { return new Set(); }
}
function writeHidden(set) {
  try { localStorage.setItem(HIDDEN_KEY, JSON.stringify([...set])); } catch { /* storage unavailable */ }
}

function downloadCsv(filename, csv) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const lastDayOf = (monthKey) => {
  const [y, m] = monthKey.split('-').map(Number);
  return `${monthKey}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};

// ── Per-widget view model ────────────────────────────────────────────────

/**
 * What a widget draws, as rows plus the columns that describe them: the
 * same shape feeds the chart, the table view and the CSV, so the three
 * always agree.
 */
function widgetModel(widget, idx, ctx, extra) {
  if (widget.type === 'stats') {
    const stats = buildStats(idx, widget.stats, ctx);
    return {
      hasData: stats.some(s => s.hasData),
      stats,
      rows: stats.map(s => ({ x: s.label, pct: `${s.pct}%`, count: s.count, total: s.total })),
      columns: [{ key: 'x', label: 'Window' }, { key: 'pct', label: 'Share' }, { key: 'count', label: 'Members' }, { key: 'total', label: 'Total members' }],
    };
  }
  if (widget.type === 'duration') {
    const d = buildDuration(idx, widget.metric, ctx);
    return { ...d, rows: d.data, columns: [{ key: 'x', label: 'Measure' }, { key: 'in_person', label: 'Minutes' }] };
  }
  if (widget.type === 'satisfaction') {
    const forms = surveyForms(idx, widget.metric);
    const form = forms.includes(extra?.form) ? extra.form : forms[0];
    const s = form ? buildSatisfaction(idx, widget.metric, form, ctx) : { hasData: false, data: [] };
    return {
      ...s, forms, form,
      rows: s.data,
      columns: [{ key: 'x', label: 'Period' }, { key: 'responded', label: 'Responded %' }, { key: 'not_responded', label: 'Not Responded %' }],
    };
  }
  const { data, hasData } = buildSeriesData(idx, widget, ctx);
  const columns = [
    { key: 'x', label: widget.type === 'hbar' ? (widget.yLabel || 'Category') : (widget.xLabel || 'Category') },
    ...widget.series.map(s => ({ key: s.key, label: s.label })),
    ...(widget.line ? [{ key: widget.line.key, label: widget.line.label }] : []),
  ];
  return { data, hasData, rows: data, columns };
}

// ── Widget bodies ────────────────────────────────────────────────────────

function StatCards({ stats, compact }) {
  return (
    <div className={compact ? styles.statStack : styles.statGrid}>
      {stats.map(s => (
        <div key={s.window} className={styles.statCard}>
          <span className={styles.statLabel}>{s.label}</span>
          <span className={styles.statValue}>
            <strong>{s.hasData ? `${s.pct}%` : '–'}</strong>
            {s.hasData && <span className={styles.statSub}> • {s.count.toLocaleString()} / {s.total.toLocaleString()}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function WidgetChart({ widget, model, hidden, onToggle, height }) {
  if (widget.type === 'stats') return <StatCards stats={model.stats} />;

  if (widget.type === 'duration') {
    return <HBars data={model.data} seriesKey="in_person" seriesLabel={widget.series[0].label} xLabel={widget.xLabel} format="minutes" height={height} />;
  }

  if (widget.type === 'donut') {
    return <Donut data={model.data} seriesKey={widget.series[0].key} height={height ? height - 40 : undefined} />;
  }

  if (widget.type === 'hbar') {
    return (
      <HBars
        data={model.data}
        seriesKey={widget.series[0].key}
        seriesLabel={widget.series[0].label}
        yLabel={widget.yLabel}
        xLabel={widget.xLabel}
        height={height}
      />
    );
  }

  const legend = <ChartLegend series={widget.series} hidden={hidden} onToggle={onToggle} line={widget.line} />;
  const chart = widget.type === 'line'
    ? <Lines data={model.data} series={widget.series} hidden={hidden} yLabel={widget.yLabel} xLabel={widget.xLabel} format={widget.format} height={height} />
    : (
      <StackedBars
        data={model.data}
        series={widget.series}
        line={widget.line}
        hidden={hidden}
        yLabel={widget.yLabel}
        xLabel={widget.xLabel}
        format={widget.format}
        height={height}
        denseX={widget.x === 'hour'}
      />
    );

  if (widget.stats) {
    // Engaged for Care: the not-engaged windows sit beside the chart.
    return (
      <div className={styles.withStats}>
        <StatCards stats={model.sideStats || []} compact />
        <div className={styles.withStatsChart}>{legend}{chart}</div>
      </div>
    );
  }
  return <>{legend}{chart}</>;
}

function SatisfactionBody({ widget, model, onForm, hidden, onToggle, height }) {
  return (
    <div className={styles.satisfaction}>
      <div className={styles.satisfactionSide}>
        <Select
          portal
          options={model.forms.map(f => ({ value: f, label: f }))}
          value={model.form}
          onChange={onForm}
        />
        <div className={styles.satBox}>
          <span className={styles.statLabel}>Average Score</span>
          <span className={styles.statValue}>
            <strong>{model.averageScore ?? '–'}</strong>
            <span className={styles.statSub}> from {model.responded.toLocaleString()} responses</span>
          </span>
        </div>
        <div className={styles.satBox}>
          <span className={styles.statLabel}>Total form sent</span>
          <strong className={styles.satNumber}>{model.sent.toLocaleString()}</strong>
          <div className={styles.satSplit}>
            <span>
              <span className={styles.statLabel}>Responded</span>
              <strong className={styles.satNumber}>{model.responded.toLocaleString()}</strong>
            </span>
            <span>
              <span className={styles.statLabel}>Not Responded</span>
              <strong className={styles.satNumber}>{model.notResponded.toLocaleString()}</strong>
            </span>
          </div>
        </div>
      </div>
      <div className={styles.satisfactionChart}>
        <ChartLegend
          series={[{ key: 'responded', label: 'Responded' }, { key: 'not_responded', label: 'Not Responded' }]}
          hidden={hidden}
          onToggle={onToggle}
        />
        <StackedBars
          data={model.data}
          series={[{ key: 'responded', label: 'Responded' }, { key: 'not_responded', label: 'Not Responded' }]}
          hidden={hidden}
          yLabel={widget.yLabel}
          xLabel={widget.xLabel}
          format="percent"
          height={height}
        />
      </div>
    </div>
  );
}

function SavingsCard({ card, rangeText, onDownload }) {
  const negative = card.savings < 0;
  return (
    <ImpactCard title={card.title} info={card.info} hasData={card.hasData} onDownload={onDownload} className={styles.savingsCard}>
      <div className={styles.savingsRow} aria-label={rangeText}>
        <span className={styles.savingsCol}>
          <span className={styles.savingsLabel}>Traditional Cost</span>
          <span className={styles.savingsValue}>{formatValue(card.traditional, 'currency')}</span>
        </span>
        <span className={styles.savingsCol}>
          <span className={styles.savingsLabel}>Our Cost</span>
          <span className={styles.savingsValue}>{formatValue(card.ours, 'currency')}</span>
        </span>
        <span className={[styles.savingsCol, styles.savingsEnd].join(' ')}>
          <span className={styles.savingsLabel}>Savings Amt.</span>
          {/* Colour and sign both carry the direction, so a cost overrun reads
              as one without relying on red alone. */}
          <span className={[styles.savingsAmount, negative ? styles.savingsLoss : styles.savingsGain].join(' ')}>
            {negative ? '−' : ''}{formatValue(Math.abs(card.savings), 'currency')}
          </span>
        </span>
      </div>
    </ImpactCard>
  );
}

// ── View ─────────────────────────────────────────────────────────────────

/**
 * Employer Impact Report: Analytics → Overview. Figma 5618:10554.
 *
 * Every chart is computed from `employer_impact_metrics` through the
 * `employer_impact_rollup` SQL function, so the filters (employer,
 * location, time frame, date range) really change what each chart shows.
 */
export function EmployerImpactView() {
  const filterOptions = useAppStore(s => s.employerImpactFilters);
  const filtersLoaded = useAppStore(s => s.employerImpactFiltersLoaded);
  const fetchFilters = useAppStore(s => s.fetchEmployerImpactFilters);
  const fetchRollup = useAppStore(s => s.fetchEmployerImpact);

  const [scope, setScope] = useState('patient');
  const [employerName, setEmployerName] = useState(null);
  const [location, setLocation] = useState(null);
  const [timeFrame, setTimeFrame] = useState('Month');
  const [range, setRange] = useState(null); // { from, to } as 'YYYY-MM'
  const [rows, setRows] = useState(null);
  const [hiddenWidgets, setHiddenWidgets] = useState(readHidden);
  const [hiddenSeries, setHiddenSeries] = useState({});
  const [forms, setForms] = useState({});
  const [dialog, setDialog] = useState(null); // { key, mode: 'expand' | 'table' }
  const [widgetMenuRect, setWidgetMenuRect] = useState(null);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const widgetBtnRef = useRef(null);
  const sectionRefs = useRef({});

  useEffect(() => { fetchFilters(); }, [fetchFilters]);

  // Default range: the last seven months that have data.
  const lastMonth = filterOptions?.lastMonth || toMonthKey(new Date());
  const firstMonth = filterOptions?.firstMonth || addMonths(lastMonth, -11);
  const effectiveRange = range || {
    from: [addMonths(lastMonth, -(DEFAULT_SPAN_MONTHS - 1)), firstMonth].sort().pop(),
    to: lastMonth,
  };

  const employers = filterOptions?.employers || [];
  const employerId = employers.find(e => e.name === employerName)?.id || null;
  const locations = (scope === 'visit' ? filterOptions?.visitLocations : filterOptions?.patientLocations) || [];

  // Refetch whenever a filter that the SQL narrows by changes. Time frame
  // only regroups months, so it doesn't need the network.
  // Rows are tagged with the request they answer, so a filter change reads
  // as loading until its own response lands.
  const requestKey = [effectiveRange.from, effectiveRange.to, employerId, scope, location].join('|');
  useEffect(() => {
    if (!filtersLoaded) return undefined;
    let cancelled = false;
    fetchRollup({ from: effectiveRange.from, to: effectiveRange.to, employer: employerId, scope, location })
      .then(r => { if (!cancelled) setRows({ key: requestKey, rows: r || [] }); });
    return () => { cancelled = true; };
  }, [filtersLoaded, fetchRollup, requestKey, effectiveRange.from, effectiveRange.to, employerId, scope, location]);

  const loading = rows?.key !== requestKey;
  const idx = useMemo(() => indexRows(loading ? [] : rows.rows), [rows, loading]);
  const months = useMemo(() => monthsBetween(effectiveRange.from, effectiveRange.to), [effectiveRange.from, effectiveRange.to]);
  const ctx = useMemo(() => ({ months, timeFrame }), [months, timeFrame]);
  const rangeText = rangeLabel(effectiveRange.from, effectiveRange.to);

  const models = useMemo(() => {
    const out = {};
    for (const w of WIDGETS) {
      const m = widgetModel(w, idx, ctx, { form: forms[w.key] });
      if (w.stats && w.type !== 'stats') m.sideStats = buildStats(idx, w.stats, ctx);
      out[w.key] = m;
    }
    return out;
  }, [idx, ctx, forms]);
  const savings = useMemo(() => buildSavings(idx, SAVINGS_CATEGORIES, SAVINGS_METRIC, ctx), [idx, ctx]);

  // Quick Jump follows whichever section heading is nearest the top.
  useEffect(() => {
    const els = SECTIONS.map(s => sectionRefs.current[s.id]).filter(Boolean);
    if (!els.length || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveSection(visible[0].target.dataset.section);
    }, { rootMargin: '0px 0px -70% 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [loading]);

  const jumpTo = (id) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const setHidden = (next) => { setHiddenWidgets(next); writeHidden(next); };
  const hideWidget = (key) => setHidden(new Set([...hiddenWidgets, key]));
  const toggleSeries = (widgetKey) => (seriesKey) => setHiddenSeries((prev) => {
    const cur = new Set(prev[widgetKey] || []);
    if (cur.has(seriesKey)) cur.delete(seriesKey); else cur.add(seriesKey);
    return { ...prev, [widgetKey]: cur };
  });
  const csvName = (title) => `${slug(title)}-${effectiveRange.from}-to-${effectiveRange.to}.csv`;

  const widgetTitles = [
    ...WIDGETS.map(w => ({ key: w.key, title: w.title })),
    ...SAVINGS_CATEGORIES.map(c => ({ key: `savings:${c.key}`, title: c.title })),
  ];

  const renderWidget = (w) => {
    if (hiddenWidgets.has(w.key)) return null;
    const model = models[w.key];
    const hidden = hiddenSeries[w.key] || new Set();
    const body = w.type === 'satisfaction'
      ? <SatisfactionBody widget={w} model={model} hidden={hidden} onToggle={toggleSeries(w.key)} onForm={(f) => setForms(p => ({ ...p, [w.key]: f }))} />
      : <WidgetChart widget={w} model={model} hidden={hidden} onToggle={toggleSeries(w.key)} />;
    return (
      <ImpactCard
        key={w.key}
        title={w.title}
        info={w.info}
        sub={rangeText}
        hasData={!loading && model.hasData}
        className={styles[`span_${w.span}`]}
        onExpand={w.type === 'stats' ? undefined : () => setDialog({ key: w.key, mode: 'expand' })}
        onDownload={() => downloadCsv(csvName(w.title), toCsv(model.rows, model.columns))}
        onTable={() => setDialog({ key: w.key, mode: 'table' })}
        onHide={() => hideWidget(w.key)}
      >
        {loading ? <ChartSkeleton /> : body}
      </ImpactCard>
    );
  };

  const dialogWidget = dialog && WIDGETS.find(w => w.key === dialog.key);
  const dialogModel = dialogWidget && models[dialogWidget.key];

  return (
    <div className={styles.page}>
      {/* Header: same structure as the shared Analytics view header */}
      <div className={layout.viewHeader}>
        <div className={styles.headerText}>
          <div className={layout.viewTitle}>{VIEW_TITLES.employer.title}</div>
          <div className={layout.viewSub}>{VIEW_TITLES.employer.sub}</div>
        </div>
        <div className={[layout.filterBar, styles.headerActions].join(' ')}>
          <Toggle
            items={[{ key: 'patient', label: 'Patient Location' }, { key: 'visit', label: 'Visit Location' }]}
            active={scope}
            onChange={(k) => { setScope(k); setLocation(null); }}
          />
          <span ref={widgetBtnRef}>
            <Button
              variant="secondary"
              size="L"
              leadingIcon="solar:widget-add-linear"
              onClick={() => setWidgetMenuRect(widgetBtnRef.current?.getBoundingClientRect() || null)}
            >
              Widget
            </Button>
          </span>
          <Button
            variant="secondary"
            size="L"
            leadingIcon="solar:printer-minimalistic-linear"
            onClick={() => window.print()}
          >
            Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <Icon name="custom:filter" size={20} color="var(--neutral-300)" />
        <FilterChip
          label="Employer"
          options={employers.map(e => e.name)}
          selected={employerName ? [employerName] : []}
          onChange={(next) => setEmployerName(next[0] || null)}
          singleSelect
          searchable={employers.length > 6}
        />
        <FilterChip
          key={scope}
          label={scope === 'visit' ? 'Visit Location' : 'Patient Location'}
          options={locations}
          selected={location ? [location] : []}
          onChange={(next) => setLocation(next[0] || null)}
          singleSelect
        />
        <FilterChip
          label="Time Frame"
          options={TIME_FRAMES}
          selected={[timeFrame]}
          onChange={(next) => setTimeFrame(next[0] || 'Month')}
          singleSelect
        />
        <div className={styles.rangePicker}>
          <DatePicker
            mode="range"
            aria-label="Date range"
            value={{ start: `${effectiveRange.from}-01`, end: lastDayOf(effectiveRange.to) }}
            min={`${firstMonth}-01`}
            max={lastDayOf(lastMonth)}
            onSelect={(r) => {
              if (!r?.start || !r?.end) return;
              const from = toMonthKey(r.start);
              const to = toMonthKey(r.end);
              setRange(from <= to ? { from, to } : { from: to, to: from });
            }}
          />
        </div>
      </div>

      {/* Quick jump */}
      <nav className={styles.quickJump} aria-label="Quick jump">
        <span className={styles.quickJumpLabel}>Quick Jump:</span>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            type="button"
            className={[styles.quickJumpItem, activeSection === s.id ? styles.quickJumpActive : ''].filter(Boolean).join(' ')}
            aria-current={activeSection === s.id ? 'true' : undefined}
            onClick={() => jumpTo(s.id)}
          >
            {s.title}
          </button>
        ))}
      </nav>

      {filtersLoaded && !filterOptions && (
        <p className={styles.notice}>
          Employer data isn&apos;t available yet. Charts will fill in once the employer impact tables are set up.
        </p>
      )}

      {/* Sections */}
      <div className={styles.sections}>
        {SECTIONS.map(section => (
          <section
            key={section.id}
            className={styles.section}
            data-section={section.id}
            ref={(el) => { sectionRefs.current[section.id] = el; }}
            aria-labelledby={`eir-${section.id}`}
          >
            <h2 className={styles.sectionTitle} id={`eir-${section.id}`}>{section.heading || section.title}</h2>
            <div className={styles.grid}>
              {section.id === 'costSavings'
                ? savings.filter(c => !hiddenWidgets.has(`savings:${c.key}`)).map(c => (
                  <SavingsCard
                    key={c.key}
                    card={{ ...c, hasData: !loading && c.hasData }}
                    rangeText={rangeText}
                    onDownload={() => downloadCsv(csvName(c.title), toCsv(
                      [{ x: c.title, traditional: c.traditional, ours: c.ours, savings: c.savings }],
                      [{ key: 'x', label: 'Category' }, { key: 'traditional', label: 'Traditional Cost' }, { key: 'ours', label: 'Our Cost' }, { key: 'savings', label: 'Savings' }],
                    ))}
                  />
                ))
                : WIDGETS.filter(w => w.section === section.id).map(renderWidget)}
            </div>
          </section>
        ))}
      </div>

      {/* Widget picker */}
      {widgetMenuRect && (
        <CheckboxListPopover
          anchorRect={widgetMenuRect}
          label="Widgets"
          options={widgetTitles.map(w => w.title)}
          selected={widgetTitles.filter(w => !hiddenWidgets.has(w.key)).map(w => w.title)}
          onChange={(shownTitles) => {
            const shown = new Set(shownTitles);
            setHidden(new Set(widgetTitles.filter(w => !shown.has(w.title)).map(w => w.key)));
          }}
          onClose={() => setWidgetMenuRect(null)}
          width={300}
          searchable
          showClear={false}
        />
      )}

      {/* Expand / table */}
      <Dialog open={!!dialogWidget} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        {dialogWidget && (
          <DialogContent className={styles.dialog}>
            <DialogHeader>
              <DialogTitle>{dialogWidget.title}</DialogTitle>
              <span className={styles.cardSub}>{rangeText}</span>
            </DialogHeader>
            {dialog.mode === 'table' ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>{dialogModel.columns.map(c => <th key={c.key} scope="col">{c.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {dialogModel.rows.map(r => (
                      <tr key={r.x}>
                        {dialogModel.columns.map((c, ci) => (
                          ci === 0
                            ? <th key={c.key} scope="row">{r[c.key]}</th>
                            : <td key={c.key}>{typeof r[c.key] === 'number' ? formatValue(r[c.key], dialogWidget.format) : r[c.key]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.expandBody}>
                {dialogWidget.type === 'satisfaction'
                  ? <SatisfactionBody widget={dialogWidget} model={dialogModel} hidden={hiddenSeries[dialogWidget.key] || new Set()} onToggle={toggleSeries(dialogWidget.key)} onForm={(f) => setForms(p => ({ ...p, [dialogWidget.key]: f }))} height={420} />
                  : <WidgetChart widget={dialogWidget} model={dialogModel} hidden={hiddenSeries[dialogWidget.key] || new Set()} onToggle={toggleSeries(dialogWidget.key)} height={420} />}
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
