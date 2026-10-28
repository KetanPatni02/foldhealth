import { EmptyState } from '@/components/EmptyState/EmptyState';

// Placeholder until the dashboard (care team, upcoming visits, care tasks)
// is built on patient-scoped tables.
export function HomePage() {
  return (
    <EmptyState
      icon="solar:home-2-linear"
      title="Your care dashboard is on its way"
      description="Upcoming visits, your care team and today's care tasks will show here."
    />
  );
}
