import { Card, Group, Text, Badge } from "@mantine/core";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

type Point = { x: string; y: number; };

type Props = {
  title: string;
  subtitle?: string;
  priceLabel?: string;
  changePercent?: number;
  data: Point[];
};

function toPercent(data: { x: string; y: number }[]) {
  if (!data.length) return [];
  const base = data[0].y || 1;
  return data.map(d => ({ x: d.x, pct: ((d.y / base) - 1) * 100 }));
}

/* function yDomain(data: Array<{ y: number }>): [number, number] | ["auto", "auto"] {
  if (!data.length) return ["auto", "auto"];
  const ys = data.map(d => d.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  if (min === max) return [min - 0.25, max + 0.25];
  const pad = (max - min) * 0.05;
  return [min - pad, max + pad];
} */
// todo: fix
function priceDomain(data: Array<{ y: number }>): [number, number] | ["auto","auto"] {
  if (!data?.length) return ["auto","auto"];

  const ys = data.map(d => d.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min;
  const last = ys[ys.length - 1];

  const minPctBand = 0.003;         
  const padPct = 0.10;               
  const tiny = span < last * minPctBand;

  if (tiny) {
    const pad = last * minPctBand;    
    return [last - pad, last + pad];
  } else {
    const pad = span * padPct;        
    return [min - pad, max + pad];
  }
}


export default function ChartCard(props: Props) {
  const pctData = toPercent(props.data);
//const pctDomain = yDomain(pctData.map(d => ({ y: d.pct })));
const domain = priceDomain(props.data);

  return (
    
    <Card withBorder radius="lg" padding="md" className="m-soft-card">
      <Group justify="space-between" mb="sm">
        <div>
          <Text fw={600}>{props.title}</Text>
          {props.subtitle ? <Text size="xs" c="dimmed">{props.subtitle}</Text> : null}
        </div>
        <Group gap="xs">
          {props.priceLabel ? <Text fw={700}>{props.priceLabel}</Text> : null}
          {typeof props.changePercent === "number" ? (
            <Badge variant="light" color={props.changePercent >= 0 ? "green" : "red"}>
              {props.changePercent >= 0 ? "+" : ""}
              {props.changePercent.toFixed(2)}%
              
            </Badge>
          ) : null}
        </Group>
      </Group>

      <div style={{ width: "100%", height: 260 }}>
<ResponsiveContainer>
  <LineChart data={pctData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
    <XAxis dataKey="x" />
<YAxis
  domain={domain}
  allowDataOverflow
  tickCount={5}
  tickFormatter={(v) => v.toFixed(2)}
/>
    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
    <Line type="monotone" dataKey="pct" dot={false} strokeWidth={2} />
  </LineChart>
</ResponsiveContainer>

      </div>
    </Card>
  );
}
