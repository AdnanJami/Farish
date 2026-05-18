// src/pages/PostDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getPost } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/PostDetail.css';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPost(id)
      .then((data) => { if (!cancelled) setPost(data); })
      .catch(() => { if (!cancelled) navigate('/'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, navigate, user]);

  if (loading) return <div className="detail__loading"><span className="spinner" /></div>;
  if (!post) return null;

  const allMedia = post.media || [];
  const current = allMedia[activeMedia];

  const loginForEnquire = () => {
    const returnTo = `${location.pathname}${location.search || ''}`;
    navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  return (
    <div className="detail">
      <button type="button" className="detail__back" onClick={() => navigate(-1)}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M19 12H5m7-7-7 7 7 7"/>
        </svg>
        Back
      </button>

      <div className="detail__layout">
        {/* Media column */}
        <div className="detail__media-col">
          <div className="detail__main-media">
            {current ? (
              current.media_type === 'video' ? (
                <video src={current.file_url} controls className="detail__video" />
              ) : (
                <img 
                  src={current.file_url} 
                  alt={post.title} 
                  className="detail__main-img" 
                  onClick={() => setZoomOpen(true)}
                  style={{cursor: 'zoom-in'}}
                />
              )
            ) : (
              <div className="detail__no-media">No media</div>
            )}
          </div>

          {allMedia.length > 1 && (
            <div className="detail__thumbs">
              {allMedia.map((m, i) => (
                <button
                  type="button"
                  key={m.id}
                  className={`detail__thumb${i === activeMedia ? ' active' : ''}`}
                  onClick={() => setActiveMedia(i)}
                >
                  {m.media_type === 'video' ? (
                    <div className="detail__thumb-video">
                      <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  ) : (
                    <img src={m.file_url} alt="" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info column */}
        <div className="detail__info-col">
          {post.category && <span className="detail__cat">{post.category.name}</span>}
          <h1 className="detail__title">{post.title}</h1>

          {post.price && (
            <p className="detail__price">৳ {Number(post.price).toLocaleString()}</p>
          )}

          {!post.is_available && (
            <div className="detail__sold-tag">Discontinued</div>
          )}

          {post.description && (
            <div className="detail__desc">
              <h3>About this piece</h3>
              <p>{post.description}</p>
            </div>
          )}

          {user && post.whatsapp_link ? (
            <a
              className="detail__whatsapp"
              href={post.whatsapp_link}
              target="_blank"
              rel="noreferrer"
            >
              <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.528 5.845L0 24l6.337-1.508A11.956 11.956 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 0 1-5.001-1.37l-.358-.214-3.762.895.952-3.674-.233-.375A9.816 9.816 0 0 1 2.182 12C2.182 6.58 6.58 2.182 12 2.182 17.42 2.182 21.818 6.58 21.818 12c0 5.42-4.398 9.818-9.818 9.818z"/>
              </svg>
              Enquire on WhatsApp
            </a>
          ) : user && !post.whatsapp_link ? (
            <p className="detail__hint detail__hint--warn">WhatsApp enquiry is not available (set COMPANY_WHATSAPP on the server).</p>
          ) : (
            <button type="button" className="detail__whatsapp detail__whatsapp--cta" onClick={loginForEnquire}>
              <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.528 5.845L0 24l6.337-1.508A11.956 11.956 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 0 1-5.001-1.37l-.358-.214-3.762.895.952-3.674-.233-.375A9.816 9.816 0 0 1 2.182 12C2.182 6.58 6.58 2.182 12 2.182 17.42 2.182 21.818 6.58 21.818 12c0 5.42-4.398 9.818-9.818 9.818z"/>
              </svg>
              Log in to enquire on WhatsApp
            </button>
          )}

{user && post.whatsapp_link && (
             <p className="detail__hint">
               Opens WhatsApp with a pre-filled message about this item.
             </p>
           )}
        </div>
      </div>

      {/* Zoom Modal */}
      {zoomOpen && current?.media_type === 'image' && (
        <div className="detail__zoom-modal" onClick={() => setZoomOpen(false)}>
          <button type="button" className="detail__zoom-close" onClick={() => setZoomOpen(false)}>×</button>
          <img src={current.file_url} alt={post.title} className="detail__zoom-img" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
