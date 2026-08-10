import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { GoalDetailDrawer } from '../settings/panels/GoalDetailDrawer';
import { SECTIONS, DEFAULT_FORM } from './ConfigurePanelParts.constants';
import { ConfigurePanelSections } from './ConfigurePanelSections';
import styles from './ConfigurePanel.module.css';

export function ConfigurePanel({ agent, onSave }) {
  const scrollRef = useRef(null);
  const [activeSection, setActiveSection] = useState('agent-use-case');
  const savingRef = useRef(false);
  const formLoadedRef = useRef(false);
  const fetchAgentIdRef = useRef(null);

  const builderConfig = useAppStore(s => s.builderConfig);
  const builderConfigLoading = useAppStore(s => s.builderConfigLoading);
  const fetchAgentConfig = useAppStore(s => s.fetchAgentConfig);
  const saveAgentConfig = useAppStore(s => s.saveAgentConfig);
  const showToast = useAppStore(s => s.showToast);
  const setGoalDetailId = useAppStore(s => s.setGoalDetailId);
  const goalDetailId = useAppStore(s => s.goalDetailId);

  const [expanded, setExpanded] = useState({
    'agent-use-case': true,
    'personalization': true,
    'policies': true,
    'target-population': true,
    'knowledge-base': false,
    'communication': true,
  });

  const [form, setForm] = useState({ ...DEFAULT_FORM, agentName: agent?.name || '' });

  useEffect(() => {
    if (!agent?.id) return;
    if (fetchAgentIdRef.current === agent.id && formLoadedRef.current) return;
    fetchAgentIdRef.current = agent.id;
    formLoadedRef.current = false;
    fetchAgentConfig(agent.id);
  }, [agent?.id, fetchAgentConfig]);

  useEffect(() => {
    if (!agent?.id || builderConfigLoading || formLoadedRef.current) return;
    formLoadedRef.current = true;
    if (builderConfig) {
      setForm({
        agentName: agent?.name || '',
        agentRole: builderConfig.agent_role || '',
        useCaseName: builderConfig.use_case_name || agent?.use_case || '',
        description: builderConfig.description || '',
        goalIds: builderConfig.goal_ids || [],
        systemPrompt: builderConfig.system_prompt || '',
        toneOfVoice: builderConfig.tone_of_voice || 'professional',
        voice: builderConfig.voice || 'erica',
        empathyLevel: builderConfig.empathy_level ?? 75,
        speakingPace: builderConfig.speaking_pace ?? 75,
        languages: builderConfig.languages || ['english'],
        adaptations: builderConfig.adaptations || [],
        selectedPolicies: builderConfig.selected_policies || [],
        populationType: builderConfig.population_type || 'worklist',
        selectedWorklist: builderConfig.selected_worklist || '',
        modality: builderConfig.modality || 'voice',
        phone: builderConfig.phone || '',
        email: builderConfig.email || '',
        officeHours: builderConfig.office_hours || '',
      });
    } else {
      setForm(prev => ({ ...prev, agentName: agent?.name || '', useCaseName: agent?.use_case || '' }));
    }
  }, [builderConfig, builderConfigLoading, agent?.id, agent?.name, agent?.use_case]);

  const updateField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleExpanded = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleArrayItem = (field, item) => {
    setForm(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(item) ? arr.filter(v => v !== item) : [...arr, item] };
    });
  };

  const toggleGoal = (goalId) => {
    setForm(prev => {
      const ids = prev.goalIds;
      return { ...prev, goalIds: ids.includes(goalId) ? ids.filter(id => id !== goalId) : [...ids, goalId] };
    });
  };

  const handleSave = async () => {
    if (!agent?.id || savingRef.current) return;
    savingRef.current = true;
    let ok = false;
    try {
      ok = await saveAgentConfig(agent.id, form);
    } finally {
      savingRef.current = false;
    }
    if (ok) showToast('Configuration saved');
    else showToast('Failed to save configuration');
    if (onSave) onSave();
  };

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      const containerRect = scrollEl.getBoundingClientRect();
      const nearBottom = scrollTop + clientHeight >= scrollHeight - 100;

      if (nearBottom) {
        for (let i = SECTIONS.length - 1; i >= 0; i--) {
          const el = document.getElementById(`section-${SECTIONS[i].id}`);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top < containerRect.bottom && rect.bottom > containerRect.top) {
              setActiveSection(SECTIONS[i].id);
              return;
            }
          }
        }
      } else {
        const threshold = containerRect.top + containerRect.height * 0.3;
        let best = SECTIONS[0].id;
        for (const s of SECTIONS) {
          const el = document.getElementById(`section-${s.id}`);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= threshold) best = s.id;
          }
        }
        setActiveSection(best);
      }
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(`section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!expanded[id]) {
        setExpanded(prev => ({ ...prev, [id]: true }));
      }
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.sectionTabs}>
        <div className={styles.sectionTabsInner}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`${styles.sectionTab} ${activeSection === s.id ? styles.sectionTabActive : ''}`}
              onClick={() => scrollToSection(s.id)}
              type="button"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.scrollArea} ref={scrollRef}>
        <div className={styles.scrollInner}>
          <ConfigurePanelSections
            form={form}
            expanded={expanded}
            toggleExpanded={toggleExpanded}
            updateField={updateField}
            toggleArrayItem={toggleArrayItem}
            toggleGoal={toggleGoal}
            setGoalDetailId={setGoalDetailId}
          />
        </div>
      </div>

      {goalDetailId && <GoalDetailDrawer />}
    </div>
  );
}
