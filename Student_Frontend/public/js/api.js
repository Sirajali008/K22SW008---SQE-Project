// Thin wrapper around the Student REST API. All calls go through the
// frontend server's /api proxy, so the relative URL below is always same-origin.
const API_BASE = '/api/students';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path = '', body) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(API_BASE + path, options);
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check that both servers are running.');
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(response.status, data?.error || `Request failed with status ${response.status}.`);
  }
  return data;
}

export const StudentApi = {
  list: () => request('GET'),
  get: (id) => request('GET', `/${id}`),
  create: (student) => request('POST', '', student),
  update: (id, student) => request('PUT', `/${id}`, student),
  remove: (id) => request('DELETE', `/${id}`),
};
