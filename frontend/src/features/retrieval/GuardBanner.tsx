import type { Guard } from "./guards";

export function GuardBanner({ guards }: { guards: Guard[] }) {
  if (guards.length === 0) return null;
  return (
    <>
      {guards.map((g, i) => (
        <p key={i} className="guard" role="alert" data-level={g.level}>
          {g.message}
        </p>
      ))}
    </>
  );
}
