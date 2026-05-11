import { signInAnonymously } from 'firebase/auth'
import {
  get,
  push,
  ref,
  runTransaction,
  set,
  update,
} from 'firebase/database'
import { CHECKPOINT_IDS, TEAM_IDS, checkpointContent, createInitialData } from '../data/seed'
import type {
  AnswerLog,
  Checkpoint,
  CheckpointId,
  GameState,
  LogEntry,
  RootData,
  Team,
  TeamId,
  Vote,
} from '../types'
import { auth, database } from './firebase'

export class GameError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}

export type LoginResult = {
  teamId: TeamId
  team: Team
  uid: string
}

function now() {
  return Date.now()
}

function normalizeTeam(team: Team): Team {
  return {
    ...team,
    uid: team.uid ?? null,
    lastSeenAt: team.lastSeenAt ?? null,
  }
}

function normalizeCheckpoint(checkpoint: Checkpoint): Checkpoint {
  return {
    ...checkpoint,
    pollutedBy: checkpoint.pollutedBy ?? null,
    pollutedAt: checkpoint.pollutedAt ?? null,
  }
}

function isCheckpointId(value: string): value is CheckpointId {
  return CHECKPOINT_IDS.includes(value as CheckpointId)
}

function findTeamByCode(code: string): TeamId | null {
  const normalizedCode = code.trim().toUpperCase()
  return TEAM_IDS.find((teamId) => `${teamId}1914` === normalizedCode) ?? null
}

async function writeLog(
  teamId: TeamId | 'admin' | null,
  action: string,
  cpId?: CheckpointId | null,
  payload?: unknown,
) {
  const logRef = push(ref(database, 'logs'))
  const entry: LogEntry = {
    timestamp: now(),
    teamId,
    action,
    cpId: cpId ?? null,
    payload: payload ?? null,
  }
  await set(logRef, entry)
}

export function getCurrentTargetCheckpoint(team: Team): CheckpointId | null {
  return team.route[team.currentIndex] ?? null
}

export function getRoleLabel(role: Team['role']) {
  return role === 'repair' ? '修復組' : '覆寫組'
}

export function calculateRepairRate(
  checkpoints: Partial<Record<CheckpointId, Checkpoint>>,
) {
  const cleanCount = CHECKPOINT_IDS.filter(
    (cpId) => !checkpoints[cpId]?.polluted,
  ).length
  return cleanCount / CHECKPOINT_IDS.length
}

export function calculateAnswerScore(correct: boolean, hintUsed: boolean) {
  return 50 + (correct ? 100 : 20) - (hintUsed ? 30 : 0)
}

export function checkAnswer(cpId: CheckpointId, answer: string | string[]) {
  const content = checkpointContent[cpId]

  if (content.type === 'single-choice') {
    return typeof answer === 'string' && answer === content.answer
  }

  if (!Array.isArray(answer) || answer.length !== content.answer.length) {
    return false
  }

  return content.answer.every((item, index) => answer[index] === item)
}

export async function ensureAnonymousAuth() {
  if (auth.currentUser) {
    return auth.currentUser
  }

  const credential = await signInAnonymously(auth)
  return credential.user
}

export async function loginWithTeamCode(teamCode: string): Promise<LoginResult> {
  const teamId = findTeamByCode(teamCode)

  if (!teamId) {
    throw new GameError('隊伍代碼不正確。', 'invalid-team-code')
  }

  const credential = await signInAnonymously(auth)
  const uid = credential.user.uid
  const teamsSnapshot = await get(ref(database, 'teams'))
  const teams = (teamsSnapshot.val() ?? {}) as Partial<Record<TeamId, Team>>
  const team = teams[teamId]

  if (!team) {
    throw new GameError('尚未建立隊伍資料，請先由管理員重設遊戲。', 'missing-seed')
  }

  const normalizedTeam = normalizeTeam(team)
  const uidOwner = TEAM_IDS.find((id) => teams[id]?.uid === uid)

  if (uidOwner && uidOwner !== teamId) {
    throw new GameError('此瀏覽器已綁定其他隊伍。', 'uid-bound-to-other-team')
  }

  if (normalizedTeam.uid && normalizedTeam.uid !== uid) {
    throw new GameError(
      '此隊伍已綁定其他裝置，請由管理員重設該隊登入。',
      'team-uid-mismatch',
    )
  }

  await update(ref(database, `teams/${teamId}`), {
    uid,
    lastSeenAt: now(),
  })
  await writeLog(teamId, normalizedTeam.uid ? 'login' : 'bind_uid', null, {
    uid,
  })

  return {
    teamId,
    team: { ...normalizedTeam, uid, lastSeenAt: now() },
    uid,
  }
}

export async function getCurrentTeamState(teamId: TeamId) {
  const snapshot = await get(ref(database, `teams/${teamId}`))
  const team = snapshot.val() as Team | null
  return team ? normalizeTeam(team) : null
}

export async function submitAnswer(
  teamId: TeamId,
  cpId: CheckpointId,
  answer: string | string[],
  hintUsed: boolean,
): Promise<AnswerLog> {
  const [teamSnapshot, gameSnapshot, checkpointSnapshot] = await Promise.all([
    get(ref(database, `teams/${teamId}`)),
    get(ref(database, 'game')),
    get(ref(database, `checkpoints/${cpId}`)),
  ])
  const team = teamSnapshot.val() as Team | null
  const game = gameSnapshot.val() as GameState | null
  const checkpoint = checkpointSnapshot.val() as Checkpoint | null

  if (!team || !game || !checkpoint) {
    throw new GameError('遊戲資料尚未準備完成。', 'missing-data')
  }

  if (game.status !== 'running') {
    throw new GameError('遊戲尚未開始或已結束。', 'game-not-running')
  }

  const normalizedTeam = normalizeTeam(team)
  const targetCpId = getCurrentTargetCheckpoint(normalizedTeam)

  if (normalizedTeam.finished || !targetCpId) {
    throw new GameError('你們已完成所有控制點。', 'team-finished')
  }

  if (targetCpId !== cpId) {
    throw new GameError(
      '這不是你們目前的控制點，請回到地圖確認下一站。',
      'wrong-checkpoint',
    )
  }

  const correct = checkAnswer(cpId, answer)
  const scoreDelta = calculateAnswerScore(correct, hintUsed)
  const submittedAt = now()
  const nextIndex = normalizedTeam.currentIndex + 1
  const finished = nextIndex >= normalizedTeam.route.length
  const answerLog: AnswerLog = {
    answer,
    correct,
    scoreDelta,
    submittedAt,
    wasPolluted: Boolean(checkpoint.polluted),
    hintUsed,
  }
  const logKey = push(ref(database, 'logs')).key

  if (!logKey) {
    throw new GameError('無法寫入紀錄。', 'log-key-failed')
  }

  await update(ref(database), {
    [`answers/${teamId}/${cpId}`]: answerLog,
    [`teams/${teamId}/score`]: (normalizedTeam.score ?? 0) + scoreDelta,
    [`teams/${teamId}/currentIndex`]: nextIndex,
    [`teams/${teamId}/finished`]: finished,
    [`teams/${teamId}/lastSeenAt`]: submittedAt,
    [`logs/${logKey}`]: {
      timestamp: submittedAt,
      teamId,
      action: 'submit_answer',
      cpId,
      payload: {
        correct,
        scoreDelta,
        hintUsed,
        wasPolluted: Boolean(checkpoint.polluted),
      },
    } satisfies LogEntry,
  })

  return answerLog
}

export async function useSkill(teamId: TeamId, targetCpId: CheckpointId) {
  const [teamSnapshot, gameSnapshot, checkpointsSnapshot] = await Promise.all([
    get(ref(database, `teams/${teamId}`)),
    get(ref(database, 'game')),
    get(ref(database, 'checkpoints')),
  ])
  const team = teamSnapshot.val() as Team | null
  const game = gameSnapshot.val() as GameState | null
  const checkpoints = (checkpointsSnapshot.val() ?? {}) as Partial<
    Record<CheckpointId, Checkpoint>
  >

  if (!team || !game || !checkpoints[targetCpId]) {
    throw new GameError('遊戲資料尚未準備完成。', 'missing-data')
  }

  if (game.status !== 'running') {
    throw new GameError('遊戲進行中才可使用技能。', 'game-not-running')
  }

  const normalizedTeam = normalizeTeam(team)

  if (normalizedTeam.skillUsed) {
    throw new GameError('本隊已使用過技能。', 'skill-used')
  }

  const skillAt = now()
  const nextCheckpoints = {
    ...checkpoints,
    [targetCpId]:
      normalizedTeam.role === 'repair'
        ? {
            ...normalizeCheckpoint(checkpoints[targetCpId]),
            polluted: false,
            pollutedBy: null,
            pollutedAt: null,
          }
        : {
            ...normalizeCheckpoint(checkpoints[targetCpId]),
            polluted: true,
            pollutedBy: teamId,
            pollutedAt: skillAt,
          },
  }
  const logKey = push(ref(database, 'logs')).key

  if (!logKey) {
    throw new GameError('無法寫入紀錄。', 'log-key-failed')
  }

  await update(ref(database), {
    [`checkpoints/${targetCpId}/polluted`]: normalizedTeam.role === 'overwrite',
    [`checkpoints/${targetCpId}/pollutedBy`]:
      normalizedTeam.role === 'overwrite' ? teamId : null,
    [`checkpoints/${targetCpId}/pollutedAt`]:
      normalizedTeam.role === 'overwrite' ? skillAt : null,
    [`teams/${teamId}/skillUsed`]: true,
    [`teams/${teamId}/lastSeenAt`]: skillAt,
    'game/repairRate': calculateRepairRate(nextCheckpoints),
    [`logs/${logKey}`]: {
      timestamp: skillAt,
      teamId,
      action: normalizedTeam.role === 'repair' ? 'repair_checkpoint' : 'overwrite_checkpoint',
      cpId: targetCpId,
      payload: {
        role: normalizedTeam.role,
      },
    } satisfies LogEntry,
  })
}

export async function submitVote(teamId: TeamId, votedFor: TeamId) {
  if (teamId === votedFor) {
    throw new GameError('不能投給自己的隊伍。', 'vote-self')
  }

  const [teamSnapshot, gameSnapshot, existingVoteSnapshot] = await Promise.all([
    get(ref(database, `teams/${teamId}`)),
    get(ref(database, 'game')),
    get(ref(database, `votes/${teamId}`)),
  ])
  const team = teamSnapshot.val() as Team | null
  const game = gameSnapshot.val() as GameState | null

  if (!team || !game) {
    throw new GameError('遊戲資料尚未準備完成。', 'missing-data')
  }

  if (!team.finished && game.status !== 'ended') {
    throw new GameError('完成路線或遊戲結束後才能投票。', 'vote-not-ready')
  }

  if (existingVoteSnapshot.exists()) {
    throw new GameError('本隊已完成投票。', 'vote-exists')
  }

  const submittedAt = now()
  const vote: Vote = { votedFor, submittedAt }
  const logKey = push(ref(database, 'logs')).key

  if (!logKey) {
    throw new GameError('無法寫入紀錄。', 'log-key-failed')
  }

  await update(ref(database), {
    [`votes/${teamId}`]: vote,
    [`teams/${teamId}/lastSeenAt`]: submittedAt,
    [`logs/${logKey}`]: {
      timestamp: submittedAt,
      teamId,
      action: 'submit_vote',
      cpId: null,
      payload: { votedFor },
    } satisfies LogEntry,
  })
}

export async function adminStartGame() {
  const startedAt = now()
  const durationMinutesSnapshot = await get(ref(database, 'game/durationMinutes'))
  const durationMinutes = Number(durationMinutesSnapshot.val() ?? 45)

  await update(ref(database, 'game'), {
    status: 'running',
    startedAt,
    endsAt: startedAt + durationMinutes * 60 * 1000,
    durationMinutes,
  })
  await writeLog('admin', 'admin_start_game')
}

export async function adminEndGame() {
  await update(ref(database, 'game'), {
    status: 'ended',
    endsAt: now(),
  })
  await writeLog('admin', 'admin_end_game')
}

export async function adminResetGame() {
  await set(ref(database), createInitialData())
  await writeLog('admin', 'admin_reset_game')
}

export async function adminManualScoreAdjust(
  teamId: TeamId,
  delta: number,
  reason: string,
) {
  await runTransaction(ref(database, `teams/${teamId}/score`), (current) => {
    return Number(current ?? 0) + delta
  })
  await writeLog('admin', 'admin_manual_score_adjust', null, {
    teamId,
    delta,
    reason,
  })
}

export async function adminResetTeamUid(teamId: TeamId) {
  await update(ref(database, `teams/${teamId}`), {
    uid: null,
    lastSeenAt: null,
  })
  await writeLog('admin', 'admin_reset_team_uid', null, { teamId })
}

export function getRootDataWithDefaults(data: RootData | null): RootData {
  return data ?? createInitialData()
}

export function parseCheckpointId(value: string | undefined): CheckpointId | null {
  return value && isCheckpointId(value) ? value : null
}
