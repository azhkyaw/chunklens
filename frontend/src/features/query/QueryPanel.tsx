import { SingleQuery } from "./SingleQuery";

export function QueryPanel({ name }: { name: string }) {
  return (
    <section style={{ marginTop: 16 }}>
      <h3>Query</h3>
      <SingleQuery name={name} />
    </section>
  );
}
