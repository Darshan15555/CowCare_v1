import { STATUS } from '../../utils/constants';

export default function StatusBadge({ status, size = 'md' }) {
  const config = STATUS[status] || STATUS.REQUESTED;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${sizeClass} ${config.badgeClass}`}>
      {config.label}
    </span>
  );
}
