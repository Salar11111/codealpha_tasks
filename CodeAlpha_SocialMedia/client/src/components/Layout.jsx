import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { IconBell, IconBookmark, IconHome, IconPeople, IconUser } from './icons';
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
        <IconBookmark />
        <span>Saved</span>
      </NavLink>
      <NavLink to={`/u/${user.username}`} className={navClass}>
        <IconUser />
        <span>Profile</span>
      </NavLink>
    </>
  );
}

function AlertsPanel({ notes, onClose }) {
  const panelRef = useRef(null);
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;
    function onKey(event) {
      if (event.key !== 'Tab') return;
      const focusable = panel.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    panel.addEventListener('keydown', onKey);
    return () => panel.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div ref={panelRef} className="card alerts-panel" role="dialog" aria-label="Alerts" aria-modal="true">
      <div className="alerts-head">
        <h2>Alerts</h2>
        <button type="button" className="text-btn" onClick={onClose} autoFocus>
          Close
        </button>
      </div>
      {notes.length === 0 ? (
        <div className="alerts-empty">
          <p className="muted">No alerts yet. Likes, follows, and replies will land here.</p>
        </div>
      ) : (
        <ul className="alerts-list">
          {notes.map((note) => (
            <li key={note._id} className={note.read ? 'alert-item' : 'alert-item unread'}>
              <p>{note.text}</p>
              {note.actor?.username && (
                <span className="muted alert-meta">@{note.actor.username}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
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

  useEffect(() => {
    if (!openNotes) return undefined;
    function onPointerDown(event) {
      if (event.target.closest('.alerts-wrap')) return;
      setOpenNotes(false);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpenNotes(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openNotes]);

  async function toggleAlerts() {
    const next = !openNotes;
    setOpenNotes(next);
    if (next && unread > 0) {
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
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <main id="main-content" className="guest-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
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
        <div className="topbar-actions">
          <div className="alerts-wrap alerts-wrap-mobile">
            <button
              type="button"
              className="icon-btn alerts-trigger compact"
              aria-expanded={openNotes}
              aria-haspopup="dialog"
              aria-label={unread > 0 ? `Alerts, ${unread} unread` : 'Alerts'}
              onClick={() => toggleAlerts().catch(() => {})}
            >
              <IconBell />
              {unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
            </button>
            {openNotes && (
              <>
                <button type="button" className="alerts-backdrop" aria-label="Close alerts" onClick={() => setOpenNotes(false)} />
                <AlertsPanel notes={notes} onClose={() => setOpenNotes(false)} />
              </>
            )}
          </div>
          <button type="button" className="text-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <div className="app">
        <aside className="sidenav">
          <Link to="/" className="brand">
            Lumen
          </Link>
          <nav className="nav-links" aria-label="Primary">
            <PrimaryLinks user={user} />
            <div className="alerts-wrap alerts-wrap-desktop">
              <button
                type="button"
                className="nav-link alerts-trigger"
                aria-expanded={openNotes}
                aria-haspopup="dialog"
                onClick={() => toggleAlerts().catch(() => {})}
              >
                <IconBell />
                <span>Alerts</span>
                {unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
              </button>
              {openNotes && (
                <AlertsPanel notes={notes} onClose={() => setOpenNotes(false)} />
              )}
            </div>
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
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <main id="main-content" className="column">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        <Suggestions />
      </div>
      <nav className="tabbar" aria-label="Primary">
        <PrimaryLinks user={user} />
      </nav>
    </div>
  );
}
