import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api/client';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import Select from '../components/ui/select';
import { useAuth } from '../context/AuthContext';

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France'];

export default function Account() {
  const { user, setUser, logout } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [address, setAddress] = useState({
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
  });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setProfile({ name: user.name || '', phone: user.phone || '' });
    setAddress((current) => ({
      ...current,
      fullName: user.savedAddress?.fullName || user.name || '',
      phone: user.savedAddress?.phone || user.phone || '',
      line1: user.savedAddress?.line1 || '',
      line2: user.savedAddress?.line2 || '',
      city: user.savedAddress?.city || '',
      state: user.savedAddress?.state || '',
      postalCode: user.savedAddress?.postalCode || '',
      country: user.savedAddress?.country || 'United States',
    }));
  }, [user?.id]);

  async function saveProfile(event) {
    event.preventDefault();
    setError('');
    setBusy('profile');
    try {
      const data = await api('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
      setUser(data.user);
      toast.success('Profile updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function saveAddress(event) {
    event.preventDefault();
    setError('');
    setBusy('address');
    try {
      const data = await api('/auth/address', {
        method: 'PUT',
        body: JSON.stringify(address),
      });
      setUser(data.user);
      toast.success('Address saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function signOut() {
    await logout();
    toast.success('Signed out.');
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="mt-2 text-[2.4rem] leading-none sm:text-[3rem]">Hello, {user.name.split(' ')[0]}.</h1>
          <p className="mt-3 text-sm text-muted">
            {user.email} {user.role === 'admin' && <span className="text-brand">· Administrator</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-2 border border-line bg-surface px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] transition-colors hover:border-ink"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>

      {error && (
        <p className="mt-6 border border-brand/25 bg-brand/5 px-4 py-3 text-sm text-brand" role="alert">
          {error}
        </p>
      )}

      <div className="mt-9 grid gap-10 lg:grid-cols-[1fr_320px] lg:gap-14">
        <div className="space-y-10">
          <section>
            <div className="border-b border-line pb-3">
              <h2 className="text-xl">Profile</h2>
            </div>
            <form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="account-name">
                  Full name
                </label>
                <Input
                  id="account-name"
                  required
                  value={profile.name}
                  onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="account-phone">
                  Phone
                </label>
                <Input
                  id="account-phone"
                  value={profile.phone}
                  onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="account-email">
                  Email
                </label>
                <Input id="account-email" value={user.email} disabled className="bg-paper/60 text-muted" />
                <p className="mt-1.5 text-[11px] text-muted">Email changes are handled by support.</p>
              </div>
              <div>
                <Button type="submit" disabled={busy === 'profile'}>
                  {busy === 'profile' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save profile
                </Button>
              </div>
            </form>
          </section>

          <section>
            <div className="border-b border-line pb-3">
              <h2 className="text-xl">Saved address</h2>
            </div>
            <p className="mt-2 text-[12px] text-muted">
              Used to prefill checkout. You can still edit it each time.
            </p>
            <form onSubmit={saveAddress} className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="address-name">
                  Full name
                </label>
                <Input
                  id="address-name"
                  value={address.fullName}
                  onChange={(event) => setAddress((current) => ({ ...current, fullName: event.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="address-phone">
                  Phone
                </label>
                <Input
                  id="address-phone"
                  value={address.phone}
                  onChange={(event) => setAddress((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="address-country">
                  Country
                </label>
                <Select
                  id="address-country"
                  value={address.country}
                  onChange={(event) => setAddress((current) => ({ ...current, country: event.target.value }))}
                >
                  {COUNTRIES.map((country) => (
                    <option key={country}>{country}</option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="address-line1">
                  Street address
                </label>
                <Input
                  id="address-line1"
                  value={address.line1}
                  onChange={(event) => setAddress((current) => ({ ...current, line1: event.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="address-line2">
                  Apartment, suite, etc.
                </label>
                <Input
                  id="address-line2"
                  value={address.line2}
                  onChange={(event) => setAddress((current) => ({ ...current, line2: event.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="address-city">
                  City
                </label>
                <Input
                  id="address-city"
                  value={address.city}
                  onChange={(event) => setAddress((current) => ({ ...current, city: event.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="address-state">
                    State
                  </label>
                  <Input
                    id="address-state"
                    value={address.state}
                    onChange={(event) => setAddress((current) => ({ ...current, state: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="address-postal">
                    Postal code
                  </label>
                  <Input
                    id="address-postal"
                    value={address.postalCode}
                    onChange={(event) => setAddress((current) => ({ ...current, postalCode: event.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Button type="submit" disabled={busy === 'address'}>
                  {busy === 'address' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save address
                </Button>
              </div>
            </form>
          </section>
        </div>

        <aside>
          <div className="border border-line bg-surface p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Shortcuts</p>
            <div className="mt-4 space-y-3 text-[13px]">
              <Link to="/orders" className="block border-b border-line pb-3 hover:text-brand">
                Order history
              </Link>
              <Link to="/wishlist" className="block border-b border-line pb-3 hover:text-brand">
                Saved pieces
              </Link>
              <Link to="/cart" className="block border-b border-line pb-3 hover:text-brand">
                Your bag
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="block border-b border-line pb-3 text-brand hover:text-brand-dark">
                  Admin studio
                </Link>
              )}
            </div>
            <div className="mt-6 border-t border-line pt-4">
              <p className="text-[11px] leading-relaxed text-muted">
                This is a demo account environment. Orders are stored locally and no payment is taken.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
