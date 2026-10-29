import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import { SkeletonProfile } from '../components/Skeleton';

export default function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setProfile(null);
    setError('');
    api(`/users/${username}`)
      .then((data) => {
        setProfile(data.profile);
        setPosts(data.posts);
      })
      .catch((err) => setError(err.message));
  }, [username]);

  async function toggleFollow() {
    const path = `/users/${profile.id}/follow`;
    const data = profile.isFollowing ? await api(path, { method: 'DELETE' }) : await api(path, { method: 'POST' });
    setProfile((current) => ({
      ...current,
      isFollowing: data.isFollowing,
      followers: current.followers + (data.isFollowing ? 1 : -1),
    }));
  }

  if (!profile && error) {
    return (
      <p className="error page-status" role="alert">
        {error}
      </p>
    );
  }
  if (!profile) {
    return (
      <section className="stack" aria-busy="true">
        <p className="sr-only">Loading profile</p>
        <SkeletonProfile />
      </section>
    );
  }

  return (
    <section className="stack">
      <article className="card profile-card">
        <div className="profile-banner" />
        <div className="profile-body">
          <div className="profile-top">
            <Avatar name={profile.name} size="lg" />
            {profile.isSelf ? (
              <Link to="/settings" className="btn btn-small">
                Edit profile
              </Link>
            ) : (
              <button
                type="button"
                className={profile.isFollowing ? 'btn btn-small btn-outline' : 'btn btn-small'}
                onClick={() => toggleFollow().catch((err) => setError(err.message))}
              >
                {profile.isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          <h1>{profile.name}</h1>
          <p className="muted">@{profile.username}</p>
          <p className="bio">{profile.bio || 'No bio yet.'}</p>
          <p className="counts">
            <Link to={`/u/${profile.username}/followers`}>
              <strong>{profile.followers}</strong> {profile.followers === 1 ? 'follower' : 'followers'}
            </Link>
            <Link to={`/u/${profile.username}/following`}>
              <strong>{profile.following}</strong> following
            </Link>
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </article>
      {posts.length === 0 && (
        <div className="empty">
          <h2>No posts yet</h2>
          <p className="muted">{profile.isSelf ? 'Share something from your feed.' : 'When they post, it will show up here.'}</p>
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
