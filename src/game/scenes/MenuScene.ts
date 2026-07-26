import * as Phaser from "phaser";
import { ASSET } from "../assets";
import { gameAudio, gameStore } from "../runtime";
import { addBackdrop, addPanel, addTextButton, COLORS, FONT } from "../ui";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "menu" });
  }

  create(): void {
    addBackdrop(this, ASSET.exterior, 0.28);
    this.add.rectangle(640, 58, 1280, 116, COLORS.tealDeep, 0.88);
    this.add
      .text(640, 54, "SLICE RUSH", {
        fontFamily: FONT,
        fontSize: "54px",
        fontStyle: "bold",
        color: "#fff8e8",
        stroke: "#8f2d2d",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setShadow(0, 5, "#332018", 0.42);

    this.renderStartPanel();
    this.renderLeaderboard();
    this.renderSettings();

    this.input.keyboard?.once("keydown-ENTER", () => this.startGame());
  }

  private renderStartPanel(): void {
    addPanel(this, 352, 379, 594, 522, COLORS.creamLight, 0.98);
    this.add
      .image(184, 248, ASSET.chefWelcome)
      .setDisplaySize(210, 210);
    this.add
      .text(410, 178, "READY FOR THE RUSH?", {
        fontFamily: FONT,
        fontSize: "30px",
        fontStyle: "bold",
        color: "#8f2d2d",
      })
      .setOrigin(0.5);
    this.add
      .text(410, 226, "90 seconds. Serve as many perfect pizzas as you can.", {
        fontFamily: FONT,
        fontSize: "17px",
        fontStyle: "bold",
        color: "#38241d",
        align: "center",
        wordWrap: { width: 330 },
      })
      .setOrigin(0.5);

    const instructions = [
      ["1", "READ", "Check the customer's fraction order"],
      ["2", "TOP", "Tap slices to add or remove toppings"],
      ["3", "SERVE", "Send it when the pizza matches"],
    ] as const;
    instructions.forEach(([number, title, copy], index) => {
      const y = 316 + index * 78;
      this.add.circle(136, y, 25, [COLORS.gold, COLORS.teal, COLORS.tomato][index])
        .setStrokeStyle(3, COLORS.cream);
      this.add
        .text(136, y, number, {
          fontFamily: FONT,
          fontSize: "21px",
          fontStyle: "bold",
          color: "#fff8e8",
        })
        .setOrigin(0.5);
      this.add
        .text(178, y - 14, title, {
          fontFamily: FONT,
          fontSize: "17px",
          fontStyle: "bold",
          color: "#146c6b",
        });
      this.add
        .text(178, y + 10, copy, {
          fontFamily: FONT,
          fontSize: "14px",
          color: "#5b4034",
        });
    });

    addTextButton(
      this,
      352,
      574,
      "START GAME",
      386,
      76,
      () => this.startGame(),
      { color: COLORS.tomato, fontSize: 29 },
    );
    this.add
      .text(352, 630, "Press Enter to start  •  Progress stays on this device", {
        fontFamily: FONT,
        fontSize: "13px",
        fontStyle: "bold",
        color: "#6d5144",
      })
      .setOrigin(0.5);
  }

  private renderLeaderboard(): void {
    addPanel(this, 925, 379, 500, 522, COLORS.creamLight, 0.98);
    this.add
      .text(925, 150, "LOCAL TOP 10", {
        fontFamily: FONT,
        fontSize: "30px",
        fontStyle: "bold",
        color: "#8f2d2d",
      })
      .setOrigin(0.5);
    this.add
      .text(925, 185, "Best scores on this device", {
        fontFamily: FONT,
        fontSize: "14px",
        fontStyle: "bold",
        color: "#146c6b",
      })
      .setOrigin(0.5);

    const entries = gameStore.snapshot().leaderboard;
    if (entries.length === 0) {
      this.add
        .image(925, 344, ASSET.chefCelebrate)
        .setDisplaySize(168, 168)
        .setAlpha(0.9);
      this.add
        .text(925, 458, "The board is waiting!\nSet the first score.", {
          fontFamily: FONT,
          fontSize: "19px",
          fontStyle: "bold",
          color: "#6d5144",
          align: "center",
          lineSpacing: 8,
        })
        .setOrigin(0.5);
      return;
    }

    entries.forEach((entry, index) => {
      const y = 229 + index * 39;
      const highlight = index < 3;
      if (index % 2 === 0) {
        this.add.rectangle(925, y, 430, 34, highlight ? 0xffe7a8 : 0xf2e7cf, 0.68);
      }
      this.add
        .text(730, y, `${index + 1}.`, {
          fontFamily: FONT,
          fontSize: "16px",
          fontStyle: "bold",
          color: highlight ? "#8f2d2d" : "#6d5144",
        })
        .setOrigin(0, 0.5);
      this.add
        .text(774, y, entry.name.toUpperCase(), {
          fontFamily: FONT,
          fontSize: "16px",
          fontStyle: "bold",
          color: "#38241d",
        })
        .setOrigin(0, 0.5);
      this.add
        .text(1118, y, entry.score.toLocaleString(), {
          fontFamily: FONT,
          fontSize: "16px",
          fontStyle: "bold",
          color: "#146c6b",
        })
        .setOrigin(1, 0.5);
    });
  }

  private renderSettings(): void {
    const settings = gameStore.snapshot().settings;
    addTextButton(
      this,
      105,
      687,
      settings.muted ? "SOUND OFF" : "SOUND ON",
      184,
      40,
      () => {
        gameStore.setSettings({ muted: !settings.muted });
        this.scene.restart();
      },
      { color: COLORS.tealDeep, fontSize: 14 },
    );
    addTextButton(
      this,
      1175,
      687,
      settings.reducedMotion ? "CALM MOTION" : "FULL MOTION",
      184,
      40,
      () => {
        gameStore.setSettings({ reducedMotion: !settings.reducedMotion });
        this.scene.restart();
      },
      { color: COLORS.tealDeep, fontSize: 14 },
    );
  }

  private startGame(): void {
    gameStore.acknowledgeInstructions();
    gameAudio.ding();
    this.scene.start("game");
  }
}
