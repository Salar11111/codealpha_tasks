import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import { SkeletonPost } from '../components/Skeleton';

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/posts/feed')
      .then((data) => setPosts(data.posts))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function publish(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('text', text);
      if (file) body.append('image', file);
      const data = await api('/posts', { method: 'POST', body });
      setPosts((current) => [data.post, ...current]);
      setText('');
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack" aria-busy={loading}>
      <header className="page-head">
        <h1>Feed</h1>
      </header>
      <form className="card composer" onSubmit={publish}>
        <div className="composer-top">
          <Avatar name={user?.name} />
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="What's happening?"
            maxLength={500}
            aria-label="Write a post"
            required={!file}
          />
        </div>
        <div className="row">
          <label className="text-btn">
            Photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              hidden
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
          <span className="muted">{file ? file.name : `${text.length}/500`}</span>
          <button className="btn" type="submit" disabled={busy || (!text.trim() && !file)}>
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <>
          <p className="sr-only">Loading feed</p>
          <SkeletonPost />
          <SkeletonPost />
        </>
      )}
      {!loading && posts.length === 0 && !error && (
        <div className="empty">
          <h2>Your feed is quiet</h2>
          <p className="muted">
            <Link to="/people">Find people to follow</Link> and their posts will show up here.
          </p>
        </div>
      )}
      {posts.map((post) => (
        <PostCard
          key={post._id}
          post={post}
          onChange={(next) => setPosts((current) => current.map((item) => (item._id === next._id ? next : item)))}
          onDelete={(id) => setPosts((current) => current.filter((item) => item._id !== id))}
        />
      ))}
    </section>
  );
}
