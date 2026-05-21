// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyPosts, createPost, updatePost, deletePost,
  uploadMedia, deleteMedia, getCategories,
  getOrders, createOrder, updateOrder, deleteOrder,
  searchOrderCustomers, getOrderProductChoices,
} from '../services/api';
import FarishWordmark from '../components/FarishWordmark';
import '../styles/Dashboard.css';

const EMPTY_FORM = { title: '', description: '', price: '', categoryName: '', is_available: true };
const DEFAULT_SIZING_ROWS = [
  { label: 'Height', value: '' },
  { label: 'Width', value: '' },
];

const EMPTY_ORDER_FORM = {
  postId: '',
  guestName: '',
  address: '',
  customPrice: '',
  advancePayment: '',
  status: 'preparing',
  sizingRows: DEFAULT_SIZING_ROWS.map((r) => ({ ...r })),
};

function formatMoney(amount) {
  if (amount === null || amount === undefined || amount === '') return null;
  const n = Number(amount);
  if (Number.isNaN(n)) return null;
  return `৳${n.toLocaleString()}`;
}

function parseSizingRows(data) {
  if (Array.isArray(data) && data.length > 0) {
    return data.map((r) => ({ label: r.label || '', value: r.value || '' }));
  }
  if (typeof data === 'string' && data.trim()) {
    return [{ label: 'Notes', value: data.trim() }];
  }
  return DEFAULT_SIZING_ROWS.map((r) => ({ ...r }));
}

function formatSizingSummary(rows) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const parts = rows
    .filter((r) => (r.label || '').trim() || (r.value || '').trim())
    .map((r) => `${(r.label || '').trim() || '—'}: ${(r.value || '').trim() || '—'}`);
  return parts.length ? parts.join(' · ') : null;
}

function buildCategoryPayload(categoryName, categories) {
  const name = categoryName.trim();
  if (!name) return { category: null };
  const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return { category: existing.id };
  return { category: null, new_category_name: name };
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('collection');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingPreviews, setPendingPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER_FORM);
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [zoomImage, setZoomImage] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'admin') { navigate('/', { replace: true }); }
  }, [user, navigate]);

  // ── Queries ──────────────────────────────────────────────

  const { data: posts = [], isLoading: loading } = useQuery({
    queryKey: ['myPosts'],
    queryFn: async () => {
      const data = await getMyPosts();
      return Array.isArray(data) ? data : data.results || [];
    },
    enabled: !!user && user.role === 'admin',
    staleTime: 1000 * 60 * 2,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const data = await getCategories();
      return Array.isArray(data) ? data : data.results || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const data = await getOrders();
      return Array.isArray(data) ? data : data.results || [];
    },
    enabled: !!user && activeTab === 'orders', // only fetch when on orders tab
    staleTime: 1000 * 60 * 1,
  });

  const { data: productChoices = [] } = useQuery({
    queryKey: ['productChoices'],
    queryFn: async () => {
      const data = await getOrderProductChoices();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user && activeTab === 'orders',
    staleTime: 1000 * 60 * 5,
  });

  // ── Mutations ─────────────────────────────────────────────

  const deletePostMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myPosts'] }),
  });

  const deleteOrderMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const toggleAvailableMutation = useMutation({
    mutationFn: ({ id, is_available }) => updatePost(id, { is_available }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myPosts'] }),
  });

  // ── Customer search (live, no cache) ──────────────────────

  useEffect(() => {
    if (!showOrderForm || selectedCustomer) {
      setCustomerResults([]);
      return undefined;
    }
    const q = customerSearchQuery.trim();
    if (q.length < 2) { setCustomerResults([]); return undefined; }
    const timer = setTimeout(async () => {
      setCustomerSearchLoading(true);
      try {
        const data = await searchOrderCustomers(q);
        setCustomerResults(Array.isArray(data) ? data : []);
      } catch {
        setCustomerResults([]);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchQuery, showOrderForm, selectedCustomer]);

  // ── File helpers (unchanged) ───────────────────────────────

  const clearPendingFiles = () => {
    setPendingPreviews((prev) => {
      prev.forEach((url) => { if (url) URL.revokeObjectURL(url); });
      return [];
    });
    setPendingFiles([]);
  };

  const addPendingFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setPendingFiles((prev) => [...prev, ...incoming]);
    setPendingPreviews((prev) => [
      ...prev,
      ...incoming.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)),
    ]);
  };

  const removePendingFile = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setPendingPreviews((prev) => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ── Post form handlers ────────────────────────────────────

  const openNew = () => {
    setEditingPost(null);
    setForm(EMPTY_FORM);
    clearPendingFiles();
    setError('');
    setShowForm(true);
  };

  const openEdit = (post) => {
    setEditingPost(post);
    setForm({
      title: post.title,
      description: post.description,
      price: post.price || '',
      categoryName: post.category?.name || '',
      is_available: post.is_available,
    });
    clearPendingFiles();
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        description: form.description,
        price: form.price || null,
        is_available: form.is_available,
        ...buildCategoryPayload(form.categoryName, categories),
      };
      let saved;
      if (editingPost) {
        saved = await updatePost(editingPost.id, payload);
      } else {
        saved = await createPost(payload);
      }
      if (pendingFiles.length > 0) {
        const images = pendingFiles.filter((f) => f.type.startsWith('image/'));
        const videos = pendingFiles.filter((f) => f.type.startsWith('video/'));
        const hasExistingImages = editingPost?.media?.some((m) => m.media_type === 'image');
        if (images.length > 0) await uploadMedia(saved.id, images, 'image', !hasExistingImages);
        if (videos.length > 0) await uploadMedia(saved.id, videos, 'video', false);
      }
      clearPendingFiles();
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['myPosts'] }); // refresh list
    } catch (e) {
      setError(e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this post?')) return;
    deletePostMutation.mutate(id);
  };

  const handleDeleteMedia = async (post, mediaId) => {
    await deleteMedia(post.id, mediaId);
    // Update the editingPost preview locally without a full refetch
    setEditingPost((prev) => {
      if (!prev || prev.id !== post.id) return prev;
      return { ...prev, media: (prev.media || []).filter((m) => m.id !== mediaId) };
    });
    queryClient.invalidateQueries({ queryKey: ['myPosts'] });
  };

  const handleToggleAvailable = (post) => {
    toggleAvailableMutation.mutate({ id: post.id, is_available: !post.is_available });
  };

  // ── Order form handlers ───────────────────────────────────

  const resetOrderCustomerSearch = () => {
    setSelectedCustomer(null);
    setCustomerSearchQuery('');
    setCustomerResults([]);
    setOrderForm((f) => ({ ...f, guestName: '' }));
  };

  const openNewOrder = () => {
    setEditingOrder(null);
    setOrderForm({
      postId: '',
      guestName: '',
      address: '',
      customPrice: '',
      advancePayment: '',
      status: 'preparing',
      sizingRows: DEFAULT_SIZING_ROWS.map((r) => ({ ...r })),
    });
    resetOrderCustomerSearch();
    setOrderError('');
    setShowOrderForm(true);
  };

  const openEditOrder = (order) => {
    setEditingOrder(order);
    setOrderForm({
      postId: order.post_id ? String(order.post_id) : '',
      guestName: order.guest_name || '',
      address: order.address || '',
      customPrice: order.custom_price != null ? String(order.custom_price) : '',
      advancePayment: order.advance_payment != null ? String(order.advance_payment) : '',
      status: order.status || 'preparing',
      sizingRows: parseSizingRows(order.custom_sizing),
    });
    if (order.customer_id) {
      setSelectedCustomer({
        id: order.customer_id,
        full_name: order.customer_name || '',
        email: order.customer_email || '',
        phone: order.customer_phone || '',
      });
      setCustomerSearchQuery('');
    } else {
      setSelectedCustomer(null);
      setCustomerSearchQuery('');
      setCustomerResults([]);
    }
    setOrderError('');
    setShowOrderForm(true);
  };

  const updateSizingRow = (index, field, value) => {
    setOrderForm((f) => ({
      ...f,
      sizingRows: f.sizingRows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  };

  const addSizingRow = () => {
    setOrderForm((f) => ({ ...f, sizingRows: [...f.sizingRows, { label: '', value: '' }] }));
  };

  const removeSizingRow = (index) => {
    setOrderForm((f) => ({
      ...f,
      sizingRows: f.sizingRows.length > 1 ? f.sizingRows.filter((_, i) => i !== index) : f.sizingRows,
    }));
  };

  const handleSaveOrder = async () => {
    const guestName = orderForm.guestName.trim();
    if (!selectedCustomer && !guestName) { setOrderError('Select a customer or enter a name only.'); return; }
    if (!orderForm.postId) { setOrderError('Please select a product.'); return; }
    setOrderSaving(true);
    setOrderError('');
    try {
      const payload = {
        post_id: Number(orderForm.postId),
        address: orderForm.address.trim(),
        custom_sizing: orderForm.sizingRows,
        status: orderForm.status,
        guest_name: selectedCustomer ? '' : guestName,
        customer_id: selectedCustomer ? selectedCustomer.id : null,
        custom_price: orderForm.customPrice !== '' ? orderForm.customPrice : null,
        advance_payment: orderForm.advancePayment !== '' ? orderForm.advancePayment : null,
      };
      if (editingOrder) {
        await updateOrder(editingOrder.id, payload);
      } else {
        await createOrder(payload);
      }
      setShowOrderForm(false);
      queryClient.invalidateQueries({ queryKey: ['orders'] }); // refresh list
    } catch (e) {
      setOrderError(e.message || 'Failed to save order.');
    } finally {
      setOrderSaving(false);
    }
  };

  const handleDeleteOrder = (id) => {
    if (!window.confirm('Delete this order?')) return;
    deleteOrderMutation.mutate(id);
  };

  const stats = {
    total: posts.length,
    available: posts.filter((p) => p.is_available).length,
    sold: posts.filter((p) => !p.is_available).length,
  };

  // ── JSX (completely unchanged) ────────────────────────────

  return (
    <div className="dash">
      <aside className="dash__sidebar">
        <div className="dash__brand"><FarishWordmark size="sidebar" /></div>
        <nav className="dash__nav">
          <button type="button" className={`dash__nav-item${activeTab === 'collection' ? ' active' : ''}`} onClick={() => setActiveTab('collection')}>My Collection</button>
          <button type="button" className={`dash__nav-item${activeTab === 'orders' ? ' active' : ''}`} onClick={() => setActiveTab('orders')}>Order</button>
        </nav>
        <div className="dash__user">
          <span>{user?.username}</span>
          <button className="dash__logout" onClick={() => { logout(); navigate('/'); }}>Logout</button>
        </div>
      </aside>

      <main className="dash__main">
        {activeTab === 'collection' && (
          <>
            <div className="dash__header">
              <div><h1>My Collection</h1><p>Manage your designer pieces</p></div>
              <button className="dash__add-btn" onClick={openNew}>+ New Post</button>
            </div>
            <div className="dash__stats">
              {[['Total', stats.total], ['Available', stats.available], ['Sold', stats.sold]].map(([label, val]) => (
                <div key={label} className="dash__stat">
                  <span className="dash__stat-val">{val}</span>
                  <span className="dash__stat-label">{label}</span>
                </div>
              ))}
            </div>
            {loading ? (
              <div className="dash__loading">Loading…</div>
            ) : (
              <div className="dash__posts">
                {posts.map((post) => (
                  <div key={post.id} className="dash__post-row">
                    <div className="dash__post-thumb">
                      {post.cover_image ? <img src={post.cover_image} alt={post.title} /> : <div className="dash__post-thumb-empty">No image</div>}
                    </div>
                    <div className="dash__post-info">
                      <h3>{post.title}</h3>
                      <p className="dash__post-meta">
                        {post.category?.name && <span>{post.category.name}</span>}
                        {post.price && <span>৳{Number(post.price).toLocaleString()}</span>}
                        <span>{post.media?.length || 0} media</span>
                      </p>
                    </div>
                    <div className="dash__post-actions">
                      <button className={`dash__toggle ${post.is_available ? 'available' : 'sold'}`} onClick={() => handleToggleAvailable(post)}>
                        {post.is_available ? 'Available' : 'Discontinued'}
                      </button>
                      <button className="dash__edit-btn" onClick={() => openEdit(post)}>Edit</button>
                      <button className="dash__del-btn" onClick={() => handleDelete(post.id)}>Delete</button>
                    </div>
                  </div>
                ))}
                {posts.length === 0 && <div className="dash__empty">No posts yet. Create your first one!</div>}
              </div>
            )}
          </>
        )}

        {activeTab === 'orders' && (
          <>
            <div className="dash__header">
              <div><h1>Order</h1><p>Customer, product, address, and measurements</p></div>
              <button className="dash__add-btn" onClick={openNewOrder}>+ New Order</button>
            </div>
            {ordersLoading ? (
              <div className="dash__loading">Loading…</div>
            ) : (
              <div className="dash__orders">
                <div className="dash__orders-head dash__orders-head--wide">
                  <span>Customer</span><span>Product</span><span>Price</span>
                  <span>Advance</span><span>Address</span><span>Status</span>
                  <span className="dash__orders-head-actions">Actions</span>
                </div>
                {orders.map((order) => (
                  <div key={order.id} className="dash__order-row dash__order-row--wide" onClick={() => openEditOrder(order)} style={{ cursor: 'pointer' }}>
                    <div className="dash__order-cell">
                      <strong>{order.customer_name || '—'}</strong>
                      {order.customer_phone && <span className="dash__order-sub">{order.customer_phone}</span>}
                    </div>
                    <div className="dash__order-cell dash__order-cell--name">
                      <strong>{order.product_name || order.post_title || '—'}</strong>
                      {formatSizingSummary(order.custom_sizing) && <span className="dash__order-sub">{formatSizingSummary(order.custom_sizing)}</span>}
                    </div>
                    <div className="dash__order-cell">{formatMoney(order.custom_price) || <span className="dash__order-empty">—</span>}</div>
                    <div className="dash__order-cell">{formatMoney(order.advance_payment) || <span className="dash__order-empty">—</span>}</div>
                    <div className="dash__order-cell">{order.address || <span className="dash__order-empty">—</span>}</div>
                    <div className="dash__order-cell"><span className={`dash__status-badge dash__status-${order.status}`}>{order.status}</span></div>
                    <div className="dash__order-actions">
                      <button type="button" className="dash__edit-btn" onClick={(e) => { e.stopPropagation(); openEditOrder(order); }}>Edit</button>
                      <button type="button" className="dash__del-btn" onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}>Delete</button>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <div className="dash__empty">No orders yet. Create one with customer, product, and sizing.</div>}
              </div>
            )}
          </>
        )}
      </main>

      {showForm && (
        <div className="dash__modal-bg" onClick={() => { clearPendingFiles(); setShowForm(false); }}>
          <div className="dash__modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash__modal-header">
              <h2>{editingPost ? 'Edit Post' : 'New Post'}</h2>
              <button type="button" className="dash__modal-close" onClick={() => { clearPendingFiles(); setShowForm(false); }}>×</button>
            </div>
            {error && <div className="dash__error">{error}</div>}
            <div className="dash__form">
              <label>Title *
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Silk Embroidered Kurti" />
              </label>
              <label>Description
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Fabric, size, details…" />
              </label>
              <div className="dash__form-row">
                <label>Price (৳)
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" />
                </label>
                <label>Category
                  <input list="dash-category-list" value={form.categoryName} onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))} placeholder="Pick or type a category" />
                  <datalist id="dash-category-list">
                    {categories.map((c) => <option key={c.id} value={c.name} />)}
                  </datalist>
                  <span className="dash__file-hint">Choose from suggestions or type a new name.</span>
                </label>
              </div>
              <label className="dash__checkbox">
                <input type="checkbox" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} />
                Available for sale
              </label>
              <div className="dash__media-section">
                <p className="dash__media-section-title">Photos & videos</p>
                {editingPost && editingPost.media?.length > 0 && (
                  <div className="dash__existing-media">
                    <p className="dash__file-hint">Current uploads</p>
                    <div className="dash__media-grid">
                      {editingPost.media.map(m => (
                        <div key={m.id} className="dash__media-thumb">
                          {m.media_type === 'image'
                            ? <img src={m.file_url} alt="" onClick={() => setZoomImage(m.file_url)} style={{ cursor: 'zoom-in' }} />
                            : <div className="dash__media-video-icon">▶</div>
                          }
                          <button type="button" onClick={() => handleDeleteMedia(editingPost, m.id)} title="Remove">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <label className="dash__upload-btn">
                  <span>{editingPost ? '+ Add more photos / videos' : '+ Upload photos / videos'}</span>
                  <input type="file" multiple accept="image/*,video/*" onChange={(e) => { addPendingFiles(e.target.files); e.target.value = ''; }} />
                </label>
                {pendingFiles.length > 0 && (
                  <div className="dash__pending-media">
                    <p className="dash__file-hint">{pendingFiles.length} new file(s) — saved when you click Save Post</p>
                    <div className="dash__media-grid">
                      {pendingFiles.map((file, i) => (
                        <div key={`${file.name}-${i}`} className="dash__media-thumb">
                          {pendingPreviews[i] ? <img src={pendingPreviews[i]} alt="" /> : <div className="dash__media-video-icon">▶</div>}
                          <button type="button" onClick={() => removePendingFile(i)} title="Remove">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="dash__modal-footer">
              <button type="button" className="dash__cancel-btn" onClick={() => { clearPendingFiles(); setShowForm(false); }}>Cancel</button>
              <button className="dash__save-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Post'}</button>
            </div>
          </div>
        </div>
      )}

      {showOrderForm && (
        <div className="dash__modal-bg" onClick={() => setShowOrderForm(false)}>
          <div className="dash__modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash__modal-header">
              <h2>{editingOrder ? 'Edit Order' : 'New Order'}</h2>
              <button type="button" className="dash__modal-close" onClick={() => setShowOrderForm(false)}>✕</button>
            </div>
            {orderError && <div className="dash__error">{orderError}</div>}
            <div className="dash__form">
              <label>Customer *
                {selectedCustomer ? (
                  <div className="dash__customer-selected">
                    <div>
                      <strong>{selectedCustomer.full_name}</strong>
                      <span className="dash__order-sub">{selectedCustomer.email}</span>
                      {selectedCustomer.phone && <span className="dash__order-sub">{selectedCustomer.phone}</span>}
                    </div>
                    <button type="button" className="dash__edit-btn" onClick={resetOrderCustomerSearch}>Change</button>
                  </div>
                ) : (
                  <div className="dash__customer-search">
                    <input value={customerSearchQuery} onChange={(e) => setCustomerSearchQuery(e.target.value)} placeholder="Search by name, phone, or email…" autoComplete="off" />
                    {customerSearchLoading && <p className="dash__file-hint">Searching…</p>}
                    {customerResults.length > 0 && (
                      <ul className="dash__customer-results">
                        {customerResults.map((c) => (
                          <li key={c.id}>
                            <button type="button" onClick={() => { setSelectedCustomer(c); setCustomerSearchQuery(''); setCustomerResults([]); setOrderForm((f) => ({ ...f, guestName: '' })); }}>
                              <strong>{c.full_name}</strong>
                              <span>{c.email}</span>
                              {c.phone && <span>{c.phone}</span>}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {customerSearchQuery.trim().length >= 2 && !customerSearchLoading && customerResults.length === 0 && (
                      <p className="dash__file-hint">No customers found — use name only below.</p>
                    )}
                    <div className="dash__guest-name">
                      <span className="dash__file-hint">Or name only (if not in system)</span>
                      <input value={orderForm.guestName} onChange={(e) => setOrderForm((f) => ({ ...f, guestName: e.target.value }))} placeholder="e.g. Ayesha Khan" />
                    </div>
                  </div>
                )}
              </label>
              <label>Product *
                <select value={orderForm.postId} onChange={(e) => setOrderForm((f) => ({ ...f, postId: e.target.value }))}>
                  <option value="">— Select product —</option>
                  {productChoices.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}{p.price ? ` — ৳${Number(p.price).toLocaleString()}` : ''}</option>
                  ))}
                </select>
              </label>
              <div className="dash__form-row">
                <label>Custom price (৳)
                  <input type="number" min="0" step="1" value={orderForm.customPrice} onChange={(e) => setOrderForm((f) => ({ ...f, customPrice: e.target.value }))} placeholder="Order total (optional)" />
                </label>
                <label>Advance payment (৳)
                  <input type="number" min="0" step="1" value={orderForm.advancePayment} onChange={(e) => setOrderForm((f) => ({ ...f, advancePayment: e.target.value }))} placeholder="Amount paid (optional)" />
                </label>
              </div>
              <label>Address
                <textarea value={orderForm.address} onChange={(e) => setOrderForm((f) => ({ ...f, address: e.target.value }))} rows={3} placeholder="Delivery / billing address" />
              </label>
              <label>Status
                <select value={orderForm.status} onChange={(e) => setOrderForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="preparing">Preparing</option>
                  <option value="delivering">Delivering</option>
                  <option value="delivered">Delivered</option>
                </select>
              </label>
              <div className="dash__sizing-block">
                <div className="dash__sizing-header">
                  <span>Custom sizing</span>
                  <button type="button" className="dash__edit-btn" onClick={addSizingRow}>+ Add row</button>
                </div>
                <table className="dash__sizing-table">
                  <thead><tr><th>Measurement</th><th>Value</th><th aria-label="Actions" /></tr></thead>
                  <tbody>
                    {orderForm.sizingRows.map((row, index) => (
                      <tr key={`sizing-${index}`}>
                        <td><input value={row.label} onChange={(e) => updateSizingRow(index, 'label', e.target.value)} placeholder="e.g. Height" /></td>
                        <td><input value={row.value} onChange={(e) => updateSizingRow(index, 'value', e.target.value)} placeholder="e.g. 5 ft 6 in" /></td>
                        <td><button type="button" className="dash__del-btn" onClick={() => removeSizingRow(index)} disabled={orderForm.sizingRows.length <= 1} title="Remove row">×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="dash__modal-footer">
              <button type="button" className="dash__cancel-btn" onClick={() => setShowOrderForm(false)}>Cancel</button>
              <button type="button" className="dash__save-btn" onClick={handleSaveOrder} disabled={orderSaving}>{orderSaving ? 'Saving…' : 'Save Order'}</button>
            </div>
          </div>
        </div>
      )}

      {zoomImage && (
        <div className="dash__modal-bg" onClick={() => setZoomImage(null)}>
          <div className="dash__modal" style={{ maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="dash__modal-close" onClick={() => setZoomImage(null)}>✕</button>
            <img src={zoomImage} alt="Full size" style={{ width: '100%', height: 'auto', maxHeight: '80vh', objectFit: 'contain', cursor: 'zoom-out' }} onClick={() => setZoomImage(null)} />
          </div>
        </div>
      )}
    </div>
  );
}