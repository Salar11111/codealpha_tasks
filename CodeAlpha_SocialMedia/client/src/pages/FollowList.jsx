import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';

export default function FollowList() {
  const { username, list } = useParams();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const kind = list === 'following' ? 'following' : 'followers';

  useEffect(() => {
    api(`/users/${username}/${kind}`)
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message));
  }, [username, kind]);

  return (
    <section className="stack">
      <header className="page-head">
        <h1>
          @{username} · {kind}
        </h1>
        <Link to={`/u/${username}`}>Back to profile</Link>
      </header>
      {error && <p className="error">{error}</p>}
      {users.length === 0 && !error && <p className="muted">No one here yet.</p>}
      {users.map((person) => (
        <article className="card" key={person.id}>
          <Link to={`/u/${person.username}`}>
            <strong>{person.name}</strong>
          </Link>
          <p className="muted">@{person.username}</p>
          {person.bio && <p>{person.bio}</p>}
        </article>
      ))}
    </section>
  );
}
