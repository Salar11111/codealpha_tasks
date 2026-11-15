import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { api, toQuery } from '../api/client';
import ProductCard from '../components/ProductCard';
import Select from '../components/ui/select';
import Button from '../components/ui/button';
import { colorHex, money } from '../lib/utils';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

const PRICE_BANDS = [
  { label: 'Under $75', min: '', max: '7500' },
  { label: '$75 – $150', min: '7500', max: '15000' },
  { label: '$150 – $250', min: '15000', max: '25000' },
  { label: '$250 and up', min: '25000', max: '' },
];

function FilterSection({ title, children }) {
  return (
    <div className="border-b border-line py-5 first:pt-0 last:border-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">{title}</p>
      <div className="mt-3.5">{children}</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] bg-paper-deep" />
      <div className="mt-4 h-3 w-1/3 bg-paper-deep" />
      <div className="mt-2 h-4 w-2/3 bg-paper-deep" />
    </div>
  );
}

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const query = Object.fromEntries(params.entries());
  const page = Math.max(1, Number(params.get('page')) || 1);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['shop', params.toString()],
    queryFn: () =>
      api(`/products${toQuery({ ...query, page, limit: 24 })}`),
    placeholderData: keepPreviousData,
  });

  const filters = data?.facets || { departments: [], categories: [], sizes: [], colors: [] };
  const products = data?.products || [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;
  const counts = useMemo(
    () => new Map(filters.categoryCounts?.map((entry) => [entry.name, entry.count]) || []),
    [filters.categoryCounts]
  );

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (value === '' || value === undefined || value === null) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  function toggleParam(key, value) {
    if (params.get(key) === value) setParam(key, value === params.get(key) ? '' : value);
    else setParam(key, value);
  }

  function clearAll() {
    setParams(new URLSearchParams(), { replace: true });
  }

  const activeFilters = [
    query.q && { key: 'q', label: `“${query.q}”` },
    query.department && { key: 'department', label: query.department },
    query.category && { key: 'category', label: query.category },
    query.size && { key: 'size', label: `Size ${query.size}` },
    query.color && { key: 'color', label: query.color },
    (query.minPrice || query.maxPrice) && {
      key: 'price',
      label: `${query.minPrice ? money(query.minPrice) : '$0'} – ${
        query.maxPrice ? money(query.maxPrice) : 'any'
      }`,
    },
  ].filter(Boolean);

  const heading = query.category || query.department || 'All pieces';
  const filterPanel = (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em]">Filters</p>
        {activeFilters.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] text-muted underline decoration-line underline-offset-4 hover:text-brand"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="mt-4">
        <FilterSection title="Department">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setParam('department', '')}
              className={`block text-left text-[13px] transition-colors ${
                !query.department ? 'text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              All departments
            </button>
            {['Shoes', 'Clothing'].map((department) => (
              <button
                key={department}
                type="button"
                onClick={() => setParam('department', query.department === department ? '' : department)}
                className={`flex w-full items-center justify-between text-left text-[13px] transition-colors ${
                  query.department === department ? 'text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {department}
                {query.department === department && <span className="h-1 w-1 bg-brand" />}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Category">
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setParam('category', '')}
              className={`flex w-full items-center justify-between text-left text-[13px] ${
                !query.category ? 'text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              <span>All categories</span>
            </button>
            {filters.categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setParam('category', query.category === category ? '' : category)}
                className={`flex w-full items-center justify-between gap-2 text-left text-[13px] transition-colors ${
                  query.category === category ? 'text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                <span>{category}</span>
                <span className="text-[11px] text-muted/70">{counts.get(category) || 0}</span>
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Size">
          <div className="flex flex-wrap gap-1.5">
            {filters.sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setParam('size', query.size === size ? '' : size)}
                className={`h-8 min-w-8 border px-2 text-[11.5px] transition-colors ${
                  query.size === size
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line bg-surface text-ink hover:border-ink'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Colour">
          <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
            {filters.colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setParam('color', query.color === color ? '' : color)}
                className={`flex items-center gap-2 text-left text-[12px] transition-colors ${
                  query.color === color ? 'text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                <span
                  className={`h-3.5 w-3.5 shrink-0 rounded-full border ${
                    query.color === color ? 'ring-1 ring-ink ring-offset-2 ring-offset-paper' : 'border-ink/20'
                  }`}
                  style={{ backgroundColor: colorHex(color) }}
                />
                {color}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Price">
          <div className="space-y-2">
            {PRICE_BANDS.map((band) => {
              const active =
                (params.get('minPrice') || '') === band.min &&
                (params.get('maxPrice') || '') === band.max;
              return (
                <button
                  key={band.label}
                  type="button"
                  onClick={() => {
                    if (active) {
                      const next = new URLSearchParams(params);
                      next.delete('minPrice');
                      next.delete('maxPrice');
                      setParams(next, { replace: true });
                    } else {
                      const next = new URLSearchParams(params);
                      if (band.min) next.set('minPrice', band.min);
                      else next.delete('minPrice');
                      if (band.max) next.set('maxPrice', band.max);
                      else next.delete('maxPrice');
                      next.delete('page');
                      setParams(next, { replace: true });
                    }
                  }}
                  className={`block text-left text-[13px] transition-colors ${
                    active ? 'text-ink' : 'text-muted hover:text-ink'
                  }`}
                >
                  {band.label}
                </button>
              );
            })}
          </div>
        </FilterSection>
      </div>
    </div>
  );

  return (
    <div>
      <section className="border-b border-line bg-paper">
        <div className="container-page py-10 sm:py-14">
          <nav className="flex items-center gap-2 text-[11px] text-muted" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-ink">
              Home
            </Link>
            <span>/</span>
            <span className="text-ink">Shop</span>
            {query.category && (
              <>
                <span>/</span>
                <span className="text-ink">{query.category}</span>
              </>
            )}
          </nav>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{query.q ? 'Search' : 'The collection'}</p>
              <h1 className="mt-2 text-[2.4rem] leading-[1.02] sm:text-[3.4rem]">
                {query.q ? `“${query.q}”` : heading}
              </h1>
              <p className="mt-3 text-sm text-muted">
                {isLoading ? 'Gathering pieces…' : `${total} ${total === 1 ? 'piece' : 'pieces'}`}
                {query.department ? ` · ${query.department}` : ''}
              </p>
            </div>
            <p className="max-w-sm text-[13px] leading-relaxed text-muted">
              Every piece is made in small batches. Stock shown is the stock on the shelf today.
            </p>
          </div>
        </div>
      </section>

      <div className="container-page py-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-12">
          <aside className="hidden lg:block">
            <div className="sticky top-[118px]">{filterPanel}</div>
          </aside>

          <div className="min-w-0">
            <details className="mb-5 border border-line bg-surface lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[12px] font-medium uppercase tracking-[0.16em]">
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters {activeFilters.length > 0 ? `(${activeFilters.length})` : ''}
                </span>
                <span className="text-[11px] text-muted">Open</span>
              </summary>
              <div className="border-t border-line px-4 py-4">{filterPanel}</div>
            </details>

            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
              <div className="flex flex-wrap items-center gap-2">
                {activeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => {
                      if (filter.key === 'price') {
                        const next = new URLSearchParams(params);
                        next.delete('minPrice');
                        next.delete('maxPrice');
                        setParams(next, { replace: true });
                      } else {
                        setParam(filter.key, '');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink-soft transition-colors hover:border-ink"
                  >
                    {filter.label}
                    <X className="h-3 w-3 text-muted" />
                  </button>
                ))}
                {activeFilters.length === 0 && (
                  <p className="text-[12px] text-muted">Showing everything in the collection.</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden text-[11px] uppercase tracking-[0.16em] text-muted sm:inline">
                  Sort
                </span>
                <Select
                  value={query.sort || 'featured'}
                  onChange={(event) => setParam('sort', event.target.value)}
                  className="h-9 w-48 text-[12px]"
                  aria-label="Sort products"
                >
                  {SORTS.map((sort) => (
                    <option key={sort.value} value={sort.value}>
                      {sort.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {error && (
              <p className="mt-8 border border-brand/25 bg-brand/5 px-4 py-3 text-sm text-brand" role="alert">
                {error.message}
              </p>
            )}

            {isLoading ? (
              <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="mt-10 border border-line bg-surface px-6 py-16 text-center">
                <p className="eyebrow">Nothing found</p>
                <h2 className="mt-3 text-3xl">No pieces match those filters.</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                  Try removing a filter or widening the price range.
                </p>
                <Button className="mt-6" onClick={clearAll}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <>
                <div
                  className={`mt-8 grid grid-cols-2 gap-x-4 gap-y-10 transition-opacity sm:gap-x-6 lg:grid-cols-3 lg:gap-x-7 ${
                    isFetching ? 'opacity-60' : 'opacity-100'
                  }`}
                >
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {pages > 1 && (
                  <div className="mt-14 flex items-center justify-between border-t border-line pt-6">
                    <button
                      type="button"
                      onClick={() => setParam('page', String(Math.max(1, page - 1)))}
                      disabled={page <= 1}
                      className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink disabled:opacity-35"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: pages }).map((_, index) => {
                        const number = index + 1;
                        if (pages > 7 && Math.abs(number - page) > 1 && number !== 1 && number !== pages) {
                          return number === 2 || number === pages - 1 ? (
                            <span key={number} className="px-1 text-xs text-muted">
                              …
                            </span>
                          ) : null;
                        }
                        return (
                          <button
                            key={number}
                            type="button"
                            onClick={() => setParam('page', String(number))}
                            className={`flex h-8 min-w-8 items-center justify-center border px-2 text-[12px] transition-colors ${
                              number === page
                                ? 'border-ink bg-ink text-paper'
                                : 'border-transparent text-muted hover:border-line hover:text-ink'
                            }`}
                            aria-current={number === page ? 'page' : undefined}
                          >
                            {number}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setParam('page', String(Math.min(pages, page + 1)))}
                      disabled={page >= pages}
                      className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink disabled:opacity-35"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
