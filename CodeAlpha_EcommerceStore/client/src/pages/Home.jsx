import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Hammer,
  Leaf,
  Plus,
  RotateCcw,
  Star,
  Truck,
} from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import SectionHeading from '../components/SectionHeading';
import { buttonVariants } from '../components/ui/button';

const CATEGORY_TILES = [
  { label: 'Sneakers', category: 'Sneakers', image: '/products/sneakers-1.jpg', note: 'Court, canvas, trail' },
  { label: 'Boots', category: 'Boots', image: '/products/boots-1.jpg', note: 'Goodyear-welted' },
  { label: 'Denim', category: 'Jeans', image: '/products/jeans-1.jpg', note: 'Japanese selvedge' },
  { label: 'Outerwear', category: 'Jackets', image: '/products/jackets-1.jpg', note: 'Waxed cotton' },
];

const VALUES = [
  { icon: Truck, title: 'Complimentary shipping', copy: 'On orders over $75, always.' },
  { icon: RotateCcw, title: '30-day returns', copy: 'Unworn, in the original box.' },
  { icon: Hammer, title: 'Resoled for life', copy: 'Send them back; we rebuild them.' },
  { icon: Leaf, title: 'Small-batch materials', copy: 'Traceable leather, linen, cotton.' },
];

const REVIEWS = [
  {
    quote:
      'Third season in the Chelsea boots and the leather has only gotten better. They have been resoled once and came back better than new.',
    name: 'Mara T.',
    detail: 'Ridgeline Chelsea Boot',
  },
  {
    quote:
      'The loopback hoodie is the only thing I reach for after work. Properly heavy, and it has kept its shape through a winter of washing.',
    name: 'Ines K.',
    detail: 'Loopback Hoodie',
  },
  {
    quote:
      'Ordered the selvedge jean on a whim. Stiff for two weeks, then it became the pair I measure every other pair against.',
    name: 'Theo B.',
    detail: 'Selvedge Straight Jean',
  },
];

const FAQS = [
  {
    q: 'When will my order ship?',
    a: 'Orders placed before 2pm Pacific ship the same business day. Everything else goes out the next morning. You will receive a tracking note as soon as the label is printed.',
  },
  {
    q: 'How do the sizes run?',
    a: 'Shoes run true to EU size. Clothing is cut straight through the body — if you are between sizes and prefer a closer fit, take the smaller one. Every product page lists the exact measurements of the fit model.',
  },
  {
    q: 'What is the returns policy?',
    a: 'Thirty days from delivery, unworn and in the original packaging. Start a return from your order page and we will email a prepaid label. Refunds land within five business days of arrival.',
  },
  {
    q: 'Can you repair or resole shoes?',
    a: 'Yes. Welted boots and stitched sneakers can be sent back to the workshop for a new sole, new laces and a full clean. Repairs start at $65 and take two to three weeks.',
  },
  {
    q: 'Do you ship internationally?',
    a: 'We ship to the United States, Canada, the United Kingdom and the EU. Duties are calculated at checkout so there is nothing to pay on delivery.',
  },
];

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] bg-paper-deep" />
      <div className="mt-4 h-3 w-1/3 bg-paper-deep" />
      <div className="mt-2 h-4 w-2/3 bg-paper-deep" />
    </div>
  );
}

export default function Home() {
  const featured = useQuery({
    queryKey: ['home', 'featured'],
    queryFn: () => api('/products?sort=featured&limit=8'),
  });
  const newest = useQuery({
    queryKey: ['home', 'newest'],
    queryFn: () => api('/products?sort=newest&limit=4'),
  });

  const featuredProducts = (featured.data?.products || []).slice(0, 4);
  const newProducts = newest.data?.products || [];
  const counts = new Map(
    (featured.data?.facets?.categoryCounts || []).map((entry) => [entry.name, entry.count])
  );

  return (
    <>
      <section className="overflow-hidden border-b border-line">
        <div className="container-page grid items-stretch gap-10 py-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-16">
          <div className="flex flex-col justify-center lg:py-8">
            <p className="eyebrow flex items-center gap-3">
              <span className="h-px w-8 bg-brand" />
              Autumn / Winter 2026
            </p>
            <h1 className="mt-6 text-[clamp(3.4rem,8.4vw,6.8rem)] font-normal leading-[0.9] tracking-[-0.035em]">
              Made to
              <br />
              <span className="italic text-brand">be kept.</span>
            </h1>
            <p className="mt-7 max-w-lg text-[15px] leading-relaxed text-muted sm:text-base">
              Shoes and clothing in small batches from leather, linen and cotton. Not designed for
              the season — designed to be worn, resoled and handed on.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/shop" className={buttonVariants({ size: 'lg' })}>
                Shop the collection
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/#story"
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                Our story
              </Link>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.18em] text-muted">Pieces</dt>
                <dd className="mt-1.5 font-serif text-2xl">
                  {featured.data?.total ? `${featured.data.total}` : '20'}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.18em] text-muted">Workshops</dt>
                <dd className="mt-1.5 font-serif text-2xl">02</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.18em] text-muted">Repairs</dt>
                <dd className="mt-1.5 font-serif text-2xl">Lifetime</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="min-h-[420px] overflow-hidden bg-paper-deep sm:min-h-[520px] lg:h-full lg:min-h-[620px]">
              <img
                src="/products/hero-1.jpg"
                alt="Atelier & Oak autumn collection"
                className="h-full w-full object-cover"
              />
            </div>
            <Link
              to="/products/ridgeline-chelsea-boot"
              className="group absolute bottom-4 left-4 right-4 border border-line/80 bg-surface/95 p-4 backdrop-blur transition-colors hover:border-ink sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-[310px]"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-brand">The signature</p>
              <p className="mt-1.5 font-serif text-xl leading-tight">Ridgeline Chelsea Boot</p>
              <p className="mt-1 text-xs text-muted">Goodyear-welted · from $248</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em]">
                View the boot
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface">
        <div className="container-page grid grid-cols-2 gap-x-6 gap-y-7 py-8 lg:grid-cols-4">
          {VALUES.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand" strokeWidth={1.4} />
              <div>
                <p className="text-[12.5px] font-medium">{title}</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-16 sm:py-20">
        <SectionHeading
          eyebrow="The collection"
          title="The pieces we make most."
          to="/shop"
          label="Shop all pieces"
        />
        <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-7">
          {featured.isLoading
            ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
            : featuredProducts.map((product) => <ProductCard key={product._id} product={product} />)}
        </div>
      </section>

      <section className="border-y border-line bg-paper-deep/60">
        <div className="container-page py-16 sm:py-20">
          <SectionHeading eyebrow="Four ways in" title="Start with a category." to="/shop" />
          <div className="mt-9 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {CATEGORY_TILES.map((tile) => (
              <Link
                key={tile.label}
                to={`/shop?category=${encodeURIComponent(tile.category)}`}
                className="group relative block aspect-[3/4] overflow-hidden bg-paper-deep"
              >
                <img
                  src={tile.image}
                  alt={tile.label}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-ink/5 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-paper sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-paper/65">{tile.note}</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <h3 className="text-2xl leading-none">{tile.label}</h3>
                    <span className="text-[11px] text-paper/70">
                      {counts.get(tile.category) ?? ''}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="story" className="scroll-mt-24 border-b border-line bg-surface">
        <div className="grid lg:grid-cols-2">
          <div className="relative min-h-[380px] overflow-hidden bg-paper-deep lg:min-h-[660px]">
            <img
              src="/products/hero-2.jpg"
              alt="Leather being finished in the workshop"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute bottom-6 left-6 max-w-[250px] border border-line/70 bg-surface/92 p-4 backdrop-blur">
              <p className="font-serif text-[15px] leading-snug">
                “A sole can be replaced. A shape, if you get it right, cannot.”
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted">
                Elias Ward · Pattern cutter
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-center px-5 py-14 sm:px-10 lg:px-16 lg:py-20">
            <p className="eyebrow">Our story</p>
            <h2 className="mt-3 max-w-md text-[2.1rem] leading-[1.05] sm:text-[2.7rem]">
              A shoe should outlive its first owner.
            </h2>
            <div className="mt-5 max-w-lg space-y-4 text-sm leading-relaxed text-muted">
              <p>
                We started in a two-bench workshop in Portland with one pattern: a plain Chelsea
                boot on a Goodyear-welted last. No seasonal colourways, no logo on the side.
              </p>
              <p>
                Twelve years later the shapes have barely changed. We still cut leather by hand,
                still build the boots so the sole can come off, and still keep the lasts on the
                shelf in case someone sends a pair back for a second life.
              </p>
            </div>
            <Link
              to="/shop?department=Shoes"
              className="group mt-7 inline-flex w-fit items-center gap-2 border-b border-ink/25 pb-1 text-[12px] font-medium uppercase tracking-[0.16em] transition-colors hover:border-brand hover:text-brand"
            >
              Explore the workshop
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-5 border-t border-line pt-6">
              <div>
                <dt className="font-serif text-2xl">2014</dt>
                <dd className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted">Founded</dd>
              </div>
              <div>
                <dt className="font-serif text-2xl">2</dt>
                <dd className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted">Workshops</dd>
              </div>
              <div>
                <dt className="font-serif text-2xl">1,400+</dt>
                <dd className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted">Pairs repaired</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section id="materials" className="scroll-mt-24 bg-ink text-paper">
        <div className="container-page py-16 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.4fr] lg:gap-16">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-paper/45">
                Materials
              </p>
              <h2 className="mt-3 max-w-sm text-[2.1rem] leading-[1.05] sm:text-[2.6rem]">
                Fewer materials, chosen properly.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/60">
                If a material cannot be repaired, it does not go into a pair. These three account
                for almost everything we make.
              </p>
            </div>
            <div className="grid gap-px bg-paper/15 sm:grid-cols-3">
              {[
                {
                  index: '01',
                  title: 'Vegetable-tanned leather',
                  copy: 'From a tannery in Tuscany. Slow-tanned with tree bark, so it darkens rather than cracks.',
                },
                {
                  index: '02',
                  title: 'Japanese selvedge',
                  copy: '13.5oz denim woven on shuttle looms in Okayama. Rigid at first, personal afterwards.',
                },
                {
                  index: '03',
                  title: 'European linen',
                  copy: 'Washed flax from Belgium and France. Heavy enough to hold a shape, cool enough for August.',
                },
              ].map((material) => (
                <div key={material.index} className="bg-ink p-6 sm:p-7">
                  <p className="text-[10px] tracking-[0.2em] text-clay">{material.index}</p>
                  <h3 className="mt-4 text-xl leading-tight text-paper">{material.title}</h3>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-paper/55">{material.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-16 sm:py-20">
        <SectionHeading
          eyebrow="Just arrived"
          title="New in the workshop."
          to="/shop?sort=newest"
          label="See what is new"
        />
        <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-7">
          {newest.isLoading
            ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
            : newProducts.map((product) => <ProductCard key={product._id} product={product} />)}
        </div>
      </section>

      <section id="journal" className="scroll-mt-24 border-y border-line bg-paper-deep/60">
        <div className="container-page py-16 sm:py-20">
          <SectionHeading eyebrow="Journal" title="Field notes." to="/shop" label="Shop the story" />
          <div className="mt-9 grid gap-6 md:grid-cols-2">
            {[
              {
                image: '/products/jackets-2.jpg',
                kicker: 'Care',
                title: 'How to rewax a cotton jacket in an afternoon.',
                copy: 'A tin of wax, a hairdryer and forty minutes. The jacket does the rest.',
                to: '/products/chore-coat',
              },
              {
                image: '/products/boots-3.jpg',
                kicker: 'Repair',
                title: 'What comes back from the cobbler, and what does not.',
                copy: 'A welted sole can be replaced three or four times. A glued one, usually once.',
                to: '/products/workshop-lace-boot',
              },
            ].map((entry) => (
              <Link key={entry.title} to={entry.to} className="group block">
                <div className="aspect-[16/10] overflow-hidden bg-paper-deep">
                  <img
                    src={entry.image}
                    alt={entry.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.04]"
                  />
                </div>
                <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-brand">{entry.kicker}</p>
                <h3 className="mt-1.5 max-w-lg font-serif text-[1.55rem] leading-snug transition-colors group-hover:text-brand">
                  {entry.title}
                </h3>
                <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">{entry.copy}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em]">
                  Read the note
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface">
        <div className="container-page py-16 sm:py-20">
          <div className="text-center">
            <p className="eyebrow">In their words</p>
            <h2 className="mt-3 text-[2rem] leading-[1.06] sm:text-[2.6rem]">
              Worn, washed, resoled.
            </h2>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden border border-line bg-line md:grid-cols-3">
            {REVIEWS.map((review) => (
              <figure key={review.name} className="flex flex-col bg-surface p-6 sm:p-8">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-3.5 w-3.5 fill-ink text-ink" />
                  ))}
                </div>
                <blockquote className="mt-5 flex-1 font-serif text-[1.15rem] leading-[1.5]">
                  “{review.quote}”
                </blockquote>
                <figcaption className="mt-6 border-t border-line pt-4">
                  <p className="text-[12.5px] font-medium">{review.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{review.detail}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24">
        <div className="container-page grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <div>
            <p className="eyebrow">Questions</p>
            <h2 className="mt-3 text-[2rem] leading-[1.06] sm:text-[2.6rem]">
              Good to know.
            </h2>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Anything else, write to us at{' '}
              <a
                href="mailto:hello@atelierandoak.example"
                className="link-quiet"
              >
                hello@atelierandoak.example
              </a>
              .
            </p>
          </div>
          <div className="border-t border-line">
            {FAQS.map((faq, index) => (
              <details key={faq.q} className="group border-b border-line" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[15px] font-medium marker:hidden">
                  {faq.q}
                  <Plus className="h-4 w-4 shrink-0 text-muted transition-transform duration-300 group-open:rotate-45" />
                </summary>
                <p className="max-w-2xl pb-5 pr-8 text-[13.5px] leading-relaxed text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="stockists" className="scroll-mt-24 border-t border-line bg-paper-deep/60">
        <div className="container-page grid gap-8 py-12 sm:grid-cols-3">
          <div>
            <p className="eyebrow">Visiting</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
              The workshop shop is open Thursday to Sunday, by appointment.
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Portland</p>
            <p className="mt-2 text-sm leading-relaxed">
              214 SE Ash Street
              <br />
              Portland, OR 97214
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted">New York</p>
            <p className="mt-2 text-sm leading-relaxed">
              58 Crosby Street
              <br />
              New York, NY 10012
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
