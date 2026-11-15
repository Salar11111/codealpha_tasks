import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Heart, LogOut, Package, Settings, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useAuthDialog } from '../context/AuthDialogContext';

const itemClass =
  'flex cursor-pointer select-none items-center gap-2.5 px-3 py-2.5 text-[13px] text-ink outline-none transition-colors data-[highlighted]:bg-paper';

export default function AccountMenu() {
  const { user, logout } = useAuth();
  const { openAuth } = useAuthDialog();

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openAuth('login')}
        className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:text-brand"
        aria-label="Sign in"
      >
        <User className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </button>
    );
  }

  async function signOut() {
    await logout();
    toast.success('Signed out.');
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:text-brand"
          aria-label="Account menu"
        >
          <User className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-[70] min-w-[224px] border border-line bg-surface p-1.5 shadow-soft"
        >
          <div className="px-3 pb-2.5 pt-1.5">
            <p className="truncate text-[13px] font-medium">{user.name}</p>
            <p className="truncate text-[11px] text-muted">{user.email}</p>
          </div>
          <DropdownMenu.Separator className="mb-1.5 h-px bg-line" />
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/orders">
              <Package className="h-3.5 w-3.5 text-muted" />
              Orders
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/wishlist">
              <Heart className="h-3.5 w-3.5 text-muted" />
              Wishlist
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/account">
              <Settings className="h-3.5 w-3.5 text-muted" />
              Account details
            </Link>
          </DropdownMenu.Item>
          {user.role === 'admin' && (
            <DropdownMenu.Item asChild className={itemClass}>
              <Link to="/admin">
                <Settings className="h-3.5 w-3.5 text-muted" />
                Admin studio
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="my-1.5 h-px bg-line" />
          <DropdownMenu.Item className={itemClass} onSelect={signOut}>
            <LogOut className="h-3.5 w-3.5 text-muted" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
