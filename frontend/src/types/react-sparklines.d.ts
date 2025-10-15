declare module "react-sparklines" {
  import * as React from "react";

  export interface SparklinesProps {
    data: number[];
    width?: number;
    height?: number;
    margin?: number;
    children?: React.ReactNode; // <-- add this
  }
  export class Sparklines extends React.Component<SparklinesProps> {}

  export interface SparklinesLineProps {
    color?: string;
    style?: React.CSSProperties;
  }
  export class SparklinesLine extends React.Component<SparklinesLineProps> {}

  export class SparklinesSpots extends React.Component<Record<string, never>> {}

  export interface SparklinesReferenceLineProps {
    type?: "mean" | "median" | "avg" | "max" | "min";
  }
  export class SparklinesReferenceLine extends React.Component<SparklinesReferenceLineProps> {}
}
