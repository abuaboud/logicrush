// Blog and comment bodies are user-authored HTML (the legacy editor was TinyMCE).
// This strips the dangerous surface -- scripts, event handlers, javascript: URLs
// -- while leaving the formatting the editor produces. It is intentionally a
// denylist of the things that execute, applied server-side on write, so a stored
// payload can never run in another user's browser.
const SCRIPT = /<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi
const SELF_CLOSING = /<\s*(script|iframe|object|embed|link|meta)\b[^>]*\/?>/gi
const ON_ATTR = /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi
const JS_URL = /\s(href|src)\s*=\s*(["']?)\s*javascript:[^"'>]*\2/gi

export const sanitize = {
  html(input: string): string {
    return input
      .replace(SCRIPT, '')
      .replace(SELF_CLOSING, '')
      .replace(ON_ATTR, '')
      .replace(JS_URL, '')
  },
}
