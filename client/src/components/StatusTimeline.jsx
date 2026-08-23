const STATUS_ORDER = [
  'Created', 'Assigned', 'Picked Up', 'In Transit',
  'Out for Delivery', 'Delivered', 'Failed', 'Rescheduled',
];

const STATUS_ICONS = {
  Created:             'bi-plus-circle',
  Assigned:            'bi-person-check',
  'Picked Up':         'bi-box-seam',
  'In Transit':        'bi-truck',
  'Out for Delivery':  'bi-geo',
  Delivered:           'bi-check-circle',
  Failed:              'bi-x-circle',
  Rescheduled:         'bi-calendar2-check',
};

function dotClass(status) {
  if (status === 'Delivered') return 'done';
  if (status === 'Failed') return 'failed';
  return '';
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function StatusTimeline({ timeline }) {
  if (!timeline || timeline.length === 0) {
    return <p className="text-muted">No status history yet.</p>;
  }

  return (
    <div className="timeline">
      {timeline.map((entry, i) => (
        <div key={entry.id || i} className="timeline-item fade-in-up">
          <div className={`timeline-dot ${dotClass(entry.status)}`} />
          <div className="timeline-time">{formatDate(entry.created_at)}</div>
          <div className="timeline-status">
            <i className={`bi ${STATUS_ICONS[entry.status] || 'bi-circle'} me-1`} />
            {entry.status}
          </div>
          {entry.note && <div className="timeline-note">{entry.note}</div>}
          {entry.actor_name && (
            <div className="timeline-actor">
              by {entry.actor_name} ({entry.actor_role})
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
