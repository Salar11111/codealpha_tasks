import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export default function FollowList() {
  const { username, list } = useParams();
  const kind = list === 'following' ? 'following' : 'followers';
  const { data: users = [], error } = useQuery({
    queryKey: ['users', username, kind],
    queryFn: () => api(`/users/${username}/${kind}`).then((result) => result.users),
  });

  return (
    <section className="stack">
      <header className="page-head">
        <h1>
          @{username} · {kind}
        </h1>
        <Link to={`/u/${username}`}>Back to profile</Link>
      </header>
      {error && <p className="error" aria-live="polite">{error.message}</p>}
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