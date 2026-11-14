import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import { SkeletonProfile } from '../components/Skeleton';
import { User, Check, X } from 'lucide-react';

export default function Profile() {
  const { username } = useParams();
  const queryClient = useQueryClient();
  const { data, error, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => api(`/users/${username}`),
  });
  const profile = data?.profile || null;
  const posts = data?.posts || [];

  const followMutation = useMutation({
    mutationFn: (current) =>
      current.isFollowing
        ? api(`/users/${current.id}/follow`, { method: 'DELETE' })
        : api(`/users/${current.id}/follow`, { method: 'POST' }),
    onSuccess: (result) => {
      queryClient.setQueryData(['profile', username], (current) => ({
        ...current,
        profile: {
          ...current.profile,
          isFollowing: result.isFollowing,
          followers: current.profile.followers + (result.isFollowing ? 1 : -1),
        },
      }));
    },
  });

  if (!profile && error) {
    return (
      <p className="error page-status" role="alert">
        {error.message}
      </p>
    );
  }
  if (!profile || isLoading) {
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
                onClick={() => followMutation.mutate(profile)}
                disabled={followMutation.isPending}
              >
                {profile.isFollowing ? (
                  <span>
                    <User size={16} aria-hidden="true" /> Following
                  </span>
                ) : (
                  <span>
                    <User size={16} aria-hidden="true" /> Follow
                  </span>
                )}
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
          {followMutation.error && (
            <p className="error" role="alert">
              {followMutation.error.message}
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
          onChange={(next) =>
            queryClient.setQueryData(['profile', username], (current) => ({
              ...current,
              posts: current.posts.map((item) => (item._id === next._id ? next : item)),
            }))
          }
          onDelete={(id) =>
            queryClient.setQueryData(['profile', username], (current) => ({
              ...current,
              posts: current.posts.filter((item) => item._id !== id),
            }))
          }
        />
      ))}
    </section>
  );
}