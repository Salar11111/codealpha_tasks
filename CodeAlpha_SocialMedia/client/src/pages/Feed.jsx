import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Trash2 } from 'lucide-react';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import { SkeletonPost } from '../components/Skeleton';

export default function Feed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: posts = [], error: queryError, isLoading: loading } = useQuery({
    queryKey: ['posts', 'feed'],
    queryFn: () => api('/posts/feed').then((result) => result.posts),
  });
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const publishMutation = useMutation({
    mutationFn: (body) => api('/posts', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] });
      setText('');
      clearFile();
    },
    onError: (err) => setError(err.message),
  });

  function clearFile() {
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function publish(event) {
    event.preventDefault();
    setError('');
    const body = new FormData();
    body.append('text', text);
    if (file) body.append('image', file);
    publishMutation.mutate(body);
  }

  const busy = publishMutation.isPending;
  const displayError = error || queryError?.message || '';

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
            placeholder="Share something worth reading…"
            maxLength={500}
            aria-label="Write a post"
            required={!file}
          />
        </div>
        <div className="composer-foot">
          <div className="composer-tools">
            <label className={`file-pick${file ? ' has-file' : ''}`}>
              Photo
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                hidden
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>
            {file && (
              <button type="button" className="text-btn" onClick={clearFile}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <div className="composer-meta">
            <span className="muted counter">{file ? file.name : `${text.length}/500`}</span>
            <button className="btn" type="submit" disabled={busy || (!text.trim() && !file)}>
              {busy ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </form>
      {displayError && (
        <p className="error" role="alert">
          {displayError}
        </p>
      )}
      {loading && (
        <>
          <p className="sr-only">Loading feed</p>
          <SkeletonPost />
          <SkeletonPost />
        </>
      )}
      {!loading && posts.length === 0 && !displayError && (
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
          onChange={(next) =>
            queryClient.setQueryData(['posts', 'feed'], (current = []) =>
              current.map((item) => (item._id === next._id ? next : item))
            )
          }
          onDelete={(id) =>
            queryClient.setQueryData(['posts', 'feed'], (current = []) =>
              current.filter((item) => item._id !== id)
            )
          }
        />
      ))}
    </section>
  );
}