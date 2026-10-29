import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
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
  const chain = useRef(Promise.resolve());
  const labels = task.labels || [];
  const checklist = task.checklist || [];

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
    <div className="drawer-back" onMouseDown={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-heading"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="drawer-head">
          <p className="eyebrow">Card</p>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <h2 id="task-heading">{title || 'Untitled'}</h2>
        <form onSubmit={saveDetails}>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label>
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </form>

        <label>
          Move to
          <select value={task.column} onChange={(event) => patch({ column: event.target.value })}>
            {COLUMNS.map((column) => (
              <option key={column.id} value={column.id}>
                {column.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select value={task.priority || 'none'} onChange={(event) => patch({ priority: event.target.value })}>
            {PRIORITIES.map((priority) => (
              <option key={priority.id} value={priority.id}>
                {priority.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Due date
          <input
            type="date"
            value={dateInputValue(task.dueDate)}
            onChange={(event) => patch({ dueDate: event.target.value || null })}
          />
        </label>

        <div className="field">
          <span>Labels</span>
          <div className="chip-row">
            {labels.map((label) => (
              <span key={label} className="chip" style={{ background: labelColor(label) }}>
                {label}
                <button type="button" aria-label={`Remove ${label}`} onClick={() => removeLabel(label)}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <form className="comment-row" onSubmit={addLabel}>
            <input
              value={labelDraft}
              onChange={(event) => setLabelDraft(event.target.value)}
              placeholder="Add a label"
              maxLength={24}
            />
            <button className="btn btn-small" type="submit" disabled={!labelDraft.trim() || labels.length >= 4}>
              Add
            </button>
          </form>
        </div>

        <div className="field">
          <span>Checklist</span>
          {checklist.map((item, index) => (
            <label key={`${item.text}-${index}`} className="check">
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
              {item.text}
            </label>
          ))}
          <form
            className="comment-row"
            onSubmit={(event) => {
              event.preventDefault();
              const text = checkDraft.trim();
              if (!text) return;
              patch({ checklist: [...checklist, { text, done: false }] }).then((saved) => {
                if (saved) setCheckDraft('');
              });
            }}
          >
            <input value={checkDraft} onChange={(event) => setCheckDraft(event.target.value)} placeholder="Add a step" maxLength={120} />
            <button className="btn btn-small" type="submit">
              Add
            </button>
          </form>
        </div>

        <fieldset>
          <legend>Assign</legend>
          {members.map((member) => (
            <label key={member._id} className="check">
              <input
                type="checkbox"
                checked={(task.assignees || []).some((person) => String(person._id) === String(member._id))}
                onChange={() => toggleAssignee(member._id)}
              />
              {member.name}
            </label>
          ))}
        </fieldset>
        <button className="text-btn danger" type="button" onClick={remove}>
          Delete card
        </button>

        <div className="comments">
          <h3>Comments</h3>
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
              placeholder="Write to the people on this card"
              maxLength={500}
            />
            <button className="btn btn-small" type="submit" disabled={!text.trim()}>
              Send
            </button>
          </form>
        </div>
        {error && <p className="error">{error}</p>}
      </aside>
    </div>
  );
}
