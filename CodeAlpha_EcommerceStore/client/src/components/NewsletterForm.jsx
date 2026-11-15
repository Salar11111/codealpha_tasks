import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api/client';

export default function NewsletterForm({ compact = false, source = 'footer' }) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      await api('/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email, source }),
      });
      setDone(true);
      setEmail('');
      toast.success('You are on the list.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink">
        <Check className="h-4 w-4 text-brand" />
        Thank you — look out for the next letter.
      </p>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`flex w-full items-center border-b border-ink/30 ${compact ? 'max-w-sm' : 'max-w-md'}`}
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Your email address"
        className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted"
      />
      <button
        type="submit"
        disabled={busy}
        className="flex h-12 shrink-0 items-center gap-2 px-2 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:text-brand disabled:opacity-50"
      >
        {busy ? 'Joining' : 'Join'}
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
