import { SliceRushGame } from "./SliceRushGame";

export default function Home() {
  return (
    <main className="game-shell">
      <h1 className="sr-only">Slice Rush</h1>
      <SliceRushGame />
      <p className="orientation-hint" aria-hidden="true">
        Turn your device sideways for the fastest service.
      </p>
    </main>
  );
}
