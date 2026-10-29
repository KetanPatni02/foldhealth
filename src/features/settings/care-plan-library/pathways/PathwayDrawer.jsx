import { useMemo, useState } from 'react';
import { Drawer } from '../../../../components/Drawer/Drawer';
import { Button } from '../../../../components/Button/Button';
import { Badge } from '../../../../components/Badge/Badge';
import { Alert } from '../../../../components/Alert/Alert';
import { Icon } from '../../../../components/Icon/Icon';
import { useAppStore } from '../../../../store/useAppStore';
import { PROTOCOL_SECTIONS } from '../../clinical-protocols/lib/protocolSections';
import { pathwaySources, resolvePathway } from '../lib/carePathways';
import { useCanManageTemplates } from '../lib/useCanManageTemplates';
import styles from './Pathways.module.css';

const LOGIC_SECTIONS = Object.fromEntries(PROTOCOL_SECTIONS.map(s => [s.key, s]));

function Section({ icon, label, items, renderItem }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <Icon name={icon} size={16} color="var(--neutral-400)" />
        <span className={styles.sectionTitle}>{label}<span className={styles.sectionCount}>{items.length}</span></span>
      </div>
      {items.map(renderItem)}
    </section>
  );
}

function Item({ title, detail, source, badges }) {
  return (
    <div className={styles.item}>
      <div className={styles.itemText}>
        <span className={styles.itemTitle}>{title}</span>
        {detail && <span className={styles.itemDetail}>{detail}</span>}
        {source && <span className={styles.itemSource}>{source}</span>}
      </div>
      {badges && <span className={styles.itemBadges}>{badges}</span>}
    </div>
  );
}

/**
 * A Fold pathway, read-only: its recommended GBI set, decision logic and
 * recheck cadence, and the templates already adapted from it. Adapting makes
 * a draft template to edit; supervisors can also publish it as is.
 */
export function PathwayDrawer({ pathway, onClose }) {
  const canManage = useCanManageTemplates();
  const goals = useAppStore(s => s.carePlanGoals);
  const interventions = useAppStore(s => s.carePlanInterventionTemplates);
  const barriers = useAppStore(s => s.carePlanBarriers);
  const libraryLoaded = useAppStore(s => s.carePlanLibraryDidFetch);
  const templates = useAppStore(s => s.carePlanTemplates);
  const adaptCarePathway = useAppStore(s => s.adaptCarePathway);
  const setCarePlanTemplateScreen = useAppStore(s => s.setCarePlanTemplateScreen);
  const setCarePlanTab = useAppStore(s => s.setCarePlanTab);
  const showToast = useAppStore(s => s.showToast);
  const [busy, setBusy] = useState(null);

  const missing = useMemo(() => {
    if (!libraryLoaded) return new Set();
    const { unresolved } = resolvePathway(pathway, { goals, interventions, barriers });
    return new Set(unresolved.map(u => `${u.kind}:${u.title}`));
  }, [pathway, goals, interventions, barriers, libraryLoaded]);
  const adapted = templates.filter(t => t.sourcePathway?.id === pathway.id);

  const adapt = async (publish) => {
    setBusy(publish ? 'publish' : 'adapt');
    let saved;
    try { saved = await adaptCarePathway(pathway, { publish }); }
    finally { setBusy(null); }
    if (!saved) return;
    onClose();
    if (publish) {
      showToast(`"${saved.name}" published as a template`);
      setCarePlanTab('template');
      return;
    }
    // A draft opens straight in the editor; it goes for approval from Draft Templates.
    showToast(`Draft "${saved.name}" created from the Fold pathway`);
    setCarePlanTab('drafts');
    setCarePlanTemplateScreen({ mode: 'edit', template: saved });
  };

  const notInLibrary = (kind, title) => (missing.has(`${kind}:${title}`)
    ? <Badge tone="grey" size="S" label="Not in your library" />
    : null);

  return (
    <Drawer
      title={pathway.name}
      onClose={onClose}
      noCloseDivider
      headerRight={(
        <>
          <Badge tone="primary" size="S" label={`Fold v${pathway.version}`} />
          <span className={styles.headerDivider} />
          {canManage && (
            <Button variant="secondary" size="L" disabled={!!busy} onClick={() => adapt(true)}>
              {busy === 'publish' ? 'Publishing…' : 'Use as Template'}
            </Button>
          )}
          <Button variant="primary" size="L" leadingIcon="solar:pen-new-square-linear" disabled={!!busy} onClick={() => adapt(false)}>
            {busy === 'adapt' ? 'Creating…' : 'Adapt into Template'}
          </Button>
          <span className={styles.headerDivider} />
        </>
      )}
    >
      <div className={styles.body}>
        <Alert
          tone="info"
          message="Fold content, read-only. Adapt it into a template to change anything. Your organization's own guidance belongs in Clinical Protocols."
        />

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Overview</h3>
          <p className={styles.summary}>{pathway.summary}</p>
          <div className={styles.meta}>
            <span className={styles.label}>Condition</span>
            <Badge tone="grey" size="S" label={pathway.condition} />
          </div>
          <div className={styles.group}>
            <span className={styles.label}>Based on</span>
            <ul className={styles.sources}>
              {pathwaySources(pathway).map(s => <li key={s}>{s}</li>)}
            </ul>
          </div>
        </div>

        {adapted.length > 0 && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Templates from this pathway</h3>
            <ul className={styles.adaptedList}>
              {adapted.map(t => (
                <li key={t.id} className={styles.adaptedRow}>
                  <button type="button" className={styles.adaptedName} onClick={() => { onClose(); setCarePlanTemplateScreen({ mode: 'edit', template: t }); }}>
                    {t.name}
                  </button>
                  <span className={styles.meta}>
                    <Badge tone={t.status === 'draft' ? 'grey' : 'success'} size="S" label={t.status === 'draft' ? 'Draft' : 'Published'} />
                    {t.sourcePathway.version !== pathway.version
                      ? <Badge tone="warning" size="S" label={`From v${t.sourcePathway.version}, now v${pathway.version}`} />
                      : <Badge tone="grey" size="S" label={`v${t.sourcePathway.version}`} />}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Recommended GBI set</h3>
          <p className={styles.groupHint}>Goals, interventions and barriers from your Care Plan Library, already linked to each other.</p>
        </div>
        <Section
          icon="solar:flag-linear"
          label="Goals"
          items={pathway.goals}
          renderItem={g => (
            <Item key={g.title} title={g.title} badges={notInLibrary('goal', g.title)} />
          )}
        />
        <Section
          icon="solar:clipboard-check-linear"
          label="Interventions"
          items={pathway.interventions}
          renderItem={i => (
            <Item key={i.title} title={i.title} detail={i.goalTitle ? `Supports: ${i.goalTitle}` : ''} badges={notInLibrary('intervention', i.title)} />
          )}
        />
        <Section
          icon="custom:barrier"
          label="Barriers"
          items={pathway.barriers}
          renderItem={b => (
            <Item key={b.title} title={b.title} detail={b.goalTitles?.length ? `Blocks: ${b.goalTitles.join(', ')}` : ''} badges={notInLibrary('barrier', b.title)} />
          )}
        />

        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Decision logic</h3>
          <p className={styles.groupHint}>Actions route decisions to the treating clinician. Each item names what it rests on.</p>
        </div>
        {['thresholds', 'decisionRules'].map(key => (
          <Section
            key={key}
            icon={LOGIC_SECTIONS[key].icon}
            label={LOGIC_SECTIONS[key].label}
            items={pathway[key]}
            renderItem={(x, idx) => (
              <Item key={idx} title={LOGIC_SECTIONS[key].title(x)} detail={LOGIC_SECTIONS[key].detail(x)} source={x.source} />
            )}
          />
        ))}
        <Section
          icon={LOGIC_SECTIONS.cadence.icon}
          label="Recheck Cadence"
          items={pathway.cadence}
          renderItem={(c, idx) => (
            <Item key={idx} title={LOGIC_SECTIONS.cadence.title(c)} detail={LOGIC_SECTIONS.cadence.detail(c)} source={c.source} />
          )}
        />
      </div>
    </Drawer>
  );
}
