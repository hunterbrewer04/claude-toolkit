// Owned by task B1. Task A1 never touches this file.
export function requireSameOrigin(req) {
  return req.headers['sec-fetch-site'] === 'same-origin';
}

export function rateLimit(req, budget) {
  return req.count < budget;
}
