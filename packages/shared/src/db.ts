import type { ColumnType, Generated } from 'kysely'

// The Postgres schema the legacy MySQL data migrates into. Three shape changes
// from the legacy schema, each deliberate:
//   1. Revision rows are gone. Legacy stored problem descriptions, blog bodies
//      and comment bodies in a shared `revision` table joined by *_rev_id, with
//      no history actually used. Content is now an inline column.
//   2. comment_blog / comment_problem / comment_solution collapse into one
//      `comment` table with (target, target_id).
//   3. Legacy int enums become Postgres text enums; the mapping lives in
//      @logicrush/shared next to each schema.
// Legacy integer ids are preserved in `legacy_id` on every migrated table so the
// migration is re-runnable and auditable.

type Timestamp = ColumnType<Date, Date | string, Date | string>

export interface Database {
  user: UserTable
  session: SessionTable
  auth_token: AuthTokenTable
  country: CountryTable
  problem: ProblemTable
  problem_option: ProblemOptionTable
  tag: TagTable
  problem_tag: ProblemTagTable
  problem_tutorial_access: ProblemTutorialAccessTable
  contest: ContestTable
  contest_register: ContestRegisterTable
  submission: SubmissionTable
  rating_change: RatingChangeTable
  blog: BlogTable
  blog_subject: BlogSubjectTable
  blog_category: BlogCategoryTable
  comment: CommentTable
  vote: VoteTable
  badge: BadgeTable
  badge_user: BadgeUserTable
  notification: NotificationTable
}

export interface UserTable {
  id: string
  legacy_id: number | null
  username: string
  full_name: string
  email: string
  password_hash: string | null
  role: 'user' | 'admin' | 'setter'
  rating: number
  contribution_points: number
  country_code: string | null
  gender: 'male' | 'female' | 'unspecified'
  birthday: string | null
  img_url: string | null
  email_validated: boolean
  registered_at: Timestamp
  last_online_at: Timestamp | null
}

export interface SessionTable {
  id: string
  user_id: string
  expires_at: Timestamp
  created_at: Timestamp
}

// Email-validation and password-reset tokens. Stored hashed and single-use --
// `used_at` is what makes a reset link unusable a second time.
export interface AuthTokenTable {
  id: string
  user_id: string
  kind: 'email_validation' | 'password_reset'
  token_hash: string
  expires_at: Timestamp
  used_at: Timestamp | null
}

export interface CountryTable {
  code: string
  name: string
}

export interface ProblemTable {
  id: string
  legacy_id: number | null
  slug: string
  title: string
  type: 'choice' | 'fill_in_blank'
  author_id: string
  writer_id: string
  description: string
  solution: string
  correct_option: string
  visibility: 'public' | 'unlisted' | 'deleted'
  approved: boolean
  points: number
  solved_count: number
  number_of_attempts: number
  contest_id: string | null
  order_index: number
  created_at: Timestamp
  updated_at: Timestamp
}

export interface ProblemOptionTable {
  id: string
  legacy_id: number | null
  problem_id: string
  content: string
  visibility: 'public' | 'unlisted' | 'deleted'
  order_index: number
}

export interface TagTable {
  id: string
  legacy_id: number | null
  name: string
  description: string | null
}

export interface ProblemTagTable {
  problem_id: string
  tag_id: string
}

export interface ProblemTutorialAccessTable {
  user_id: string
  problem_id: string
  unlocked_at: Timestamp
}

export interface ContestTable {
  id: string
  legacy_id: number | null
  slug: string
  title: string
  author_id: string
  starts_at: Timestamp
  length_minutes: number
  allowed_attempts: number
  visibility: 'public' | 'unlisted' | 'deleted'
  created_at: Timestamp
  updated_at: Timestamp
}

export interface ContestRegisterTable {
  contest_id: string
  user_id: string
  registered_at: Timestamp
}

export interface SubmissionTable {
  id: string
  legacy_id: number | null
  user_id: string
  problem_id: string
  answer: string
  correct: boolean
  blind: boolean
  submitted_at: Timestamp
}

export interface RatingChangeTable {
  id: string
  legacy_id: number | null
  user_id: string
  contest_id: string
  rank: number
  new_rating: number
}

// The grouping level above a category — "مدونات عامة" / "مدونات أُخرى" on the forum
// index. Legacy `blog_subject`; every category hangs off one.
export interface BlogSubjectTable {
  id: string
  legacy_id: number | null
  title: string
  order_index: number
}

export interface BlogCategoryTable {
  id: string
  legacy_id: number | null
  slug: string
  title: string
  description: string | null
  subject_id: string
  order_index: number
}

export interface BlogTable {
  id: string
  legacy_id: number | null
  title: string
  content: string
  author_id: string
  category_id: string
  visibility: 'public' | 'unlisted' | 'deleted'
  announcement: boolean
  up_votes: number
  down_votes: number
  comment_count: number
  created_at: Timestamp
  last_activity_at: Timestamp
}

export interface CommentTable {
  id: string
  legacy_id: number | null
  target: 'blog' | 'problem' | 'solution'
  target_id: string
  parent_id: string | null
  author_id: string
  content: string
  visibility: 'public' | 'unlisted' | 'deleted'
  up_votes: number
  down_votes: number
  created_at: Timestamp
}

export interface VoteTable {
  id: string
  legacy_id: number | null
  target: 'blog' | 'comment'
  target_id: string
  user_id: string
  up_vote: boolean
}

export interface BadgeTable {
  id: string
  legacy_id: number | null
  title: string
  description: string | null
  img_url: string | null
  deleted: boolean
}

export interface BadgeUserTable {
  badge_id: string
  user_id: string
  awarded_at: Timestamp
}

export interface NotificationTable {
  id: string
  legacy_id: number | null
  user_id: string
  content: string
  link: string | null
  read: boolean
  created_at: Timestamp
}
