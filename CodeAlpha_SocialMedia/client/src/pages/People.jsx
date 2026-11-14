import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import Avatar from '../components/Avatar';
import { IconSearch } from '../components/icons';
import { SkeletonPerson } from '../components/Skeleton';

export default function People() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: users = [], error, isLoading: loading } = useQuery({
    queryKey: ['users', 'search', debounced],
    queryFn: () => api(`/users/search?q=${encodeURIComponent(debounced)}`).then((result) => result.users),
  });

  const followMutation = useMutation({
    mutationFn: (person) =>
      person.isFollowing
        ? api(`/users/${person.id}/follow`, { method: 'DELETE' })
        : api(`/users/${person.id}/follow`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'search'] }),
  });

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
          {error.message}
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
          {users.map((person) => (
            <li key={person.id} className="person card">
              <Avatar name={person.name} />
              <div className="person-copy">
                <Link to={`/u/${person.username}`}>
                  <strong>{person.name}</strong>
                </Link>
                <p className="muted">@{person.username}</p>
                {person.bio && <p>{person.bio}</p>}
              </div>
              <button
                type="button"
                className={person.isFollowing ? 'btn btn-small btn-outline' : 'btn btn-small'}
                onClick={() => followMutation.mutate(person)}
                disabled={followMutation.isPending}
              >
                {person.isFollowing ? 'Following' : 'Follow'}
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