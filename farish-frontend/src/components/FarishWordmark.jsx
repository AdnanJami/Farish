import './FarishWordmark.css';

export default function FarishWordmark({ className = '', size = 'md' }) {
  return (
    <span
      className={`farish-wordmark farish-wordmark--${size} ${className}`.trim()}
      aria-label="Farish"
    >
      <img src="/flower.png" alt="" className="farish-wordmark__flower" aria-hidden="true" />
      <img src="/logo-png.png" alt="Farish" className="farish-wordmark__logo" />
    </span>
  );
}
