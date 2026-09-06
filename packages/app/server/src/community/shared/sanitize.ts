import sanitizeHtml from 'sanitize-html'

// Blog and comment bodies are user-authored HTML (the legacy editor was TinyMCE).
// This is an ALLOWLIST sanitizer, not a denylist: only the formatting tags and
// attributes the editor actually produces survive; everything else -- scripts,
// event handlers, javascript:/data: URLs, unknown tags -- is dropped. A
// hand-rolled regex denylist for HTML is never complete (an independent audit
// bypassed the previous one with `<img src=x/onerror=...>` and a `javascript:`
// href), so this defers to the well-tested library.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'span', 'div', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
    'blockquote', 'pre', 'code', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    '*': ['style'],
  },
  // Only these URL schemes survive on href/src -- no javascript:, no data:.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  // Constrain inline styles to harmless text formatting.
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
      color: [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/i],
      'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/i],
      'font-weight': [/^(normal|bold|[1-9]00)$/],
    },
  },
  transformTags: {
    // Any surviving link opens safely.
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }),
  },
}

export const sanitize = {
  html(input: string): string {
    return sanitizeHtml(input, OPTIONS)
  },
}
