import { Icon } from '../../components/Icon/Icon';
import { useAppStore } from '../../store/useAppStore';

export function TocEmptyState() {
  const setActiveSubnavList = useAppStore(s => s.setActiveSubnavList);
  const setActiveTab = useAppStore(s => s.setActiveTab);

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', paddingBottom: 64 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12,
          background: 'var(--neutral-50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
        }}>
          <Icon name="solar:users-group-two-rounded-linear" size={28} color="var(--neutral-200)" />
        </div>
        <div style={{ fontSize: 'var(--font-base)', fontWeight: 500, color: 'var(--neutral-400)' }}>No active agent runs</div>
        <div style={{ fontSize: 'var(--font-md)', color: 'var(--neutral-300)', lineHeight: 1.5 }}>
          Invoke an agent from the TCM Worklist to start.
        </div>
        <button
          type="button"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
            fontSize: 'var(--font-md)', color: 'var(--primary-300)', cursor: 'pointer',
            background: 'none', border: 'none', padding: 0, font: 'inherit',
          }}
          onClick={() => {
            setActiveSubnavList('TCM');
            setActiveTab('toc-worklist');
          }}
        >
          <Icon name="solar:arrow-left-linear" size={13} />
          Go to TCM Worklist
        </button>
      </div>
    </div>
  );
}
