import * as Phaser from "phaser";
import { ChefScene } from "./scenes/ChefScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { ShiftScene } from "./scenes/ShiftScene";
import { ShopScene } from "./scenes/ShopScene";

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
    scene: [PreloadScene, ChefScene, ShopScene, ShiftScene],
    callbacks: {
      postBoot: (bootedGame) => {
        bootedGame.canvas.setAttribute("role", "application");
        bootedGame.canvas.setAttribute("tabindex", "0");
        bootedGame.canvas.setAttribute(
          "aria-label",
          "Slice Rush arcade. Choose a chef, select a restaurant shift, portion pizza wedges to match customer orders, and serve before the friendly ninety-second rush ends.",
        );
      },
    },
  });
  return game;
}
