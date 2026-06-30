import { useState } from 'react';
import { Icon } from '../Icon/Icon';
import { Button } from '../Button/Button';
import { Badge } from '../Badge/Badge';
import { AuditBadge } from '../AuditBadge/AuditBadge';
import { ReasonDialog } from '../ReasonDialog/ReasonDialog';
import {
  CHECK_KEYS, CHECK_LABELS, STANDARD_REASONS,
  OCR_TIER_LABEL, OCR_TIER_TONE,
  applyManualDecision,
} from '../../features/hcc/compliance';
import styles from './ComplianceReviewPanel.module.css';

/**
 * ComplianceReviewPanel — full 5-point review surface for a single document.
 * Shows OCR tier, per-check state, and lets Support apply manual decisions
 * (each requires a reason via ReasonDialog).
 *
 * Callbacks (in priority order):
 *   - onDecision({ checkKey, decision, reason, actor })  — preferred. The
 *       parent dispatches via its own store action (e.g. logs audit events,
 *       persists to Supabase). The panel does no local mutation.
 *   - onChange(nextCompliance) — fallback. Panel applies the decision
 *       locally via applyManualDecision and hands back the new object.
 *
 * @param {object}   props
 * @param {string}   props.fileName
 * @param {'clean'|'degraded'|'unreadable'} props.ocrTier
 * @param {object}   props.compliance
 * @param {string}   [props.actor]
 * @param {function} [props.onDecision]
 * @param {function} [props.onChange]
 */
export function ComplianceReviewPanel({ fileName, ocrTier, compliance, actor, onDecision, onChange }) {
  // { checkKey, decision } — open when truthy
  const [pending, setPending] = useState(null);

  const handleSubmitReason = (reason) => {
    if (!pending) return;
    const { checkKey, decision } = pending;
    if (onDecision) {
      onDecision({ checkKey, decision, reason, actor: actor || 'Support' });
    } else if (onChange) {
      const next = {
        ...compliance,
        [checkKey]: applyManualDecision(compliance[checkKey], {
          decision,
          actor: actor || 'Support',
          reason,
        }),
      };
      onChange(next);
    }
    setPending(null);
  };

  const unreadable = ocrTier === 'unreadable';

  return (
    <div className={styles.panel}>
      {/* Doc header with OCR tier badge */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Icon name="solar:document-text-linear" size={18} color="var(--neutral-400)" />
          <div className={styles.fileName} title={fileName}>{fileName}</div>
        </div>
        {ocrTier && (
          <Badge
            variant={OCR_TIER_TONE[ocrTier]}
            label={`OCR · ${OCR_TIER_LABEL[ocrTier]}`}
          />
        )}
      </div>

      {/* Unreadable banner — short-circuits the rest */}
      {unreadable && (
        <div className={styles.unreadableBanner}>
          <Icon name="solar:danger-triangle-bold" size={18} color="var(--status-error)" />
          <div>
            <div className={styles.unreadableTitle}>Document unreadable</div>
            <div className={styles.unreadableHint}>
              OCR failed. This document cannot be reviewed for compliance — re-scan or re-request the record from the provider.
            </div>
          </div>
        </div>
      )}

      {/* 5-point checklist */}
      {!unreadable && (
        <ul className={styles.list}>
          {CHECK_KEYS.map((k, i) => {
            const check = compliance?.[k];
            return (
              <li key={k} className={styles.row}>
                <div className={styles.rowMain}>
                  <span className={styles.index}>{i + 1}</span>
                  <div className={styles.rowText}>
                    <div className={styles.checkLabel}>{CHECK_LABELS[k]}</div>
                    {check?.reason?.code && (
                      <div className={styles.reasonText}>Reason: {check.reason.code}</div>
                    )}
                    {check?.reason?.freeText && (
                      <div className={styles.reasonText}>“{check.reason.freeText}”</div>
                    )}
                  </div>
                  <div className={styles.rowRight}>
                    <StatusPill status={check?.status} />
                    {check?.source && (
                      <AuditBadge source={check.source} actor={check.actor} at={check.at} />
                    )}
                  </div>
                </div>
                <div className={styles.rowActions}>
                  <Button
                    variant={check?.status === 'pass' ? 'secondary' : 'tertiary'}
                    size="S"
                    leadingIcon="solar:check-circle-linear"
                    onClick={() => setPending({ checkKey: k, decision: 'pass' })}
                    disabled={check?.status === 'pass' && check?.source === 'support'}
                  >
                    Manual Pass
                  </Button>
                  <Button
                    variant={check?.status === 'fail' ? 'danger' : 'tertiary'}
                    size="S"
                    leadingIcon="solar:close-circle-linear"
                    onClick={() => setPending({ checkKey: k, decision: 'fail' })}
                    disabled={check?.status === 'fail' && check?.source === 'support'}
                  >
                    Manual Fail
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pending && (
        <ReasonDialog
          title={pending.decision === 'pass' ? 'Confirm manual pass' : 'Confirm manual fail'}
          description={CHECK_LABELS[pending.checkKey]}
          decision={pending.decision}
          standardReasons={STANDARD_REASONS[pending.checkKey] || []}
          onCancel={() => setPending(null)}
          onSubmit={handleSubmitReason}
        />
      )}
    </div>
  );
}

function StatusPill({ status }) {
  if (status === 'pass') return <Badge variant="success" label="Pass" />;
  if (status === 'fail') return <Badge variant="error" label="Fail" />;
  return <Badge variant="warning" label="Pending" />;
}
