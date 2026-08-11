import {
  GlobalSettingsIdentitySection,
  GlobalSettingsPromptAndUtilitySection,
  GlobalSettingsInterfaceAndVoiceSection,
  GlobalSettingsSpeechAndCallSection,
  GlobalSettingsSecurityAndMessagesSection,
} from './GlobalSettingsSectionCards';

export function GlobalSettingsSections({ settings, update, touched, errors, markTouched, showAgentNameError, showUseCaseError }) {
  const identityProps = { settings, update, errors, markTouched, showAgentNameError, showUseCaseError };
  const sectionProps = { settings, update };

  return (
    <>
      <GlobalSettingsIdentitySection {...identityProps} />
      <GlobalSettingsPromptAndUtilitySection {...sectionProps} />
      <GlobalSettingsInterfaceAndVoiceSection {...sectionProps} />
      <GlobalSettingsSpeechAndCallSection {...sectionProps} />
      <GlobalSettingsSecurityAndMessagesSection {...sectionProps} />
    </>
  );
}
