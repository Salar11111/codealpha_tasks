import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import Avatar from './Avatar';

export default function Suggestions() {
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api('/users/search?q=')
      .then((data) => {
        if (active) setUsers(data.users.filter((user) => !user.isFollowing).slice(0, 4));
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  async function follow(user) {
    setError('');
    try {
      await api(`/users/${user.id}/follow`, { method: 'POST' });
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <aside className="rail">
      <section className="card rail-card">
        <h2>People to follow</h2>
        {loading && (
          <div className="rail-list" aria-hidden="true">
            <div className="rail-person">
              <span className="skeleton ball" />
              <span className="skeleton bar mid" />
            </div>
            <div className="rail-person">
              <span className="skeleton ball" />
              <span className="skeleton bar mid" />
            </div>
          </div>
        )}
        {!loading && error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && users.length === 0 && (
          <p className="muted">You're already following everyone here.</p>
        )}
        {!loading && users.length > 0 && (
          <ul className="rail-list">
            {users.map((user) => (
              <li key={user.id} className="rail-person">
                <Avatar name={user.name} />
                <div className="person-copy">
                  <Link to={`/u/${user.username}`}>
                    <strong>{user.name}</strong>
                  </Link>
                  <p className="muted">@{user.username}</p>
                </div>
                <button type="button" className="btn btn-small" onClick={() => follow(user)}>
                  Follow
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link className="rail-link" to="/people">
          Browse people
        </Link>
      </section>
    </aside>
  );
}
