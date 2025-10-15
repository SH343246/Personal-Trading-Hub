// src/mosaic/SidebarLinkGroup.tsx
import { useState } from "react";

type Props = {
  activecondition?: boolean;
  children: (handleClick: () => void, open: boolean) => React.ReactNode;
};

export default function SidebarLinkGroup({ activecondition, children }: Props) {
  const [open, setOpen] = useState(!!activecondition);
  const handleClick = () => setOpen((v) => !v);
  return <li className="mb-1">{children(handleClick, open)}</li>;
}
