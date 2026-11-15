import { Link } from 'react-router-dom';
import { buttonVariants } from '../components/ui/button';

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-serif text-[clamp(3rem,9vw,6rem)] leading-none">Off the shelf.</h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
        The page you were looking for is not here. It may have been retired from the collection.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className={buttonVariants({ size: 'lg' })}>
          Back home
        </Link>
        <Link to="/shop" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          Browse the collection
        </Link>
      </div>
    </div>
  );
}
