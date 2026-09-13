import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowRight, BarChart3, Bell, BookOpen, CalendarDays, Check, ChevronDown,
  CirclePause, CirclePlay, Clock3, LayoutDashboard, Menu, NotebookPen, Plus, Search,
  Settings, ShieldCheck, Sparkles, Target, Trash2, Trophy, Users, X,
  Pencil,
} from 'lucide-react'
import { demoData, loadFplData } from './data'
import { updatePlanTeamSelection } from './plans'
import { averageDifficulty, getClubWeek, getRotationWeeks, rotationScore } from './rotation'
import { loadPlans, savePlans } from './storage'
import type { FplData, GameweekKey, PlanStatus, RotationPlan, Team, TeamFixture } from './types'

type Filter = 'all' | PlanStatus

const initialPlans: RotationPlan[] = loadPlans() ?? [
  {
    id: 'starter-premium',
    name: 'Premium defence rotation',
    teamIds: [1, 2, 3],
    teamKeys: ['ARS', 'AVL', 'BOU'],
    manualPicks: {},
    status: 'active',
    note: 'Start the defender with the kinder fixture. Review after the next international break.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'starter-keepers',
    name: 'Budget keeper pair',
    teamIds: [4, 5],
    teamKeys: ['BRE', 'BHA'],
    manualPicks: {},
    status: 'paused',
    note: 'Pause until both first-choice keepers are confirmed fit.',
    createdAt: new Date().toISOString(),
  },
]

function TeamMark({ team, size = 'md' }: { team: Team; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`team-mark team-mark--${size}`}
      style={{ '--team-color': team.colors[0], '--team-ink': team.colors[1] } as React.CSSProperties}
      title={team.name}
    >
      {team.shortName.slice(0, 2)}
    </span>
  )
}

function TeamStack({ teams, max = 4 }: { teams: Team[]; max?: number }) {
  const hiddenCount = Math.max(0, teams.length - max)
  return (
    <div className="team-stack" aria-label={teams.map((team) => team.name).join(', ')}>
      {teams.slice(0, max).map((team) => <TeamMark team={team} key={team.id} />)}
      {hiddenCount > 0 && <span className="team-overflow">+{hiddenCount}</span>}
    </div>
  )
}

function StatusPill({ status }: { status: PlanStatus }) {
  return (
    <span className={`status-pill status-pill--${status}`}>
      <span />{status === 'active' ? 'In use' : 'Paused'}
    </span>
  )
}

function Difficulty({ value }: { value: number | null }) {
  if (value === null) return <span className="difficulty difficulty--blank">—</span>
  const rounded = Math.max(1, Math.min(5, Math.round(value)))
  return <span className={`difficulty difficulty--${rounded}`}>{Number.isInteger(value) ? value : value.toFixed(1)}</span>
}

function PlanEditor({ teams, plan, onClose, onSave }: {
  teams: Team[]
  plan?: RotationPlan
  onClose: () => void
  onSave: (name: string, teamIds: number[]) => void
}) {
  const [name, setName] = useState(plan?.name ?? '')
  const [selected, setSelected] = useState<number[]>(plan?.teamIds ?? [])
  const [query, setQuery] = useState('')
  const visibleTeams = teams.filter((team) =>
    `${team.name} ${team.shortName}`.toLowerCase().includes(query.toLowerCase()),
  )

  const toggleTeam = (teamId: number) => {
    setSelected((current) => current.includes(teamId)
      ? current.filter((id) => id !== teamId)
      : [...current, teamId])
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose()
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="creator-title">
        <div className="modal__header">
          <div>
            <span className="eyebrow">{plan ? 'Edit rotation' : 'New rotation'}</span>
            <h2 id="creator-title">{plan ? 'Update teams' : 'Build a rotation group'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>

        <label className="field-label" htmlFor="plan-name">Plan name</label>
        <input
          id="plan-name"
          className="text-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Budget defender rotation"
          autoFocus
        />

        <div className="picker-heading">
          <div>
            <span className="field-label">Select 2 or more clubs</span>
            <span className="picker-count">{selected.length} selected · no maximum</span>
          </div>
          <label className="team-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find club" />
          </label>
        </div>

        <div className="team-picker">
          {visibleTeams.map((team) => {
            const isSelected = selected.includes(team.id)
            return (
              <button
                key={team.id}
                className={`team-option ${isSelected ? 'team-option--selected' : ''}`}
                onClick={() => toggleTeam(team.id)}
              >
                <TeamMark team={team} size="sm" />
                <span>{team.name}</span>
                <span className="team-option__check">{isSelected && <Check size={14} />}</span>
              </button>
            )
          })}
        </div>

        <div className="modal__footer">
          <button className="button button--ghost" onClick={onClose}>Cancel</button>
          <button
            className="button button--primary"
            disabled={selected.length < 2 || !name.trim()}
            onClick={() => onSave(name.trim(), selected)}
          >
            {plan ? 'Save changes' : 'Create rotation'} <ArrowRight size={17} />
          </button>
        </div>
      </section>
    </div>
  )
}

function RotationCard({ plan, teams, fixtures, gameweeks, selected, onSelect }: {
  plan: RotationPlan
  teams: Team[]
  fixtures: TeamFixture[]
  gameweeks: number[]
  selected: boolean
  onSelect: () => void
}) {
  const planTeams = plan.teamIds.flatMap((id) => teams.find((team) => team.id === id) ?? [])
  const missingTeamCount = Math.max(0, plan.teamKeys.length - planTeams.length)
  const weeks = getRotationWeeks(plan, fixtures, gameweeks, teams)
  const score = rotationScore(weeks)
  return (
    <button className={`plan-card ${selected ? 'plan-card--selected' : ''}`} onClick={onSelect}>
      <div className="plan-card__top">
        <TeamStack teams={planTeams} />
        <StatusPill status={plan.status} />
      </div>
      <h3>{plan.name}</h3>
      <p>{planTeams.map((team) => team.shortName).join(' · ')}{missingTeamCount > 0 ? ` · ${missingTeamCount} unavailable` : ''}</p>
      <div className="plan-card__footer">
        <span><Sparkles size={15} /> Fixture score</span>
        <strong>{score}<small>/100</small></strong>
      </div>
    </button>
  )
}

function RotationDetail({ plan, data, editingDisabled, onChange, onEditTeams, onDelete }: {
  plan: RotationPlan
  data: FplData
  editingDisabled: boolean
  onChange: (plan: RotationPlan) => void
  onEditTeams: () => void
  onDelete: () => void
}) {
  const [saved, setSaved] = useState(false)
  const planTeams = plan.teamIds.flatMap((id) => data.teams.find((team) => team.id === id) ?? [])
  const isIncomplete = planTeams.length !== plan.teamKeys.length
  const weeks = getRotationWeeks(plan, data.fixtures, data.gameweeks, data.teams)
  const score = rotationScore(weeks)
  const average = averageDifficulty(weeks)

  const updateNote = (note: string) => {
    onChange({ ...plan, note })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  const toggleManualPick = (gameweek: number, teamKey: string) => {
    const weekKey = `${gameweek}` as GameweekKey
    const manualPicks = { ...plan.manualPicks }
    if (manualPicks[weekKey] === teamKey) delete manualPicks[weekKey]
    else manualPicks[weekKey] = teamKey
    onChange({ ...plan, manualPicks })
  }

  return (
    <section className="detail-card">
      <div className="detail-card__header">
        <div>
          <div className="detail-title-row">
            <TeamStack teams={planTeams} max={6} />
            <StatusPill status={plan.status} />
          </div>
          <h2>{plan.name}</h2>
          <p>Highlighted cells show your current picks; “auto” marks the lowest adjusted rotation difficulty.</p>
          {isIncomplete && <div className="incomplete-warning">A saved club is unavailable this season. This plan was paused; edit teams to replace it.</div>}
        </div>
        <div className="detail-actions">
          <button className="button button--ghost" disabled={editingDisabled} onClick={onEditTeams}><Pencil size={16} /> Edit teams</button>
          <button
            className={`button ${plan.status === 'active' ? 'button--pause' : 'button--resume'}`}
            disabled={isIncomplete}
            onClick={() => onChange({ ...plan, status: plan.status === 'active' ? 'paused' : 'active' })}
          >
            {plan.status === 'active' ? <CirclePause size={17} /> : <CirclePlay size={17} />}
            {plan.status === 'active' ? 'Pause plan' : 'Use plan'}
          </button>
          <button className="icon-button icon-button--danger" onClick={onDelete} aria-label="Delete plan">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="insight-strip">
        <div><span>Fixture score</span><strong>{score}<small>/100</small></strong></div>
        <div><span>Avg. rotation FDR</span><strong>{average ? average.toFixed(1) : '—'}<small> adj.</small></strong></div>
        <div><span>Good fixtures</span><strong>{weeks.filter((week) => (week.difficulty ?? 9) <= 2).length}<small> of {weeks.length}</small></strong></div>
        <div className="insight-tip"><Sparkles size={18} /><span>{score >= 75 ? 'Strong rotation — keep it on your shortlist.' : score >= 55 ? 'Useful rotation with a few tougher weeks.' : 'Consider swapping one club for better coverage.'}</span></div>
      </div>

      <div className="section-heading">
        <div><span className="eyebrow">Fixture map</span><h3>Upcoming gameweeks</h3><p>Click a fixture to pick it manually. Click your manual pick again to return to auto.</p></div>
        <div className="legend"><span><i className="legend__easy" />Easy</span><span><i className="legend__hard" />Hard</span><span>DGW: −0.75 boost</span></div>
      </div>

      <div className="fixture-scroll">
        <table className="fixture-table">
          <thead><tr><th>Club</th>{data.gameweeks.map((gw) => <th key={gw}>GW{gw}</th>)}</tr></thead>
          <tbody>
            {planTeams.map((team) => (
              <tr key={team.id}>
                <th><TeamMark team={team} size="sm" /><span>{team.shortName}</span></th>
                {data.gameweeks.map((gw) => {
                  const clubWeek = getClubWeek(team.id, data.fixtures, gw)
                  const week = weeks.find((item) => item.gameweek === gw)
                  const isPicked = week?.pickedTeamId === team.id
                  const isSuggested = week?.suggestedTeamId === team.id
                  const isManual = isPicked && week?.isManual
                  return (
                    <td key={gw} className={isPicked ? 'fixture-cell--best' : ''}>
                      <button
                        className="fixture-cell"
                        disabled={!clubWeek || isIncomplete}
                        onClick={() => toggleManualPick(gw, team.key)}
                        aria-label={isManual ? `Clear manual pick for ${team.name} in gameweek ${gw}` : `Pick ${team.name} manually for gameweek ${gw}`}
                      >
                        <span>{clubWeek?.fixtures.map((fixture) => {
                          const opponent = data.teams.find((item) => item.id === fixture.opponentId)
                          return `${opponent?.shortName ?? '—'} ${fixture.venue.toLowerCase()}`
                        }).join(' · ') ?? '—'}</span>
                        <Difficulty value={clubWeek?.rotationDifficulty ?? null} />
                        {isPicked && <span className={`best-label ${isManual ? 'best-label--manual' : ''}`}><Check size={10} /> {isManual ? 'manual' : 'pick'}{isManual && isSuggested ? ' · auto' : ''}{clubWeek && clubWeek.fixtures.length > 1 ? ' · DGW' : ''}</span>}
                        {!isPicked && isSuggested && <span className="auto-label">auto</span>}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="notes-panel">
        <div className="notes-panel__heading">
          <div><NotebookPen size={18} /><span>Plan notes</span></div>
          <span className={`saved-state ${saved ? 'saved-state--visible' : ''}`}><Check size={13} /> Saved</span>
        </div>
        <textarea
          value={plan.note}
          onChange={(event) => updateNote(event.target.value)}
          placeholder="Record your thinking, injury news, price points, or when to revisit this rotation…"
          aria-label="Plan notes"
        />
      </div>
    </section>
  )
}

export default function App() {
  const [data, setData] = useState<FplData>(demoData)
  const [isLoading, setIsLoading] = useState(true)
  const [plans, setPlans] = useState<RotationPlan[]>(initialPlans)
  const [selectedId, setSelectedId] = useState(initialPlans[0]?.id ?? '')
  const [filter, setFilter] = useState<Filter>('all')
  const [editorPlanId, setEditorPlanId] = useState<string | 'new' | null>(null)
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    loadFplData().then((result) => {
      setData(result)
      setPlans((current) => current.map((plan) => {
        const teamIds = plan.teamKeys.flatMap((key) => result.teams.find((team) => team.key === key)?.id ?? [])
        return {
          ...plan,
          teamIds,
          status: teamIds.length === plan.teamKeys.length ? plan.status : 'paused',
        }
      }))
      setIsLoading(false)
    })
  }, [])

  useEffect(() => savePlans(plans), [plans])

  const visiblePlans = useMemo(() => plans.filter((plan) => filter === 'all' || plan.status === filter), [plans, filter])
  const selectedPlan = visiblePlans.find((plan) => plan.id === selectedId) ?? visiblePlans[0]
  const activeCount = plans.filter((plan) => plan.status === 'active').length
  const scoredPlans = plans.map((plan) => ({ plan, score: rotationScore(getRotationWeeks(plan, data.fixtures, data.gameweeks, data.teams)) }))
  const topPlan = scoredPlans.sort((a, b) => b.score - a.score)[0]
  const planBeingEdited = editorPlanId && editorPlanId !== 'new'
    ? plans.find((plan) => plan.id === editorPlanId)
    : undefined

  const createPlan = (name: string, teamIds: number[]) => {
    const plan: RotationPlan = {
      id: crypto.randomUUID(),
      name,
      teamIds,
      teamKeys: teamIds.flatMap((id) => data.teams.find((team) => team.id === id)?.key ?? []),
      manualPicks: {},
      status: 'active',
      note: '',
      createdAt: new Date().toISOString(),
    }
    setPlans((current) => [plan, ...current])
    setSelectedId(plan.id)
    setFilter('all')
    setEditorPlanId(null)
  }

  const updatePlan = (updated: RotationPlan) => setPlans((current) => current.map((plan) => plan.id === updated.id ? updated : plan))

  const saveEditedPlan = (name: string, teamIds: number[]) => {
    if (!planBeingEdited) return
    updatePlan(updatePlanTeamSelection(planBeingEdited, name, teamIds, data.teams))
    setEditorPlanId(null)
  }

  const deletePlan = () => {
    if (!selectedPlan || !window.confirm(`Delete “${selectedPlan.name}”?`)) return
    const nextPlans = plans.filter((plan) => plan.id !== selectedPlan.id)
    setPlans(nextPlans)
    setSelectedId(nextPlans[0]?.id ?? '')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar--open' : ''}`}>
        <div className="brand"><span className="brand__mark"><Target size={22} /></span><span>touchline<small>FPL workbench</small></span></div>
        <button className="sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X /></button>
        <nav>
          <span className="nav-label">Workspace</span>
          <a href="#overview"><LayoutDashboard size={18} /> Overview</a>
          <a href="#rotation" className="active"><Activity size={18} /> Rotation Lab <span>1</span></a>
          <a href="#planner"><CalendarDays size={18} /> Squad Planner <em>Soon</em></a>
          <a href="#watchlist"><Users size={18} /> Watchlist <em>Soon</em></a>
          <span className="nav-label">Knowledge</span>
          <a href="#decisions"><BookOpen size={18} /> Decision journal</a>
          <a href="#reports"><BarChart3 size={18} /> Weekly reports</a>
        </nav>
        <div className="sidebar-card"><span><Sparkles size={17} /></span><strong>Build with context</strong><p>Your notes stay with each rotation, so good reasoning never gets lost.</p></div>
        <div className="sidebar-footer"><button><Settings size={18} /> Settings</button><div className="profile"><span>FP</span><div><strong>FPL Manager</strong><small>Local workspace</small></div><ChevronDown size={16} /></div></div>
      </aside>

      {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}

      <main>
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></button>
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>Rotation Lab</strong></div>
          <div className="topbar__actions">
            <span className={`data-status ${data.isLive ? '' : 'data-status--demo'}`}><i />{isLoading ? 'Updating fixtures…' : data.isLive ? 'Live FPL data' : 'Demo fixture data'}</span>
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
          </div>
        </header>

        <div className="page">
          <div className="page-heading">
            <div><span className="eyebrow">Planning workspace</span><h1>Rotation Lab</h1><p>Find the cleanest fixture runs, then capture the thinking behind every move.</p></div>
            <button className="button button--primary button--large" disabled={isLoading} onClick={() => setEditorPlanId('new')}><Plus size={18} /> New rotation</button>
          </div>

          <section className="metrics-grid">
            <article><span className="metric-icon metric-icon--green"><CirclePlay size={19} /></span><div><small>Plans in use</small><strong>{activeCount}</strong><p>{plans.length - activeCount} currently paused</p></div></article>
            <article><span className="metric-icon metric-icon--purple"><Trophy size={19} /></span><div><small>Best rotation</small><strong>{topPlan?.score ?? 0}<em>/100</em></strong><p>{topPlan?.plan.name ?? 'Create your first plan'}</p></div></article>
            <article><span className="metric-icon metric-icon--orange"><CalendarDays size={19} /></span><div><small>Planning horizon</small><strong>{data.gameweeks.length}<em> GWs</em></strong><p>GW{data.gameweeks[0]}–GW{data.gameweeks.at(-1)}</p></div></article>
            <article><span className="metric-icon metric-icon--blue"><ShieldCheck size={19} /></span><div><small>Saved locally</small><strong>{plans.length}<em> plans</em></strong><p>Private to this browser</p></div></article>
          </section>

          <div className="workspace-heading">
            <div><h2>Your rotations</h2><p>{plans.length} fixture {plans.length === 1 ? 'plan' : 'plans'} in your workspace</p></div>
            <div className="filters" aria-label="Filter plans">
              {(['all', 'active', 'paused'] as Filter[]).map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'active' ? 'In use' : value[0].toUpperCase() + value.slice(1)}</button>)}
            </div>
          </div>

          <div className="plan-layout">
            <div className="plan-list">
              {visiblePlans.map((plan) => <RotationCard key={plan.id} plan={plan} teams={data.teams} fixtures={data.fixtures} gameweeks={data.gameweeks} selected={selectedPlan?.id === plan.id} onSelect={() => setSelectedId(plan.id)} />)}
              <button className="new-plan-card" disabled={isLoading} onClick={() => setEditorPlanId('new')}><span><Plus size={20} /></span><strong>Compare another rotation</strong><small>Choose 2 or more clubs</small></button>
              {visiblePlans.length === 0 && <div className="empty-filter"><CirclePause size={22} /><strong>No {filter} plans</strong><span>Try another filter or create a rotation.</span></div>}
            </div>
            {selectedPlan ? <RotationDetail plan={selectedPlan} data={data} editingDisabled={isLoading} onChange={updatePlan} onEditTeams={() => setEditorPlanId(selectedPlan.id)} onDelete={deletePlan} /> : <section className="empty-detail"><Target size={32} /><h2>Build your first rotation</h2><p>Compare clubs across upcoming fixtures and save your decision notes.</p><button className="button button--primary" disabled={isLoading} onClick={() => setEditorPlanId('new')}><Plus size={17} /> New rotation</button></section>}
          </div>

          <footer className="page-footer"><span><Clock3 size={14} /> Fixture data {data.isLive ? 'from the official FPL API' : 'is in demo mode'} · score is a fixture-only heuristic</span><span>Touchline v0.1</span></footer>
        </div>
      </main>
      {editorPlanId && <PlanEditor
        key={editorPlanId}
        teams={data.teams}
        plan={planBeingEdited}
        onClose={() => setEditorPlanId(null)}
        onSave={editorPlanId === 'new' ? createPlan : saveEditedPlan}
      />}
    </div>
  )
}
