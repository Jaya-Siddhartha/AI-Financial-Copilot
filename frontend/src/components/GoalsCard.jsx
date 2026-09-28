import React from 'react';
import { Plus, Target } from 'lucide-react';
import { goalPlan, GOAL_STATUS, monthlySurplus } from '../lib/goals';
import { inr } from '../lib/format';

// Savings goals with progress, the monthly amount needed and whether it fits.
export function GoalsCard({ data, analysis, actions }) {
  const surplus = monthlySurplus(analysis, data.profile);
  return (
    <section className="card" aria-labelledby="goals-title">
      <div className="card-head">
        <h2 className="card-title" id="goals-title">Savings goals</h2>
        <button type="button" className="btn btn-soft btn-sm" onClick={() => actions.editGoal()}>
          <Plus size={18} /> Add goal
        </button>
      </div>
      {surplus !== null && (
        <p className="card-sub" style={{ marginBottom: 8 }}>
          You usually have about {inr(Math.max(0, surplus))} left at the end of a month{surplus < 0 ? ' (recently you spent more than you earned)' : ''}.
        </p>
      )}
      {data.goals.length === 0 ? (
        <div className="empty">No goals yet. Saving for something makes it easier to spend less.</div>
      ) : (
        <div className="list">
          {data.goals.map((g) => {
            const p = goalPlan(g, surplus);
            const st = GOAL_STATUS[p.status];
            return (
              <button type="button" className="row goal-row" key={g.id} onClick={() => actions.editGoal(g)}>
                <span className="icon-circle"><Target size={20} /></span>
                <div className="row-main">
                  <div className="row-title">{g.name}</div>
                  <div className="progress" aria-label={`${p.progress}% saved`}><span style={{ width: `${p.progress}%` }} /></div>
                  <div className="row-sub" style={{ whiteSpace: 'normal' }}>
                    {inr(p.saved)} of {inr(p.target)}
                    {p.status !== 'done' && p.months ? ` · save ${inr(p.perMonth)} a month for ${p.months} month${p.months === 1 ? '' : 's'}` : ''}
                  </div>
                </div>
                <span className={`chip ${st.tone}`}>{st.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
