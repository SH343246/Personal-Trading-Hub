import { useTicker } from "../hooks/useTicker";

type Props = { symbol: string };

export function LivePrice({ symbol }: Props) {
  const tick = useTicker(symbol);

  return (
    <div>
      <div>{symbol.toUpperCase()}</div>
      <div>{tick ? tick.price : "Loading..."}</div>
      <div>{tick ? new Date(tick.event_ts).toLocaleTimeString() : ""}</div>
    </div>
  );
}
