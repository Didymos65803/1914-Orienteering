import type {
  Checkpoint,
  CheckpointContent,
  CheckpointId,
  GameState,
  RootData,
  Team,
  TeamId,
} from '../types'

export const TEAM_IDS: TeamId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export const CHECKPOINT_IDS: CheckpointId[] = [
  'CP1',
  'CP2',
  'CP3',
  'CP4',
  'CP5',
  'CP6',
]

export const checkpointContent: Record<CheckpointId, CheckpointContent> = {
  CP1: {
    id: 'CP1',
    name: '紅磚記憶',
    type: 'single-choice',
    question: '此處最適合對應華山哪一種早期記憶？',
    choices: [
      { key: 'A', label: '樟腦與早期工業生產' },
      { key: 'B', label: '現代玻璃辦公空間' },
      { key: 'C', label: '河岸倉儲碼頭' },
    ],
    answer: 'A',
    pollutedHint:
      '這裡最重要的是它現在如何被品牌化，不一定要看早期工業痕跡。',
    normalHint: '注意紅磚與早期工業用途。',
  },
  CP2: {
    id: 'CP2',
    name: '酒廠時間線',
    type: 'ordering',
    question: '請排出最能描述華山轉變的時間順序。',
    items: [
      '1914 芳釀社產製清酒',
      '1929 改名為專賣局台北酒工場',
      '1987 酒廠遷往林口',
      '1999 華山藝文特區正式實施',
    ],
    answer: [
      '1914 芳釀社產製清酒',
      '1929 改名為專賣局台北酒工場',
      '1987 酒廠遷往林口',
      '1999 華山藝文特區正式實施',
    ],
    pollutedHint: '藝文特區的形成應放在最前面理解。',
    normalHint: '先想工業生產，再想遷出與轉型。',
  },
  CP3: {
    id: 'CP3',
    name: '公共動線',
    type: 'single-choice',
    question: '在公共園區進行定向越野時，哪一種行為最不合適？',
    choices: [
      { key: 'A', label: '快走前往下一站' },
      { key: 'B', label: '小聲討論答案' },
      { key: 'C', label: '奔跑穿越人群' },
      { key: 'D', label: '遇到排隊動線時繞路' },
    ],
    answer: 'C',
    pollutedHint: '速度越快越好，路線越短越好。',
    normalHint: '這不是競速跑，是定向與判讀。',
  },
  CP4: {
    id: 'CP4',
    name: '方位觀察',
    type: 'single-choice',
    question: '站在此控制點，觀察地圖上標出的高塔方向。它最接近哪個方位？',
    choices: [
      { key: 'A', label: '東北' },
      { key: 'B', label: '東南' },
      { key: 'C', label: '西北' },
      { key: 'D', label: '西南' },
    ],
    answer: 'A',
    pollutedHint: '不要相信地圖，直接跟著人潮走。',
    normalHint: '請用地圖與現場方向對照。',
  },
  CP5: {
    id: 'CP5',
    name: '安全移動',
    type: 'single-choice',
    question: '若前方有展演排隊人潮，最適合的行動是？',
    choices: [
      { key: 'A', label: '穿越隊伍節省時間' },
      { key: 'B', label: '繞路並保持隊形' },
      { key: 'C', label: '派一人衝去掃碼' },
      { key: 'D', label: '大聲請路人讓路' },
    ],
    answer: 'B',
    pollutedHint: '控制點最重要，可以派最快的人先過去。',
    normalHint: '全組安全與公共秩序優先。',
  },
  CP6: {
    id: 'CP6',
    name: '最終檔案',
    type: 'ordering',
    question: '請排出最能描述華山空間變化的四個詞。',
    items: ['生產', '閒置', '介入', '轉型'],
    answer: ['生產', '閒置', '介入', '轉型'],
    pollutedHint: '從轉型開始理解，其他只是背景。',
    normalHint: '先有工業生產，再有遷出後的空間變化。',
  },
}

export const teamRoutes: Record<TeamId, CheckpointId[]> = {
  A: ['CP1', 'CP2', 'CP3', 'CP4', 'CP5', 'CP6'],
  B: ['CP2', 'CP3', 'CP4', 'CP5', 'CP6', 'CP1'],
  C: ['CP3', 'CP4', 'CP5', 'CP6', 'CP1', 'CP2'],
  D: ['CP4', 'CP5', 'CP6', 'CP1', 'CP2', 'CP3'],
  E: ['CP5', 'CP6', 'CP1', 'CP2', 'CP3', 'CP4'],
  F: ['CP6', 'CP1', 'CP2', 'CP3', 'CP4', 'CP5'],
  G: ['CP1', 'CP3', 'CP5', 'CP2', 'CP4', 'CP6'],
  H: ['CP2', 'CP4', 'CP6', 'CP1', 'CP3', 'CP5'],
}

export const initialGameState: GameState = {
  status: 'waiting',
  startedAt: null,
  endsAt: null,
  durationMinutes: 45,
  repairRate: 1,
}

export function createInitialTeams(): Record<TeamId, Team> {
  return TEAM_IDS.reduce(
    (teams, teamId) => {
      teams[teamId] = {
        code: `${teamId}1914`,
        role: ['B', 'D', 'F'].includes(teamId) ? 'overwrite' : 'repair',
        route: teamRoutes[teamId],
        currentIndex: 0,
        score: 0,
        skillUsed: false,
        finished: false,
        uid: null,
        lastSeenAt: null,
      }
      return teams
    },
    {} as Record<TeamId, Team>,
  )
}

export function createInitialCheckpoints(): Record<CheckpointId, Checkpoint> {
  return CHECKPOINT_IDS.reduce(
    (checkpoints, cpId) => {
      checkpoints[cpId] = {
        name: checkpointContent[cpId].name,
        polluted: false,
        pollutedBy: null,
        pollutedAt: null,
      }
      return checkpoints
    },
    {} as Record<CheckpointId, Checkpoint>,
  )
}

export function createInitialData(): RootData {
  return {
    game: initialGameState,
    teams: createInitialTeams(),
    checkpoints: createInitialCheckpoints(),
    answers: {},
    logs: {},
    votes: {},
  }
}
