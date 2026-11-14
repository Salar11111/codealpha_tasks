import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AvatarStack, DueMark, PriorityMark } from '../components/Avatar';
import { useWorkspace } from '../components/Layout';

function Progress({ counts = { todo: 0, inprogress: 0, done: 0 } }) {
  const total = counts.todo + counts.inprogress + counts.done;
  const pct = total ? Math.round((counts.done / total) * 100) : 0;
  return (
    <div className="progress-block">
      <div className="progress" role="img" aria-label={total ? `${pct} percent done` : 'No cards yet'}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="muted">{total ? `${pct}% done` : 'No cards yet'}</span>
    </div>
  );
}

export default function ProjectList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const { setTitle, refreshProjects } = useWorkspace();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogEntered, setDialogEntered] = useState(false);

  const { data: projects = [], isLoading: loaded } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api('/projects').then((result) => result.projects),
  });
  const { data: mine = [], isLoading: workLoaded } = useQuery({
    queryKey: ['tasks', 'mine'],
    queryFn: () => api('/tasks/mine').then((result) => result.tasks),
  });

  useEffect(() => {
    setTitle('Projects');
  }, [setTitle]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setDialogEntered(false);
      return undefined;
    }
    const frame = requestAnimationFrame(() => setDialogEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const createMutation = useMutation({
    mutationFn: (payload) => api('/projects', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await refreshProjects();
      navigate(`/projects/${data.project._id}`);
    },
    onError: (err) => setError(err.message),
  });

  async function createProject(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await createMutation.mutateAsync(form);
    } catch {
      // error handled by mutation
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <section className="section">
        <div className="section-head">
          <h2>My work</h2>
        </div>
        {workLoaded && mine.length === 0 && <p className="muted">Nothing is assigned to you right now.</p>}
        <div className="work-list">
          {mine.map((task) => (
            <Link key={task._id} to={`/projects/${task.project._id}?task=${task._id}`} className="work-row">
              <span className="work-priority">
                <PriorityMark priority={task.priority} />
              </span>
              <span className="work-title">{task.title}</span>
              <span className="work-project">{task.project.name}</span>
              <span className="work-due">
                <DueMark value={task.dueDate} column={task.column} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>All projects</h2>
          <button type="button" className="btn btn-small" onClick={() => setOpen(true)}>
            <Plus size={16} aria-hidden="true" /> New project
          </button>
        </div>
        {error && !open && <p className="error" aria-live="polite">{error}</p>}
        {loaded && projects.length === 0 && !error && <p className="muted">No projects yet. Create one, or log in as the demo lead.</p>}
        <ul className="project-grid">
          {projects.map((project) => (
            <li key={project._id}>
              <Link to={`/projects/${project._id}`} className="project-card">
                <strong>{project.name}</strong>
                <p>{project.description || 'No description'}</p>
                <Progress counts={project.counts} />
                <span className="card-people">
                  <AvatarStack people={project.members || []} />
                  <span className="muted">{project.members.length} members</span>
                </span>
              </Link>
              {String(project.owner?._id || project.owner) === String(userId) && (
                <button
                  type="button"
                  className="text-btn"
                  onClick={() =>
                    api(`/projects/${project._id}`, { method: 'PATCH', body: JSON.stringify({ archived: true }) }).then(() =>
                      queryClient.invalidateQueries({ queryKey: ['projects'] })
                    )
                  }
                >
                  Archive
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {open && (
        <div className={`dialog-back${dialogEntered ? ' open' : ''}`} onMouseDown={() => setOpen(false)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="new-project-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="new-project-title">New project</h2>
            <form onSubmit={createProject}>
              <label>
                Name
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                  autoFocus
                />
              </label>
              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
              {error && <p className="error" aria-live="polite">{error}</p>}
              <div className="row">
                <button className="btn" type="submit" disabled={busy}>
                  {busy ? 'Creating…' : 'Create project'}
                </button>
                <button className="text-btn" type="button" onClick={() => setOpen(false)}>
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