import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  X,
  XCircle,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { checkpointContent } from '../data/seed'
import { useRealtimeValue } from '../hooks/useRealtimeValue'
import {
  getCurrentTargetCheckpoint,
  parseCheckpointId,
  submitAnswer,
} from '../lib/game'
import { getStoredTeamId } from '../lib/session'
import type { AnswerLog, Checkpoint, CheckpointId, GameState, Team } from '../types'

function moveItem(items: string[], fromIndex: number, toIndex: number) {
  const nextItems = [...items]
  const [item] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, item)
  return nextItems
}

export function CheckpointPage() {
  const { cpId: cpIdParam } = useParams()
  const cpId = parseCheckpointId(cpIdParam)

  return <CheckpointFlow key={cpIdParam ?? 'missing'} cpId={cpId} />
}

function CheckpointFlow({ cpId }: { cpId: CheckpointId | null }) {
  const teamId = getStoredTeamId()
  const { data: team } = useRealtimeValue<Team>(`teams/${teamId}`)
  const { data: game } = useRealtimeValue<GameState>('game')
  const { data: checkpoint } = useRealtimeValue<Checkpoint>(
    cpId ? `checkpoints/${cpId}` : 'checkpoints/invalid',
  )
  const [singleChoiceAnswer, setSingleChoiceAnswer] = useState('')
  const [orderingAnswer, setOrderingAnswer] = useState<string[]>([])
  const [hintRevealed, setHintRevealed] = useState(false)
  const [result, setResult] = useState<AnswerLog | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const content = cpId ? checkpointContent[cpId] : null
  const targetCpId = useMemo(() => {
    return team ? getCurrentTargetCheckpoint(team) : null
  }, [team])
  const isCurrentCp = Boolean(cpId && targetCpId === cpId)
  const canAnswer = isCurrentCp && game?.status === 'running' && !result

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!teamId || !cpId || !content) {
      return
    }

    const answer =
      content.type === 'single-choice' ? singleChoiceAnswer : orderingAnswer

    setSubmitting(true)
    setError('')

    try {
      const nextResult = await submitAnswer(teamId, cpId, answer, hintRevealed)
      setResult(nextResult)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '送出失敗，請再試一次。')
    } finally {
      setSubmitting(false)
    }
  }

  if (!cpId || !content) {
    return (
      <main className="page-shell">
        <section className="panel space-y-4">
          <h1 className="text-2xl font-bold">控制點不存在</h1>
          <Link className="primary-button" to="/map">
            <ArrowLeft aria-hidden size={22} />
            回地圖
          </Link>
        </section>
      </main>
    )
  }

  if (result) {
    return (
      <main className="page-shell">
        <section className="panel space-y-5 text-center">
          {result.correct ? (
            <CheckCircle2 className="mx-auto text-green-600" size={64} aria-hidden />
          ) : (
            <XCircle className="mx-auto text-amber-600" size={64} aria-hidden />
          )}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-950">
              {result.correct ? '答案正確' : '答案未完全正確'}
            </h1>
            <p className="text-xl font-semibold text-slate-800">
              分數變化：{result.scoreDelta > 0 ? '+' : ''}
              {result.scoreDelta}
            </p>
            {result.hintUsed && (
              <p className="text-base text-slate-600">已扣除提示分數 30 分。</p>
            )}
          </div>
          <Link className="primary-button" to="/map">
            <ArrowLeft aria-hidden size={22} />
            回地圖
          </Link>
        </section>
      </main>
    )
  }

  if (!isCurrentCp) {
    return (
      <main className="page-shell">
        <section className="panel space-y-5">
          <p className="text-base font-semibold text-accent">{cpId}</p>
          <h1 className="text-2xl font-bold text-slate-950">
            這不是你們目前的控制點，請回到地圖確認下一站。
          </h1>
          <Link className="primary-button" to="/map">
            <ArrowLeft aria-hidden size={22} />
            回地圖
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="page-shell">
      <section className="space-y-2">
        <p className="text-base font-semibold text-accent">{cpId}</p>
        <h1 className="text-3xl font-bold text-slate-950">{content.name}</h1>
        <p className="text-lg text-slate-700">
          {game?.status === 'running' ? '請確認題目後送出答案。' : '遊戲尚未進行。'}
        </p>
      </section>

      <section className="panel space-y-5">
        {!hintRevealed ? (
          <button
            className="secondary-button w-full"
            type="button"
            onClick={() => setHintRevealed(true)}
            disabled={!canAnswer}
          >
            <Lightbulb aria-hidden size={24} />
            顯示提示（-30）
          </button>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-left">
            <p className="text-base font-bold text-amber-900">
              {checkpoint?.polluted
                ? '你們收到一則不明提示，請自行判斷是否可信。'
                : '提示'}
            </p>
            <p className="mt-2 text-lg leading-relaxed text-slate-900">
              {checkpoint?.polluted ? content.pollutedHint : content.normalHint}
            </p>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold leading-snug text-slate-950">
            {content.question}
          </h2>

          {content.type === 'single-choice' ? (
            <div className="grid gap-3">
              {content.choices.map((choice) => (
                <label
                  className={`answer-option ${singleChoiceAnswer === choice.key ? 'answer-option-selected' : ''}`}
                  key={choice.key}
                >
                  <input
                    className="h-5 w-5"
                    type="radio"
                    name="answer"
                    value={choice.key}
                    checked={singleChoiceAnswer === choice.key}
                    onChange={(event) => setSingleChoiceAnswer(event.target.value)}
                    disabled={!canAnswer}
                  />
                  <span>
                    {choice.key}. {choice.label}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2">
                {orderingAnswer.map((item, index) => (
                  <div className="answer-option answer-option-selected" key={item}>
                    <span className="min-w-8 font-bold">{index + 1}</span>
                    <span className="flex-1">{item}</span>
                    <button
                      type="button"
                      className="icon-button-sm"
                      title="上移"
                      disabled={index === 0 || !canAnswer}
                      onClick={() =>
                        setOrderingAnswer((current) =>
                          moveItem(current, index, index - 1),
                        )
                      }
                    >
                      <ArrowUp aria-hidden size={18} />
                    </button>
                    <button
                      type="button"
                      className="icon-button-sm"
                      title="下移"
                      disabled={index === orderingAnswer.length - 1 || !canAnswer}
                      onClick={() =>
                        setOrderingAnswer((current) =>
                          moveItem(current, index, index + 1),
                        )
                      }
                    >
                      <ArrowDown aria-hidden size={18} />
                    </button>
                    <button
                      type="button"
                      className="icon-button-sm"
                      title="移除"
                      disabled={!canAnswer}
                      onClick={() =>
                        setOrderingAnswer((current) =>
                          current.filter((currentItem) => currentItem !== item),
                        )
                      }
                    >
                      <X aria-hidden size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid gap-2">
                {content.items
                  .filter((item) => !orderingAnswer.includes(item))
                  .map((item) => (
                    <button
                      className="answer-option"
                      type="button"
                      key={item}
                      disabled={!canAnswer}
                      onClick={() =>
                        setOrderingAnswer((current) => [...current, item])
                      }
                    >
                      {item}
                    </button>
                  ))}
              </div>

              <button
                className="secondary-button w-full"
                type="button"
                disabled={!canAnswer || orderingAnswer.length === 0}
                onClick={() => setOrderingAnswer([])}
              >
                <RotateCcw aria-hidden size={22} />
                重排
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-base font-semibold text-red-700">
              {error}
            </div>
          )}

          <button
            className="primary-button w-full"
            disabled={
              !canAnswer ||
              submitting ||
              (content.type === 'single-choice'
                ? !singleChoiceAnswer
                : orderingAnswer.length !== content.items.length)
            }
          >
            {submitting ? '送出中' : '送出答案'}
          </button>
        </form>
      </section>
    </main>
  )
}
