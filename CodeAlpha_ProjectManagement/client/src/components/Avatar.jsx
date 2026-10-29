import { Calendar, MessageSquare } from 'lucide-react';
import { avatarColor, dueState, initials, PRIORITIES } from '../utils';

export default function Avatar({ name, size = 'md' }) {
  return (
    <span className={`avatar ${size}`} style={{ background: avatarColor(name) }} title={name || 'Member'}>
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ people = [] }) {
  if (!people.length) return null;
  return (
    <span className="avatar-stack">
      {people.map((person) => (
        <Avatar key={person._id} name={person.name} size="sm" />
      ))}
    </span>
  );
}

export function PriorityMark({ priority }) {
  if (!priority || priority === 'none') return null;
  const label = PRIORITIES.find((item) => item.id === priority)?.label || priority;
  const loud = priority === 'high' || priority === 'urgent';
  return (
    <span className={`priority ${priority}`} title={label}>
      <i aria-hidden="true" />
      {loud ? label : <span className="sr-only">{label}</span>}
    </span>
  );
}

export function DueMark({ value, column }) {
  const due = dueState(value, column);
  if (!due) return null;
  return (
    <span className={due.overdue ? 'due overdue' : 'due'}>
      <Calendar size={13} aria-hidden="true" />
      {due.overdue ? `Overdue · ${due.label}` : due.label}
    </span>
  );
}

export function CommentCount({ count }) {
  if (!count) return null;
  return (
    <span className="meta-count" title={`${count} ${count === 1 ? 'comment' : 'comments'}`}>
      <MessageSquare size={13} aria-hidden="true" />
      {count}
    </span>
  );
}
