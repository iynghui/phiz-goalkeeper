import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  ArrowCounterClockwise, ArrowLeft, ArrowRight, CalendarCheck, CaretRight, CheckCircle,
  ChatCircleDots, ClockCounterClockwise, Compass, CurrencyCircleDollar, DeviceMobile,
  DotsThree, HandPalm, House, IdentificationCard, ImageSquare, Lightning, ListChecks,
  MagnifyingGlass, Medal, PlayCircle, Plus, ShieldCheck, SoccerBall, SquaresFour,
  Target, Translate, Trophy, UserPlus, UsersThree, Wallet,
} from "@phosphor-icons/react";
import { BottomSheet, KeyboardTextarea, MobileScroll, useKeyboard } from "./mobile";

type Screen = "home" | "match" | "result" | "tasks" | "task-detail" | "entry" | "wallet" | "history";
type Locale = "zh" | "en" | "pt";
type MatchPhase = "ready" | "runup" | "aiming" | "flight" | "feedback";
type TaskId = "verify" | "friend-one" | "friend-eleven" | "moment" | "beta";
type EntryId = "message" | "apps" | "games";

type DemoState = {
  gamePoints: number;
  cashRewardUnits: number;
  checkedInDate: string | null;
  completedTasks: TaskId[];
  locale: Locale;
  matches: Array<{ id: string; saved: number; won: boolean; reward: number }>;
};

type MatchState = {
  shot: number;
  saved: number;
  phase: MatchPhase;
  targetZone: number;
  selectedZone: number | null;
  lastSaved: boolean | null;
  isRevival: boolean;
  revivalCount: number;
};

type RoundResult = {
  saved: number;
  reward: number;
  settled: boolean;
  revivalsUsed: number;
};

const STORAGE_KEY = "phiz-goalkeeper-demo-v2";
const LEGACY_STORAGE_KEY = "phiz-goalkeeper-demo-v1";
const INITIAL_STATE: DemoState = {
  gamePoints: 10,
  cashRewardUnits: 0,
  checkedInDate: null,
  completedTasks: [],
  locale: "zh",
  matches: [],
};

const PAYOUT_UNITS = [0, 50, 90, 150, 230, 499] as const;

const DIFFICULTIES = [
  { id: "newcomer", from: 0, reactionMs: 2200, assistShots: 2 },
  { id: "standard", from: 1, reactionMs: 1800, assistShots: 0 },
  { id: "challenge", from: 3, reactionMs: 1450, assistShots: 0 },
  { id: "pro", from: 6, reactionMs: 1100, assistShots: 0 },
] as const;

type Difficulty = (typeof DIFFICULTIES)[number];

const TASKS: Array<{ id: TaskId; reward: number; icon: ReactNode }> = [
  { id: "verify", reward: 20, icon: <ShieldCheck weight="fill" /> },
  { id: "friend-one", reward: 30, icon: <UserPlus weight="fill" /> },
  { id: "friend-eleven", reward: 120, icon: <UsersThree weight="fill" /> },
  { id: "moment", reward: 30, icon: <PlayCircle weight="fill" /> },
  { id: "beta", reward: 80, icon: <SquaresFour weight="fill" /> },
];

const COPY = {
  zh: {
    back: "返回", exit: "返回 PhizChat", gamePoints: "游戏积分", home: "首页", tasks: "任务", match: "比赛", wallet: "Wallet",
    homeEyebrow: "PHIZ 安全守门挑战", homeTitleA: "和", homeTitleB: "一起，", homeTitleC: "守住安全", homeIntro: "判断射门方向，完成五次扑救。每局消耗 10 游戏积分。",
    checked: "今日已签到", checkIn: "每日签到", tomorrow: "明天再来领取", checkInReward: "+10 游戏积分", start: "开始比赛", earn: "做任务赚积分", viewWallet: "查看 Wallet", entryFlow: "查看 PhizChat 入口流程",
    entryTitle: "入口流程", onboarding: "PHIZCHAT 新手引导", rightMoment: "在用户最需要时出现", entryIntro: "安全守门挑战以小程序形式存在，可从官方账号消息、Phiz Apps 或 Games 进入。", official: "官方账号",
    resultTitle: "比赛结算", won: "本局赢得现金", almost: "本局暂无奖金", savedOutOf: "5 球扑出", balls: "球", roundCash: "本局现金奖金", roundReward: "本局奖金", cashBalance: "Wallet 现金余额", again: "再来一局", estimatedCash: "预计奖金", claimCash: "领取奖金", withdrawNow: "立即提现", reviveTitle: "再给自己一次机会", reviveCopy: "可以连续挑战复活球。扑出后奖金提升一个档位，失败仍保留当前奖金；每次复活费用增加 10 积分。", reviveAction: "积分复活", reviveShort: "复活球", settleCash: "结算奖金", newcomer: "新手加成", standard: "标准难度", challengeLevel: "挑战难度", pro: "高手难度", exactRule: "选中真实点位即可扑出",
    taskCenter: "任务中心", continuePlay: "继续比赛", taskHero: "完成任务，赚取游戏积分", taskOnly: "所有任务奖励只用于开启比赛。", daily: "每日签到", todayDone: "今日已完成", dailyReturn: "每天回来领取", claimed: "奖励已领取", taskNote: "进入任务详情并完成模拟动作后，游戏积分才会到账。",
    cash: "现金奖金", cashArrives: "比赛获胜后直接到账", ledger: "奖励换算", rewardUnits: "奖励分", withdraw: "提现", cashHistory: "奖金明细", pointsOnly: "仅用于开启比赛，完成任务可获得", goEarn: "去赚取", cashTitle: "赢得比赛，奖金直接进入 Wallet", cashCopy: "现金奖金与游戏积分相互独立。游戏积分只用于参赛，现金奖金可查看明细并发起提现。",
    currentCash: "当前现金奖金", noHistory: "还没有比赛记录", noHistoryCopy: "赢得一局比赛后，奖金会显示在这里。", challenge: "安全守门挑战", gameNo: "局", saved: "扑出",
    insufficient: "游戏积分不足", insufficientCopy: "本局需要 10 游戏积分。完成任务后即可继续比赛。", allTasks: "查看全部任务",
    ready: "准备", observe: "观察动作", runup: "开始助跑", locked: "方向已锁定", kick: "出脚！", greatSave: "精彩扑救", opponentGoal: "对手破门", savedBang: "扑出了！", conceded: "失球了", cue: "注意助跑角度与支撑脚", drag: "拖动手套，在出脚前完成预判", next: "下一球", viewResult: "查看赛果", finalCall: "最后判断", saveLabel: "扑救", quit: "退出", shot: "第",
    detailTitle: "任务详情", completeFor: "完成后获得", demoPrivacy: "这是早期 Demo，任务操作使用模拟完成，不会提交真实身份或社交数据。", friendProgress: "好友进度", contacts: "来自通讯录", mayKnow: "你可能认识的人", add: "添加", publishTo: "发布到 Moment", momentDraft: "今天开始我的 Phiz 安全挑战。", addImage: "添加图片", visibility: "谁可以看", allFriends: "所有好友", reset: "重置 Demo",
    successCheckin: "签到成功，获得 10 游戏积分", alreadyCheckin: "今天已经签到", taskDone: "任务完成，获得", taskClaimed: "该任务奖励已经领取", resetDone: "Demo 已重置", withdrawDemo: "Demo 暂不执行真实提现", returnToast: "将返回 PhizChat",
  },
  en: {
    back: "Back", exit: "Back to PhizChat", gamePoints: "Game points", home: "Home", tasks: "Tasks", match: "Match", wallet: "Wallet",
    homeEyebrow: "PHIZ SAFEKEEPER CHALLENGE", homeTitleA: "Defend with", homeTitleB: "", homeTitleC: "protect what matters", homeIntro: "Read the shot and make five saves. Each match costs 10 game points.",
    checked: "Checked in today", checkIn: "Daily check-in", tomorrow: "Come back tomorrow", checkInReward: "+10 game points", start: "Start match", earn: "Earn points", viewWallet: "View Wallet", entryFlow: "View PhizChat entry flow",
    entryTitle: "Entry flow", onboarding: "PHIZCHAT ONBOARDING", rightMoment: "Show up at the right moment", entryIntro: "The SafeKeeper Challenge is a mini app available from the official account, Phiz Apps, and Games.", official: "Official account",
    resultTitle: "Match result", won: "Cash won", almost: "No cash this round", savedOutOf: "Saved", balls: "of 5", roundCash: "Cash won", roundReward: "Round reward", cashBalance: "Wallet cash balance", again: "Play again", estimatedCash: "Estimated cash", claimCash: "Claim reward", withdrawNow: "Withdraw now", reviveTitle: "Take one more chance", reviveCopy: "You can keep buying revival shots. A save moves your cash up one tier and a miss keeps the reward; each revival costs 10 more points.", reviveAction: "points to revive", reviveShort: "Revival shot", settleCash: "Settle reward", newcomer: "Newcomer boost", standard: "Standard", challengeLevel: "Challenge", pro: "Pro", exactRule: "Choose the real target to save",
    taskCenter: "Task center", continuePlay: "Keep playing", taskHero: "Complete tasks to earn game points", taskOnly: "Task rewards are only used to start matches.", daily: "Daily check-in", todayDone: "Completed today", dailyReturn: "Return every day", claimed: "Reward claimed", taskNote: "Game points arrive after you open a task and complete the demo action.",
    cash: "Cash reward", cashArrives: "Added after a match win", ledger: "Reward conversion", rewardUnits: "reward units", withdraw: "Withdraw", cashHistory: "Cash history", pointsOnly: "Only used to start matches; earn more from tasks", goEarn: "Earn", cashTitle: "Win matches and receive cash in Wallet", cashCopy: "Cash and game points are separate. Game points start matches, while cash rewards can be reviewed and withdrawn.",
    currentCash: "Current cash reward", noHistory: "No match history yet", noHistoryCopy: "Your cash reward will appear here after your first win.", challenge: "SafeKeeper Challenge", gameNo: "Match", saved: "Saved",
    insufficient: "Not enough game points", insufficientCopy: "This match costs 10 game points. Complete a task to keep playing.", allTasks: "View all tasks",
    ready: "Ready", observe: "Watch the motion", runup: "Run-up", locked: "Direction locked", kick: "Shot!", greatSave: "Great save", opponentGoal: "Goal conceded", savedBang: "Saved!", conceded: "Goal", cue: "Watch the run-up and planted foot", drag: "Drag the glove before the kick", next: "Next shot", viewResult: "View result", finalCall: "Final call", saveLabel: "Saves", quit: "Exit", shot: "Shot",
    detailTitle: "Task details", completeFor: "Complete to earn", demoPrivacy: "This early demo simulates task completion and does not submit real identity or social data.", friendProgress: "Friend progress", contacts: "From contacts", mayKnow: "Suggested contact", add: "Add", publishTo: "Post to Moment", momentDraft: "Starting my Phiz safety challenge today.", addImage: "Add image", visibility: "Visibility", allFriends: "All friends", reset: "Reset demo",
    successCheckin: "Check-in complete: +10 game points", alreadyCheckin: "Already checked in today", taskDone: "Task complete. Game points earned:", taskClaimed: "This reward was already claimed", resetDone: "Demo reset", withdrawDemo: "Withdrawals are not processed in this demo", returnToast: "Returning to PhizChat",
  },
  pt: {
    back: "Voltar", exit: "Voltar ao PhizChat", gamePoints: "Pontos do jogo", home: "Início", tasks: "Missões", match: "Partida", wallet: "Carteira",
    homeEyebrow: "DESAFIO GOLEIRO SEGURO PHIZ", homeTitleA: "Defenda com", homeTitleB: "", homeTitleC: "proteja o que importa", homeIntro: "Leia a direção do chute e faça cinco defesas. Cada partida custa 10 pontos.",
    checked: "Check-in feito", checkIn: "Check-in diário", tomorrow: "Volte amanhã", checkInReward: "+10 pontos", start: "Começar partida", earn: "Ganhar pontos", viewWallet: "Ver carteira", entryFlow: "Ver entradas no PhizChat",
    entryTitle: "Fluxo de entrada", onboarding: "BOAS-VINDAS PHIZCHAT", rightMoment: "Apareça no momento certo", entryIntro: "O desafio é um miniapp acessível pela conta oficial, Phiz Apps e Games.", official: "Conta oficial",
    resultTitle: "Resultado", won: "Prêmio em dinheiro", almost: "Sem prêmio nesta rodada", savedOutOf: "Defendeu", balls: "de 5", roundCash: "Prêmio em dinheiro", roundReward: "Prêmio da rodada", cashBalance: "Saldo em dinheiro", again: "Jogar novamente", estimatedCash: "Prêmio estimado", claimCash: "Receber prêmio", withdrawNow: "Sacar agora", reviveTitle: "Tente mais uma vez", reviveCopy: "Você pode comprar novas cobranças de recuperação. Uma defesa aumenta o prêmio e um erro mantém o valor; cada nova tentativa custa mais 10 pontos.", reviveAction: "pontos para reviver", reviveShort: "Chute de recuperação", settleCash: "Finalizar prêmio", newcomer: "Bônus de iniciante", standard: "Padrão", challengeLevel: "Desafio", pro: "Profissional", exactRule: "Escolha o alvo real para defender",
    taskCenter: "Central de missões", continuePlay: "Continue jogando", taskHero: "Conclua missões e ganhe pontos", taskOnly: "Os pontos das missões servem apenas para iniciar partidas.", daily: "Check-in diário", todayDone: "Concluído hoje", dailyReturn: "Volte todos os dias", claimed: "Prêmio resgatado", taskNote: "Os pontos são creditados após abrir a missão e concluir a ação de demonstração.",
    cash: "Prêmio em dinheiro", cashArrives: "Creditado ao vencer", ledger: "Conversão", rewardUnits: "unidades", withdraw: "Sacar", cashHistory: "Histórico", pointsOnly: "Usados apenas nas partidas; ganhe mais nas missões", goEarn: "Ganhar", cashTitle: "Vença partidas e receba na carteira", cashCopy: "Dinheiro e pontos são separados. Pontos iniciam partidas; o dinheiro pode ser consultado e sacado.",
    currentCash: "Prêmio atual", noHistory: "Nenhuma partida ainda", noHistoryCopy: "Seu prêmio aparecerá aqui após a primeira vitória.", challenge: "Desafio Goleiro Seguro", gameNo: "Partida", saved: "Defesas",
    insufficient: "Pontos insuficientes", insufficientCopy: "A partida custa 10 pontos. Conclua uma missão para continuar.", allTasks: "Ver todas as missões",
    ready: "Prepare-se", observe: "Observe o movimento", runup: "Corrida", locked: "Direção definida", kick: "Chute!", greatSave: "Grande defesa", opponentGoal: "Gol do adversário", savedBang: "Defendeu!", conceded: "Gol", cue: "Observe a corrida e o pé de apoio", drag: "Arraste a luva antes do chute", next: "Próximo chute", viewResult: "Ver resultado", finalCall: "Decisão final", saveLabel: "Defesas", quit: "Sair", shot: "Chute",
    detailTitle: "Detalhes da missão", completeFor: "Conclua para ganhar", demoPrivacy: "Esta demonstração simula a conclusão e não envia dados reais de identidade ou contatos.", friendProgress: "Progresso de amigos", contacts: "Dos contatos", mayKnow: "Contato sugerido", add: "Adicionar", publishTo: "Publicar no Moment", momentDraft: "Começando hoje meu desafio de segurança Phiz.", addImage: "Adicionar imagem", visibility: "Visibilidade", allFriends: "Todos os amigos", reset: "Reiniciar demo",
    successCheckin: "Check-in concluído: +10 pontos", alreadyCheckin: "Check-in já feito hoje", taskDone: "Missão concluída. Pontos ganhos:", taskClaimed: "Este prêmio já foi resgatado", resetDone: "Demo reiniciada", withdrawDemo: "Saques não são processados nesta demo", returnToast: "Voltando ao PhizChat",
  },
} as const;

const TASK_COPY: Record<Locale, Record<TaskId, { title: string; subtitle: string }>> = {
  zh: {
    verify: { title: "完成身份验证", subtitle: "验证身份，守护社区安全" },
    "friend-one": { title: "添加 1 位好友", subtitle: "认识一位新的 Phiz 好友" },
    "friend-eleven": { title: "添加 11 位好友", subtitle: "当前进度 4/11" },
    moment: { title: "发布 1 条 Moment", subtitle: "分享你的第一个动态" },
    beta: { title: "参与 Beta Testing", subtitle: "前往开放平台小程序" },
  },
  en: {
    verify: { title: "Complete identity verification", subtitle: "Verify your identity and protect the community" },
    "friend-one": { title: "Add 1 friend", subtitle: "Meet your first Phiz friend" },
    "friend-eleven": { title: "Add 11 friends", subtitle: "Current progress 4/11" },
    moment: { title: "Post 1 Moment", subtitle: "Share your first update" },
    beta: { title: "Join Beta Testing", subtitle: "Open the platform mini app" },
  },
  pt: {
    verify: { title: "Concluir verificação de identidade", subtitle: "Confirme sua identidade e proteja a comunidade" },
    "friend-one": { title: "Adicionar 1 amigo", subtitle: "Conheça seu primeiro amigo na Phiz" },
    "friend-eleven": { title: "Adicionar 11 amigos", subtitle: "Progresso atual 4/11" },
    moment: { title: "Publicar 1 Moment", subtitle: "Compartilhe sua primeira atualização" },
    beta: { title: "Participar do Beta Testing", subtitle: "Abra o miniapp da plataforma" },
  },
};

const TARGETS = [
  { left: 17, top: 37, label: "左上" },
  { left: 50, top: 37, label: "中上" },
  { left: 83, top: 37, label: "右上" },
  { left: 28, top: 63, label: "左下" },
  { left: 72, top: 63, label: "右下" },
];

function loadState(): DemoState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const legacyStored = stored ? null : localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed = JSON.parse(stored ?? legacyStored ?? "null") as Partial<DemoState> | null;
    const persisted = parsed ? {
      ...INITIAL_STATE,
      ...parsed,
      cashRewardUnits: legacyStored ? Math.max(0, (parsed.cashRewardUnits ?? 0) - 520) : (parsed.cashRewardUnits ?? 0),
    } : INITIAL_STATE;
    return persisted;
  } catch {
    return INITIAL_STATE;
  }
}

function formatBRL(units: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(units / 100);
}

function randomZone() { return Math.floor(Math.random() * TARGETS.length); }
function todayKey() { return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }); }
function zoneSide(zone: number) { return zone === 1 ? "center" : zone === 0 || zone === 3 ? "left" : "right"; }
function getDifficulty(completedMatches: number) {
  return [...DIFFICULTIES].reverse().find((item) => completedMatches >= item.from) ?? DIFFICULTIES[0];
}
function getReviveCost(revivalsUsed: number) { return 10 * (revivalsUsed + 2); }

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button className="icon-button" type="button" aria-label={label} onClick={onClick}>{children}</button>;
}

function PointsPill({ points, locale }: { points: number; locale: Locale }) {
  const c = COPY[locale];
  return (
    <div className="points-pill" aria-label={`${points} ${c.gamePoints}`}>
      <span className="points-pill-icon"><Lightning weight="fill" /></span>
      <span><strong>{points}</strong><small>{c.gamePoints}</small></span>
    </div>
  );
}

function Header({ title, points, locale, onBack, action }: { title: string; points?: number; locale: Locale; onBack?: () => void; action?: ReactNode }) {
  const c = COPY[locale];
  return (
    <header className="page-header">
      <div className="header-side">{onBack ? <IconButton label={c.back} onClick={onBack}><ArrowLeft weight="bold" /></IconButton> : <span className="brand-word">Phiz</span>}</div>
      <h1>{title}</h1>
      <div className="header-side header-side-right">{typeof points === "number" ? <PointsPill points={points} locale={locale} /> : action}</div>
    </header>
  );
}

function BottomNav({ active, locale, onNavigate }: { active: Screen; locale: Locale; onNavigate: (screen: Screen) => void }) {
  const c = COPY[locale];
  const items: Array<{ id: Screen; label: string; icon: ReactNode }> = [
    { id: "home", label: c.home, icon: <House weight={active === "home" ? "fill" : "regular"} /> },
    { id: "tasks", label: c.tasks, icon: <ListChecks weight={active === "tasks" ? "fill" : "regular"} /> },
    { id: "match", label: c.match, icon: <SoccerBall weight={active === "match" || active === "result" ? "fill" : "regular"} /> },
    { id: "wallet", label: c.wallet, icon: <Wallet weight={active === "wallet" || active === "history" ? "fill" : "regular"} /> },
  ];
  return (
    <nav className="bottom-nav" aria-label="主要导航">
      {items.map((item) => (
        <button key={item.id} type="button" className={active === item.id ? "active" : ""} onClick={() => onNavigate(item.id)}>
          {item.icon}<span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Shell({ children, active, locale, onNavigate, className = "" }: { children: ReactNode; active: Screen; locale: Locale; onNavigate: (screen: Screen) => void; className?: string }) {
  return (
    <div className={`app-shell ${className}`}>
      <MobileScroll className="app-screen"><div className="page-scroll-content">{children}</div></MobileScroll>
      <BottomNav active={active} locale={locale} onNavigate={onNavigate} />
    </div>
  );
}

export default function Prototype() {
  const keyboard = useKeyboard();
  const [screen, setScreen] = useState<Screen>("home");
  const [state, setState] = useState<DemoState>(loadState);
  const [pointsSheetOpen, setPointsSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [result, setResult] = useState<RoundResult>({ saved: 0, reward: 0, settled: false, revivalsUsed: 0 });
  const [cashHighlight, setCashHighlight] = useState(false);
  const [sessionMatches, setSessionMatches] = useState(0);
  const [taskReturnScreen, setTaskReturnScreen] = useState<"tasks" | "result">("tasks");
  const [activeTask, setActiveTask] = useState<TaskId | null>(null);
  const [activeEntry, setActiveEntry] = useState<EntryId>("message");
  const [match, setMatch] = useState<MatchState>({ shot: 1, saved: 0, phase: "ready", targetZone: randomZone(), selectedZone: null, lastSaved: null, isRevival: false, revivalCount: 0 });
  const locale = state.locale;
  const c = COPY[locale];
  const difficulty = getDifficulty(sessionMatches);
  const reviveCost = getReviveCost(result.revivalsUsed);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => { keyboard.hide(); }, [screen]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const deviceScreen = document.querySelector<HTMLElement>("[data-phone-screen]");
      if (deviceScreen) deviceScreen.scrollTop = 0;
      document.querySelectorAll<HTMLElement>(".mobile-scroll").forEach((element) => { element.scrollTop = 0; });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [screen, locale]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1900);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (screen !== "match" || match.phase !== "ready") return;
    const timer = window.setTimeout(() => setMatch((current) => ({ ...current, phase: "runup" })), 560);
    return () => window.clearTimeout(timer);
  }, [screen, match.phase, match.shot]);
  useEffect(() => {
    if (screen !== "match" || match.phase !== "runup") return;
    const timer = window.setTimeout(() => setMatch((current) => ({ ...current, phase: "aiming" })), 920);
    return () => window.clearTimeout(timer);
  }, [screen, match.phase, match.shot]);
  useEffect(() => {
    if (screen !== "match" || match.phase !== "aiming") return;
    const timer = window.setTimeout(() => resolveAttempt(null), difficulty.reactionMs);
    return () => window.clearTimeout(timer);
  }, [screen, match.phase, match.shot, difficulty.reactionMs]);
  useEffect(() => {
    if (screen !== "match" || match.phase !== "flight") return;
    const timer = window.setTimeout(() => {
      setMatch((current) => {
        const wasSaved = current.selectedZone !== null && current.selectedZone === current.targetZone;
        return { ...current, phase: "feedback", lastSaved: wasSaved, saved: current.saved + (wasSaved ? 1 : 0) };
      });
    }, 640);
    return () => window.clearTimeout(timer);
  }, [screen, match.phase, match.shot]);

  const checkedIn = state.checkedInDate === todayKey();

  function navigate(next: Screen) {
    if (next === "match") return requestStart();
    setScreen(next);
  }

  function requestStart() {
    if (state.gamePoints < 10) return setPointsSheetOpen(true);
    beginMatch();
  }

  function beginMatch() {
    if (state.gamePoints < 10) return setPointsSheetOpen(true);
    setState((current) => ({ ...current, gamePoints: current.gamePoints - 10 }));
    setResult({ saved: 0, reward: 0, settled: false, revivalsUsed: 0 });
    setCashHighlight(false);
    setMatch({ shot: 1, saved: 0, phase: "ready", targetZone: randomZone(), selectedZone: null, lastSaved: null, isRevival: false, revivalCount: 0 });
    setScreen("match");
  }

  function checkIn() {
    if (checkedIn) return setToast(c.alreadyCheckin);
    setState((current) => ({ ...current, gamePoints: current.gamePoints + 10, checkedInDate: todayKey() }));
    setToast(c.successCheckin);
  }

  function completeTask(taskId: TaskId) {
    if (state.completedTasks.includes(taskId)) return setToast(c.taskClaimed);
    const task = TASKS.find((item) => item.id === taskId);
    if (!task) return;
    setState((current) => ({ ...current, gamePoints: current.gamePoints + task.reward, completedTasks: [...current.completedTasks, taskId] }));
    setToast(`${c.taskDone} ${task.reward}`);
  }

  function openTask(taskId: TaskId, returnTo: "tasks" | "result" = "tasks") {
    setActiveTask(taskId);
    setTaskReturnScreen(returnTo);
    setScreen("task-detail");
  }

  function finishTask(taskId: TaskId) {
    completeTask(taskId);
    window.setTimeout(() => setScreen(taskReturnScreen), 420);
  }

  function resolveAttempt(zone: number | null) {
    if (match.phase !== "aiming") return;
    setMatch((current) => ({ ...current, phase: "flight", selectedZone: zone, lastSaved: null }));
  }

  function continueMatch() {
    if (match.isRevival) {
      if (match.saved === 5) {
        settleResult(match.saved, match.revivalCount);
        return;
      }
      setResult({ saved: match.saved, reward: PAYOUT_UNITS[match.saved], settled: false, revivalsUsed: match.revivalCount });
      setScreen("result");
      return;
    }
    if (match.shot < 5) {
      setMatch((current) => ({ ...current, shot: current.shot + 1, phase: "ready", targetZone: randomZone(), selectedZone: null, lastSaved: null }));
      return;
    }
    const reward = PAYOUT_UNITS[match.saved];
    if (match.saved === 5) {
      settleResult(match.saved, 0);
      return;
    }
    setResult({ saved: match.saved, reward, settled: false, revivalsUsed: 0 });
    setScreen("result");
  }

  function beginRevival() {
    if (result.saved >= 5) return;
    if (state.gamePoints < reviveCost) {
      setPointsSheetOpen(true);
      return;
    }
    const nextRevivalCount = result.revivalsUsed + 1;
    setState((current) => ({ ...current, gamePoints: current.gamePoints - reviveCost }));
    setMatch({ shot: 5 + nextRevivalCount, saved: result.saved, phase: "ready", targetZone: randomZone(), selectedZone: null, lastSaved: null, isRevival: true, revivalCount: nextRevivalCount });
    setScreen("match");
  }

  function settleResult(saved: number, revivalsUsed: number) {
    const reward = PAYOUT_UNITS[Math.min(5, saved)];
    setResult({ saved, reward, settled: true, revivalsUsed });
    setState((current) => ({
      ...current,
      cashRewardUnits: current.cashRewardUnits + reward,
      matches: [{ id: String(Date.now()), saved, won: saved > 0, reward }, ...current.matches].slice(0, 20),
    }));
    setSessionMatches((current) => current + 1);
    setCashHighlight(reward > 0);
    setScreen("result");
  }

  function resetDemo() {
    setState({ ...INITIAL_STATE, locale });
    setResult({ saved: 0, reward: 0, settled: false, revivalsUsed: 0 });
    setCashHighlight(false);
    setSessionMatches(0);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setToast(c.resetDone);
    setScreen("home");
  }

  return (
    <>
      {screen === "home" && (
        <Shell key="home" active="home" locale={locale} onNavigate={navigate} className="home-shell">
          <section className="home-hero">
            <img src="/assets/phiz/goalkeeper-hero.png" alt="绿色球衣守门员在球场扑向足球" />
            <div className="home-topbar">
              <button className="exit-button" type="button" onClick={() => setToast(c.returnToast)}><ArrowLeft weight="bold" />{c.exit}</button>
              <PointsPill points={state.gamePoints} locale={locale} />
            </div>
          </section>
          <div className="language-switch" role="group" aria-label="Language">
            <Translate weight="bold" />
            {([['zh', '中文'], ['en', 'English'], ['pt', 'Português']] as Array<[Locale, string]>).map(([id, label]) => (
              <button key={id} type="button" className={locale === id ? "active" : ""} aria-pressed={locale === id} onClick={() => setState((current) => ({ ...current, locale: id }))}>{label}</button>
            ))}
          </div>
          <section className="home-copy">
            <span className="eyebrow">{c.homeEyebrow}</span>
            <h1>{c.homeTitleA} <em>Phiz</em> {c.homeTitleB}<br />{c.homeTitleC}</h1>
            <p>{c.homeIntro}</p>
          </section>
          <button className={`checkin-card ${checkedIn ? "completed" : ""}`} type="button" onClick={checkIn}>
            <span className="card-icon"><CalendarCheck weight="fill" /></span>
            <span><strong>{checkedIn ? c.checked : c.checkIn}</strong><small>{checkedIn ? c.tomorrow : c.checkInReward}</small></span>
            {checkedIn ? <CheckCircle weight="fill" /> : <CaretRight weight="bold" />}
          </button>
          <button className="primary-button large" type="button" onClick={requestStart}><SoccerBall weight="fill" />{c.start}<ArrowRight weight="bold" /></button>
          <div className="home-links">
            <button type="button" onClick={() => setScreen("tasks")}><ListChecks />{c.earn}</button>
            <button type="button" onClick={() => setScreen("wallet")}><Wallet />{c.viewWallet}</button>
          </div>
          <button className="entry-flow-link" type="button" onClick={() => setScreen("entry")}><DeviceMobile weight="fill" />{c.entryFlow}<CaretRight weight="bold" /></button>
        </Shell>
      )}

      {screen === "entry" && (
        <Shell key="entry" active="home" locale={locale} onNavigate={navigate} className="entry-shell">
          <Header title={c.entryTitle} locale={locale} onBack={() => setScreen("home")} />
          <section className="entry-intro"><span className="eyebrow">{c.onboarding}</span><h2>{c.rightMoment}</h2><p>{c.entryIntro}</p></section>
          <div className="entry-tabs" role="tablist" aria-label="入口类型">
            {([['message', c.official], ['apps', 'Phiz Apps'], ['games', 'Games']] as Array<[EntryId, string]>).map(([id, label]) => <button key={id} role="tab" aria-selected={activeEntry === id} className={activeEntry === id ? "active" : ""} onClick={() => setActiveEntry(id)}>{label}</button>)}
          </div>
          <EntryPreview active={activeEntry} locale={locale} onEnter={requestStart} />
        </Shell>
      )}

      {screen === "match" && <MatchScreen match={match} gamePoints={state.gamePoints} locale={locale} difficulty={difficulty} onSelect={resolveAttempt} onContinue={continueMatch} onExit={() => setScreen("home")} />}

      {screen === "result" && (
        <Shell key="result" active="result" locale={locale} onNavigate={navigate} className="result-shell">
          <Header title={c.resultTitle} points={state.gamePoints} locale={locale} onBack={result.settled ? () => setScreen("home") : undefined} />
          <section className={`result-card ${result.reward > 0 ? "won" : "lost"}`}>
            <img src="/assets/phiz/goalkeeper-hero.png" alt="守门员比赛结算" />
            <div className="result-badge">{result.reward > 0 ? <Trophy weight="fill" /> : <Medal weight="fill" />}</div>
            <h1>{result.reward > 0 ? c.won : c.almost}</h1><p>{c.savedOutOf} <strong>{result.saved}</strong> {c.balls}</p>
          </section>
          <section className="reward-panel"><div><span>{result.settled ? c.roundCash : c.estimatedCash}</span><strong>{formatBRL(result.reward)}</strong></div><div><span>{c.cashBalance}</span><strong>{formatBRL(state.cashRewardUnits)}</strong></div></section>
          {!result.settled ? <>
            <section className="revive-card"><span className="revive-icon"><Lightning weight="fill" /></span><div><span className="eyebrow">{c.reviveShort} {result.revivalsUsed + 1}</span><h2>{c.reviveTitle}</h2><p>{c.reviveCopy}</p><strong>{formatBRL(result.reward)} → {formatBRL(PAYOUT_UNITS[Math.min(5, result.saved + 1)])}</strong></div></section>
            <button className={`primary-button large revive-button ${state.gamePoints < reviveCost ? "needs-points" : ""}`} type="button" onClick={beginRevival}><Lightning weight="fill" />{reviveCost} {c.reviveAction}<ArrowRight weight="bold" /></button>
            <button className="secondary-button large" type="button" onClick={() => settleResult(result.saved, result.revivalsUsed)}>{c.claimCash}</button>
          </> : <>
            {result.reward > 0 && <button className={`withdraw-cta large ${cashHighlight ? "cash-highlight" : ""}`} type="button" onClick={() => setScreen("wallet")}><CurrencyCircleDollar weight="fill" />{c.withdrawNow} · {formatBRL(result.reward)}<ArrowRight weight="bold" /></button>}
            <button className="primary-button large replay-button" type="button" onClick={requestStart}><ArrowCounterClockwise weight="bold" />{c.again}</button>
            <button className="secondary-button large" type="button" onClick={() => setScreen("wallet")}><Wallet />{c.viewWallet}</button>
          </>}
        </Shell>
      )}

      {screen === "tasks" && (
        <Shell key="tasks" active="tasks" locale={locale} onNavigate={navigate}>
          <Header title={c.taskCenter} points={state.gamePoints} locale={locale} onBack={() => setScreen("home")} />
          <section className="tasks-hero"><span className="tasks-hero-icon"><Lightning weight="fill" /></span><div><span className="eyebrow">{c.continuePlay}</span><h2>{c.taskHero}</h2><p>{c.taskOnly}</p></div></section>
          <div className="task-list">
            <button className={`task-row ${checkedIn ? "done" : ""}`} type="button" onClick={checkIn}>
              <span className="task-icon"><CalendarCheck weight="fill" /></span><span className="task-copy"><strong>{c.daily}</strong><small>{checkedIn ? c.todayDone : c.dailyReturn}</small></span><span className="task-reward">+10</span>
            </button>
            {TASKS.map((task) => {
              const done = state.completedTasks.includes(task.id);
              const taskText = TASK_COPY[locale][task.id];
              return (
                <button className={`task-row ${done ? "done" : ""} ${task.id === "beta" ? "beta" : ""}`} type="button" key={task.id} onClick={() => openTask(task.id)}>
                  <span className="task-icon">{task.icon}</span><span className="task-copy"><strong>{taskText.title}</strong><small>{done ? c.claimed : taskText.subtitle}</small>{task.id === "friend-eleven" && !done && <span className="task-inline-progress" aria-label="4 / 11"><i style={{ width: "36%" }} /></span>}</span><span className="task-reward">{done ? <CheckCircle weight="fill" /> : `+${task.reward}`}</span>
                </button>
              );
            })}
          </div>
          <p className="demo-note">{c.taskNote}</p>
        </Shell>
      )}

      {screen === "task-detail" && activeTask && (
        <TaskDetailScreen key={`${activeTask}-${locale}`} taskId={activeTask} locale={locale} completed={state.completedTasks.includes(activeTask)} onBack={() => setScreen(taskReturnScreen)} onComplete={() => finishTask(activeTask)} />
      )}

      {screen === "wallet" && (
        <Shell key="wallet" active="wallet" locale={locale} onNavigate={navigate}>
          <Header title={c.wallet} locale={locale} onBack={() => setScreen("home")} action={<IconButton label={c.reset} onClick={resetDemo}><ArrowCounterClockwise /></IconButton>} />
          <section className="cash-card">
            <span className="cash-label"><CurrencyCircleDollar weight="fill" />{c.cash}</span><strong>{formatBRL(state.cashRewardUnits)}</strong><p>{c.cashArrives}</p>
            <div className="ledger-line">{c.ledger}: {state.cashRewardUnits} {c.rewardUnits} = {formatBRL(state.cashRewardUnits)}</div>
            <div className="wallet-actions"><button className={cashHighlight ? "cash-highlight" : ""} type="button" onClick={() => { setCashHighlight(false); setToast(c.withdrawDemo); }}>{c.withdraw}</button><button type="button" onClick={() => setScreen("history")}>{c.cashHistory}</button></div>
          </section>
          <section className="game-points-card"><span className="card-icon"><Lightning weight="fill" /></span><div><span>{c.gamePoints}</span><strong>{state.gamePoints}</strong><small>{c.pointsOnly}</small></div><button type="button" onClick={() => setScreen("tasks")}>{c.goEarn}<CaretRight /></button></section>
          <section className="wallet-note-card"><CurrencyCircleDollar weight="duotone" /><div><span className="eyebrow">{c.cash}</span><h2>{c.cashTitle}</h2><p>{c.cashCopy}</p></div></section>
        </Shell>
      )}

      {screen === "history" && (
        <Shell key="history" active="history" locale={locale} onNavigate={navigate}>
          <Header title={c.cashHistory} locale={locale} onBack={() => setScreen("wallet")} />
          <section className="history-summary"><ClockCounterClockwise weight="fill" /><div><span>{c.currentCash}</span><strong>{formatBRL(state.cashRewardUnits)}</strong></div></section>
          <div className="history-list">
            {state.matches.length === 0 ? <div className="empty-state"><Target weight="duotone" /><h2>{c.noHistory}</h2><p>{c.noHistoryCopy}</p><button className="primary-button" type="button" onClick={requestStart}>{c.start}</button></div> : state.matches.map((item, index) => (
              <div className="history-row" key={item.id}><span className={`history-icon ${item.won ? "win" : "loss"}`}>{item.won ? <Trophy weight="fill" /> : <SoccerBall weight="fill" />}</span><span><strong>{c.challenge}</strong><small>{c.gameNo} {state.matches.length - index} · {c.saved} {item.saved}/5</small></span><b>{item.reward ? `+ ${formatBRL(item.reward)}` : formatBRL(0)}</b></div>
            ))}
          </div>
        </Shell>
      )}

      <BottomSheet open={pointsSheetOpen} onOpenChange={setPointsSheetOpen} title={c.insufficient} description={c.insufficientCopy} snap={0.68}>
        <div className="sheet-task-list">
          {TASKS.filter((task) => !state.completedTasks.includes(task.id)).slice(0, 4).map((task) => (
            <button key={task.id} type="button" onClick={() => { setPointsSheetOpen(false); openTask(task.id, screen === "result" ? "result" : "tasks"); }}><span className="task-icon">{task.icon}</span><span><strong>{TASK_COPY[locale][task.id].title}</strong><small>{TASK_COPY[locale][task.id].subtitle}</small></span><b>+{task.reward}</b><CaretRight /></button>
          ))}
          <button className="sheet-primary" type="button" onClick={() => { setPointsSheetOpen(false); setScreen("tasks"); }}>{c.allTasks}</button>
        </div>
      </BottomSheet>
      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
    </>
  );
}

function EntryPreview({ active, locale, onEnter }: { active: EntryId; locale: Locale; onEnter: () => void }) {
  const entry = {
    zh: { assistant: "新用户安全助手", starter: "新手任务 1/4", title: "玩小游戏，和 Phiz 一起守住安全", copy: "完成五次扑救，认识游戏积分与 Wallet 现金奖金。", enter: "进入安全守门挑战", discover: "发现", recommended: "Phiz Apps · 新手推荐", miniTitle: "安全守门挑战", miniCopy: "每局 10 游戏积分，胜利赢现金奖金。", open: "打开", limited: "新手限定", gameCopy: "观察动作，扑出关键射门", start: "开始游戏", popular: "热门小游戏", captions: ["新用户注册后，由官方账号发送任务消息", "从发现页的 Phiz Apps 进入小程序", "从 Games 列表进入活动"] },
    en: { assistant: "New user safety assistant", starter: "Starter task 1/4", title: "Play with Phiz and defend what matters", copy: "Make five saves and learn how game points and Wallet cash work.", enter: "Enter SafeKeeper", discover: "Discover", recommended: "Phiz Apps · Recommended", miniTitle: "SafeKeeper Challenge", miniCopy: "Spend 10 points per match and win cash.", open: "Open", limited: "New users", gameCopy: "Read the motion and stop the decisive shot", start: "Start game", popular: "Popular games", captions: ["The official account sends a starter task after sign-up", "Open the mini app from Phiz Apps in Discover", "Open the event from the Games list"] },
    pt: { assistant: "Assistente de segurança para novos usuários", starter: "Missão inicial 1/4", title: "Jogue com a Phiz e proteja o que importa", copy: "Faça cinco defesas e conheça os pontos e o dinheiro na carteira.", enter: "Entrar no desafio", discover: "Descobrir", recommended: "Phiz Apps · Recomendado", miniTitle: "Desafio Goleiro Seguro", miniCopy: "Use 10 pontos por partida e ganhe dinheiro.", open: "Abrir", limited: "Novos usuários", gameCopy: "Observe o movimento e defenda o chute decisivo", start: "Começar", popular: "Jogos populares", captions: ["A conta oficial envia uma missão após o cadastro", "Abra o miniapp pelo Phiz Apps em Descobrir", "Abra o evento pela lista de Games"] },
  }[locale];
  return (
    <section className={`entry-preview entry-${active}`}>
      <div className="host-status"><span>17:32</span><span>PhizChat</span><DotsThree weight="bold" /></div>
      {active === "message" && (
        <div className="host-content message-entry">
          <div className="host-title"><ChatCircleDots weight="fill" /><div><strong>PhizChat Official</strong><small>{entry.assistant}</small></div></div>
          <div className="blurred-thread"><span /><span /><span /></div>
          <article className="official-message">
            <span className="official-badge"><ShieldCheck weight="fill" /></span>
            <div><small>{entry.starter}</small><strong>{entry.title}</strong><p>{entry.copy}</p><button type="button" onClick={onEnter}>{entry.enter}<ArrowRight weight="bold" /></button></div>
          </article>
        </div>
      )}
      {active === "apps" && (
        <div className="host-content apps-entry">
          <div className="host-page-title"><Compass weight="fill" /><h3>{entry.discover}</h3><Plus weight="bold" /></div>
          {[['Moment', <ImageSquare weight="fill" />], ['Clips', <PlayCircle weight="fill" />], ['Phiz Apps', <SquaresFour weight="fill" />], ['Phiz TV', <DeviceMobile weight="fill" />]].map(([label, icon]) => <div key={String(label)} className={`host-list-row ${label === 'Phiz Apps' ? 'highlighted' : ''}`}><span>{icon}</span><strong>{label}</strong><CaretRight /></div>)}
          <article className="miniapp-card"><span className="miniapp-mark"><HandPalm weight="fill" /></span><div><small>{entry.recommended}</small><strong>{entry.miniTitle}</strong><p>{entry.miniCopy}</p></div><button type="button" onClick={onEnter}>{entry.open}</button></article>
        </div>
      )}
      {active === "games" && (
        <div className="host-content games-entry">
          <div className="host-page-title"><ArrowLeft weight="bold" /><h3>Games</h3><MagnifyingGlass weight="bold" /></div>
          <article className="featured-game"><img src="/assets/phiz/goalkeeper-hero.png" alt="SafeKeeper Challenge" /><div><small>{entry.limited}</small><strong>{entry.miniTitle}</strong><p>{entry.gameCopy}</p><button type="button" onClick={onEnter}>{entry.start}</button></div></article>
          <h4>{entry.popular}</h4>
          {['Air Wolves', 'Balloon Fight', 'Formula Racing'].map((label, index) => <div className="game-list-row" key={label}><span>{index + 1}</span><strong>{label}</strong><button type="button">{entry.open}</button></div>)}
        </div>
      )}
      <p className="entry-caption">{entry.captions[active === "message" ? 0 : active === "apps" ? 1 : 2]}</p>
    </section>
  );
}

function TaskDetailScreen({ taskId, locale, completed, onBack, onComplete }: { taskId: TaskId; locale: Locale; completed: boolean; onBack: () => void; onComplete: () => void }) {
  const c = COPY[locale];
  const task = TASKS.find((item) => item.id === taskId)!;
  const detailByLocale = {
    zh: {
      verify: { kicker: "账户安全", title: "验证身份，守护社区安全", copy: "完成基本信息、证件上传与人脸确认，验证通过后获得游戏积分。", action: "模拟完成验证" },
      "friend-one": { kicker: "建立连接", title: "添加第一位 Phiz 好友", copy: "从推荐联系人中发送好友申请，完成第一次安全连接。", action: "模拟添加好友" },
      "friend-eleven": { kicker: "好友挑战", title: "邀请 11 位好友", copy: "当前已有 4 位好友，再邀请 7 位即可领取本阶段奖励。", action: "模拟完成邀请" },
      moment: { kicker: "分享动态", title: "发布第一条 Moment", copy: "选择图片并添加文字，让新朋友更快认识你。", action: "模拟发布 Moment" },
      beta: { kicker: "开放平台", title: "参与 Beta Testing", copy: "进入 Phiz Apps 小程序体验新功能，并提交一条反馈。", action: "模拟提交反馈" },
    },
    en: {
      verify: { kicker: "Account safety", title: "Verify your identity", copy: "Complete basic details, document upload, and a face check to earn game points.", action: "Simulate verification" },
      "friend-one": { kicker: "Make a connection", title: "Add your first Phiz friend", copy: "Send a request to a suggested contact and create your first connection.", action: "Simulate adding a friend" },
      "friend-eleven": { kicker: "Friend challenge", title: "Invite 11 friends", copy: "You have 4 friends. Invite 7 more to claim this reward.", action: "Simulate completed invites" },
      moment: { kicker: "Share an update", title: "Post your first Moment", copy: "Choose an image and add text so new friends can get to know you.", action: "Simulate posting" },
      beta: { kicker: "Open platform", title: "Join Beta Testing", copy: "Open the Phiz Apps mini app, try a new feature, and submit feedback.", action: "Simulate feedback" },
    },
    pt: {
      verify: { kicker: "Segurança da conta", title: "Verifique sua identidade", copy: "Preencha seus dados, envie o documento e conclua a verificação facial para ganhar pontos.", action: "Simular verificação" },
      "friend-one": { kicker: "Crie uma conexão", title: "Adicione seu primeiro amigo", copy: "Envie um pedido para um contato sugerido e crie sua primeira conexão.", action: "Simular novo amigo" },
      "friend-eleven": { kicker: "Desafio de amigos", title: "Convide 11 amigos", copy: "Você já tem 4 amigos. Convide mais 7 para receber o prêmio.", action: "Simular convites" },
      moment: { kicker: "Compartilhe", title: "Publique seu primeiro Moment", copy: "Escolha uma imagem e escreva algo para seus novos amigos conhecerem você.", action: "Simular publicação" },
      beta: { kicker: "Plataforma aberta", title: "Participe do Beta Testing", copy: "Abra o miniapp Phiz Apps, teste um recurso e envie seu feedback.", action: "Simular feedback" },
    },
  } as const;
  const detail = detailByLocale[locale][taskId];
  const verifySteps: Array<[string, string, string]> = locale === "zh" ? [['1', '填写基本信息', '姓名、国籍与证件类型'], ['2', '上传证件', '拍摄护照或身份证明'], ['3', '人脸确认', '确认由本人完成操作']] : locale === "en" ? [['1', 'Basic information', 'Name, nationality, and document type'], ['2', 'Upload a document', 'Take a passport or ID photo'], ['3', 'Face check', 'Confirm you are completing the process']] : [['1', 'Dados básicos', 'Nome, nacionalidade e documento'], ['2', 'Enviar documento', 'Fotografe o passaporte ou identidade'], ['3', 'Verificação facial', 'Confirme que é você']];
  const betaSteps: Array<[string, string, string]> = locale === "zh" ? [['1', '进入小程序', '打开 Phiz 开放平台小程序'], ['2', '完成体验', '体验核心流程与交互'], ['3', '提交反馈', '描述问题或改进建议']] : locale === "en" ? [['1', 'Open the mini app', 'Launch the Phiz open-platform mini app'], ['2', 'Try the experience', 'Explore the main flow and interactions'], ['3', 'Submit feedback', 'Describe an issue or improvement']] : [['1', 'Abrir o miniapp', 'Inicie o miniapp da plataforma Phiz'], ['2', 'Testar a experiência', 'Explore o fluxo e as interações'], ['3', 'Enviar feedback', 'Descreva um problema ou melhoria']];

  return (
    <div className="app-shell task-detail-shell">
      <MobileScroll className="app-screen"><div className="page-scroll-content">
        <Header title={c.detailTitle} locale={locale} onBack={onBack} />
        <section className={`task-detail-hero task-${taskId}`}><span className="task-detail-icon">{task.icon}</span><span className="eyebrow">{detail.kicker}</span><h1>{detail.title}</h1><p>{detail.copy}</p><div className="detail-reward"><Lightning weight="fill" />{c.completeFor} <strong>{task.reward} {c.gamePoints}</strong></div></section>

        {taskId === "verify" && <div className="detail-panel"><div className="identity-preview"><IdentificationCard weight="duotone" /><span><strong>{TASK_COPY[locale].verify.title}</strong><small>Demo</small></span><ShieldCheck weight="fill" /></div><StepRows rows={verifySteps} /></div>}

        {(taskId === "friend-one" || taskId === "friend-eleven") && <div className="detail-panel"><div className="invite-progress"><div><span>{c.friendProgress}</span><strong>{taskId === "friend-one" ? '0 / 1' : '4 / 11'}</strong></div><div className="progress-track"><span style={{ width: taskId === "friend-one" ? '8%' : '36%' }} /></div></div>{['Ana Porchat', 'Marcio Alves', 'Camila R.'].map((name, index) => <div className="contact-row" key={name}><span className={`avatar avatar-${index + 1}`}>{name.slice(0, 1)}</span><span><strong>{name}</strong><small>{index === 0 ? c.contacts : c.mayKnow}</small></span><button type="button"><UserPlus weight="bold" />{c.add}</button></div>)}</div>}

        {taskId === "moment" && <div className="detail-panel moment-composer"><div className="composer-user"><span className="avatar avatar-2">S</span><span><strong>Selina</strong><small>{c.publishTo}</small></span></div><KeyboardTextarea aria-label="Moment" defaultValue={c.momentDraft} /><div className="composer-photo"><ImageSquare weight="duotone" /><span>{c.addImage}</span></div><div className="composer-options"><span>{c.visibility}</span><strong>{c.allFriends}<CaretRight /></strong></div></div>}

        {taskId === "beta" && <div className="detail-panel beta-detail"><div className="beta-banner"><SquaresFour weight="fill" /><div><small>Phiz Apps</small><strong>Beta Testing</strong><span>{detail.copy}</span></div></div><StepRows rows={betaSteps} /></div>}

        <button className={`primary-button large detail-action ${completed ? 'completed' : ''}`} type="button" disabled={completed} onClick={onComplete}>{completed ? <><CheckCircle weight="fill" />{c.claimed}</> : <>{detail.action}<ArrowRight weight="bold" /></>}</button>
        <p className="task-privacy">{c.demoPrivacy}</p>
      </div></MobileScroll>
    </div>
  );
}

function StepRows({ rows }: { rows: Array<[string, string, string]> }) {
  return <div className="step-rows">{rows.map(([number, title, copy]) => <div className="step-row" key={number}><span>{number}</span><div><strong>{title}</strong><small>{copy}</small></div><CaretRight /></div>)}</div>;
}

function Football3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: import("three").WebGLRenderer | null = null;
    let scene: import("three").Scene | null = null;
    let ball: import("three").Group | null = null;
    let frame = 0;
    let disposed = false;

    const setup = async () => {
      const [THREE, { OBJLoader }] = await Promise.all([import("three"), import("three/addons/loaders/OBJLoader.js")]);
      if (disposed) return;

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(192, 192, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
      camera.position.set(0, 0, 4.6);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x13261d, 2.8));
      const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
      keyLight.position.set(-2.4, 3.6, 4.5);
      scene.add(keyLight);
      const rimLight = new THREE.DirectionalLight(0xb9ffd6, 2.2);
      rimLight.position.set(3.4, 0.6, -2.8);
      scene.add(rimLight);

      const loader = new OBJLoader();
      loader.load("/assets/models/football.obj", (object) => {
        if (disposed || !scene) return;
        const bounds = new THREE.Box3().setFromObject(object);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        object.position.sub(center);
        object.scale.setScalar(2.8 / Math.max(size.x, size.y, size.z));
        object.rotation.set(-0.16, -0.42, 0.08);
        object.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.geometry.computeVertexNormals();
          const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
          child.material = sourceMaterials.map((source) => {
            const name = source.name.toLowerCase();
            const color = name.startsWith("00:") ? 0x111513 : name === "default" ? 0x707874 : 0xf4f5ef;
            return new THREE.MeshStandardMaterial({ color, roughness: name.startsWith("00:") ? 0.4 : 0.3, metalness: 0.03 });
          });
        });
        ball = object;
        scene.add(object);
      });

      const render = () => {
        if (disposed || !renderer || !scene) return;
        if (ball) {
          ball.rotation.x += 0.006;
          ball.rotation.y += 0.013;
        }
        renderer.render(scene, camera);
        frame = window.requestAnimationFrame(render);
      };
      render();
    };
    void setup();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      if (ball) {
        ball.traverse((child) => {
          const mesh = child as import("three").Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material.dispose());
        });
      }
      renderer?.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="football-3d-canvas" aria-hidden="true" />;
}

function GoalkeeperGloves3D({ phase, zone, saved }: { phase: MatchPhase; zone: number | null; saved: boolean | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const motionRef = useRef({ phase, zone, saved, changedAt: performance.now() });
  const useIllustratedGloves = true;

  useEffect(() => {
    motionRef.current = { phase, zone, saved, changedAt: performance.now() };
  }, [phase, zone, saved]);

  useEffect(() => {
    if (useIllustratedGloves) {
      setReady(false);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: import("three").WebGLRenderer | null = null;
    let scene: import("three").Scene | null = null;
    let camera: import("three").OrthographicCamera | null = null;
    let leftGlove: import("three").Object3D | null = null;
    let rightGlove: import("three").Object3D | null = null;
    let frame = 0;
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    const setup = async () => {
      const [THREE, { GLTFLoader }] = await Promise.all([import("three"), import("three/addons/loaders/GLTFLoader.js")]);
      if (disposed) return;

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 2.2, -2.2, 0.1, 20);
      camera.position.set(0, -7, 0.2);
      camera.up.set(0, 0, 1);
      camera.lookAt(0, 0, 0.1);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x003e25, 2.35));
      const key = new THREE.DirectionalLight(0xffffff, 3.2);
      key.position.set(-2.2, -4.2, 5.5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x8dffc0, 2.05);
      rim.position.set(3.8, 1.5, 2.4);
      scene.add(rim);

      const [gltf, sourceDiffuseMap, normalMap] = await Promise.all([
        new GLTFLoader().loadAsync("/assets/models/goalkeeper-gloves.glb"),
        new THREE.TextureLoader().loadAsync("/assets/models/goalkeeper-gloves-diffuse.jpg"),
        new THREE.TextureLoader().loadAsync("/assets/models/goalkeeper-gloves-normal.jpg"),
      ]);
      if (disposed || !scene) return;
      const textureCanvas = document.createElement("canvas");
      textureCanvas.width = sourceDiffuseMap.image.width;
      textureCanvas.height = sourceDiffuseMap.image.height;
      const context = textureCanvas.getContext("2d", { willReadFrequently: true });
      context?.drawImage(sourceDiffuseMap.image, 0, 0);
      if (context) {
        const pixels = context.getImageData(0, 0, textureCanvas.width, textureCanvas.height);
        for (let index = 0; index < pixels.data.length; index += 4) {
          const red = pixels.data[index];
          const green = pixels.data[index + 1];
          const blue = pixels.data[index + 2];
          if (red > green * 1.16 && red > blue * 1.16) {
            const detail = Math.max(0, Math.min(1, red / 255));
            pixels.data[index] = 4 + detail * 7;
            pixels.data[index + 1] = 70 + detail * 126;
            pixels.data[index + 2] = 43 + detail * 47;
          } else if (green > red * 1.2) {
            pixels.data[index] = Math.min(220, red + 80);
            pixels.data[index + 1] = Math.min(255, green + 38);
            pixels.data[index + 2] = Math.min(190, blue + 34);
          }
        }
        context.putImageData(pixels, 0, 0);
      }
      sourceDiffuseMap.dispose();
      const diffuseMap = new THREE.CanvasTexture(textureCanvas);
      diffuseMap.colorSpace = THREE.SRGBColorSpace;
      diffuseMap.flipY = true;
      normalMap.flipY = true;
      normalMap.wrapS = THREE.RepeatWrapping;
      normalMap.wrapT = THREE.RepeatWrapping;

      const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        map: diffuseMap,
        roughness: 0.42,
        metalness: 0.02,
        clearcoat: 0.28,
        clearcoatRoughness: 0.52,
        emissive: 0x00351f,
        emissiveIntensity: 0.34,
        normalMap,
        normalScale: new THREE.Vector2(0.48, 0.48),
        side: THREE.DoubleSide,
      });

      leftGlove = gltf.scene.getObjectByName("left_glove") ?? null;
      rightGlove = gltf.scene.getObjectByName("right_glove") ?? null;
      for (const glove of [leftGlove, rightGlove]) {
        if (!glove) continue;
        glove.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.geometry.computeVertexNormals();
          child.material = material.clone();
        });
        const bounds = new THREE.Box3().setFromObject(glove);
        const center = bounds.getCenter(new THREE.Vector3());
        glove.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.geometry.translate(-center.x, -center.y, -center.z);
        });
        glove.position.set(0, 0, 0);
        glove.scale.setScalar(0.052);
        scene.add(glove);
      }

      if (!leftGlove || !rightGlove) throw new Error("Goalkeeper glove meshes are missing.");
      setReady(true);

      const resize = () => {
        if (!renderer || !camera || !canvas) return;
        const width = Math.max(1, canvas.clientWidth);
        const height = Math.max(1, canvas.clientHeight);
        const halfHeight = 2.2;
        const halfWidth = halfHeight * (width / height);
        camera.left = -halfWidth;
        camera.right = halfWidth;
        camera.top = halfHeight;
        camera.bottom = -halfHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
      resize();

      const base = {
        left: { x: -0.48, z: -1.24, rotation: Math.PI / 2 },
        right: { x: 0.48, z: -1.24, rotation: -Math.PI / 2 },
      };
      const targets = [
        { lead: "left", x: -0.62, z: 0.42, spread: 0.2 },
        { lead: "both", x: 0, z: 0.46, spread: 0.17 },
        { lead: "right", x: 0.62, z: 0.42, spread: 0.2 },
        { lead: "left", x: -0.67, z: -0.2, spread: 0.18 },
        { lead: "right", x: 0.67, z: -0.2, spread: 0.18 },
      ] as const;

      const setGlovePose = (glove: import("three").Object3D, side: "left" | "right", x: number, z: number, rotation: number, scale: number) => {
        glove.position.x += (x - glove.position.x) * 0.24;
        glove.position.z += (z - glove.position.z) * 0.24;
        glove.rotation.y += (rotation - glove.rotation.y) * 0.24;
        const nextScale = 0.052 * scale;
        glove.scale.lerp(new THREE.Vector3(nextScale, nextScale, nextScale), 0.22);
        const meshes: import("three").Mesh[] = [];
        glove.traverse((child) => { if (child instanceof THREE.Mesh) meshes.push(child); });
        const isMiss = motionRef.current.phase === "feedback" && motionRef.current.saved === false;
        for (const mesh of meshes) {
          const meshMaterial = mesh.material as import("three").MeshPhysicalMaterial;
          meshMaterial.opacity += ((isMiss ? 0.72 : 1) - meshMaterial.opacity) * 0.18;
          meshMaterial.transparent = meshMaterial.opacity < 0.99;
          meshMaterial.color.lerp(new THREE.Color(isMiss ? 0x63776c : side === "left" ? 0xffffff : 0xf0fff6), 0.12);
        }
      };

      const render = (now: number) => {
        if (disposed || !renderer || !scene || !camera || !leftGlove || !rightGlove) return;
        const motion = motionRef.current;
        const elapsed = now - motion.changedAt;
        const active = motion.zone !== null && (motion.phase === "flight" || motion.phase === "feedback");
        const progress = active ? Math.min(1, elapsed / 470) : 0;
        const eased = 1 - Math.pow(1 - progress, 3);
        const idle = Math.sin(now / 420) * 0.025;
        let leftX = base.left.x;
        let leftZ = base.left.z + idle;
        let rightX = base.right.x;
        let rightZ = base.right.z - idle;
        let leftRotation = base.left.rotation;
        let rightRotation = base.right.rotation;
        let leftScale = 1;
        let rightScale = 1;

        if (active && motion.zone !== null) {
          const target = targets[motion.zone];
          const leadLeft = target.lead === "left" || target.lead === "both";
          const leadRight = target.lead === "right" || target.lead === "both";
          const leftTargetX = leadLeft ? target.x - (target.lead === "both" ? target.spread : 0) : 0.26;
          const rightTargetX = leadRight ? target.x + (target.lead === "both" ? target.spread : 0) : -0.26;
          const leftTargetZ = leadLeft ? target.z : -1.05;
          const rightTargetZ = leadRight ? target.z : -1.05;
          leftX += (leftTargetX - leftX) * eased;
          leftZ += (leftTargetZ - leftZ) * eased;
          rightX += (rightTargetX - rightX) * eased;
          rightZ += (rightTargetZ - rightZ) * eased;
          leftRotation += (leadLeft ? (motion.zone === 0 || motion.zone === 3 ? 0.2 : -0.08) : -0.22) * eased;
          rightRotation += (leadRight ? (motion.zone === 2 || motion.zone === 4 ? -0.2 : 0.08) : 0.22) * eased;
          leftScale = leadLeft ? 1 + eased * 0.18 : 0.92;
          rightScale = leadRight ? 1 + eased * 0.18 : 0.92;

          if (motion.phase === "feedback" && motion.saved) {
            const impact = Math.sin(Math.min(1, elapsed / 330) * Math.PI);
            leftScale += leadLeft ? impact * 0.16 : 0;
            rightScale += leadRight ? impact * 0.16 : 0;
            leftZ -= leadLeft ? impact * 0.07 : 0;
            rightZ -= leadRight ? impact * 0.07 : 0;
          }
        }

        setGlovePose(leftGlove, "left", leftX, leftZ, leftRotation, leftScale);
        setGlovePose(rightGlove, "right", rightX, rightZ, rightRotation, rightScale);
        renderer.render(scene, camera);
        frame = window.requestAnimationFrame(render);
      };
      frame = window.requestAnimationFrame(render);
    };

    void setup().catch(() => setReady(false));
    return () => {
      disposed = true;
      setReady(false);
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      scene?.traverse((child) => {
        const mesh = child as import("three").Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          const standardMaterial = material as import("three").MeshStandardMaterial;
          const normalMap = standardMaterial.normalMap;
          standardMaterial.map?.dispose();
          normalMap?.dispose();
          material.dispose();
        });
      });
      renderer?.dispose();
    };
  }, []);

  const zoneClass = zone === null ? "gloves-idle" : `gloves-zone-${zone}`;
  const committed = zone !== null && (phase === "flight" || phase === "feedback");
  return (
    <div className={`keeper-gloves ${zoneClass} ${committed ? "committed" : ""} ${ready ? "three-ready" : ""}`} aria-hidden="true">
      <canvas ref={canvasRef} className="keeper-gloves-canvas" />
      <img className="keeper-glove keeper-glove-left" src="/assets/phiz/glove-left.png" alt="" />
      <img className="keeper-glove keeper-glove-right" src="/assets/phiz/glove-right.png" alt="" />
    </div>
  );
}

function MatchScreen({ match, gamePoints, locale, difficulty, onSelect, onContinue, onExit }: { match: MatchState; gamePoints: number; locale: Locale; difficulty: Difficulty; onSelect: (zone: number | null) => void; onContinue: () => void; onExit: () => void }) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState({ x: 50, y: 82, active: false });
  const cue = zoneSide(match.targetZone);
  const ballTarget = TARGETS[match.targetZone];
  const c = COPY[locale];
  const difficultyLabel = {
    newcomer: c.newcomer,
    standard: c.standard,
    challenge: c.challengeLevel,
    pro: c.pro,
  }[difficulty.id];
  function updateDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(92, Math.max(8, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(88, Math.max(24, ((event.clientY - rect.top) / rect.height) * 100));
    setDrag({ x, y, active: true });
  }

  function releaseDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (match.phase !== "aiming") return;
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const nearest = TARGETS.reduce((best, target, index) => {
      const distance = Math.hypot(x - target.left, y - target.top);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Number.POSITIVE_INFINITY });
    setDrag({ x: TARGETS[nearest.index].left, y: TARGETS[nearest.index].top, active: false });
    onSelect(nearest.index);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  useEffect(() => { setDrag({ x: 50, y: 82, active: false }); }, [match.shot]);
  useEffect(() => {
    if (match.selectedZone === null) return;
    const target = TARGETS[match.selectedZone];
    setDrag({ x: target.left, y: target.top, active: false });
  }, [match.selectedZone]);

  return (
    <div className={`match-screen phase-${match.phase} cue-${cue} difficulty-${difficulty.id} ${match.phase === "feedback" ? (match.lastSaved ? "save-state" : "goal-state") : ""}`} ref={fieldRef} style={{ "--team-accent": "#009b55", "--ball-x": `${ballTarget.left}%`, "--ball-y": `${ballTarget.top}%`, "--reaction-ms": `${difficulty.reactionMs}ms` } as CSSProperties}>
      <img className="match-background" src="/assets/phiz/penalty-stadium-field.png" alt="守门员第一人称视角，前方是球场和看台" />
      <div className="striker-stage" aria-hidden="true">
        <img className="animated-striker striker-ready" src="/assets/phiz/striker/ready.png" alt="" />
        <img className="animated-striker striker-run" src="/assets/phiz/striker/run.png" alt="" />
        <img className="animated-striker striker-kick" src="/assets/phiz/striker/kick.png" alt="" />
      </div>
      <span className="animated-ball purchased-football" aria-hidden="true"><Football3D /></span>
      <GoalkeeperGloves3D phase={match.phase} zone={match.selectedZone} saved={match.lastSaved} />
      <div className="match-topbar"><button type="button" className="exit-button compact" onClick={onExit}><ArrowLeft weight="bold" />{c.quit}</button><div className="save-counter"><HandPalm weight="fill" /><span>{c.saveLabel}<strong>{match.saved}/5</strong><small>{c.estimatedCash} {formatBRL(PAYOUT_UNITS[Math.min(5, match.saved)])}</small></span></div><PointsPill points={gamePoints} locale={locale} /></div>
      <div className={`shot-dots ${match.isRevival ? "revival-dots" : ""}`} aria-label={match.isRevival ? c.reviveShort : `${c.shot} ${match.shot} / 5`}>{match.isRevival ? <span className="current revival-dot"><Lightning weight="fill" /></span> : Array.from({ length: 5 }).map((_, index) => <span key={index} className={index < match.shot ? "current" : ""} />)}</div>
      <div className="target-layer">{TARGETS.map((target, index) => {
        const assisted = difficulty.id === "newcomer" && !match.isRevival && match.shot <= difficulty.assistShots && match.phase === "aiming" && match.targetZone === index;
        return <button type="button" key={target.label} aria-label={`${c.saveLabel} ${index + 1}`} className={`save-target ${match.selectedZone === index ? "selected" : ""} ${match.phase === "feedback" && match.targetZone === index ? "actual" : ""} ${assisted ? "assist" : ""}`} style={{ left: `${target.left}%`, top: `${target.top}%` }} disabled={match.phase !== "aiming"} onClick={() => onSelect(index)} />;
      })}</div>
      {match.phase === "aiming" && <div className="reaction-bar"><span /><b>{c.finalCall}</b></div>}
      <div className="match-message" aria-live="polite">{match.phase === "ready" && <><span>{match.isRevival ? c.reviveShort : `${c.shot} ${match.shot}`} · {difficultyLabel}</span><strong>{c.ready}</strong></>}{match.phase === "runup" && <><span>{c.observe}</span><strong>{c.runup}</strong></>}{match.phase === "flight" && <><span>{c.locked}</span><strong>{c.kick}</strong></>}{match.phase === "feedback" && <><span>{match.lastSaved ? c.greatSave : c.opponentGoal}</span><strong>{match.lastSaved ? c.savedBang : c.conceded}</strong></>}</div>
      <button type="button" className={`glove-control ${drag.active ? "dragging" : ""}`} aria-label={c.drag} disabled={match.phase !== "aiming"} onPointerDown={(event) => { if (match.phase !== "aiming") return; event.currentTarget.setPointerCapture(event.pointerId); updateDrag(event); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updateDrag(event); }} onPointerUp={releaseDrag} />
      {match.phase === "runup" && <div className="drag-instruction observing"><Target weight="fill" />{c.cue}</div>}
      {match.phase === "aiming" && <div className="drag-instruction"><HandPalm weight="fill" />{c.drag}</div>}
      {match.phase === "feedback" && <div className={`outcome-burst ${match.lastSaved ? "saved" : "missed"}`}>{match.lastSaved ? "SAVE" : "GOAL"}</div>}
      {match.phase === "feedback" && <button className="match-continue" type="button" onClick={onContinue}>{match.isRevival ? c.settleCash : match.shot === 5 ? c.viewResult : c.next}<ArrowRight weight="bold" /></button>}
    </div>
  );
}
