// src/pages/Home.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { getPosts, getCategories } from '../services/api';
import PostCard from '../components/PostCard';
import FarishWordmark from '../components/FarishWordmark';
import { useAuth } from '../context/AuthContext';
import '../styles/Home.css';

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const loaderRef = useRef(null);
  const searchTimer = useRef(null);

  const fetchPosts = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const data = await getPosts({ page: currentPage, search, category: activeCategory });
      if (reset) {
        setPosts(data.results || data);
        setPage(2);
      } else {
        setPosts((prev) => [...prev, ...(data.results || [])]);
        setPage((p) => p + 1);
      }
      setHasMore(!!(data.next));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeCategory]);

  useEffect(() => {
    getCategories().then(data => {
  setCategories(Array.isArray(data) ? data : data.results || []);
}).catch(console.error);
  }, []);

  useEffect(() => {
    fetchPosts(true);
  }, [search, activeCategory, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loading) fetchPosts(); },
      { threshold: 0.5 }
    );
    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => el && observer.unobserve(el);
  }, [hasMore, loading, fetchPosts]);

  const handleSearch = (e) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(e.target.value), 400);
  };

  return (
    <div className="home">
      {/* Hero strip */}
      <div className="home__hero">
        <span className="home__hero-label">Curated fashion</span>
        <div className="home__hero-wordmark">
          <FarishWordmark size="hero" />
        </div>
        <p className="home__hero-sub">Browse pieces freely — log in to send a WhatsApp enquiry.</p>
      </div>

      {/* Sticky filters */}
      <div className="home__filters">
        <div className="home__search-wrap">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="home__search"
            placeholder="Search pieces…"
            onChange={handleSearch}
          />
        </div>
        <div className="home__cats">
          <button
            className={`home__cat${!activeCategory ? ' active' : ''}`}
            onClick={() => setActiveCategory('')}
          >All</button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`home__cat${activeCategory === c.slug ? ' active' : ''}`}
              onClick={() => setActiveCategory(c.slug)}
            >{c.name}</button>
          ))}
        </div>
      </div>

      {/* Feed grid */}
      <div className="home__grid">
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} index={i} />
        ))}
      </div>

      {/* Loader sentinel */}
      <div ref={loaderRef} className="home__loader">
        {loading && (
          <div className="home__spinner">
            <span/><span/><span/>
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="home__end">— end of collection —</p>
        )}
      </div>

      {!loading && posts.length === 0 && (
        <div className="home__empty">
          <p>No pieces found.</p>
        </div>
      )}
    </div>
  );
}
