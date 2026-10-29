import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import CartDrawer from './CartDrawer';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const CATEGORIES = ['Kitchen', 'Home', 'Stationery'];

function CartGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 7h15l-1.5 9h-12z" />
      <path d="M6 7 5 4H2" />
      <circle cx="9" cy="20" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { count, openDrawer, closeDrawer } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [draft, setDraft] = useState(() => new URLSearchParams(location.search).get('q') || '');
  const searchReady = useRef(false);

  function onDraft(value) {
    searchReady.current = true;
    setDraft(value);
  }

  const locationRef = useRef(location);
  locationRef.current = location;

  useEffect(() => {
    setOpen(false);
    closeDrawer();
  }, [location.pathname, closeDrawer]);

  useEffect(() => {
    setDraft(new URLSearchParams(location.search).get('q') || '');
  }, [location.search]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!searchReady.current) return undefined;
    searchReady.current = false;
    const timer = setTimeout(() => {
      const loc = locationRef.current;
      const next = new URLSearchParams(loc.pathname === '/' ? loc.search : '');
      const trimmed = draft.trim();
      if ((next.get('q') || '') === trimmed && loc.pathname === '/') return;
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      navigate({ pathname: '/', search: next.toString() }, { replace: loc.pathname === '/' });
    }, 250);
    return () => clearTimeout(timer);
  }, [draft, navigate]);

  const activeCategory = location.pathname === '/' ? new URLSearchParams(location.search).get('category') || '' : '';

  function categoryLink(name) {
    const next = new URLSearchParams(location.pathname === '/' ? location.search : '');
    next.delete('q');
    if (name) next.set('category', name);
    else next.delete('category');
    return { pathname: '/', search: next.toString() };
  }

  return (
    <div className="shell">
      <header className={scrolled ? 'site-header scrolled' : 'site-header'}>
        <div className="bar">
          <Link to="/" className="brand">
            Northline
          </Link>
          <nav className="pill-nav">
            <Link to={categoryLink('')} className={activeCategory === '' && location.pathname === '/' ? 'active' : ''}>
              All
            </Link>
            {CATEGORIES.map((name) => (
              <Link key={name} to={categoryLink(name)} className={activeCategory === name ? 'active' : ''}>
                {name}
              </Link>
            ))}
            {user && <NavLink to="/orders">Orders</NavLink>}
            {user && <NavLink to="/wishlist">Saved</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          </nav>
          <form className="header-search" role="search" onSubmit={(event) => event.preventDefault()}>
            <input
              name="q"
              value={draft}
              onChange={(event) => onDraft(event.target.value)}
              placeholder="Search goods"
              aria-label="Search products"
            />
          </form>
          <div className="nav-auth">
            {user ? (
              <>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={count > 0 ? `Cart, ${count} items` : 'Cart'}
                  onClick={openDrawer}
                >
                  <CartGlyph />
                  {count > 0 && <em key={count}>{count}</em>}
                </button>
                <span className="who">{user.name}</span>
                <button type="button" className="text-btn" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login">Log in</Link>
                <Link to="/register" className="btn btn-small">
                  Join
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            className="menu-btn"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        {open && (
          <div className="mobile-panel">
            <form role="search" onSubmit={(event) => event.preventDefault()}>
              <input
                value={draft}
                onChange={(event) => onDraft(event.target.value)}
                placeholder="Search goods"
                aria-label="Search products"
              />
            </form>
            <Link to={categoryLink('')}>All</Link>
            {CATEGORIES.map((name) => (
              <Link key={name} to={categoryLink(name)}>
                {name}
              </Link>
            ))}
            {user ? (
              <>
                <NavLink to="/orders">Orders</NavLink>
                <NavLink to="/wishlist">Saved</NavLink>
                {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
                <button type="button" onClick={openDrawer}>
                  Cart{count > 0 ? ` · ${count}` : ''}
                </button>
                <button type="button" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login">Log in</Link>
                <Link to="/register" className="btn">
                  Join
                </Link>
              </>
            )}
          </div>
        )}
      </header>
      <CartDrawer />
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="brand">
              Northline
            </Link>
            <p>Household goods for the table, the desk, and the room. Stock updates as you shop.</p>
          </div>
          <nav aria-label="Shop">
            <p className="eyebrow">Shop</p>
            <Link to={categoryLink('')}>All goods</Link>
            {CATEGORIES.map((name) => (
              <Link key={name} to={categoryLink(name)}>
                {name}
              </Link>
            ))}
          </nav>
          <nav aria-label="Account">
            <p className="eyebrow">Account</p>
            {user ? (
              <>
                <Link to="/orders">Orders</Link>
                <Link to="/wishlist">Saved</Link>
                {user.role === 'admin' && <Link to="/admin">Admin</Link>}
                <Link to="/cart">Cart</Link>
                <button type="button" className="text-btn" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login">Log in</Link>
                <Link to="/register">Create an account</Link>
              </>
            )}
          </nav>
          <nav aria-label="Help">
            <p className="eyebrow">Help</p>
            <Link to="/#reviews-title">Reviews</Link>
            <Link to="/#faq-title">Questions</Link>
          </nav>
        </div>
        <div className="footer-bar">
          <p>© 2026 Northline. A CodeAlpha store — orders are recorded locally, and no payment is taken.</p>
        </div>
      </footer>
    </div>
  );
}
