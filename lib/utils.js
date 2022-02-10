export const sanitizeURL = url => {
  return url.replace(window.location.origin, '');
};
