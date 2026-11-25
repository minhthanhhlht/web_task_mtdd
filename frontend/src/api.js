// Mọi lời gọi API của giao diện nằm ở đây; component không gọi fetch trực tiếp.

// Gọi API dạng JSON; lỗi trả về Error có thông báo tiếng Việt
async function request(method, url, body) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Không kết nối được server');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (response.status === 401 && !url.startsWith('/api/auth/')) window.dispatchEvent(new Event('auth-expired'));
  if (response.status === 403 && data?.error?.startsWith('Bạn cần đổi mật khẩu')) window.dispatchEvent(new Event('password-required'));
  if (!response.ok) throw new Error(data?.error || 'Có lỗi xảy ra');
  return data;
}

// Dựng query string cho danh sách task
export function buildQuery({ status, q, page, limit, archived, notUpdated, sort, dir } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('trang_thai', status);
  if (q) params.set('q', q);
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);
  if (archived) params.set('archived', '1');
  if (notUpdated) params.set('chua_cap_nhat', '1');
  if (sort) { params.set('sort', sort); params.set('dir', dir === 'desc' ? 'desc' : 'asc'); }
  const text = params.toString();
  return text ? `?${text}` : '';
}

// Địa chỉ tải CSV (dùng thẻ <a>)
export const EXPORT_URL = '/api/export';

// ----- Xác thực -----
export const getMe = () => request('GET', '/api/auth/me');
export const setupAccount = (body) => request('POST', '/api/auth/setup', body);
export const login = (body) => request('POST', '/api/auth/login', body);
export const logout = () => request('POST', '/api/auth/logout');
export const changePassword = (body) => request('POST', '/api/auth/password', body);

// ----- Task -----
export const listTasks = (params) => request('GET', `/api/tasks${buildQuery(params)}`);
export const listChecklists = (params) => request('GET', `/api/checklists${buildQuery(params)}`);
export const createTask = (body) => request('POST', '/api/tasks', body);
export const getTask = (id) => request('GET', `/api/tasks/${id}`);
export const updateTask = (id, body) => request('PUT', `/api/tasks/${id}`, body);
export const deleteTask = (id) => request('DELETE', `/api/tasks/${id}`);
export const getTaskHistory = (id, { page = 1, limit = 50 } = {}) => request('GET', `/api/tasks/${id}/history?page=${page}&limit=${limit}`);
export const listDeletedTasks = (params) => request('GET', `/api/deleted-tasks${buildQuery(params)}`);
export const restoreDeletedTask = (id) => request('POST', `/api/deleted-tasks/${id}/restore`);
export const transferTask = (id, userId) => request('PUT', `/api/tasks/${id}/owner`, { user_id: userId });
export const saveEod = (items) => request('POST', '/api/eod', { items });

// ----- Checklist và vấn đề -----
export const setChecklistItem = (id, done) => request('PUT', `/api/checklist/${id}`, { da_xong: done });
export const setAllChecklist = (taskId, done) => request('PUT', `/api/tasks/${taskId}/checklist`, { da_xong: done });
export const addIssue = (taskId, body) => request('POST', `/api/tasks/${taskId}/issues`, body);
export const updateIssue = (id, body) => request('PUT', `/api/issues/${id}`, body);
export const deleteIssue = (id) => request('DELETE', `/api/issues/${id}`);
export const getTemplates = () => request('GET', '/api/checklist-templates');
export const saveTemplates = (items) => request('PUT', '/api/checklist-templates', { items });
export const applyTemplates = (body) => request('POST', '/api/checklist-templates/apply', body);

// ----- Trạng thái và danh mục -----
export const listStatuses = () => request('GET', '/api/statuses');
export const createStatus = (body) => request('POST', '/api/statuses', body);
export const updateStatus = (id, body) => request('PUT', `/api/statuses/${id}`, body);
export const moveStatus = (id, direction) => request('PUT', `/api/statuses/${id}/move`, { huong: direction });
export const deleteStatus = (id) => request('DELETE', `/api/statuses/${id}`);
export const listDataGroups = () => request('GET', '/api/data-groups');
export const createDataItem = (body) => request('POST', '/api/data-items', body);
export const createDataItemsBulk = (body) => request('POST', '/api/data-items/bulk', body);
export const updateDataItem = (id, body) => request('PUT', `/api/data-items/${id}`, body);
export const moveDataItem = (id, direction) => request('PUT', `/api/data-items/${id}/move`, { huong: direction });
export const deleteDataItem = (id) => request('DELETE', `/api/data-items/${id}`);

// ----- Tài khoản -----
export const listUsers = () => request('GET', '/api/users');
export const createUser = (body) => request('POST', '/api/users', body);
export const updateUser = (id, body) => request('PUT', `/api/users/${id}`, body);
export const deleteUser = (id) => request('DELETE', `/api/users/${id}`);
