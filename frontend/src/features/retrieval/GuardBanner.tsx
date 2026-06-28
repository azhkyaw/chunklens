import type { Guard } from "./guards";

export function GuardBanner({ guards }: { guards: Guard[] }) {
  if (guards.length === 0) return null;
  return (
    <>
      {guards.map((g, i) => (
        <p key={i} role="alert" data-level={g.level}
           style={{ background: g.level === "block" ? "#fee2e2" : "#fef3c7", padding: 8, borderRadius: 6 }}>
          {g.message}
        </p>
      ))}
    </>
  );
}
