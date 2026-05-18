// src/components/PostCard.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/PostCard.css';

export default function PostCard({ post, index }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const images = post.media?.filter((m) => m.media_type === 'image') || [];
  const hasVideo = post.media?.some((m) => m.media_type === 'video');
  const displaySrc = images[hovered && images.length > 1 ? 1 : 0]?.file_url || post.cover_image;

  const handleClick = () => navigate(`/post/${post.id}`);

  const goLoginForEnquire = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/login?returnTo=${encodeURIComponent(`/post/${post.id}`)}`);
  };

  const openWhatsApp = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="card"
      style={{ animationDelay: `${(index % 12) * 0.06}s` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      {/* Media */}
      <div className="card__media">
        {displaySrc ? (
          <img
            className={`card__img${hovered ? ' card__img--hovered' : ''}`}
            src={displaySrc}
            alt={post.title}
            loading="lazy"
          />
        ) : (
          <div className="card__placeholder">
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
          </div>
        )}

        {/* Badges */}
        {hasVideo && (
          <span className="card__badge card__badge--video">
            <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Video
          </span>
        )}
        {images.length > 1 && (
          <span className="card__badge card__badge--multi">{images.length} photos</span>
        )}
        {!post.is_available && (
          <div className="card__sold">DISCONTINUED</div>
        )}

        {/* Quick enquire — login required before WhatsApp */}
        {user && post.whatsapp_link ? (
          <a
            className="card__enquire"
            href={post.whatsapp_link}
            target="_blank"
            rel="noreferrer"
            onClick={openWhatsApp}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.528 5.845L0 24l6.337-1.508A11.956 11.956 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 0 1-5.001-1.37l-.358-.214-3.762.895.952-3.674-.233-.375A9.816 9.816 0 0 1 2.182 12C2.182 6.58 6.58 2.182 12 2.182 17.42 2.182 21.818 6.58 21.818 12c0 5.42-4.398 9.818-9.818 9.818z"/>
            </svg>
            Enquire
          </a>
        ) : user ? (
          <span className="card__enquire card__enquire--na" onClick={(e) => e.stopPropagation()}>
            Enquire unavailable
          </span>
        ) : (
          <button type="button" className="card__enquire card__enquire--login" onClick={goLoginForEnquire}>
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            Log in to enquire
          </button>
        )}
      </div>

      {/* Info */}
      <div className="card__info">
        {post.category && <span className="card__cat">{post.category.name}</span>}
        <h3 className="card__title">{post.title}</h3>
        {post.price && (
          <p className="card__price">৳ {Number(post.price).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}
