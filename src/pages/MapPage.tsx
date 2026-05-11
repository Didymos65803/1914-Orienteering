import { useEffect, useMemo, useState } from 'react'
import {
  LogOut,
  MapPinned,
  ScanLine,
  Timer,
  Vote,
  Wrench,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { checkpointContent } from '../data/seed'
import { useRealtimeValue } from '../hooks/useRealtimeValue'
import {
  getCurrentTargetCheckpoint,
  getRoleLabel,
} from '../lib/game'
import { clearStoredTeamId, getStoredTeamId } from '../lib/session'
import type { GameState, Team } from '../types'

function formatTime(ms: number) {
  const safeMs = Math.max(ms, 0)
  const totalSeconds = Math.floor(safeMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function MapPage() {
  const navigate = useNavigate()
  const teamId = getStoredTeamId()
  const { data: team, loading: teamLoading } = useRealtimeValue<Team>(
    `teams/${teamId}`,
  )
  const { data: game } = useRealtimeValue<GameState>('game')
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timerId)
  }, [])

  const currentTarget = useMemo(() => {
    return team ? getCurrentTargetCheckpoint(team) : null
  }, [team])
  const progress = team
    ? `${Math.min(team.currentIndex, team.route.length)}/${team.route.length}`
    : '0/6'
  const remainingTime =
    game?.status === 'running' && game.endsAt
      ? formatTime(game.endsAt - nowMs)
      : game?.status === 'ended'
        ? '已結束'
        : '尚未開始'

  if (teamLoading) {
    return <main className="page-shell">讀取隊伍資料中</main>
  }

  if (!teamId || !team) {
    return (
      <main className="page-shell">
        <section className="panel space-y-4">
          <h1 className="text-2xl font-bold">尚未建立隊伍資料</h1>
          <p className="text-lg text-slate-700">請先由管理員重設遊戲，再重新登入。</p>
          <Link className="primary-button" to="/login">
            回登入頁
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="page-shell">
      <section className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-accent">華山 Archive Run</p>
          <h1 className="text-3xl font-bold text-slate-950">隊伍 {teamId}</h1>
        </div>
        <button
          className="icon-button"
          title="登出本機"
          onClick={() => {
            clearStoredTeamId()
            navigate('/login', { replace: true })
          }}
        >
          <LogOut aria-hidden size={22} />
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="stat-card">
          <span>任務類型</span>
          <strong>{getRoleLabel(team.role)}</strong>
        </div>
        <div className="stat-card">
          <span>分數</span>
          <strong>{team.score}</strong>
        </div>
        <div className="stat-card">
          <span>進度</span>
          <strong>{progress}</strong>
        </div>
        <div className="stat-card">
          <span className="inline-flex items-center gap-2">
            <Timer aria-hidden size={18} />
            剩餘時間
          </span>
          <strong>{remainingTime}</strong>
        </div>
      </section>

      <section className="panel space-y-4">
        <div className="flex items-start gap-3">
          <MapPinned className="mt-1 text-accent" aria-hidden size={28} />
          <div>
            <h2 className="text-2xl font-bold text-slate-950">目前控制點</h2>
            <p className="text-xl font-semibold text-slate-800">
              {currentTarget
                ? `${currentTarget} ${checkpointContent[currentTarget].name}`
                : '已完成全部控制點'}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <img
            className="aspect-[4/3] w-full object-cover"
            src={`${import.meta.env.BASE_URL}map-placeholder.svg`}
            alt="華山 1914 定向地圖示意"
          />
        </div>
      </section>

      <section className="grid gap-3">
        <Link
          className={`primary-button ${!currentTarget || game?.status !== 'running' ? 'pointer-events-none opacity-50' : ''}`}
          to={currentTarget ? `/checkpoint/${currentTarget}` : '/map'}
        >
          <ScanLine aria-hidden size={24} />
          前往掃描控制點
        </Link>
        <Link className="secondary-button" to="/skill">
          <Wrench aria-hidden size={24} />
          使用技能
        </Link>
        {(team.finished || game?.status === 'ended') && (
          <Link className="secondary-button" to="/vote">
            <Vote aria-hidden size={24} />
            最終投票
          </Link>
        )}
      </section>

      {game?.status !== 'running' && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-lg font-semibold text-amber-900">
          {game?.status === 'ended'
            ? '遊戲已結束，可以前往最終投票。'
            : '遊戲尚未開始，請等待管理員開始。'}
        </section>
      )}
    </main>
  )
}
