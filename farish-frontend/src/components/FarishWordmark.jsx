import './FarishWordmark.css';

const TulipIcon = () => (
  <svg
    className="farish-wordmark__tulip"
    viewBox="0 0 40 56"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="none"
      stroke="var(--tulip-green)"
      strokeWidth="2.2"
      strokeLinecap="round"
      d="M20 52V30"
    />
    <path
      fill="var(--tulip-green)"
      d="M20 34 Q8 30 6 22 Q12 24 18 32"
    />
    <path fill="var(--tulip-red)" d="M20 6 C12 8 8 16 12 22 C14 18 18 16 20 18 C22 16 26 18 28 22 C32 16 28 8 20 6" />
    <path fill="var(--tulip-red)" d="M20 4 L14 14 L20 10 L26 14 Z" />
  </svg>
);

export default function FarishWordmark({ className = '', size = 'md' }) {
  return (
    <span
      className={`farish-wordmark farish-wordmark--${size} ${className}`.trim()}
      aria-label="Farish"
    >
      <span className="farish-wordmark__letter">F</span>
      <span className="farish-wordmark__letter">A</span>
      <span className="farish-wordmark__letter">R</span>
      <TulipIcon />
      <span className="farish-wordmark__letter">S</span>
      <span className="farish-wordmark__letter">H</span>
    </span>
  );
}
