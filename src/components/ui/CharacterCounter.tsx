interface CharacterCounterProps {
  current: number;
  max: number;
}

export function CharacterCounter({ current, max }: CharacterCounterProps) {
  const isNear = current > max * 0.85;
  const isOver = current > max;

  return (
    <span
      className={`text-xs tabular-nums ${
        isOver
          ? "text-destructive font-medium"
          : isNear
            ? "text-amber-600"
            : "text-muted-foreground"
      }`}
    >
      {current}/{max}
    </span>
  );
}
