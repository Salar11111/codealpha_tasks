import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { money } from '../utils';

const REVIEWS = [
  {
    product: 'Stoneware Mug',
    from: 'Kitchen buyer',
    stars: 5,
    text: 'Wide lip, easy to stack, and it stays on the table instead of in a cupboard.',
  },
  {
    product: 'Linen Apron',
    from: 'Kitchen buyer',
    stars: 5,
    text: 'The crossed back stays put, and the front pocket actually fits a towel.',
  },
  {
    product: 'Brass Desk Lamp',
    from: 'Home buyer',
    stars: 4,
    text: 'Warm light, a base that does not tip, and the cord is covered instead of plastic.',
  },
  {
    product: 'Wool Throw',
    from: 'Home buyer',
    stars: 5,
    text: 'Large enough for the sofa and light enough to fold over a chair.',
  },
  {
    product: 'Notebook Trio',
    from: 'Stationery buyer',
    stars: 5,
    text: 'Blank, lined, and dotted in one set. The paper is cream and does not bleed.',
  },
  {
    product: 'Fountain Pen',
    from: 'Stationery buyer',
    stars: 4,
    text: 'A medium nib that writes smoothly, and it comes with a cartridge so you can start.',
  },
];

const FAQS = [
  {
    q: 'Is a card charged?',
    a: 'No. Checkout records the order and reduces stock. No payment is taken.',
  },
  {
    q: 'How do I keep a cart?',
    a: 'Log in or create an account. The cart is saved to that account and opens from the cart button.',
  },
  {
    q: 'Can I change a quantity?',
    a: 'Yes. Use the stepper in the cart drawer or on the cart page, up to the number still in stock.',
  },
  {
    q: 'Where do I see an order?',
    a: 'After you place it, Orders lists the total, the address, and a pending status.',
  },
  {
    q: 'How do I narrow the shop?',
    a: 'Search from the header, or choose Kitchen, Home, or Stationery. The grid updates as you type.',
  },
];

export default function Home() {
  const { user } = useAuth();
  const { addItem, openDrawer } = useCart();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const query = params.get('q') || '';
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [slides, setSlides] = useState([]);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState('');

  useEffect(() => {
    api('/products')
      .then((data) => {
        setSlides(data.products);
        setCategories(data.categories);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (slides.length < 2 || paused) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = setInterval(() => {
      setSlide((current) => (current + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length, paused]);

  useEffect(() => {
    const search = new URLSearchParams();
    if (category) search.set('category', category);
    if (query) search.set('q', query);
    const timer = setTimeout(() => {
      api(`/products?${search.toString()}`)
        .then((data) => {
          setProducts(data.products);
          setCategories(data.categories);
          setError('');
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 180);
    return () => clearTimeout(timer);
  }, [category, query]);

  function setCategory(name) {
    const next = new URLSearchParams(params);
    if (name) next.set('category', name);
    else next.delete('category');
    setParams(next, { replace: true });
  }

  async function quickAdd(event, product) {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    setAddingId(product._id);
    setError('');
    try {
      await addItem(product._id, 1);
      openDrawer();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingId('');
    }
  }

  return (
    <section>
      <div className="hero reveal">
        <div className="hero-copy">
          <p className="eyebrow">Household goods</p>
          <h1>Objects for the table, the desk, and the room.</h1>
          <p>Kitchen, home, and stationery with live stock. Your cart stays with your account.</p>
          <a className="btn" href="#shop">
            Shop the collection
          </a>
        </div>
        {slides.length > 0 && (
          <div
            className="hero-slideshow"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
            }}
          >
            {slides.map((product, index) => (
              <Link
                key={product._id}
                to={`/products/${product._id}`}
                className={index === slide ? 'hero-slide on' : 'hero-slide'}
                aria-hidden={index !== slide}
                tabIndex={index === slide ? 0 : -1}
              >
                <img src={product.image} alt={product.name} />
                <span>
                  {product.name}
                  <strong>{money(product.price)}</strong>
                </span>
              </Link>
            ))}
            {slides.length > 1 && (
              <>
                <div className="hero-controls">
                  <button
                    type="button"
                    aria-label="Previous product"
                    onClick={() => setSlide((current) => (current - 1 + slides.length) % slides.length)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Next product"
                    onClick={() => setSlide((current) => (current + 1) % slides.length)}
                  >
                    ›
                  </button>
                </div>
                <div className="hero-dots">
                  {slides.map((product, index) => (
                    <button
                      key={product._id}
                      type="button"
                      className={index === slide ? 'on' : ''}
                      aria-label={`Show ${product.name}`}
                      aria-current={index === slide ? 'true' : undefined}
                      onClick={() => setSlide(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <ul className="trust">
        <li>Live stock counts</li>
        <li>Cart saved to your account</li>
        <li>Orders recorded, no card charged</li>
      </ul>

      <div className="toolbar" id="shop">
        <h2 className="section-label">{category || query ? 'Results' : 'All goods'}</h2>
        <div className="chips">
          <button type="button" className={!category ? 'chip on' : 'chip'} onClick={() => setCategory('')}>
            All
          </button>
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              className={category === item ? 'chip on' : 'chip'}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error state-panel">{error}</p>}
      {loading && (
        <div className="grid" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="skeleton" key={index} />
          ))}
        </div>
      )}
      {!loading && !error && products.length === 0 && (
        <div className="empty-panel">
          <h2>Nothing matches that search.</h2>
          <p>Try another word, or clear the category.</p>
        </div>
      )}
      {!loading && (
        <div className="grid">
          {products.map((product, index) => (
            <Link
              to={`/products/${product._id}`}
              className="card"
              key={product._id}
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <div className="card-media">
                <img src={product.image} alt="" />
                <button
                  type="button"
                  className="quick-add"
                  disabled={product.stock < 1 || addingId === product._id}
                  onClick={(event) => quickAdd(event, product)}
                >
                  {product.stock < 1 ? 'Sold out' : addingId === product._id ? 'Adding…' : 'Add'}
                </button>
              </div>
              <div className="card-body">
                <p className="eyebrow">{product.category}</p>
                <h2>{product.name}</h2>
                <div className="card-meta">
                  <strong>{money(product.price)}</strong>
                  <span>{product.stock > 0 && product.stock <= 5 ? `Only ${product.stock} left` : product.stock > 0 ? `${product.stock} in stock` : 'Sold out'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <section className="band" aria-labelledby="reviews-title">
        <p className="eyebrow">Notes from the shop</p>
        <h2 id="reviews-title">What people keep coming back for.</h2>
        <div className="review-grid">
          {REVIEWS.map((review) => (
            <article className="review-card" key={review.product}>
              <p className="stars" aria-label={`${review.stars} out of 5`}>
                {'★'.repeat(review.stars)}
                {'☆'.repeat(5 - review.stars)}
              </p>
              <p>{review.text}</p>
              <footer>
                <strong>{review.product}</strong>
                <span>{review.from}</span>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="band" aria-labelledby="faq-title">
        <p className="eyebrow">Questions</p>
        <h2 id="faq-title">Before you order.</h2>
        <div className="faq">
          {FAQS.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </section>
  );
}
