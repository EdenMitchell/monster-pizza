import "./style.css";
import { createMonsterPizzaGame } from "./game/createGame";

const root = document.documentElement;
const gameHost = document.querySelector<HTMLElement>("#game");
const orientationHint = document.querySelector<HTMLElement>("#orientation-hint");

if (!gameHost) throw new Error("Monster Pizza game host is missing.");

function syncViewport(): void {
  const viewport = window.visualViewport;
  const width = Math.round(viewport?.width ?? window.innerWidth);
  const height = Math.round(viewport?.height ?? window.innerHeight);
  root.style.setProperty("--viewport-width", `${width}px`);
  root.style.setProperty("--viewport-height", `${height}px`);
  orientationHint?.classList.toggle("visible", height > width && width < 760);
}

syncViewport();
const game = createMonsterPizzaGame(gameHost);
gameHost.querySelector(".game-loading")?.remove();

let resizeFrame = 0;
function refreshViewport(): void {
  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(() => {
    syncViewport();
    game.scale.refresh();
  });
}

window.addEventListener("resize", refreshViewport);
window.addEventListener("orientationchange", refreshViewport);
window.addEventListener("pageshow", refreshViewport);
window.visualViewport?.addEventListener("resize", refreshViewport);
window.visualViewport?.addEventListener("scroll", refreshViewport);

window.addEventListener("beforeunload", () => {
  window.cancelAnimationFrame(resizeFrame);
  window.removeEventListener("resize", refreshViewport);
  window.removeEventListener("orientationchange", refreshViewport);
  window.removeEventListener("pageshow", refreshViewport);
  window.visualViewport?.removeEventListener("resize", refreshViewport);
  window.visualViewport?.removeEventListener("scroll", refreshViewport);
  game.destroy(true);
});
