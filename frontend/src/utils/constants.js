export const PRIORITY = {
  EMERGENCY: {
    label: 'Emergency',
    icon: '🔴',
    badgeClass: 'bg-vital-50 text-vital-700 border-vital-500/40',
    dotClass: 'bg-vital-600',
  },
  URGENT: {
    label: 'Urgent',
    icon: '🟡',
    badgeClass: 'bg-amber-alert-50 text-amber-alert-700 border-amber-alert-500/40',
    dotClass: 'bg-amber-alert-600',
  },
  ROUTINE: {
    label: 'Routine',
    icon: '🟢',
    badgeClass: 'bg-pasture-50 text-pasture-700 border-pasture-500/40',
    dotClass: 'bg-pasture-600',
  },
};

export const STATUS = {
  REQUESTED: { label: 'Requested', badgeClass: 'bg-mist-100 text-ink-700 border-mist-300' },
  ACCEPTED: { label: 'Accepted', badgeClass: 'bg-serum-50 text-serum-700 border-serum-500/30' },
  ON_THE_WAY: { label: 'On the way', badgeClass: 'bg-serum-50 text-serum-700 border-serum-500/30' },
  ARRIVED: { label: 'Arrived', badgeClass: 'bg-serum-100 text-serum-700 border-serum-500/40' },
  IN_PROGRESS: {
    label: 'In progress',
    badgeClass: 'bg-serum-100 text-serum-700 border-serum-500/40',
  },
  COMPLETED: {
    label: 'Completed',
    badgeClass: 'bg-pasture-50 text-pasture-700 border-pasture-500/30',
  },
  REJECTED: { label: 'Rejected', badgeClass: 'bg-vital-50 text-vital-700 border-vital-500/30' },
  CANCELLED: { label: 'Cancelled', badgeClass: 'bg-mist-100 text-ink-500 border-mist-300' },
};

export const CATTLE_STATUS = {
  HEALTHY: { label: 'Healthy', badgeClass: 'bg-pasture-50 text-pasture-700' },
  UNDER_OBSERVATION: { label: 'Under observation', badgeClass: 'bg-amber-alert-50 text-amber-alert-700' },
  CRITICAL: { label: 'Critical', badgeClass: 'bg-vital-50 text-vital-700' },
  RECOVERING: { label: 'Recovering', badgeClass: 'bg-serum-50 text-serum-700' },
};

// Ordered list for the booking status stepper.
export const STATUS_FLOW = [
  'REQUESTED',
  'ACCEPTED',
  'ON_THE_WAY',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
];
