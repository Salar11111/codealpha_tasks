import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export default function SectionHeading({ eyebrow, title, to, label = 'View all', className = '' }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-8 gap-y-4 ${className}`}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-2.5 text-[2rem] leading-[1.06] sm:text-[2.6rem]">{title}</h2>
      </div>
      {to && (
        <Link
          to={to}
          className="group inline-flex items-center gap-2 border-b border-ink/20 pb-1 text-[12px] font-medium uppercase tracking-[0.16em] transition-colors hover:border-brand hover:text-brand"
        >
          {label}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
