// A tiny module-level logger seam so services can log without holding a Fastify
// request. Structured, and it never receives secrets by convention.
export const log = {
  info(obj: Record<string, unknown>, msg: string): void {
    console.log(JSON.stringify({ level: 'info', msg, ...obj }))
  },
  error(obj: Record<string, unknown>, msg: string): void {
    console.error(JSON.stringify({ level: 'error', msg, ...obj }))
  },
}
