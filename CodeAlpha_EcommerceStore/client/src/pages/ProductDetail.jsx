import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import QtyStepper from '../components/QtyStepper';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { bindImgFade, getStockDetails, getStockStatusLabel, money, onImgLoad } from '../utils';

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addItem, openDrawer } = useCart();
  const navigate = useNavigate();
  const buyRef = useRef(null);
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: '5', text: '' });
  const [reviewNote, setReviewNote] = useState('');
  const [notifyEmail, setNotifyEmail] = useState('');

  useEffect(() => {
    setProduct(null);
    setRelated([]);
    setQty(1);
    setError('');
    setShowBar(false);
    api(`/products/${id}`)
      .then((data) => setProduct(data.product))
      .catch((err) => setError(err.message));
    api(`/reviews/product/${id}`)
      .then((data) => setReviews(data.reviews))
      .catch(() => setReviews([]));
  }, [id]);

  useEffect(() => {
    if (!product) return undefined;
    api(`/products?category=${encodeURIComponent(product.category)}`)
      .then((data) => setRelated(data.products.filter((item) => item._id !== product._id).slice(0, 4)))
      .catch(() => setRelated([]));
  }, [product]);

  useEffect(() => {
    const node = buyRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setShowBar(!entry.isIntersecting),
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [product]);

  useEffect(() => {
    document.body.classList.toggle('has-buy-bar', showBar);
    return () => document.body.classList.remove('has-buy-bar');
  }, [showBar]);

  async function toggleSaved() {
    try {
      const data = await api(`/wishlist/${product._id}`, { method: 'POST' });
      setSaved(data.saved);
    } catch (err) {
      setError(err.message);
    }
  }

  async function notifyRestock(productId) {
    try {
      const data = await api(`/restock-notifications`, {
        method: 'POST',
        body: JSON.stringify({ productId, email: notifyEmail }),
      });
      setNotifyEmail('');
      alert(data.message || `Thank you! You'll be notified when ${product.name} is back in stock.`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitReview(event) {
    event.preventDefault();
    setReviewNote('');
    try {
      const data = await api(`/reviews/product/${product._id}`, {
        method: 'POST',
        body: JSON.stringify({ rating: Number(reviewForm.rating), text: reviewForm.text }),
      });
      setReviews((current) => [data.review, ...current]);
      setReviewForm({ rating: '5', text: '' });
    } catch (err) {
      setReviewNote(err.message);
    }
  }

  async function onAdd(event) {
    event.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await addItem(product._id, Number(qty));
      openDrawer();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !product) return <p className="error page-pad" aria-live="polite">{error}</p>;
  if (!product) return <p className="muted page-pad">Loading product…</p>;

  return (
    <article>
      <div className="product">
        <div className="product-photo reveal product-photo-3d">
          <img loading="lazy" decoding="async" ref={bindImgFade} className="img-fade" src={product.image} alt={product.name} onLoad={onImgLoad} />
        </div>
        <div className="product-buy">
          <Link to={`/?category=${encodeURIComponent(product.category)}`} className="back">
            {product.category}
          </Link>
          <h1>{product.name}</h1>
          <p className="price">{money(product.price)}</p>
          <p className="lead">{product.description}</p>
          <p className="stock">{product.stock < 1 ? 'Sold out' : getStockStatusLabel(product.stock)}</p>
          {product.stock < 1 && (
            <div className="restock-notice">
              <p className="muted">Out of stock.</p>
              <label>
                Notify me when available
                <input
                  type="email"
                  placeholder="your@email.com"
                  defaultValue={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="text-btn small"
                onClick={() => notifyRestock(product._id)}
              >
                Sign up
              </button>
            </div>
          )}
          <form id="buy-form" className="add-row" onSubmit={onAdd}>
            <QtyStepper value={qty} max={product.stock || 1} onChange={setQty} disabled={product.stock < 1} />
            <button ref={buyRef} className="btn" type="submit" disabled={busy || product.stock < 1}>
              {product.stock < 1 ? 'Sold out' : busy ? 'Adding…' : 'Add to cart'}
            </button>
          </form>
          {error && <p className="error" aria-live="polite">{error}</p>}
          {user && (
            <button type="button" className="text-btn" onClick={toggleSaved}>
              <Heart size={16} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved to wishlist' : 'Save to wishlist'}
            </button>
          )}
          <p className="hint">This adds the item to your cart. Checkout records the order and does not charge a card.</p>
        </div>
      </div>

      <section className="related">
        <h2>Reviews</h2>
        {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
        <div className="review-grid">
          {reviews.map((review) => (
            <article className="review-card" key={review._id}>
              <p className="stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
              <p>{review.text}</p>
              <footer>
                <strong>{review.user?.name}</strong>
              </footer>
            </article>
          ))}
        </div>
        {user && (
          <form className="panel" onSubmit={submitReview}>
            <label>
              Rating
              <select
                value={reviewForm.rating}
                onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} stars
                  </option>
                ))}
              </select>
            </label>
            <label>
              Review
              <textarea
                value={reviewForm.text}
                onChange={(event) => setReviewForm((current) => ({ ...current, text: event.target.value }))}
                required
              />
            </label>
            {reviewNote && <p className="error" aria-live="polite">{reviewNote}</p>}
            <button className="btn" type="submit">
              Publish review
            </button>
          </form>
        )}
      </section>

      {related.length > 0 && (
        <section className="related">
          <h2>More in {product.category}</h2>
          <div className="grid">
            {related.map((item) => (
              <Link to={`/products/${item._id}`} className="card" key={item._id}>
                <div className="card-media">
                  <img loading="lazy" decoding="async" ref={bindImgFade} className="img-fade" src={item.image} alt="" onLoad={onImgLoad} />
                </div>
                <div className="card-body">
                  <p className="eyebrow">{item.category}</p>
                  <h2>{item.name}</h2>
                  <div className="card-meta">
                    <strong>{money(item.price)}</strong>
                  <span>{getStockDetails(item.stock)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className={showBar ? 'buy-bar on' : 'buy-bar'} hidden={!showBar}>
        <img loading="lazy" decoding="async" ref={bindImgFade} className="img-fade" src={product.image} alt="" onLoad={onImgLoad} />
        <div>
          <strong>{product.name}</strong>
          <span>{money(product.price)}</span>
        </div>
        <button type="submit" form="buy-form" className="btn btn-small" disabled={busy || product.stock < 1}>
          {product.stock < 1 ? 'Sold out' : busy ? 'Adding…' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}
