import { Avatar } from '../Avatar/Avatar';
import { Icon } from '../Icon/Icon';
import { MissedCallIcon } from '../Icon/MissedCallIcon';
import { DeclinedCallIcon } from '../Icon/DeclinedCallIcon';
import { DIR_ICON } from './CallTypeAvatar.constants';

export function CallTypeAvatar({ dir, size = 36, iconSize = 18 }) {
  const cfg = DIR_ICON[dir] || DIR_ICON.outgoing;
  const icon = cfg.isMissed ? <MissedCallIcon size={iconSize} color={cfg.color} /> :
               cfg.isDeclined ? <DeclinedCallIcon size={iconSize} color={cfg.color} /> :
               <Icon name={cfg.icon} size={iconSize} color={cfg.color} />;

  return (
    <Avatar 
      variant="generic"
      size={size}
      icon={icon}
      backgroundColor={cfg.bg}
      borderColor={cfg.border}
    />
  );
}
