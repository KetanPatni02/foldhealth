import { Avatar } from '../../../components/Avatar/Avatar';
import { Badge } from '../../../components/Badge/Badge';
import styles from './PersonOption.module.css';

const initialsOf = (name = '') => name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

/**
 * A person row for pickers (Figma 2910:39991): avatar, name, a meta line
 * (gender • date of birth (age)) and, optionally, a grey tag on the right
 * (e.g. their relation to the patient).
 */
export function PersonOption({ name, initials, meta, tag }) {
  return (
    <span className={styles.row}>
      <Avatar variant="patient" size="M" initials={initials || initialsOf(name)} />
      <span className={styles.text}>
        <span className={styles.name}>{name}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
      </span>
      {tag && <Badge tone="grey" size="S" label={tag} className={styles.tag} />}
    </span>
  );
}
