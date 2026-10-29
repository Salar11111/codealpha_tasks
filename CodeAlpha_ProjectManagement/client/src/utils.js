export const COLUMNS = [
  { id: 'todo', label: 'To do' },
  { id: 'inprogress', label: 'In progress' },
  { id: 'done', label: 'Done' },
];

export const PRIORITIES = [
  { id: 'none', label: 'No priority' },
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
];

const AVATAR_COLORS = ['#d9e2ec', '#dce8e1', '#e6e0f0', '#f0e6d8', '#d9e7e4', '#e7e0dc'];
const LABEL_COLORS = ['#e7eef5', '#e8f0ea', '#f3e8f0', '#eeeaf6', '#e5f2f2', '#f4efe6'];

function hash(value) {
  let total = 0;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) total = (total * 31 + text.charCodeAt(index)) >>> 0;
  return total;
}

export function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function avatarColor(name) {
  return AVATAR_COLORS[hash(name) % AVATAR_COLORS.length];
}

export function labelColor(label) {
  return LABEL_COLORS[hash(label) % LABEL_COLORS.length];
}

export function when(value) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function dateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDay(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}

export function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function dueState(value, column) {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;
  const overdue = column !== 'done' && due.getTime() < startOfTodayUtc().getTime();
  return { label: formatDay(value), overdue };
}

export function applyMove(tasks, taskId, column, index) {
  const moving = tasks.find((task) => String(task._id) === String(taskId));
  if (!moving) return tasks;
  const from = moving.column;
  const without = tasks.filter((task) => String(task._id) !== String(taskId));
  const destination = without.filter((task) => task.column === column).sort((a, b) => a.position - b.position);
  const clamped = Math.max(0, Math.min(index, destination.length));
  destination.splice(clamped, 0, { ...moving, column });
  const placed = destination.map((task, position) => ({ ...task, column, position }));
  const source = from === column
    ? []
    : without
        .filter((task) => task.column === from)
        .sort((a, b) => a.position - b.position)
        .map((task, position) => ({ ...task, position }));
  const untouched = without.filter((task) => task.column !== column && task.column !== from);
  return [...untouched, ...source, ...placed];
}

export function filterTasks(tasks, filters, userId) {
  const query = (filters.q || '').trim().toLowerCase();
  const today = startOfTodayUtc();
  const week = new Date(today);
  week.setUTCDate(week.getUTCDate() + 7);

  return tasks.filter((task) => {
    if (query && !`${task.title} ${task.description || ''}`.toLowerCase().includes(query)) return false;
    const people = task.assignees || [];
    if (filters.assignee === 'me' && !people.some((person) => String(person._id) === String(userId))) return false;
    if (filters.assignee && filters.assignee !== 'me' && !people.some((person) => String(person._id) === filters.assignee)) {
      return false;
    }
    if (filters.priority && (task.priority || 'none') !== filters.priority) return false;
    if (filters.label && !(task.labels || []).includes(filters.label)) return false;
    if (filters.due === 'none') return !task.dueDate;
    if (filters.due === 'overdue') {
      if (!task.dueDate || task.column === 'done') return false;
      return new Date(task.dueDate).getTime() < today.getTime();
    }
    if (filters.due === 'week') {
      if (!task.dueDate) return false;
      const time = new Date(task.dueDate).getTime();
      return time >= today.getTime() && time < week.getTime();
    }
    return true;
  });
}
