// src/pages/Home.jsx
import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getPosts, getCategories } from '../services/api';
import PostCard from '../components/PostCard';
import FarishWordmark from '../components/FarishWordmark';
import { useAuth } from '../context/AuthContext';
import '../styles/Home.css';

export default function Home() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const loaderRef = useRef(null);
  const searchTimer = useRef(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 1000 * 60 * 10,
    select: (data) => Array.isArray(data) ? data : data.results || [],
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['posts', search, activeCategory, user?.id],
    queryFn: ({ pageParam = 1 }) =>
      getPosts({ page: pageParam, search, category: activeCategory }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined;
      const url = new URL(lastPage.next);
      return url.searchParams.get('page');
    },
    staleTime: 1000 * 60 * 2,
  });

  const posts = data?.pages.flatMap((page) => page.results || page) ?? [];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );
    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => el && observer.unobserve(el);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSearch = (e) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(e.target.value), 400);
  };

  const loading = isLoading || isFetchingNextPage;

  return (
    <div className="home">
      <div className="home__hero">
        <span className="home__hero-label">Curated fashion</span>
        <div className="home__hero-wordmark">
          <FarishWordmark size="hero" />
        </div>
        <p className="home__hero-sub">Browse pieces freely — log in to send a WhatsApp enquiry.</p>
      </div>

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

      <div className="home__grid">
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} index={i} />
        ))}
      </div>

      <div ref={loaderRef} className="home__loader">
        {loading && (
          <div className="home__spinner">
            <span/><span/><span/>
          </div>
        )}
        {!hasNextPage && posts.length > 0 && (
          <p className="home__end">— end of collection —</p>
        )}
      </div>

      {!isLoading && posts.length === 0 && (
        <div className="home__empty">
          <p>No pieces found.</p>
        </div>
      )}
    </div>
  );
}