import { Badge } from '../../../../components/Badge/Badge';
import { Card, EmptyState, KpiCard, ProgressBar } from '../shared';
import { CHANNELS } from '../../../pharmacy-worklist/pharmacyImpact';
import s from '../../AnalyticsLayout.module.css';
import local from './PharmacyReportsView.module.css';

const starsText = (n) => (n == null ? '-' : `${n}★`);

// Fold Impact (Ajay): patients saved through Fold's outreach, gaps saved
// after a deadline alert, and Fold's share of each measure's star rating.
// `saved`, `escalations`, `stars`: from pharmacyImpact.js.
export function PharmacyImpactTab({ saved, escalations, stars }) {
  const patients = new Set(saved.map(r => r.memberId)).size;
  const byChannel = CHANNELS.map(c => ({ channel: c, n: saved.filter(r => r.channel === c).length }));
  const escalationSaved = escalations.filter(r => r.saved).length;
  const starGain = stars.filter(r => r.stars != null && r.starsWithout != null && r.stars > r.starsWithout).length;
  return (
    <>
      <div className={`${s.kpiGrid} ${s.cols4}`}>
        <KpiCard label="Patients Saved" value={patients} sub="With a gap closed or Met for Year after Fold reached them" />
        <KpiCard label="Gaps Saved" value={saved.length} sub="Each with Fold's outreach on or before the fill" />
        <KpiCard label="Saved After an Alert" value={escalationSaved} sub={`Of ${escalations.length} alert${escalations.length === 1 ? '' : 's'} accepted or approved`} />
        <KpiCard label="Measures Up a Star" value={starGain} sub="Where Fold's saves cross a star cut point" />
      </div>

      <Card title="Saved by Channel" sub="The outreach that last reached the member or pharmacy before the fill">
        {saved.length ? (
          <div className={local.bars}>
            {byChannel.map(r => (
              <ProgressBar key={r.channel} label={r.channel} value={`${r.n} of ${saved.length}`} pct={saved.length ? Math.round((r.n / saved.length) * 100) : 0} />
            ))}
          </div>
        ) : <EmptyState message="No gaps saved through Fold yet" icon="solar:pill-linear" />}
        <p className={local.note}>Automated refill reminders count here once their sends are logged.</p>
      </Card>

      <Card title="Contribution to Star Rating" sub="Adherence rate with Fold's saves and without them, by measure" flush>
        <div className={s.tblWrap}>
          <table className={s.tbl}>
            <thead>
              <tr>
                <th>Measure</th><th className="r">Gaps</th><th className="r">Saved by Fold</th>
                <th className="r">Rate</th><th className="r">Without Fold</th><th className="r">Lift</th>
                <th className="r">Stars</th><th className="r">Without Fold</th>
              </tr>
            </thead>
            <tbody>
              {stars.length ? stars.map(r => (
                <tr key={r.code}>
                  <td className={local.groupCell}>{`${r.code} · ${r.name}`}</td>
                  <td className="r">{r.gaps}</td><td className="r">{r.foldSaved}</td>
                  <td className="r">{`${r.rate}%`}</td><td className="r">{`${r.without}%`}</td>
                  <td className="r">{`+${r.lift} pts`}</td>
                  <td className="r">{starsText(r.stars)}</td><td className="r">{starsText(r.starsWithout)}</td>
                </tr>
              )) : <EmptyState message="No pharmacy gaps match these filters" icon="solar:pill-linear" colSpan={8} />}
            </tbody>
          </table>
        </div>
        <p className={`${local.note} ${local.notePad}`}>Stars use sample cut points until Tahira and Monique confirm this year&apos;s published ones.</p>
      </Card>

      <Card title="Saved After an Alert" sub="Deadline alerts accepted or approved, by how late they came" flush>
        <div className={s.tblWrap}>
          <table className={s.tbl}>
            <thead>
              <tr><th>Member</th><th>Gap</th><th>Alert</th><th>When</th><th>Outcome</th><th>Result</th></tr>
            </thead>
            <tbody>
              {escalations.length ? escalations.map(r => (
                <tr key={`${r.memberId}|${r.code}|${r.kind}`}>
                  <td className={local.groupCell}>{r.member}</td>
                  <td>{r.code}</td>
                  <td>{r.kind === 'escalation' ? 'Escalated' : 'Deadline'}</td>
                  <td>{r.when}</td>
                  <td>{`${r.outcome}${r.by ? ` by ${r.by}` : ''}`}</td>
                  <td><Badge size="sm" tone={r.saved ? 'success' : 'neutral'} label={r.saved ? 'Saved' : 'Not yet'} /></td>
                </tr>
              )) : <EmptyState message="No alerts accepted or approved yet" icon="solar:bell-linear" colSpan={6} />}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Saved Gaps" flush>
        <div className={s.tblWrap}>
          <table className={s.tbl}>
            <thead>
              <tr><th>Member</th><th>Gap</th><th>Status</th><th>Saved On</th><th>Channel</th><th>Reached On</th><th>By</th></tr>
            </thead>
            <tbody>
              {saved.length ? saved.map(r => (
                <tr key={`${r.memberId}|${r.code}`}>
                  <td className={local.groupCell}>{r.member}</td>
                  <td>{r.code}</td><td>{r.status}</td><td>{r.savedOn || '-'}</td>
                  <td>{r.channel}</td><td>{r.touchDate}</td><td>{r.by || '-'}</td>
                </tr>
              )) : <EmptyState message="No gaps saved through Fold yet" icon="solar:pill-linear" colSpan={7} />}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
