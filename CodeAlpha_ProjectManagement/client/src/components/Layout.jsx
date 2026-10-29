import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Bell, Menu } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { when } from '../utils';
import Avatar from './Avatar';

const WorkspaceContext = createContext(null);

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('Workspace is unavailable');
  return value;
}

export default function Layout({ children }) {
  const { user, loading, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const bellRef = useRef(null);
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [title, setTitleState] = useState('Projects');

  const setTitle = useCallback((value) => setTitleState(value), []);
  const refreshProjects = useCallback(async () => {
    try {
      const data = await api('/projects');
      setProjects(data.projects);
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }
    refreshProjects();
  }, [user, location.pathname, refreshProjects]);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return undefined;
    api('/notifications')
      .then((data) => setNotes(data.notifications))
      .catch(() => setNotes([]));
  }, [user]);

  useEffect(() => {
    if (!socket) return undefined;
    const onNote = (note) => setNotes((current) => [note, ...current.filter((item) => item._id !== note._id)]);
    socket.on('notification:new', onNote);
    return () => socket.off('notification:new', onNote);
  }, [socket]);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(event) {
      if (!bellRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const unread = notes.filter((note) => !note.read).length;

  async function openNote(note) {
    if (!note.read) {
      const data = await api(`/notifications/${note._id}/read`, { method: 'PATCH' });
      setNotes((current) => current.map((item) => (item._id === note._id ? data.notification : item)));
    }
    setOpen(false);
    const projectId = note.project?._id || note.project;
    const taskId = note.task?._id || note.task;
    navigate(taskId ? `/projects/${projectId}?task=${taskId}` : `/projects/${projectId}`);
  }

  async function readAll() {
    await api('/notifications/read-all', { method: 'POST' });
    setNotes((current) => current.map((note) => ({ ...note, read: true })));
  }

  if (loading) return <p className="muted page-pad">Loading your workspace…</p>;

  if (!user) {
    return (
      <div className="shell shell-guest">
        <header className="guest-bar">
          <Link to="/" className="brand">
            Keel
          </Link>
          <div className="nav-auth">
            <Link to="/login">Log in</Link>
            <Link to="/register" className="btn btn-small">
              Join
            </Link>
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  return (
    <WorkspaceContext.Provider value={{ projects, refreshProjects, title, setTitle }}>
      <div className="shell">
        {navOpen && (
          <button type="button" className="scrim" aria-label="Close menu" onClick={() => setNavOpen(false)} />
        )}
        <aside className={navOpen ? 'sidebar open' : 'sidebar'}>
          <Link to="/" className="brand">
            Keel
          </Link>
          <p className="side-label">Projects</p>
          <nav className="side-nav">
            {projectsLoaded && projects.length === 0 && <p className="muted side-empty">No projects yet</p>}
            {projects.map((project) => (
              <NavLink
                key={project._id}
                to={`/projects/${project._id}`}
                className={({ isActive }) => (isActive ? 'side-link active' : 'side-link')}
              >
                {project.name}
              </NavLink>
            ))}
          </nav>
          <div className="side-user">
            <Avatar name={user.name} />
            <div>
              <strong>{user.name}</strong>
              <button type="button" className="text-btn" onClick={logout}>
                Log out
              </button>
            </div>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <button type="button" className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setNavOpen(true)}>
              <Menu size={18} />
            </button>
            <h1 className="top-title">
              {title === 'Projects' ? (
                'Projects'
              ) : (
                <>
                  <Link to="/" className="crumb">
                    Projects
                  </Link>
                  <span className="crumb-sep">/</span>
                  {title}
                </>
              )}
            </h1>
            <div className="top-actions">
              <div className="bell-wrap" ref={bellRef}>
                <button type="button" className="icon-btn" aria-label="Notifications" onClick={() => setOpen((value) => !value)}>
                  <Bell size={18} />
                  {unread > 0 && <em className="badge">{unread}</em>}
                </button>
                {open && (
                  <div className="bell-panel">
                    <header>
                      <strong>Notifications</strong>
                      {unread > 0 && (
                        <button type="button" className="text-btn" onClick={readAll}>
                          Mark all read
                        </button>
                      )}
                    </header>
                    {notes.length === 0 && <p className="muted">Nothing new.</p>}
                    {notes.map((note) => (
                      <button type="button" key={note._id} className={note.read ? 'note' : 'note unread'} onClick={() => openNote(note)}>
                        <span>{note.message}</span>
                        <small className="muted">{when(note.createdAt)}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}
