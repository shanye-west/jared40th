import { getTeamColor, ensureTournamentTeamColors } from './teamColors';
import { describe, it, expect } from 'vitest';

describe('teamColors util', () => {
  it('returns rowdyCup defaults when override missing', () => {
    expect(getTeamColor('rowdyCup', 'teamA', '')).toBe('#132448');
    expect(getTeamColor('rowdyCup', 'teamB', null)).toBe('#bf203c');
  });

  it('returns christmasClassic defaults when series set', () => {
    expect(getTeamColor('christmasClassic', 'teamA', '')).toBe('#00863c');
    expect(getTeamColor('christmasClassic', 'teamB', undefined)).toBe('#ef211c');
  });

  it('prefers override when provided', () => {
    expect(getTeamColor('rowdyCup', 'teamA', '#abcdef')).toBe('#abcdef');
  });

  it('ensureTournamentTeamColors populates missing colors', () => {
    const t = { series: 'christmasClassic', teamA: { id: 'teamA', name: 'A', color: '' }, teamB: { id: 'teamB', name: 'B' } } as any;
    const out = ensureTournamentTeamColors(t) as any;
    expect(out.teamA.color).toBe('#00863c');
    expect(out.teamB.color).toBe('#ef211c');
  });
});
