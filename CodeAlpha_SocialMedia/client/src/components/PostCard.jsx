import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { when } from '../utils';
import Avatar from './Avatar';
import { IconComment, IconHeart } from './icons';

export default function PostCard({ post, onChange, onDelete }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState(post.text);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [likers, setLikers] = useState(null);
  const [error, setError] = useState('');
  const mine = String(user?.id) === String(post.author?._id || post.author?.id);

  useEffect(() => setDraft(post.text), [post.text]);

  async function loadComments() {
    const data = await api(`/posts/${post._id}/comments`);
    setComments(data.comments);
    setOpen(true);
  }

  async function like() {
    setError('');
    try {
      const data = await api(`/posts/${post._id}/like`, { method: 'POST' });
      onChange(data.post);
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveEdit(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await api(`/posts/${post._id}`, { method: 'PUT', body: JSON.stringify({ text: draft }) });
      onChange(data.post);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove() {
    setError('');
    try {
      await api(`/posts/${post._id}`, { method: 'DELETE' });
      onDelete(post._id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function bookmark() {
    const data = await api(`/posts/${post._id}/bookmark`, { method: 'POST' });
    onChange(data.post);
  }

  async function showLikes() {
    if (likers) {
      setLikers(null);
      return;
    }
    const data = await api(`/posts/${post._id}/likes`);
    setLikers(data.users);
  }

  async function addComment(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await api(`/posts/${post._id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: comment, parent: replyTo?._id || undefined }),
      });
      setComments((current) => [...current, data.comment]);
      setComment('');
      setReplyTo(null);
      onChange({ ...post, commentCount: (post.commentCount || 0) + 1 });
      setOpen(true);
    } catch (err) {
      setError(err.message);
    }
  }

  function cancelEdit() {
    setDraft(post.text);
    setEditing(false);
  }

  return (
    <article className="card post">
      <header className="post-head">
        <Avatar name={post.author?.name} />
        <div>
          <Link to={`/u/${post.author?.username}`}>
            <strong>{post.author?.name}</strong>
          </Link>
          <p className="muted">
            @{post.author?.username} · {when(post.createdAt)}
          </p>
        </div>
      </header>
      {editing ? (
        <form className="edit-form" onSubmit={saveEdit}>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} required />
          <div className="row">
            <button className="btn btn-small" type="submit">
              Save
            </button>
            <button className="text-btn" type="button" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="post-text">{post.text}</p>
      )}
      {post.image && <img className="post-image" src={post.image} alt="" />}
      <div className="post-actions">
        <div className="action-group">
          <button
            type="button"
            className={post.liked ? 'icon-btn on' : 'icon-btn'}
            aria-pressed={Boolean(post.liked)}
            aria-label={`${post.liked ? 'Unlike' : 'Like'}, ${post.likeCount} ${post.likeCount === 1 ? 'like' : 'likes'}`}
            onClick={like}
          >
            <IconHeart filled={post.liked} />
            <span>{post.likeCount}</span>
          </button>
          <button type="button" className="text-btn" onClick={() => showLikes().catch((err) => setError(err.message))}>
            Who liked
          </button>
          <button
            type="button"
            className={post.saved ? 'icon-btn on' : 'icon-btn'}
            aria-pressed={Boolean(post.saved)}
            aria-label={post.saved ? 'Remove bookmark' : 'Save post'}
            onClick={() => bookmark().catch((err) => setError(err.message))}
          >
            {post.saved ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} comments, ${post.commentCount}`}
            onClick={() => (open ? setOpen(false) : loadComments().catch((err) => setError(err.message)))}
          >
            <IconComment />
            <span>{post.commentCount}</span>
          </button>
        </div>
        {mine && !editing && (
          <div className="action-group">
            {confirming ? (
              <span className="confirm">
                Delete this post?
                <button type="button" className="text-btn" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
                <button type="button" className="text-btn danger" onClick={remove}>
                  Delete
                </button>
              </span>
            ) : (
              <>
                <button type="button" className="text-btn" onClick={() => setEditing(true)}>
                  Edit
                </button>
                <button type="button" className="text-btn" onClick={() => setConfirming(true)}>
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {likers && (
        <p className="muted">
          {likers.length === 0
            ? 'No likes yet.'
            : likers.map((person) => person.name).join(', ')}
        </p>
      )}
      {open && (
        <div className="comments">
          {comments.length === 0 && <p className="muted">No comments yet. Be the first to reply.</p>}
          {comments.map((item) => (
            <article key={item._id} className="comment">
              <Avatar name={item.author?.name} size="sm" />
              <div>
                <p className="comment-meta">
                  <Link to={`/u/${item.author?.username}`}>
                    <strong>{item.author?.name}</strong>
                  </Link>
                  <span className="muted">
                    @{item.author?.username} · {when(item.createdAt)}
                  </span>
                </p>
                <p>{item.text}</p>
                <button type="button" className="text-btn" onClick={() => setReplyTo(item)}>
                  Reply
                </button>
              </div>
            </article>
          ))}
          <form onSubmit={addComment} className="comment-form">
            {replyTo && (
              <p className="muted">
                Replying to {replyTo.author?.name}{' '}
                <button type="button" className="text-btn" onClick={() => setReplyTo(null)}>
                  Cancel
                </button>
              </p>
            )}
            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Write a comment"
              maxLength={300}
              aria-label="Write a comment"
              required
            />
            <button className="btn btn-small" type="submit">
              Reply
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
