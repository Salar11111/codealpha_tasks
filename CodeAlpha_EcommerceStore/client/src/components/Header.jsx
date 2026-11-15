import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag, X } from 'lucide-react';
import AccountMenu from './AccountMenu';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { useAuthDialog } from '../context/AuthDialogContext';
import { useCart } from '../context/CartContext';
import { cn } from '../lib/utils';

const NAV = [
  { label: 'Shop all', to: '/shop' },
  { label: 'Shoes', to: '/shop?department=Shoes' },
  { label: 'Clothing', to: '/shop?department=Clothing' },
  { label: 'Boots', to: '/shop?category=Boots' },
  { label: 'Our story', to: '/#story' },
];

const NOTES = [
  'Complimentary shipping over $75',
  'Made in small batches',
  'Resole and repair service',
  '30-day returns',
];

function MarqueeNote() {
  return (
    <div className="flex shrink-0 items-center">
      {NOTES.map((note) => (
        <span key={note} className="flex items-center whitespace-nowrap">
          <span className="px-6 text-[10px] uppercase tracking-[0.22em]">{note}</span>
          <span className="text-[8px] text-clay">◆</span>
        </span>
      ))}
    </div>
  );
}

export default function Header() {
  const { user } = useAuth();
  const { openAuth } = useAuthDialog();
  const { count, openDrawer } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

  const params = new URLSearchParams(location.search);

  useEffect(() => {
    setSearchOpen(false);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  function isActive(to) {
    if (to === '/shop') {
      return (
        location.pathname === '/shop' && !params.get('department') && !params.get('category')
      );
    }
    if (to.startsWith('/shop?')) {
      const target = new URLSearchParams(to.split('?')[1]);
      return (
        location.pathname === '/shop' &&
        [...target.entries()].every(([key, value]) => params.get(key) === value)
      );
    }
    return location.pathname === to;
  }

  function submitSearch(event) {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : '/shop');
    setSearchOpen(false);
    setQuery('');
  }

  return (
    <header className={cn('sticky top-0 z-40 bg-paper/95 backdrop-blur-md', scrolled && 'shadow-[0_18px_40px_-38px_rgba(28,26,22,0.9)]')}>
      <div className="overflow-hidden bg-ink text-paper/90">
        <div className="flex w-max animate-marquee items-center py-2 hover:[animation-play-state:paused]">
          <MarqueeNote />
          <MarqueeNote />
        </div>
      </div>

      <div className="relative border-b border-line">
        <div className="container-wide relative flex h-[68px] items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="-ml-2 flex h-10 w-10 items-center justify-center lg:hidden"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Logo className="hidden lg:inline-flex" />
            <Logo className="lg:hidden" compact />
          </div>

          <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-7 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  'relative py-2 text-[12.5px] tracking-[0.02em] text-ink-soft transition-colors hover:text-ink',
                  isActive(item.to) && 'text-ink'
                )}
              >
                {item.label}
                <span
                  className={cn(
                    'absolute -bottom-px left-0 h-px w-full origin-left scale-x-0 bg-ink transition-transform duration-300',
                    isActive(item.to) && 'scale-x-100'
                  )}
                />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen((value) => !value)}
              className="flex h-10 w-10 items-center justify-center transition-colors hover:text-brand"
              aria-label="Search"
              aria-expanded={searchOpen}
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </button>
            <AccountMenu />
            <Link
              to={user ? '/wishlist' : '#'}
              onClick={(event) => {
                if (!user) {
                  event.preventDefault();
                  openAuth('login');
                }
              }}
              className="hidden h-10 w-10 items-center justify-center transition-colors hover:text-brand sm:flex"
              aria-label="Wishlist"
            >
              <Heart className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </Link>
            <button
              type="button"
              onClick={openDrawer}
              className="relative flex h-10 w-10 items-center justify-center transition-colors hover:text-brand"
              aria-label={count > 0 ? `Your bag, ${count} items` : 'Your bag'}
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.6} />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-brand px-1 text-[9px] font-medium leading-none text-surface">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="absolute inset-x-0 top-full border-b border-line bg-surface">
            <form onSubmit={submitSearch} className="container-wide flex items-center gap-3 py-4">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search shoes, denim, jackets…"
                className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted"
                aria-label="Search products"
              />
              <button
                type="submit"
                className="shrink-0 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:text-brand"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="flex h-8 w-8 items-center justify-center text-muted hover:text-ink"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {mobileOpen && (
          <div className="absolute inset-x-0 top-full border-b border-line bg-surface lg:hidden">
            <nav className="container-page flex flex-col py-3">
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="border-b border-line/70 py-3 text-[15px] last:border-0"
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex items-center gap-4 pt-4">
                {user ? (
                  <>
                    <Link to="/orders" className="text-sm text-muted hover:text-ink">
                      Orders
                    </Link>
                    <Link to="/account" className="text-sm text-muted hover:text-ink">
                      Account
                    </Link>
                    {user.role === 'admin' && (
                      <Link to="/admin" className="text-sm text-muted hover:text-ink">
                        Admin
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="text-sm font-medium"
                      onClick={() => {
                        setMobileOpen(false);
                        openAuth('login');
                      }}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      className="text-sm text-muted"
                      onClick={() => {
                        setMobileOpen(false);
                        openAuth('register');
                      }}
                    >
                      Create account
                    </button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
