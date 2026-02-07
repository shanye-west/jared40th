import type { RoundDoc } from "../types";

type RoundTabsProps = {
  rounds: RoundDoc[];
  selectedRoundId: string;
  onSelect: (roundId: string) => void;
};

export function RoundTabs({ rounds, selectedRoundId, onSelect }: RoundTabsProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
      {rounds.map((round) => {
        const isActive = round.id === selectedRoundId;
        return (
          <button
            key={round.id}
            onClick={() => onSelect(round.id)}
            className={`flex-1 rounded-md py-2 px-3 text-sm font-semibold transition-all ${
              isActive
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Day {round.day ?? "?"}
          </button>
        );
      })}
    </div>
  );
}
