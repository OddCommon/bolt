export const sanitizeURL = url => {
  if (!url) return '/';
  return url.replace(window.location.origin, '');
};
