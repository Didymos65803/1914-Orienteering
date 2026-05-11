import { useState } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TEAM_IDS } from '../data/seed'
import { useRealtimeValue } from '../hooks/useRealtimeValue'
import { submitVote } from '../lib/game'
import { getStoredTeamId } from '../lib/session'
import type { GameState, Team, TeamId, Vote } from '../types'

export function VotePage() {
  const teamId = getStoredTeamId()
  const { data: team } = useRealtimeValue<Team>(`teams/${teamId}`)
  const { data: game } = useRealtimeValue<GameState>('game')
  const { data: existingVote } = useRealtimeValue<Vote>(`votes/${teamId}`)
  const [selectedTeamId, setSelectedTeamId] = useState<TeamId | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const canVote = Boolean(team?.finished || game?.status === 'ended')

  async function handleSubmitVote() {
    if (!teamId || !selectedTeamId) {
      return
    }

    setLoading(true)
    setError('')

    try {
      await submitVote(teamId, selectedTeamId)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '投票失敗，請再試一次。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="space-y-2">
        <Link className="back-link" to="/map">
          <ArrowLeft aria-hidden size={20} />
          回地圖
        </Link>
        <p className="text-base font-semibold text-accent">最終投票</p>
        <h1 className="text-3xl font-bold text-slate-950">選擇一隊</h1>
        <p className="text-lg text-slate-700">每隊只能投票一次，不能投給自己。</p>
      </section>

      <section className="panel space-y-5">
        {existingVote ? (
          <div className="space-y-3 text-center">
            <h2 className="text-2xl font-bold text-slate-950">已完成投票</h2>
            <p className="text-xl font-semibold text-slate-800">
              你們投給：隊伍 {existingVote.votedFor}
            </p>
            <Link className="primary-button" to="/map">
              回地圖
            </Link>
          </div>
        ) : (
          <>
            {!canVote && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-lg font-semibold text-amber-900">
                完成路線或遊戲結束後才能投票。
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TEAM_IDS.filter((id) => id !== teamId).map((id) => (
                <button
                  className={`team-vote-button ${selectedTeamId === id ? 'team-vote-button-selected' : ''}`}
                  type="button"
                  key={id}
                  disabled={!canVote}
                  onClick={() => setSelectedTeamId(id)}
                >
                  隊伍 {id}
                </button>
              ))}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-base font-semibold text-red-700">
                {error}
              </div>
            )}

            <button
              className="primary-button w-full"
              disabled={!canVote || !selectedTeamId || loading}
              onClick={handleSubmitVote}
            >
              <Send aria-hidden size={24} />
              {loading ? '送出中' : '送出投票'}
            </button>
          </>
        )}
      </section>
    </main>
  )
}
