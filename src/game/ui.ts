import * as Phaser from "phaser";
import { gameAudio } from "./runtime";

export const COLORS = {
  tomato: 0xd84a32,
  tomatoDeep: 0x8f2d2d,
  cream: 0xfff2cf,
  creamLight: 0xfffbeb,
  basil: 0x5b8d3a,
  teal: 0x146c6b,
  tealDeep: 0x163c3b,
  gold: 0xf4bd45,
  ink: 0x38241d,
  shadow: 0x1a1614,
} as const;

export const FONT = '"Trebuchet MS", "Avenir Next", system-ui, sans-serif';

export function addBackdrop(
  scene: Phaser.Scene,
  key: string,
  dimAlpha = 0.2,
): Phaser.GameObjects.Image {
  const image = scene.add.image(640, 360, key).setDisplaySize(1280, 720).setDepth(-20);
  scene.add.rectangle(640, 360, 1280, 720, COLORS.tealDeep, dimAlpha).setDepth(-19);
  return image;
}

export function addTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  width: number,
  height: number,
  action: () => void,
  options: {
    readonly color?: number;
    readonly textColor?: string;
    readonly fontSize?: number;
    readonly enabled?: boolean;
  } = {},
): Phaser.GameObjects.Container {
  const enabled = options.enabled ?? true;
  const shadow = scene.add.rectangle(5, 7, width, height, COLORS.shadow, 0.3);
  const background = scene.add
    .rectangle(0, 0, width, height, enabled ? options.color ?? COLORS.tomato : 0x6e6259)
    .setStrokeStyle(3, enabled ? COLORS.cream : 0xa89c8f, enabled ? 0.82 : 0.4);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONT,
      fontSize: `${options.fontSize ?? 18}px`,
      fontStyle: "bold",
      color: enabled ? options.textColor ?? "#fff8e8" : "#d4cbc1",
      align: "center",
    })
    .setOrigin(0.5);
  const button = scene.add.container(x, y, [shadow, background, text]).setSize(width, height);
  if (enabled) {
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", () => button.setScale(0.97));
    button.on("pointerout", () => button.setScale(1));
    button.on("pointerup", () => {
      button.setScale(1);
      gameAudio.tap();
      action();
    });
  }
  return button;
}

export function addPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  color = COLORS.creamLight,
  alpha = 0.96,
): Phaser.GameObjects.Rectangle {
  scene.add.rectangle(x + 7, y + 9, width, height, COLORS.shadow, 0.28);
  return scene.add
    .rectangle(x, y, width, height, color, alpha)
    .setStrokeStyle(4, COLORS.gold, 0.88);
}
