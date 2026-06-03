import { Sparklines, SparklinesLine, SparklinesSpots } from "react-sparklines";
import { useTicker } from "../hooks/useTicker";
import { useCandles } from "../hooks/useCandles";
import type { Candle} from "../types/types";

type LivePriceProps = {
  symbol: string;
};

export function LivePriceSparkline({ symbol }: LivePriceProps) {
  const tick = useTicker(symbol); 
  const { candles } = useCandles(symbol, "1m", 120, tick || undefined);

  const closes: number[] = candles.map((c: Candle) => c.close);

  const rising =
    closes.length > 1 && closes[closes.length - 1] >= closes[0];

  const color = rising ? "#16a34a" : "#dc2626";

  return (
    <div className="p-4 rounded-xl shadow border flex flex-col gap-2">
      <div className="text-sm text-gray-500">{symbol}</div>

      <div className="text-2xl font-semibold">
        {tick != null ? tick.price.toFixed(2) : "…"}
      </div>

      {closes.length >= 2 ? (
        <Sparklines data={closes} width={120} height={32} margin={4}>
          <SparklinesLine color={color} />
          <SparklinesSpots />
        </Sparklines>
      ) : (
        <div style={{ width: 120, height: 32 }} />
      )}
    </div>
  );
}
