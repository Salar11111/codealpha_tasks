import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { IconHome, IconPeople, IconUser } from './icons';
import Suggestions from './Suggestions';

function navClass({ isActive }) {
  return isActive ? 'nav-link active' : 'nav-link';
}

function PrimaryLinks({ user }) {
  return (
    <>
      <NavLink to="/" end className={navClass}>
        <IconHome />
        <span>Feed</span>
      </NavLink>
      <NavLink to="/people" className={navClass}>
        <IconPeople />
        <span>People</span>
      </NavLink>
      <NavLink to="/saved" className={navClass}>
        <span>Saved</span>
      </NavLink>
      <NavLink to={`/u/${user.username}`} className={navClass}>
        <IconUser />
        <span>Profile</span>
      </NavLink>
    </>
  );
}

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const [notes, setNotes] = useState([]);
  const [unread, setUnread] = useState(0);
  const [openNotes, setOpenNotes] = useState(false);

  function loadNotes() {
    api('/notifications')
      .then((data) => {
        setNotes(data.notifications);
        setUnread(data.unread);
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!user) return undefined;
    loadNotes();
    const timer = setInterval(loadNotes, 20000);
    return () => clearInterval(timer);
  }, [user]);

  async function openBell() {
    setOpenNotes((current) => !current);
    if (unread > 0) {
      await api('/notifications/read', { method: 'POST' });
      setUnread(0);
      setNotes((current) => current.map((note) => ({ ...note, read: true })));
    }
  }

  if (loading) {
    return (
      <div className="shell shell-guest">
        <p className="muted page-status">Opening your feed…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="shell shell-guest">
        <main className="guest-main">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          Lumen
        </Link>
        <button type="button" className="text-btn" onClick={openBell}>
          Alerts{unread > 0 ? ` (${unread})` : ''}
        </button>
        <button type="button" className="text-btn" onClick={logout}>
          Log out
        </button>
      </header>
      <div className="app">
        <aside className="sidenav">
          <Link to="/" className="brand">
            Lumen
          </Link>
          <nav className="nav-links" aria-label="Primary">
            <PrimaryLinks user={user} />
          </nav>
          <div className="user-chip">
            <Avatar name={user.name} />
            <div className="user-meta">
              <strong>{user.name}</strong>
              <p>@{user.username}</p>
            </div>
            <button type="button" className="text-btn" onClick={logout}>
              Log out
            </button>
          </div>
        </aside>
        <main className="column">
          {openNotes && (
            <section className="card">
              <h2>Alerts</h2>
              {notes.length === 0 && <p className="muted">No alerts yet.</p>}
              {notes.map((note) => (
                <p key={note._id}>
                  {note.text} <span className="muted">{note.actor?.username ? `@${note.actor.username}` : ''}</span>
                </p>
              ))}
            </section>
          )}
          <Outlet />
        </main>
        <Suggestions />
      </div>
      <nav className="tabbar" aria-label="Primary">
        <PrimaryLinks user={user} />
      </nav>
    </div>
  );
}
