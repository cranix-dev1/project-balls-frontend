import DOMPurify from 'dompurify';

export function sanitizeHTML(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'br', 'u', 'span'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'data-mention', 'style'],
  });
}
