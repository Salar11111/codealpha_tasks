import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DndContext, PointerSensor, closestCorners, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LayoutGrid, List, Search } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useWorkspace } from '../components/Layout';
import TaskDialog from '../components/TaskDialog';
import { AvatarStack, CommentCount, DueMark, PriorityMark } from '../components/Avatar';
import Avatar from '../components/Avatar';
import { COLUMNS, PRIORITIES, applyMove, dateInputValue, dueState, filterTasks, labelColor } from '../utils';

function AddCard({ onCreate }) {
  const [title, setTitle] = useState('');
  return (
    <form
      className="add-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        onCreate(title.trim());
        setTitle('');
      }}
    >
      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a card" aria-label="Card title" />
      <button className="btn btn-small" type="submit">
        Add
      </button>
    </form>
  );
}

function TaskCard({ task, onOpen, skipOpenRef }) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(task._id) });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const labels = task.labels || [];

  return (
    <article ref={setNodeRef} style={style} className={isDragging ? 'card dragging' : 'card'} {...listeners}>
      <button
        type="button"
        className="card-open"
        onClick={() => {
          if (skipOpenRef.current) return;
          onOpen(task);
        }}
      >
        {labels.length > 0 && (
          <span className="card-labels">
            {labels.slice(0, 2).map((label) => (
              <span key={label} className="label" style={{ background: labelColor(label) }}>
                {label}
              </span>
            ))}
            {labels.length > 2 && <span className="label">+{labels.length - 2}</span>}
          </span>
        )}
        <h3>{task.title}</h3>
        <span className="card-foot">
          <span className="card-meta">
            <PriorityMark priority={task.priority} />
            <DueMark value={task.dueDate} column={task.column} />
            <CommentCount count={task.commentCount} />
          </span>
          <AvatarStack people={task.assignees || []} />
        </span>
      </button>
    </article>
  );
}

function Column({ column, tasks, onOpen, skipOpenRef, composer, onCreate, filtering }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <section ref={setNodeRef} className={isOver ? 'column over' : 'column'}>
      <header>
        <h2>
          <i className={`status-dot ${column.id}`} aria-hidden="true" />
          {column.label}
        </h2>
        <span className="count">{tasks.length}</span>
      </header>
      {composer && <AddCard onCreate={onCreate} />}
      <SortableContext items={tasks.map((task) => String(task._id))} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => (
          <TaskCard key={task._id} task={task} onOpen={onOpen} skipOpenRef={skipOpenRef} />
        ))}
      </SortableContext>
      {tasks.length === 0 && <p className="empty-col">{filtering ? 'No matches' : 'Nothing here'}</p>}
    </section>
  );
}

function ListView({ tasks, onOpen, onPatch }) {
  return (
    <div className="table-scroll">
      <table className="task-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Due</th>
            <th>People</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const due = dueState(task.dueDate, task.column);
            return (
              <tr key={task._id}>
                <td>
                  <button type="button" className="linkish" onClick={() => onOpen(task)}>
                    {task.title}
                  </button>
                </td>
                <td>
                  <select
                    aria-label={`Status for ${task.title}`}
                    value={task.column}
                    onChange={(event) => onPatch(task._id, { column: event.target.value })}
                  >
                    {COLUMNS.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    aria-label={`Priority for ${task.title}`}
                    value={task.priority || 'none'}
                    onChange={(event) => onPatch(task._id, { priority: event.target.value })}
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority.id} value={priority.id}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="date"
                    aria-label={`Due date for ${task.title}`}
                    className={due?.overdue ? 'overdue' : undefined}
                    value={dateInputValue(task.dueDate)}
                    onChange={(event) => onPatch(task._id, { dueDate: event.target.value || null })}
                  />
                </td>
                <td>
                  <AvatarStack people={task.assignees || []} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Board() {
  const { id } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const { setTitle, refreshProjects } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: '', description: '' });
  const [editError, setEditError] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [liveComment, setLiveComment] = useState(null);
  const tasksRef = useRef([]);
  const skipOpen = useRef(false);
  const seenComments = useRef(new Set());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const replaceTasks = useCallback((next) => {
    tasksRef.current = next;
    setTasks(next);
  }, []);

  const filters = {
    q: params.get('q') || '',
    assignee: params.get('assignee') || '',
    priority: params.get('priority') || '',
    due: params.get('due') || '',
    label: params.get('label') || '',
  };
  const view = params.get('view') === 'list' ? 'list' : 'board';
  const filtering = Boolean(filters.q || filters.assignee || filters.priority || filters.due || filters.label);
  const filtered = filterTasks(tasks, filters, user?.id);
  const requestedId = params.get('task');
  const active = tasks.find((task) => String(task._id) === requestedId) || null;
  const labelOptions = [...new Set(tasks.flatMap((task) => task.labels || []))].sort((a, b) => a.localeCompare(b));
  const ownerId = String(project?.owner?._id || project?.owner || '');

  function setFilter(key, value) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (!value) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true }
    );
  }

  function clearFilters() {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        ['q', 'assignee', 'priority', 'due', 'label'].forEach((key) => next.delete(key));
        return next;
      },
      { replace: true }
    );
  }

  function setView(nextView) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (nextView === 'list') next.set('view', 'list');
        else next.delete('view');
        return next;
      },
      { replace: true }
    );
  }

  function openTask(task) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('task', task._id);
        return next;
      },
      { replace: true }
    );
  }

  function closeTask() {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('task');
        return next;
      },
      { replace: true }
    );
  }

  useEffect(() => {
    setReady(false);
    setProject(null);
    replaceTasks([]);
    seenComments.current = new Set();
  }, [id, replaceTasks]);

  useEffect(() => {
    let ignore = false;
    api(`/projects/${id}`)
      .then((data) => {
        if (ignore) return;
        setProject(data.project);
        replaceTasks(data.tasks);
        setActivities(data.activities || []);
        setError('');
        setReady(true);
      })
      .catch((err) => {
        if (ignore) return;
        setError(err.message);
        setReady(true);
      });
    return () => {
      ignore = true;
    };
  }, [id, replaceTasks]);

  useEffect(() => {
    if (project?.name) setTitle(project.name);
  }, [project?.name, setTitle]);

  useEffect(() => {
    if (!ready || !requestedId) return;
    if (tasks.some((task) => String(task._id) === requestedId)) return;
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('task');
        return next;
      },
      { replace: true }
    );
  }, [ready, requestedId, tasks, setParams]);

  useEffect(() => {
    if (!socket || !id) return undefined;
    socket.emit('join-project', id);
    const onSync = (next) => replaceTasks(next);
    const onComment = (payload) => noteComment(payload);
    const onActivity = (activity) => setActivities((current) => [activity, ...current].slice(0, 20));
    socket.on('tasks:sync', onSync);
    socket.on('comment:created', onComment);
    socket.on('activity:created', onActivity);
    return () => {
      socket.off('tasks:sync', onSync);
      socket.off('comment:created', onComment);
      socket.off('activity:created', onActivity);
    };
  }, [socket, id, replaceTasks]);

  useEffect(() => {
    if (!editing) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') setEditing(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  function noteComment(payload) {
    const commentId = payload?.comment?._id;
    if (commentId && seenComments.current.has(String(commentId))) {
      setLiveComment(payload);
      return;
    }
    if (commentId) seenComments.current.add(String(commentId));
    setLiveComment(payload);
    if (!payload?.taskId) return;
    setTasks((current) => {
      const next = current.map((task) =>
        String(task._id) === String(payload.taskId) ? { ...task, commentCount: (task.commentCount || 0) + 1 } : task
      );
      tasksRef.current = next;
      return next;
    });
  }

  async function invite(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await api(`/projects/${id}/members`, { method: 'POST', body: JSON.stringify({ email }) });
      setProject(data.project);
      setEmail('');
      refreshProjects();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createTask(title) {
    setError('');
    try {
      const data = await api(`/projects/${id}/tasks`, { method: 'POST', body: JSON.stringify({ title }) });
      replaceTasks(data.tasks);
      refreshProjects();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveTask(taskId, partial) {
    const previous = tasksRef.current;
    setError('');
    const optimistic = previous.map((task) => (String(task._id) === String(taskId) ? { ...task, ...partial } : task));
    replaceTasks(optimistic);
    try {
      const data = await api(`/projects/${id}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(partial),
      });
      replaceTasks(data.tasks);
    } catch (err) {
      replaceTasks(previous);
      setError(err.message);
    }
  }

  function startEdit() {
    setDraft({ name: project.name, description: project.description || '' });
    setEditError('');
    setEditing(true);
  }

  async function saveDetails(event) {
    event.preventDefault();
    setEditBusy(true);
    setEditError('');
    try {
      const data = await api(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(draft) });
      setProject(data.project);
      setTitle(data.project.name);
      refreshProjects();
      setEditing(false);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditBusy(false);
    }
  }

  async function onDragEnd(event) {
    window.setTimeout(() => {
      skipOpen.current = false;
    }, 0);
    const { active: dragged, over } = event;
    if (!over || dragged.id === over.id) return;
    const moving = tasksRef.current.find((task) => String(task._id) === String(dragged.id));
    if (!moving) return;
    const overColumn = COLUMNS.some((column) => column.id === over.id)
      ? over.id
      : tasksRef.current.find((task) => String(task._id) === String(over.id))?.column;
    if (!overColumn) return;
    const others = tasksRef.current.filter((task) => String(task._id) !== String(moving._id));
    const destination = others.filter((task) => task.column === overColumn).sort((a, b) => a.position - b.position);
    let index = destination.length;
    if (!COLUMNS.some((column) => column.id === over.id)) {
      const overIndex = destination.findIndex((task) => String(task._id) === String(over.id));
      if (overIndex >= 0) index = overIndex;
    }
    const previous = tasksRef.current;
    replaceTasks(applyMove(previous, moving._id, overColumn, index));
    setError('');
    try {
      const data = await api(`/projects/${id}/tasks/${moving._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ column: overColumn, position: index }),
      });
      replaceTasks(data.tasks);
    } catch (err) {
      replaceTasks(previous);
      setError(err.message);
    }
  }

  if (error && !project) return <p className="error page-pad">{error}</p>;
  if (!project) return <p className="muted page-pad">Loading board…</p>;

  const listed = [...filtered].sort((a, b) => {
    const rank = { todo: 0, inprogress: 1, done: 2 };
    return rank[a.column] - rank[b.column] || a.position - b.position;
  });

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <div className="title-row">
            <h2>{project.name}</h2>
            <button type="button" className="text-btn" onClick={startEdit}>
              Edit
            </button>
            {String(project.owner?._id || project.owner) === String(user?.id) && (
              <button
                type="button"
                className="text-btn"
                onClick={() =>
                  api(`/projects/${project._id}`, { method: 'PATCH', body: JSON.stringify({ archived: !project.archived }) }).then((data) =>
                    setProject(data.project)
                  )
                }
              >
                {project.archived ? 'Restore' : 'Archive'}
              </button>
            )}
          </div>
          <p className="muted lede">{project.description || 'No description yet.'}</p>
          {activities.length > 0 && (
            <ul className="activity">
              {activities.slice(0, 6).map((item) => (
                <li key={item._id}>{item.message}</li>
              ))}
            </ul>
          )}
        </div>
        <form className="invite" onSubmit={invite}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Invite by email"
            aria-label="Invite by email"
            required
          />
          <button className="btn btn-small" type="submit">
            Invite
          </button>
        </form>
      </div>
      <div className="member-row">
        {project.members.map((member) => {
          const isOwner = String(member._id) === ownerId;
          return (
            <span key={member._id} className="member">
              <Avatar name={member.name} size="sm" />
              {member.name}
              {isOwner && <em>Owner</em>}
            </span>
          );
        })}
      </div>
      <div className="filters">
        <label className="search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={filters.q}
            onChange={(event) => setFilter('q', event.target.value)}
            placeholder="Search cards"
            aria-label="Search cards"
          />
        </label>
        <select aria-label="Filter by person" value={filters.assignee} onChange={(event) => setFilter('assignee', event.target.value)}>
          <option value="">Anyone</option>
          <option value="me">Me</option>
          {project.members.map((member) => (
            <option key={member._id} value={member._id}>
              {member.name}
            </option>
          ))}
        </select>
        <select aria-label="Filter by priority" value={filters.priority} onChange={(event) => setFilter('priority', event.target.value)}>
          <option value="">Any priority</option>
          {PRIORITIES.map((priority) => (
            <option key={priority.id} value={priority.id}>
              {priority.label}
            </option>
          ))}
        </select>
        <select aria-label="Filter by due date" value={filters.due} onChange={(event) => setFilter('due', event.target.value)}>
          <option value="">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="week">Next 7 days</option>
          <option value="none">No date</option>
        </select>
        <select aria-label="Filter by label" value={filters.label} onChange={(event) => setFilter('label', event.target.value)}>
          <option value="">Any label</option>
          {labelOptions.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
        {filtering && (
          <button type="button" className="text-btn" onClick={clearFilters}>
            Clear
          </button>
        )}
        {filtering && <span className="muted">{filtered.length} shown</span>}
        <div className="view-toggle">
          <button type="button" aria-pressed={view === 'board'} onClick={() => setView('board')}>
            <LayoutGrid size={16} aria-hidden="true" /> Board
          </button>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
            <List size={16} aria-hidden="true" /> List
          </button>
        </div>
      </div>
      {view === 'board' && <p className="hint">Drag a card to move it. Open a card to change the details, or use Move to.</p>}
      {error && <p className="error">{error}</p>}
      {view === 'board' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={() => {
            skipOpen.current = true;
          }}
          onDragCancel={() => {
            skipOpen.current = false;
          }}
          onDragEnd={onDragEnd}
        >
          <div className="board">
            {COLUMNS.map((column) => (
              <Column
                key={column.id}
                column={column}
                tasks={filtered.filter((task) => task.column === column.id).sort((a, b) => a.position - b.position)}
                onOpen={openTask}
                skipOpenRef={skipOpen}
                composer={column.id === 'todo'}
                onCreate={createTask}
                filtering={filtering}
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <div className="list-wrap">
          <AddCard onCreate={createTask} />
          {listed.length === 0 ? (
            <p className="muted">{filtering ? 'No cards match these filters.' : 'Nothing here yet.'}</p>
          ) : (
            <ListView tasks={listed} onOpen={openTask} onPatch={saveTask} />
          )}
        </div>
      )}
      {active && (
        <TaskDialog
          key={active._id}
          task={active}
          members={project.members}
          liveComment={liveComment}
          onClose={closeTask}
          onTasks={replaceTasks}
          onDeleted={(next) => {
            replaceTasks(next);
            closeTask();
            refreshProjects();
          }}
          onComment={noteComment}
        />
      )}
      {editing && (
        <div className="dialog-back" onMouseDown={() => setEditing(false)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="edit-project-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="edit-project-title">Edit project</h2>
            <form onSubmit={saveDetails}>
              <label>
                Name
                <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} required />
              </label>
              <label>
                Description
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
              {editError && <p className="error">{editError}</p>}
              <div className="row">
                <button className="btn" type="submit" disabled={editBusy}>
                  {editBusy ? 'Saving…' : 'Save'}
                </button>
                <button className="text-btn" type="button" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
