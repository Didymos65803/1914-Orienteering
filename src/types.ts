export type TeamId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'

export type CheckpointId = 'CP1' | 'CP2' | 'CP3' | 'CP4' | 'CP5' | 'CP6'

export type TeamRole = 'repair' | 'overwrite'

export type GameStatus = 'waiting' | 'running' | 'ended'

export interface GameState {
  status: GameStatus
  startedAt: number | null
  endsAt: number | null
  durationMinutes: number
  repairRate: number
}

export interface Team {
  code: string
  role: TeamRole
  route: CheckpointId[]
  currentIndex: number
  score: number
  skillUsed: boolean
  finished: boolean
  uid: string | null
  lastSeenAt: number | null
}

export interface Checkpoint {
  name: string
  polluted: boolean
  pollutedBy: TeamId | null
  pollutedAt: number | null
}

export type SingleChoiceQuestion = {
  type: 'single-choice'
  question: string
  choices: Array<{ key: string; label: string }>
  answer: string
  normalHint: string
  pollutedHint: string
}

export type OrderingQuestion = {
  type: 'ordering'
  question: string
  items: string[]
  answer: string[]
  normalHint: string
  pollutedHint: string
}

export type CheckpointContent = {
  id: CheckpointId
  name: string
} & (SingleChoiceQuestion | OrderingQuestion)

export interface AnswerLog {
  answer: string | string[]
  correct: boolean
  scoreDelta: number
  submittedAt: number
  wasPolluted: boolean
  hintUsed: boolean
}

export interface LogEntry {
  timestamp: number
  teamId: TeamId | 'admin' | null
  action: string
  cpId?: CheckpointId | null
  payload?: unknown
}

export interface Vote {
  votedFor: TeamId
  submittedAt: number
}

export interface RootData {
  game?: GameState
  teams?: Partial<Record<TeamId, Team>>
  checkpoints?: Partial<Record<CheckpointId, Checkpoint>>
  answers?: Partial<Record<TeamId, Partial<Record<CheckpointId, AnswerLog>>>>
  logs?: Record<string, LogEntry>
  votes?: Partial<Record<TeamId, Vote>>
}
