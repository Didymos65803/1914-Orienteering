import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  KeyRound,
  Play,
  RotateCcw,
  Save,
  Square,
} from 'lucide-react'
import { CHECKPOINT_IDS, TEAM_IDS, checkpointContent } from '../data/seed'
import { useRealtimeValue } from '../hooks/useRealtimeValue'
import {
  adminEndGame,
  adminManualScoreAdjust,
  adminResetGame,
  adminResetTeamUid,
  adminStartGame,
  ensureAnonymousAuth,
  getCurrentTargetCheckpoint,
  getRoleLabel,
} from '../lib/game'
import type { LogEntry, RootData, TeamId } from '../types'

const ADMIN_SESSION_KEY = 'huashanArchiveRunAdmin'

function formatDateTime(value: number | null | undefined) {
  if (!value) {
    return '無'
  }

  return new Date(value).toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function summarizeVotes(data: RootData | null) {
  const summary = TEAM_IDS.reduce(
    (counts, teamId) => {
      counts[teamId] = 0
      return counts
    },
    {} as Record<TeamId, number>,
  )

  Object.values(data?.votes ?? {}).forEach((vote) => {
    if (vote?.votedFor) {
      summary[vote.votedFor] += 1
    }
  })

  return summary
}

function getRecentLogs(logs: RootData['logs']) {
  return Object.entries(logs ?? {})
    .map(([id, log]) => ({ id, ...log }))
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 25)
}

export function AdminPage() {
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD ?? ''
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(
    window.sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true',
  )
  const [authReady, setAuthReady] = useState(false)
  const [notice, setNotice] = useState('')
  const [scoreTeamId, setScoreTeamId] = useState<TeamId>('A')
  const [scoreDelta, setScoreDelta] = useState('')
  const [scoreReason, setScoreReason] = useState('')
  const { data, loading, error } = useRealtimeValue<RootData>(
    '',
    authed && authReady,
  )

  const scoreboard = useMemo(() => {
    return TEAM_IDS.map((teamId) => ({
      teamId,
      team: data?.teams?.[teamId],
    })).sort((left, right) => (right.team?.score ?? 0) - (left.team?.score ?? 0))
  }, [data?.teams])
  const voteSummary = useMemo(() => summarizeVotes(data), [data])
  const recentLogs = useMemo(() => getRecentLogs(data?.logs), [data?.logs])

  useEffect(() => {
    if (!authed) {
      return
    }

    let active = true
    ensureAnonymousAuth()
      .then(() => {
        if (active) {
          setAuthReady(true)
        }
      })
      .catch((caught) => {
        if (active) {
          setNotice(
            caught instanceof Error ? caught.message : '匿名登入失敗，無法讀取後台。',
          )
        }
      })

    return () => {
      active = false
    }
  }, [authed])

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (adminPassword && password === adminPassword) {
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
      setAuthed(true)
      setNotice('')
    } else {
      setNotice('密碼不正確，或尚未設定 VITE_ADMIN_PASSWORD。')
    }
  }

  async function runAdminAction(action: () => Promise<void>, message: string) {
    setNotice('')
    try {
      await ensureAnonymousAuth()
      await action()
      setNotice(message)
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : '操作失敗。')
    }
  }

  async function handleScoreAdjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const delta = Number(scoreDelta)

    if (!Number.isFinite(delta) || !scoreReason.trim()) {
      setNotice('請輸入有效分數與調整原因。')
      return
    }

    await runAdminAction(
      () => adminManualScoreAdjust(scoreTeamId, delta, scoreReason.trim()),
      '分數已調整。',
    )
    setScoreDelta('')
    setScoreReason('')
  }

  if (!authed) {
    return (
      <main className="page-shell min-h-screen justify-center">
        <section className="panel max-w-xl space-y-6">
          <div className="space-y-2">
            <p className="text-base font-semibold text-accent">Admin</p>
            <h1 className="text-3xl font-bold text-slate-950">後台登入</h1>
            <p className="text-lg text-slate-700">
              請輸入 VITE_ADMIN_PASSWORD 設定的本機後台密碼。
            </p>
          </div>

          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <input
              className="text-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="管理密碼"
            />
            <button className="primary-button w-full">
              <KeyRound aria-hidden size={24} />
              進入後台
            </button>
          </form>

          {notice && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-base font-semibold text-amber-900">
              {notice}
            </div>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="admin-shell">
      <section className="space-y-2">
        <p className="text-base font-semibold text-accent">Huashan Archive Run</p>
        <h1 className="text-3xl font-bold text-slate-950">即時管理後台</h1>
        <p className="text-lg text-slate-700">
          {loading ? '讀取即時資料中' : '資料會隨 Firebase Realtime Database 更新。'}
        </p>
        {error && (
          <p className="text-base font-semibold text-red-700">
            Firebase 讀取失敗：{error.message}
          </p>
        )}
        {notice && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-base font-semibold text-slate-800">
            {notice}
          </div>
        )}
      </section>

      <section className="admin-section">
        <div>
          <h2>遊戲狀態</h2>
          <p>
            狀態：{data?.game?.status ?? '無資料'}，結束時間：
            {formatDateTime(data?.game?.endsAt)}
          </p>
          <p>
            修復率：
            {Math.round((data?.game?.repairRate ?? 0) * 100)}
            %
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="primary-button"
            onClick={() => runAdminAction(adminStartGame, '遊戲已開始。')}
          >
            <Play aria-hidden size={22} />
            開始
          </button>
          <button
            className="secondary-button"
            onClick={() => runAdminAction(adminEndGame, '遊戲已結束。')}
          >
            <Square aria-hidden size={22} />
            結束
          </button>
          <button
            className="danger-button"
            onClick={() => {
              if (window.confirm('確定要重設全部資料？此操作會清空答案與投票。')) {
                void runAdminAction(adminResetGame, '遊戲已重設。')
              }
            }}
          >
            <RotateCcw aria-hidden size={22} />
            重設
          </button>
        </div>
      </section>

      <section className="admin-section">
        <h2>隊伍狀態</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>隊伍</th>
                <th>類型</th>
                <th>目前控制點</th>
                <th>進度</th>
                <th>分數</th>
                <th>技能</th>
                <th>完成</th>
                <th>UID</th>
                <th>登入重設</th>
              </tr>
            </thead>
            <tbody>
              {TEAM_IDS.map((teamId) => {
                const team = data?.teams?.[teamId]
                const target = team ? getCurrentTargetCheckpoint(team) : null

                return (
                  <tr key={teamId}>
                    <td className="font-bold">{teamId}</td>
                    <td>{team ? getRoleLabel(team.role) : '無資料'}</td>
                    <td>{target ?? '完成'}</td>
                    <td>
                      {team
                        ? `${Math.min(team.currentIndex, team.route.length)}/${team.route.length}`
                        : '0/6'}
                    </td>
                    <td>{team?.score ?? 0}</td>
                    <td>{team?.skillUsed ? '已用' : '未用'}</td>
                    <td>{team?.finished ? '是' : '否'}</td>
                    <td className="max-w-52 truncate">{team?.uid ?? '未綁定'}</td>
                    <td>
                      <button
                        className="small-button"
                        onClick={() =>
                          runAdminAction(
                            () => adminResetTeamUid(teamId),
                            `隊伍 ${teamId} UID 已重設。`,
                          )
                        }
                      >
                        重設 UID
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="admin-section">
          <h2>控制點狀態</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CP</th>
                  <th>名稱</th>
                  <th>不明提示</th>
                  <th>來源</th>
                </tr>
              </thead>
              <tbody>
                {CHECKPOINT_IDS.map((cpId) => {
                  const checkpoint = data?.checkpoints?.[cpId]
                  return (
                    <tr key={cpId}>
                      <td className="font-bold">{cpId}</td>
                      <td>{checkpointContent[cpId].name}</td>
                      <td>{checkpoint?.polluted ? '有' : '無'}</td>
                      <td>{checkpoint?.pollutedBy ?? '無'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-section">
          <h2>排行榜</h2>
          <div className="grid gap-2">
            {scoreboard.map(({ teamId, team }, index) => (
              <div className="score-row" key={teamId}>
                <span>{index + 1}</span>
                <strong>隊伍 {teamId}</strong>
                <span>{team?.score ?? 0} 分</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="admin-section">
          <h2>投票統計</h2>
          <div className="grid gap-2">
            {TEAM_IDS.map((teamId) => (
              <div className="score-row" key={teamId}>
                <strong>隊伍 {teamId}</strong>
                <span>{voteSummary[teamId]} 票</span>
              </div>
            ))}
          </div>
        </div>

        <form className="admin-section" onSubmit={handleScoreAdjust}>
          <h2>手動調整分數</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="text-input"
              value={scoreTeamId}
              onChange={(event) => setScoreTeamId(event.target.value as TeamId)}
            >
              {TEAM_IDS.map((teamId) => (
                <option key={teamId} value={teamId}>
                  隊伍 {teamId}
                </option>
              ))}
            </select>
            <input
              className="text-input"
              type="number"
              value={scoreDelta}
              onChange={(event) => setScoreDelta(event.target.value)}
              placeholder="分數變化"
            />
            <input
              className="text-input"
              value={scoreReason}
              onChange={(event) => setScoreReason(event.target.value)}
              placeholder="原因"
            />
          </div>
          <button className="primary-button">
            <Save aria-hidden size={22} />
            儲存調整
          </button>
        </form>
      </section>

      <section className="admin-section">
        <h2>近期紀錄</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>時間</th>
                <th>隊伍</th>
                <th>動作</th>
                <th>控制點</th>
                <th>資料</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log: LogEntry & { id: string }) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.timestamp)}</td>
                  <td>{log.teamId ?? '系統'}</td>
                  <td>{log.action}</td>
                  <td>{log.cpId ?? '無'}</td>
                  <td className="max-w-96 truncate">
                    {log.payload ? JSON.stringify(log.payload) : '無'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
