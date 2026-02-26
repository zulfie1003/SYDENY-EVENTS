const STATUS_CONFIG = {
  new: { label: 'New', dot: 'bg-emerald-400', className: 'status-badge status-new' },
  updated: { label: 'Updated', dot: 'bg-amber-400', className: 'status-badge status-updated' },
  inactive: { label: 'Inactive', dot: 'bg-slate-400', className: 'status-badge status-inactive' },
  imported: { label: 'Imported', dot: 'bg-harbour-400', className: 'status-badge status-imported' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span className={config.className}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
