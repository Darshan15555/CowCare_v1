import { PRIORITY } from '../../utils/constants';

export default function PriorityBadge({ priority, size = 'md' }) {
  const config = PRIORITY[priority] || PRIORITY.ROUTINE;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  const isEmergency = priority === 'EMERGENCY';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClass} ${config.badgeClass} ${
        isEmergency ? 'animate-pulse-emergency' : ''
      }`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}
