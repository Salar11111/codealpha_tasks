export function SkeletonPost() {
  return (
    <article className="card skeleton-card" aria-hidden="true">
      <div className="skeleton-head">
        <span className="skeleton ball" />
        <span className="skeleton bar mid" />
      </div>
      <span className="skeleton bar" />
      <span className="skeleton bar short" />
    </article>
  );
}

export function SkeletonProfile() {
  return (
    <article className="card profile-card skeleton-card" aria-hidden="true">
      <div className="profile-banner" />
      <div className="profile-body">
        <span className="skeleton ball lg" />
        <span className="skeleton bar mid" />
        <span className="skeleton bar short" />
      </div>
    </article>
  );
}

export function SkeletonPerson() {
  return (
    <li className="person" aria-hidden="true">
      <span className="skeleton ball" />
      <span className="skeleton bar" />
    </li>
  );
}
