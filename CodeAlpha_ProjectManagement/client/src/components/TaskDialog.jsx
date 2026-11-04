import { useEffect, useRef, useState } from 'react';
import { AlignLeft, Calendar, CheckSquare, Tag, Trash2, User, X } from 'lucide-react';
import { api } from '../api/client';
import { COLUMNS, dateInputValue, PRIORITIES, labelColor, when } from '../utils';
import Avatar from './Avatar';

export default function TaskDialog({ task, members, liveComment, onClose, onTasks, onDeleted, onComment }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [labelDraft, setLabelDraft] = useState('');
  const [checkDraft, setCheckDraft] = useState('');
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const chain = useRef(Promise.resolve());
  const [entered, setEntered] = useState(false);
  const labels = task.labels || [];
  const checklist = task.checklist || [];
  const checkDone = checklist.filter((item) => item.done).length;
  const checkPct = checklist.length ? Math.round((checkDone / checklist.length) * 100) : 0;
  const columnLabel = COLUMNS.find((column) => column.id === task.column)?.label || task.column;

  useEffect(() => {
    api(`/projects/${task.project}/tasks/${task._id}/comments`)
      .then((data) => setComments(data.comments))
      .catch((err) => setError(err.message));
  }, [task._id, task.project]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!liveComment || String(liveComment.taskId) !== String(task._id)) return;
    setComments((current) =>
      current.some((item) => item._id === liveComment.comment._id) ? current : [...current, liveComment.comment]
    );
  }, [liveComment, task._id]);

  function patch(partial) {
    const run = chain.current
      .then(async () => {
        setError('');
        const data = await api(`/projects/${task.project}/tasks/${task._id}`, {
          method: 'PATCH',
          body: JSON.stringify(partial),
        });
        onTasks(data.tasks);
        return true;
      })
      .catch((err) => {
        setError(err.message);
        return false;
      });
    chain.current = run.then(
      () => {},
      () => {}
    );
    return run;
  }

  async function saveDetails(event) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }
    setBusy(true);
    await patch({ title: title.trim(), description });
    setBusy(false);
  }

  function toggleAssignee(id) {
    const key = String(id);
    const current = (task.assignees || []).map((person) => String(person._id));
    const assigneeIds = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    patch({ assigneeIds });
  }

  async function addLabel(event) {
    event.preventDefault();
    const next = labelDraft.trim().replace(/\s+/g, ' ');
    if (!next) return;
    if (labels.length >= 4) {
      setError('A card can have up to 4 labels');
      return;
    }
    const saved = await patch({ labels: [...labels, next] });
    if (saved) setLabelDraft('');
  }

  function removeLabel(label) {
    patch({ labels: labels.filter((item) => item !== label) });
  }

  async function addComment(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await api(`/projects/${task.project}/tasks/${task._id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setComments((current) => (current.some((item) => item._id === data.comment._id) ? current : [...current, data.comment]));
      setText('');
      onComment?.({ taskId: task._id, comment: data.comment });
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove() {
    if (!window.confirm('Delete this card?')) return;
    setError('');
    try {
      const data = await api(`/projects/${task.project}/tasks/${task._id}`, { method: 'DELETE' });
      onDeleted(data.tasks);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className={`drawer-back${entered ? ' open' : ''}`} onMouseDown={onClose}>
      <div
        className={`card-modal${entered ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-heading"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="card-modal-close icon-btn" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="card-modal-grid">
          <div className="card-modal-main">
            {labels.length > 0 && (
              <div className="card-modal-labels">
                {labels.map((label) => (
                  <span key={label} className="chip" style={{ background: labelColor(label) }}>
                    {label}
                    <button type="button" aria-label={`Remove ${label}`} onClick={() => removeLabel(label)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <form className="card-title-form" onSubmit={saveDetails}>
              <input
                id="task-heading"
                className="card-title-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                aria-label="Card title"
              />
              <p className="card-list-meta muted">
                in list <strong>{columnLabel}</strong>
              </p>
              <label className="card-section">
                <span className="card-section-title">
                  <AlignLeft size={16} aria-hidden="true" />
                  Description
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add a more detailed description…"
                  rows={4}
                />
              </label>
              <button className="btn btn-small" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </form>

            <div className="card-section">
              <span className="card-section-title">
                <CheckSquare size={16} aria-hidden="true" />
                Checklist
                {checklist.length > 0 && (
                  <em className="check-progress-label">
                    {checkDone}/{checklist.length}
                  </em>
                )}
              </span>
              {checklist.length > 0 && (
                <div className="check-bar" aria-hidden="true">
                  <i style={{ width: `${checkPct}%` }} />
                </div>
              )}
              {checklist.map((item, index) => (
                <label key={`${item.text}-${index}`} className={item.done ? 'check done' : 'check'}>
                  <input
                    type="checkbox"
                    checked={Boolean(item.done)}
                    onChange={() =>
                      patch({
                        checklist: checklist.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, done: !entry.done } : entry
                        ),
                      })
                    }
                  />
                  <span>{item.text}</span>
                </label>
              ))}
              <form
                className="comment-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  const next = checkDraft.trim();
                  if (!next) return;
                  patch({ checklist: [...checklist, { text: next, done: false }] }).then((saved) => {
                    if (saved) setCheckDraft('');
                  });
                }}
              >
                <input value={checkDraft} onChange={(event) => setCheckDraft(event.target.value)} placeholder="Add an item" maxLength={120} />
                <button className="btn btn-small" type="submit">
                  Add
                </button>
              </form>
            </div>

            <div className="comments card-section">
              <h3 className="card-section-title">Comments</h3>
              {comments.length === 0 && <p className="muted">No comments yet.</p>}
              {comments.map((comment) => (
                <article key={comment._id} className="comment">
                  <Avatar name={comment.author?.name} size="sm" />
                  <div>
                    <strong>{comment.author?.name}</strong>
                    <small className="muted"> {when(comment.createdAt)}</small>
                    <p>{comment.text}</p>
                  </div>
                </article>
              ))}
              <form className="comment-row" onSubmit={addComment}>
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Write a comment…"
                  maxLength={500}
                />
                <button className="btn btn-small" type="submit" disabled={!text.trim()}>
                  Send
                </button>
              </form>
            </div>
          </div>

          <aside className="card-modal-side">
            <p className="side-label">Add to card</p>
            <div className="side-actions">
              <details className="side-panel" open={(task.assignees || []).length > 0}>
                <summary>
                  <User size={15} aria-hidden="true" /> Members
                </summary>
                <div className="side-panel-body">
                  {members.map((member) => (
                    <label key={member._id} className="check">
                      <input
                        type="checkbox"
                        checked={(task.assignees || []).some((person) => String(person._id) === String(member._id))}
                        onChange={() => toggleAssignee(member._id)}
                      />
                      <Avatar name={member.name} size="sm" />
                      {member.name}
                    </label>
                  ))}
                </div>
              </details>

              <details className="side-panel" open={showLabels || labels.length > 0}>
                <summary onClick={() => setShowLabels(true)}>
                  <Tag size={15} aria-hidden="true" /> Labels
                </summary>
                <div className="side-panel-body">
                  <form className="comment-row" onSubmit={addLabel}>
                    <input
                      value={labelDraft}
                      onChange={(event) => setLabelDraft(event.target.value)}
                      placeholder="New label"
                      maxLength={24}
                    />
                    <button className="btn btn-small" type="submit" disabled={!labelDraft.trim() || labels.length >= 4}>
                      Add
                    </button>
                  </form>
                </div>
              </details>

              <label className="side-field">
                <span>
                  <Calendar size={15} aria-hidden="true" /> Due date
                </span>
                <input
                  type="date"
                  value={dateInputValue(task.dueDate)}
                  onChange={(event) => patch({ dueDate: event.target.value || null })}
                />
              </label>

              <label className="side-field">
                <span>Priority</span>
                <select value={task.priority || 'none'} onChange={(event) => patch({ priority: event.target.value })}>
                  {PRIORITIES.map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="side-label">Actions</p>
            <div className="side-actions">
              <label className="side-field">
                <span>Move to</span>
                <select value={task.column} onChange={(event) => patch({ column: event.target.value })}>
                  {COLUMNS.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="side-danger" type="button" onClick={remove}>
                <Trash2 size={15} aria-hidden="true" />
                Delete card
              </button>
            </div>
          </aside>
        </div>
        {error && <p className="error card-modal-error">{error}</p>}
      </div>
    </div>
  );
}
