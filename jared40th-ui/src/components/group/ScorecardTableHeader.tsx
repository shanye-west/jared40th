import { SCORECARD_CELL_WIDTH, SCORECARD_LABEL_WIDTH, SCORECARD_TOTAL_COL_WIDTH } from "../../constants";

type HoleData = {
  k: string;
  num: number;
  par: number;
  hcpIndex: number;
  yards?: number;
};

type ScorecardTableHeaderProps = {
  holes: HoleData[];
  totals: { parOut: number; parIn: number; parTotal: number };
  courseTees?: string;
};

export function ScorecardTableHeader({ holes, totals, courseTees }: ScorecardTableHeaderProps) {
  const cellWidth = SCORECARD_CELL_WIDTH;
  const labelWidth = SCORECARD_LABEL_WIDTH;
  const totalColWidth = SCORECARD_TOTAL_COL_WIDTH;
  const headerBg = "#1e293b";
  const headerAccent = "#334155";
  const borderColor = "#475569";

  return (
    <thead>
      {/* Hole Numbers Row */}
      <tr style={{ backgroundColor: headerBg, color: "white" }}>
        <th
          className="sticky left-0 z-10 font-bold text-left px-3 py-2"
          style={{ width: labelWidth, minWidth: labelWidth, backgroundColor: headerBg }}
        >
          HOLE
        </th>
        {holes.slice(0, 9).map((h) => (
          <th key={h.k} className="font-bold py-2" style={{ width: cellWidth, minWidth: cellWidth }}>
            {h.num}
          </th>
        ))}
        <th
          className="font-bold py-2 border-l-2"
          style={{ width: totalColWidth, minWidth: totalColWidth, backgroundColor: headerAccent, borderColor }}
        >
          OUT
        </th>
        {holes.slice(9, 18).map((h, i) => (
          <th
            key={h.k}
            className={`font-bold py-2 ${i === 0 ? "border-l-2" : ""}`}
            style={{ width: cellWidth, minWidth: cellWidth, borderColor }}
          >
            {h.num}
          </th>
        ))}
        <th
          className="font-bold py-2 border-l-2"
          style={{ width: totalColWidth, minWidth: totalColWidth, backgroundColor: headerAccent, borderColor }}
        >
          IN
        </th>
        <th
          className="font-bold py-2"
          style={{ width: totalColWidth, minWidth: totalColWidth, backgroundColor: borderColor }}
        >
          TOT
        </th>
      </tr>

      {/* Handicap Row */}
      <tr className="bg-slate-50 text-slate-400 text-xs border-b border-slate-200">
        <td className="sticky left-0 z-10 bg-slate-50 text-left px-3 py-1">Hcp</td>
        {holes.slice(0, 9).map((h) => (
          <td key={h.k} className="py-1">{h.hcpIndex || ""}</td>
        ))}
        <td className="py-1 bg-slate-100 border-l-2 border-slate-200" />
        {holes.slice(9, 18).map((h, i) => (
          <td key={h.k} className={`py-1 ${i === 0 ? "border-l-2 border-slate-200" : ""}`}>
            {h.hcpIndex || ""}
          </td>
        ))}
        <td className="py-1 bg-slate-100 border-l-2 border-slate-200" />
        <td className="py-1 bg-slate-200" />
      </tr>

      {/* Yardage Row */}
      <tr className="bg-slate-50 text-slate-900 text-xs border-b border-slate-200">
        <td className="sticky left-0 z-10 bg-slate-50 text-left px-3 py-1 capitalize">{courseTees || "Yards"}</td>
        {holes.slice(0, 9).map((h) => (
          <td key={h.k} className="py-1">{h.yards || ""}</td>
        ))}
        <td className="py-1 bg-slate-100 border-l-2 border-slate-200">
          {holes.slice(0, 9).reduce((sum, h) => sum + (h.yards || 0), 0) || ""}
        </td>
        {holes.slice(9, 18).map((h, i) => (
          <td key={h.k} className={`py-1 ${i === 0 ? "border-l-2 border-slate-200" : ""}`}>
            {h.yards || ""}
          </td>
        ))}
        <td className="py-1 bg-slate-100 border-l-2 border-slate-200">
          {holes.slice(9, 18).reduce((sum, h) => sum + (h.yards || 0), 0) || ""}
        </td>
        <td className="py-1 bg-slate-200">{holes.reduce((sum, h) => sum + (h.yards || 0), 0) || ""}</td>
      </tr>

      {/* Par Row */}
      <tr className="bg-slate-100 text-slate-600 text-xs font-semibold">
        <td className="sticky left-0 z-10 bg-slate-100 text-left px-3 py-1.5">Par</td>
        {holes.slice(0, 9).map((h) => (
          <td key={h.k} className="py-1.5">{h.par}</td>
        ))}
        <td className="py-1.5 bg-slate-200 font-bold border-l-2 border-slate-300">{totals.parOut}</td>
        {holes.slice(9, 18).map((h, i) => (
          <td key={h.k} className={`py-1.5 ${i === 0 ? "border-l-2 border-slate-300" : ""}`}>
            {h.par}
          </td>
        ))}
        <td className="py-1.5 bg-slate-200 font-bold border-l-2 border-slate-300">{totals.parIn}</td>
        <td className="py-1.5 bg-slate-300 font-bold">{totals.parTotal}</td>
      </tr>
    </thead>
  );
}
