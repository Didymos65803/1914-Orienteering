import type { FormEvent } from 'react'
import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { loginWithTeamCode } from '../lib/game'
import { storeTeamId } from '../lib/session'

export function LoginPage() {
  const navigate = useNavigate()
  const [teamCode, setTeamCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await loginWithTeamCode(teamCode)
      storeTeamId(result.teamId)
      navigate('/map', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '登入失敗，請再試一次。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell min-h-screen justify-center">
      <section className="panel space-y-8">
        <div className="space-y-3">
          <p className="text-base font-semibold text-accent">Huashan 1914</p>
          <h1 className="text-4xl font-bold leading-tight text-slate-950">
            華山 Archive Run
          </h1>
          <p className="text-xl text-slate-700">請輸入隊伍代碼</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-left">
            <span className="text-lg font-semibold text-slate-900">隊伍代碼</span>
            <input
              className="text-input text-center text-2xl uppercase"
              value={teamCode}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="A1914"
              onChange={(event) => setTeamCode(event.target.value)}
            />
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-left text-base font-semibold text-red-700">
              {error}
            </div>
          )}

          <button className="primary-button w-full" disabled={loading || !teamCode.trim()}>
            <LogIn aria-hidden size={24} />
            {loading ? '登入中' : '登入'}
          </button>
        </form>

        <p className="text-base leading-relaxed text-slate-600">
          若隊伍已綁定其他裝置，請管理員在後台重設該隊 UID 後再登入。
        </p>
      </section>
    </main>
  )
}
