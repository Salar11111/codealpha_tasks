import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog';
import AuthPanel from './AuthPanel';

export default function AuthDialog({ open, mode, onModeChange, onOpenChange, onSuccess }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogTitle className="sr-only">
          {mode === 'login' ? 'Sign in to Atelier & Oak' : 'Create an Atelier & Oak account'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Use your email and password, or one of the demo accounts.
        </DialogDescription>
        <div className="p-6 sm:p-8">
          <AuthPanel
            mode={mode}
            compact
            onModeChange={onModeChange}
            onSuccess={onSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
