import { useRef } from 'react';
import { Icon } from '../../components/Icon/Icon';
import styles from './HccWorklistTable.module.css';
import rowStyles from './HccWorklistRow.module.css';

export function EmptyState({ title, message, icon = 'solar:magnifer-linear' }) {
  return (
    <div className={styles.empty}>
      <Icon name={icon} size={40} color="var(--neutral-200)" />
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyMessage}>{message}</p>
    </div>
  );
}

export function HccHeaderCell({ column, className, sortKey, sortDir, onOpenSort }) {
  const ref = useRef(null);
  const sortField = column.sortField || column.k;
  const isActive = column.sortable && sortField === sortKey;
  const handleClick = () => {
    if (!column.sortable) return;
    const rect = ref.current?.getBoundingClientRect();
    if (rect) onOpenSort(column, rect);
  };
  return (
    <th
      ref={ref}
      className={[
        className || '',
        styles.headerCell,
        column.sortable ? styles.headerCellSortable : '',
        isActive ? styles.headerCellActive : '',
      ].filter(Boolean).join(' ')}
      onClick={handleClick}
      data-col={column.k}
    >
      <span className={styles.headerLabel}>
        {column.lb}
        {column.sortable && (
          <span className={styles.sortIcon}>
            {isActive ? (
              <Icon
                name={sortDir === 'asc' ? 'solar:arrow-up-linear' : 'solar:arrow-down-linear'}
                size={12}
                color="var(--primary-300)"
              />
            ) : (
              <Icon name="solar:sort-vertical-linear" size={12} color="var(--neutral-200)" />
            )}
          </span>
        )}
      </span>
    </th>
  );
}

export function ColumnsIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 5.37L9.98 4.87L10 5.37ZM10 18.63L9.98 19.13L10 18.63ZM14 5.37L14.03 4.87L14 5.37ZM14 18.63L14.03 19.13L14 18.63ZM5.33 12H4.83C4.83 13.56 4.83 14.78 4.96 15.72C5.09 16.69 5.36 17.45 5.96 18.04L6.31 17.69L6.66 17.337C6.28 16.96 6.07 16.44 5.95 15.59C5.84 14.72 5.83 13.59 5.83 12H5.33ZM18.67 12H18.17C18.17 13.59 18.17 14.72 18.05 15.59C17.94 16.44 17.72 16.96 17.34 17.337L17.691 17.69L18.04 18.04C18.64 17.45 18.91 16.69 19.04 15.72C19.17 14.78 19.17 13.56 19.17 12H18.67ZM18.67 12H19.17C19.17 10.44 19.17 9.22 19.04 8.28C18.91 7.31 18.64 6.55 18.04 5.96L17.691 6.31L17.34 6.66C17.72 7.04 17.94 7.56 18.05 8.41C18.17 9.28 18.17 10.41 18.17 12H18.67ZM5.33 12H5.83C5.83 10.41 5.84 9.28 5.95 8.41C6.07 7.56 6.28 7.04 6.66 6.66L6.31 6.31L5.96 5.96C5.36 6.55 5.09 7.31 4.96 8.28C4.83 9.22 4.83 10.44 4.83 12H5.33ZM12 5.33V4.83C10.95 4.83 10.73 4.83 9.98 4.87L10 5.37L10.03 5.87C10.75 5.83 10.95 5.83 12 5.83V5.33ZM10 5.37L9.98 4.87C9.23 4.91 8.44 4.98 7.74 5.14C7.07 5.28 6.39 5.53 5.96 5.96L6.31 6.31L6.66 6.66C6.88 6.45 7.32 6.25 7.96 6.11C8.58 5.98 9.31 5.91 10.03 5.87L10 5.37ZM12 18.67V18.17C10.95 18.17 10.75 18.17 10.03 18.13L10 18.63L9.98 19.13C10.73 19.17 10.95 19.17 12 19.17V18.67ZM10 18.63L10.03 18.13C9.31 18.09 8.58 18.02 7.96 17.888C7.32 17.75 6.88 17.56 6.66 17.337L6.31 17.69L5.96 18.04C6.39 18.475 7.07 18.716 7.74 18.86C8.44 19.018 9.23 19.09 9.98 19.13L10 18.63ZM10 5.37H9.5V18.63H10H10.5V5.37H10ZM12 5.33V5.83C13.05 5.83 13.25 5.83 13.98 5.87L14 5.37L14.03 4.87C13.28 4.83 13.06 4.83 12 4.83V5.33ZM14 5.37L13.98 5.87C14.7 5.91 15.42 5.98 16.04 6.11C16.68 6.25 17.12 6.45 17.34 6.66L17.691 6.31L18.04 5.96C17.61 5.53 16.94 5.28 16.258 5.14C15.56 4.98 14.77 4.91 14.03 4.87L14 5.37ZM12 18.67V19.17C13.06 19.17 13.28 19.17 14.03 19.13L14 18.63L13.98 18.13C13.25 18.17 13.05 18.17 12 18.17V18.67ZM14 18.63L14.03 19.13C14.77 19.09 15.56 19.018 16.258 18.86C16.94 18.716 17.61 18.475 18.04 18.04L17.691 17.69L17.34 17.337C17.12 17.56 16.68 17.75 16.04 17.888C15.42 18.02 14.7 18.09 13.98 18.13L14 18.63ZM14 5.37L13.5 5.37L13.5 18.63H14H14.5L14.5 5.37L14 5.37Z"
        fill={color}
      />
    </svg>
  );
}
