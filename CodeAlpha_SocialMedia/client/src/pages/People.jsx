import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Avatar from '../components/Avatar';
import { IconSearch } from '../components/icons';
import { SkeletonPerson } from '../components/Skeleton';

export default function People() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      api(`/users/search?q=${encodeURIComponent(query.trim())}`)
        .then((data) => {
          setUsers(data.users);
          setError('');
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  async function toggle(user) {
    const path = `/users/${user.id}/follow`;
    const data = user.isFollowing ? await api(path, { method: 'DELETE' }) : await api(path, { method: 'POST' });
    setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, isFollowing: data.isFollowing } : item)));
  }

  return (
    <section className="stack" aria-busy={loading}>
      <header className="page-head">
        <h1>People</h1>
      </header>
      <div className="search-wrap">
        <IconSearch />
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or username"
          aria-label="Search people"
        />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <>
          <p className="sr-only">Loading people</p>
          <ul className="people">
            <SkeletonPerson />
            <SkeletonPerson />
            <SkeletonPerson />
          </ul>
        </>
      )}
      {!loading && (
        <ul className="people">
          {users.map((user) => (
            <li key={user.id} className="person card">
              <Avatar name={user.name} />
              <div className="person-copy">
                <Link to={`/u/${user.username}`}>
                  <strong>{user.name}</strong>
                </Link>
                <p className="muted">@{user.username}</p>
                {user.bio && <p>{user.bio}</p>}
              </div>
              <button
                type="button"
                className={user.isFollowing ? 'btn btn-small btn-outline' : 'btn btn-small'}
                onClick={() => toggle(user).catch((err) => setError(err.message))}
              >
                {user.isFollowing ? 'Following' : 'Follow'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && users.length === 0 && !error && (
        <div className="empty">
          <h2>{query.trim() ? 'No matches' : 'No one else is here yet'}</h2>
          <p className="muted">{query.trim() ? 'Try another name or username.' : 'New accounts will show up in this list.'}</p>
        </div>
      )}
    </section>
  );
}
