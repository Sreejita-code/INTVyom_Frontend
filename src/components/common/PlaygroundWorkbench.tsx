import type { ReactNode } from "react";

interface PlaygroundWorkbenchProps {
  request: ReactNode;
  result: ReactNode;
}

export function PlaygroundWorkbench({
  request,
  result,
}: PlaygroundWorkbenchProps) {
  return (
    <div
      data-testid="playground-workbench"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]"
    >
      <div className="min-w-0">{request}</div>
      <div className="min-w-0">{result}</div>
    </div>
  );
}
