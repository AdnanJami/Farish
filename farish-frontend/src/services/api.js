// src/services/api.js
const BASE_URL = `${process.env.REACT_APP_API_URL || 'https://farish-hrx1.onrender.com'}/api`;const getHeaders = (isMultipart = false) => {
  const token = localStorage.getItem('access_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isMultipart) headers['Content-Type'] = 'application/json';
  return headers;
};

const handleResponse = async (res) => {
  if (res.status === 401) {
    // Try refresh
    const refreshed = await refreshToken();
    if (!refreshed) {
      localStorage.clear();
      window.location.href = '/login';
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || JSON.stringify(err) || 'Request failed');
  }
  if (res.status === 204) return null;
  return res.json();
};

export const refreshToken = async () => {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('access_token', data.access);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// Auth
export const login = async (username, password) => {
  const res = await fetch(`${BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(res);
};

// Posts
export const getPosts = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/posts/?${query}`, { headers: getHeaders() });
  return handleResponse(res);
};

export const getPost = async (id) => {
  const res = await fetch(`${BASE_URL}/posts/${id}/`, { headers: getHeaders() });
  return handleResponse(res);
};

export const getMyPosts = async () => {
  const res = await fetch(`${BASE_URL}/posts/my_posts/`, { headers: getHeaders() });
  return handleResponse(res);
};

export const createPost = async (data) => {
  const res = await fetch(`${BASE_URL}/posts/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const updatePost = async (id, data) => {
  const res = await fetch(`${BASE_URL}/posts/${id}/`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const deletePost = async (id) => {
  const res = await fetch(`${BASE_URL}/posts/${id}/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const uploadMedia = async (postId, files, mediaType = 'image', isCover = false) => {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  formData.append('media_type', mediaType);
  formData.append('is_cover', isCover ? 'true' : 'false');
  const res = await fetch(`${BASE_URL}/posts/${postId}/upload_media/`, {
    method: 'POST',
    headers: getHeaders(true),
    body: formData,
  });
  return handleResponse(res);
};

export const deleteMedia = async (postId, mediaId) => {
  const res = await fetch(`${BASE_URL}/posts/${postId}/media/${mediaId}/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(res);
};

// Categories
export const getCategories = async () => {
  const res = await fetch(`${BASE_URL}/categories/`, { headers: getHeaders() });
  return handleResponse(res);
};

// Orders (admin API)
export const getOrders = async () => {
  const res = await fetch(`${BASE_URL}/orders/`, { headers: getHeaders() });
  return handleResponse(res);
};

export const createOrder = async (data) => {
  const res = await fetch(`${BASE_URL}/orders/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const updateOrder = async (id, data) => {
  const res = await fetch(`${BASE_URL}/orders/${id}/`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const deleteOrder = async (id) => {
  const res = await fetch(`${BASE_URL}/orders/${id}/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const searchOrderCustomers = async (q) => {
  const query = new URLSearchParams({ q }).toString();
  const res = await fetch(`${BASE_URL}/orders/search-customers/?${query}`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const getOrderProductChoices = async () => {
  const res = await fetch(`${BASE_URL}/orders/product-choices/`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};
