import { Link } from 'react-router-dom';
import Logo from './Logo';
import NewsletterForm from './NewsletterForm';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'All pieces', to: '/shop' },
      { label: 'Shoes', to: '/shop?department=Shoes' },
      { label: 'Clothing', to: '/shop?department=Clothing' },
      { label: 'Boots', to: '/shop?category=Boots' },
      { label: 'Sneakers', to: '/shop?category=Sneakers' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Shipping & returns', to: '/#faq' },
      { label: 'Sizing', to: '/#faq' },
      { label: 'Care & repair', to: '/#story' },
      { label: 'Contact', to: 'mailto:hello@atelierandoak.example' },
    ],
  },
  {
    title: 'Atelier',
    links: [
      { label: 'Our story', to: '/#story' },
      { label: 'Materials', to: '/#materials' },
      { label: 'Journal', to: '/#journal' },
      { label: 'Stockists', to: '/#stockists' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-auto">
      <section className="border-t border-line bg-paper-deep">
        <div className="container-page grid gap-8 py-12 md:grid-cols-[1fr_auto] md:items-center md:py-14">
          <div>
            <p className="eyebrow">The letter</p>
            <h2 className="mt-2 max-w-md text-3xl leading-[1.1] sm:text-[2.15rem]">
              Notes from the workshop, once a month.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
              New pieces, restocks, and the occasional essay on why a thing should last longer
              than the season.
            </p>
          </div>
          <div className="md:justify-self-end">
            <NewsletterForm source="footer" />
            <p className="mt-3 text-[11px] text-muted">No noise. Unsubscribe whenever.</p>
          </div>
        </div>
      </section>

      <div className="bg-ink text-paper">
        <div className="container-page">
          <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Logo
                className="text-paper [&>span:last-child>span]:text-clay [&>span:first-child]:bg-paper [&>span:first-child]:text-ink"
              />
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-paper/60">
                Shoes and clothing made in small batches from leather, linen and cotton. Built to
                be kept, resoled, and handed on.
              </p>
              <p className="mt-6 text-[10px] uppercase tracking-[0.22em] text-paper/40">
                Est. 2014 · Portland, Oregon
              </p>
            </div>

            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-paper/40">
                  {column.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.to.startsWith('mailto:') ? (
                        <a
                          href={link.to}
                          className="text-[13px] text-paper/75 transition-colors hover:text-paper"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.to}
                          className="text-[13px] text-paper/75 transition-colors hover:text-paper"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-paper/15 py-6 text-[11px] text-paper/45 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Atelier &amp; Oak. A CodeAlpha full-stack demo — no payment is taken.</p>
            <p className="uppercase tracking-[0.18em]">Visa · Mastercard · Amex · Apple Pay</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
