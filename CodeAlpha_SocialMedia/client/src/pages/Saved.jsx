import { useEffect, useState } from 'react';
import { api } from '../api/client';
import PostCard from '../components/PostCard';

export default function Saved() {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/posts/saved')
      .then((data) => setPosts(data.posts))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section className="stack">
      <header className="page-head">
        <h1>Saved</h1>
      </header>
      {error && <p className="error">{error}</p>}
      {posts.length === 0 && !error && <p className="muted">Bookmarked posts show up here.</p>}
      {posts.map((post) => (
        <PostCard
          key={post._id}
          post={post}
          onChange={(next) =>
            setPosts((current) =>
              next.saved ? current.map((item) => (item._id === next._id ? next : item)) : current.filter((item) => item._id !== next._id)
            )
          }
          onDelete={(id) => setPosts((current) => current.filter((item) => item._id !== id))}
        />
      ))}
    </section>
  );
}
