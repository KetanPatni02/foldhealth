import { Button } from '../../components/Button/Button';
import { RingEmptyState } from '../../components/RingEmptyState/RingEmptyState';
import { OooRecordsTable } from './OooRecordsTable';
import { OOO_ICON } from './oooUtils';
import styles from './ooo.module.css';

export function NewButton({ onClick }) {
  return <Button variant="secondary" size="L" leadingIcon="solar:add-circle-linear" onClick={onClick}>New OOO Record</Button>;
}

export function RecordsBody({ loading, records, emptyLabel, actions, showUser, oneLineDates, highlightDate, highlightId, embedded = true, pagination }) {
  return (
    <OooRecordsTable
      records={records}
      showUser={showUser}
      oneLineDates={oneLineDates}
      highlightDate={highlightDate}
      highlightId={highlightId}
      loading={loading}
      embedded={embedded}
      pagination={pagination}
      emptyState={(
        <div className={styles.emptyBox}>
          <RingEmptyState icon={OOO_ICON} label={emptyLabel} />
        </div>
      )}
      onEdit={actions.openEdit}
      onDelete={actions.askDelete}
      onReassign={(r) => actions.openReassign({ id: r.userId, name: r.userName }, r.id)}
    />
  );
}
