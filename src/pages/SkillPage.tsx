import { useState } from 'react'
import { ArrowLeft, ShieldCheck, Wrench } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { CHECKPOINT_IDS, checkpointContent } from '../data/seed'
import { useRealtimeValue } from '../hooks/useRealtimeValue'
import { getRoleLabel, useSkill as runTeamSkill } from '../lib/game'
import { getStoredTeamId } from '../lib/session'
import type { Checkpoint, CheckpointId, GameState, Team } from '../types'

export function SkillPage() {
  const navigate = useNavigate()
  const teamId = getStoredTeamId()
  const { data: team } = useRealtimeValue<Team>(`teams/${teamId}`)
  const { data: game } = useRealtimeValue<GameState>('game')
  const { data: checkpoints } =
    useRealtimeValue<Partial<Record<CheckpointId, Checkpoint>>>('checkpoints')
  const [selectedCpId, setSelectedCpId] = useState<CheckpointId>('CP1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleUseSkill() {
    if (!teamId || !team) {
      return
    }

    setLoading(true)
    setError('')

    try {
      await runTeamSkill(teamId, selectedCpId)
      navigate('/map')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '技能使用失敗，請再試一次。')
    } finally {
      setLoading(false)
    }
  }

  if (!team) {
    return (
      <main className="page-shell">
        <section className="panel space-y-4">
          <h1 className="text-2xl font-bold">讀取隊伍資料中</h1>
          <Link className="primary-button" to="/map">
            <ArrowLeft aria-hidden size={22} />
            回地圖
          </Link>
        </section>
      </main>
    )
  }

  const actionLabel = team.role === 'repair' ? '修復控制點' : '覆寫控制點'
  const description =
    team.role === 'repair'
      ? '選擇一個控制點，清除該站的不明提示。'
      : '選擇一個控制點，讓該站出現不明提示。'

  return (
    <main className="page-shell">
      <section className="space-y-2">
        <Link className="back-link" to="/map">
          <ArrowLeft aria-hidden size={20} />
          回地圖
        </Link>
        <p className="text-base font-semibold text-accent">技能</p>
        <h1 className="text-3xl font-bold text-slate-950">{actionLabel}</h1>
        <p className="text-lg text-slate-700">任務類型：{getRoleLabel(team.role)}</p>
      </section>

      <section className="panel space-y-5">
        {team.skillUsed ? (
          <div className="space-y-4 text-center">
            <ShieldCheck className="mx-auto text-accent" size={56} aria-hidden />
            <h2 className="text-2xl font-bold text-slate-950">技能已使用</h2>
            <p className="text-lg text-slate-700">每隊只能使用一次技能。</p>
            <Link className="primary-button" to="/map">
              回地圖
            </Link>
          </div>
        ) : (
          <>
            <p className="text-lg leading-relaxed text-slate-700">{description}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              {CHECKPOINT_IDS.map((cpId) => {
                const checkpoint = checkpoints?.[cpId]
                const selected = selectedCpId === cpId

                return (
                  <button
                    className={`checkpoint-choice ${selected ? 'checkpoint-choice-selected' : ''}`}
                    key={cpId}
                    type="button"
                    onClick={() => setSelectedCpId(cpId)}
                  >
                    <span className="text-xl font-bold">{cpId}</span>
                    <span>{checkpointContent[cpId].name}</span>
                    <span className={checkpoint?.polluted ? 'text-red-700' : 'text-green-700'}>
                      {checkpoint?.polluted
                        ? `不明提示：${checkpoint.pollutedBy ?? '未知'}`
                        : '狀態正常'}
                    </span>
                  </button>
                )
              })}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-base font-semibold text-red-700">
                {error}
              </div>
            )}

            <button
              className="primary-button w-full"
              disabled={loading || game?.status !== 'running'}
              onClick={handleUseSkill}
            >
              <Wrench aria-hidden size={24} />
              {loading ? '處理中' : actionLabel}
            </button>
            {game?.status !== 'running' && (
              <p className="text-base font-semibold text-amber-800">
                遊戲進行中才可使用技能。
              </p>
            )}
          </>
        )}
      </section>
    </main>
  )
}
