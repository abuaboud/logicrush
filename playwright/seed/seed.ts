// Deterministic fixture data. Every E2E run resets the database to exactly this,
// so a failure is always the code and never yesterday's leftover rows.
//
// Point values are deliberately mixed: 500 is a multiple of 250 and 100 is not.
// The 100-point problem is the one that catches a scoring implementation using
// real division instead of the integer division the legacy Java does.

export const USERS = {
  solver: { username: 'e2e_solver', password: 'e2e-password-1', rating: 1500 },
  rival: { username: 'e2e_rival', password: 'e2e-password-2', rating: 1500 },
  setter: { username: 'e2e_setter', password: 'e2e-password-3', role: 'setter' },
  admin: { username: 'e2e_admin', password: 'e2e-password-4', role: 'admin' },
} as const

export const PROBLEMS = {
  choice: { slug: 'e2e-choice', points: 500, type: 'choice', correct: 'ب' },
  cheap: { slug: 'e2e-cheap', points: 100, type: 'choice', correct: 'أ' },
  blank: { slug: 'e2e-blank', points: 750, type: 'fill_in_blank', correct: '42' },
} as const

export const CONTEST = {
  slug: 'e2e-contest',
  lengthMinutes: 60,
  allowedAttempts: 3,
} as const

export const BLOG = { categorySlug: 'e2e-category', title: 'مدونة تجريبية' } as const
