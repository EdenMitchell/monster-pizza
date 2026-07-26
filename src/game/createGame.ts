import * as Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { MenuScene } from "./scenes/MenuScene";
import { PreloadScene } from "./scenes/PreloadScene";

export function createSliceRushGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: "#163c3b",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
    render: {
      antialias: true,
      roundPixels: false,
    },
    input: {
      activePointers: 3,
      keyboard: true,
    },
    dom: {
      createContainer: true,
    },
    scene: [PreloadScene, MenuScene, GameScene],
    callbacks: {
      postBoot: (bootedGame) => {
        bootedGame.canvas.setAttribute("role", "application");
        bootedGame.canvas.setAttribute("tabindex", "0");
        bootedGame.canvas.setAttribute(
          "aria-label",
          "Monster Pizza arcade. Start a ninety-second game, portion gross pizza ingredients to match monster orders, serve quickly, and compete for the local top ten.",
        );
      },
    },
  });
  return game;
}
