import {
  ConfigureAgentUseCaseSection,
  ConfigurePersonalizationSection,
  ConfigurePoliciesSection,
  ConfigureTargetPopulationSection,
  ConfigureKnowledgeBaseSection,
  ConfigureCommunicationSection,
} from './ConfigurePanelSectionCards';

export function ConfigurePanelSections({
  form,
  expanded,
  toggleExpanded,
  updateField,
  toggleArrayItem,
  toggleGoal,
  setGoalDetailId,
}) {
  const sectionProps = {
    form,
    expanded,
    toggleExpanded,
    updateField,
    toggleArrayItem,
    toggleGoal,
    setGoalDetailId,
  };

  return (
    <>
      <ConfigureAgentUseCaseSection {...sectionProps} />
      <ConfigurePersonalizationSection {...sectionProps} />
      <ConfigurePoliciesSection {...sectionProps} />
      <ConfigureTargetPopulationSection {...sectionProps} />
      <ConfigureKnowledgeBaseSection {...sectionProps} />
      <ConfigureCommunicationSection {...sectionProps} />
    </>
  );
}
