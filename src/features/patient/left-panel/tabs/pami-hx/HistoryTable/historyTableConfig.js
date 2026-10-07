import rowStyles from '../../../../../../components/WorklistShell/WorklistRow.module.css';
import styles from '../AddProblemsDrawer/AddProblemsDrawer.module.css';

/** Row and cell classes: the worklist row, and a cell whose text wraps. */
export const historyRowClass = rowStyles.row;
export const historyCellClass = `${rowStyles.td} ${styles.historyCell}`;

/** The Actions column's column def, shared so every History table matches. */
export const HISTORY_ACTIONS_COLUMN = { key: 'actions', label: 'Actions', width: 72 };
