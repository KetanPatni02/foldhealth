import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_SETTINGS } from './GlobalSettingsParts.constants';
import { GlobalSettingsSections } from './GlobalSettingsSections';
import styles from './GlobalSettings.module.css';

export function GlobalSettings() {
  const builderAgent = useAppStore(s => s.builderAgent);
  const updateBuilderAgent = useAppStore(s => s.updateBuilderAgent);
  const validationAttempt = useAppStore(s => s.builderValidationAttempt) || 0;

  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    agentName: builderAgent?.name || '',
    ...(builderAgent?.globalSettings || {}),
  }));
  const [touched, setTouched] = useState({});

  const errors = {
    agentName: settings.agentName?.trim() ? '' : 'Agent Name is required',
    useCaseName: settings.useCaseName?.trim() ? '' : 'Use Case is required',
  };

  const update = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    if (updateBuilderAgent) updateBuilderAgent({ globalSettings: next });
  };

  const markTouched = (key) => setTouched(t => ({ ...t, [key]: true }));

  useEffect(() => {
    if (validationAttempt > 0) setTouched({ agentName: true, useCaseName: true });
  }, [validationAttempt]);

  const showAgentNameError = touched.agentName && errors.agentName;
  const showUseCaseError = touched.useCaseName && errors.useCaseName;

  return (
    <div className={styles.panel}>
      <div className={styles.scrollArea}>
        <GlobalSettingsSections
          settings={settings}
          update={update}
          touched={touched}
          errors={errors}
          markTouched={markTouched}
          showAgentNameError={showAgentNameError}
          showUseCaseError={showUseCaseError}
        />
      </div>
    </div>
  );
}
