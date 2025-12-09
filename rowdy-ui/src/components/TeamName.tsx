import React from "react";
import "../styles/team-name.css";

export type TeamNameVariant = "tile" | "inline";

interface TeamNameProps {
  name: string;
  title?: string;
  className?: string;
  variant?: TeamNameVariant;
  style?: React.CSSProperties;
}

export default function TeamName({ name, title, className = "", variant = "inline", style }: TeamNameProps) {
  if (variant === "tile") {
    return (
      <div className={`team-tile ${className}`} title={title ?? name} style={style}>
        <span className="team-name">{name}</span>
      </div>
    );
  }

  return (
    <span className={`team-name-inline ${className}`} title={title ?? name} style={style}>
      {name}
    </span>
  );
}
