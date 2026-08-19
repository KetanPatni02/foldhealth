import { hasAgentConnected } from './tocOutcome';

export function assessmentLabel() {
  return 'TOC IP Assessment';
}

export function resolveAssessmentStatus(p) {
  if (!hasAgentConnected(p)) return 'notStarted';
  const status = p.assessmentStatus;
  if (status === 'Completed') return 'completed';
  if (status === 'In Progress' || status === 'Overdue') return 'partial';
  if (status === 'Not Started') return 'notStarted';
  const n = String(p.id || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  if (n % 4 === 1) return 'partial';
  return 'completed';
}

export function sampleAssessmentCompletedDate(p) {
  const n = String(p.id || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const month = 1 + (n % 12);
  const day = 1 + (n % 28);
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/2025`;
}
