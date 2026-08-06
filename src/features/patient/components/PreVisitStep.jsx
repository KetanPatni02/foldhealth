import { useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { Avatar } from '../../../components/Avatar/Avatar';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { preVisitForProgram } from '../data/programActivityMock';
import styles from './PreVisitStep.module.css';

// Collapsible section shell (General Info / Care Team / Pre-visit Assessment).
function Section({ title, right, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <button type="button" className={styles.sectionToggle} onClick={() => setOpen(o => !o)}>
          <Icon
            name={open ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'}
            size={16}
            color="var(--neutral-300)"
          />
          <span className={styles.sectionTitle}>{title}</span>
        </button>
        {right}
      </div>
      {open && children}
    </div>
  );
}

// Icon + title sub-section header (used by the sectioned variant).
function SubHead({ icon, title }) {
  return (
    <div className={styles.subHead}>
      <Icon name={icon} size={16} color="var(--neutral-300)" />
      <span className={styles.subTitle}>{title}</span>
    </div>
  );
}

// Bordered key/value table (TOC / HIU / DM sub-sections).
function KeyValueTable({ rows }) {
  return (
    <div className={styles.kvTable}>
      {rows.map(([label, value]) => (
        <div key={label} className={styles.kvRow}>
          <span className={styles.kvLabel}>{label}</span>
          <span className={styles.kvValue}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// Stacked label-over-value cell (SNP General Info / Payer grid).
function StackCell({ label, value }) {
  return (
    <div className={styles.stackCell}>
      <span className={styles.stackLabel}>{label}</span>
      <span className={styles.stackValue}>{value}</span>
    </div>
  );
}

function CareTeam({ rows, showAddRole }) {
  return (
    <div className={styles.careTable}>
      <div className={styles.careHeadRow}>
        <span className={styles.careHeadCell}>Role</span>
        <span className={styles.careHeadCell}>Providers</span>
        <span className={styles.careActionCol} />
      </div>
      {rows.map(r => (
        <div key={r.role} className={styles.careRow}>
          <span className={styles.careRole}>{r.role}</span>
          <span className={styles.careProvider}>
            <Avatar variant="staff" size={24} initials={r.initials} />
            <span className={styles.careName}>{r.name}</span>
          </span>
          <span className={styles.careActionCol}>
            <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
          </span>
        </div>
      ))}
      {showAddRole && (
        <button type="button" className={styles.addRoleRow}>
          <Icon name="solar:add-circle-linear" size={16} color="var(--neutral-300)" />
          <span>Add New Role</span>
        </button>
      )}
    </div>
  );
}

// SNP-only: numbered Yes/No questions with a mandatory indicator.
function PreVisitAssessment({ questions }) {
  const [answers, setAnswers] = useState(() => questions.map(() => 'Yes'));
  return (
    <div className={styles.assessment}>
      {questions.map((q, i) => (
        <div key={q} className={styles.question}>
          <div className={styles.questionText}>
            <span className={styles.questionNum}>{i + 1}.</span>
            <span className={styles.questionLabel}>{q}</span>
            <span className={styles.reqDot} aria-hidden="true" />
          </div>
          <div className={styles.questionOptions}>
            <RadioButton
              checked={answers[i] === 'Yes'}
              onChange={() => setAnswers(a => a.map((v, idx) => (idx === i ? 'Yes' : v)))}
              label="Yes"
            />
            <RadioButton
              checked={answers[i] === 'No'}
              onChange={() => setAnswers(a => a.map((v, idx) => (idx === i ? 'No' : v)))}
              label="No"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * PreVisitStep — program-specific Pre-visit content for the Program Detail
 * window. Layout and data are driven by the program code (SNP / TOC / HIU / DM).
 */
export function PreVisitStep({ programCode }) {
  const config = preVisitForProgram(programCode);

  return (
    <div className={styles.container}>
      <Section title="General Info">
        {config.variant === 'snp' ? (
          <div className={styles.generalSnp}>
            <div className={styles.stackGrid}>
              {config.general.top.map(f => (
                <StackCell key={f.label} label={f.label} value={f.value} />
              ))}
            </div>
            <div className={styles.payerTitle}>{config.general.payerTitle}</div>
            <div className={styles.payerGrid}>
              {config.general.payerCols.flat().map(f => (
                <StackCell key={f.label} label={f.label} value={f.value} />
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.sectioned}>
            {config.sections.map(sec => (
              <div key={sec.title} className={styles.subSection}>
                <SubHead icon={sec.icon} title={sec.title} />
                <KeyValueTable rows={sec.rows} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Care Team">
        <CareTeam rows={config.careTeam} showAddRole={config.showAddRole} />
      </Section>

      {config.assessment && (
        <Section title="Pre-visit Assessment">
          <PreVisitAssessment questions={config.assessment} />
        </Section>
      )}
    </div>
  );
}
