import * as Phaser from "phaser";
import { FRACTION_SKILLS } from "../../config/gameConfig";
import type { FractionSkillId } from "../../domain/types";
import { ASSET } from "../assets";
import { gameAudio, gameStore } from "../runtime";
import { addBackdrop, addPanel, addTextButton, COLORS, FONT } from "../ui";

const STEP_COLORS = [COLORS.gold, COLORS.teal, COLORS.tomato] as const;

export class MenuScene extends Phaser.Scene {
  private leaderboardOverlay?: Phaser.GameObjects.Container;
  private selectionHint?: Phaser.GameObjects.Text;

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
    this.renderSkillPanel();
    this.renderSettings();

    this.input.keyboard?.on("keydown", this.handleKeyboard, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanUp());
  }

  private renderStartPanel(): void {
    addPanel(this, 352, 379, 594, 522, COLORS.creamLight, 0.98);
    this.add
      .image(154, 210, ASSET.chefWelcome)
      .setDisplaySize(145, 145);
    this.add
      .text(420, 166, "READY FOR THE RUSH?", {
        fontFamily: FONT,
        fontSize: "28px",
        fontStyle: "bold",
        color: "#8f2d2d",
      })
      .setOrigin(0.5);
    this.add
      .text(420, 226, "90 seconds. Serve as many perfect pizzas as you can.", {
        fontFamily: FONT,
        fontSize: "16px",
        fontStyle: "bold",
        color: "#38241d",
        align: "center",
        wordWrap: { width: 330 },
      })
      .setOrigin(0.5);
    this.add
      .text(352, 292, "HOW TO PLAY", {
        fontFamily: FONT,
        fontSize: "18px",
        fontStyle: "bold",
        color: "#146c6b",
      })
      .setOrigin(0.5);

    const instructions = [
      ["READ", "Check the fraction order"],
      ["TOP", "Tap the pizza slices"],
      ["SERVE", "Send the perfect pizza"],
    ] as const;
    instructions.forEach(([title, copy], index) => {
      const x = 150 + index * 202;
      this.add.circle(x, 337, 24, STEP_COLORS[index]).setStrokeStyle(3, COLORS.cream);
      this.add
        .text(x, 337, String(index + 1), {
          fontFamily: FONT,
          fontSize: "20px",
          fontStyle: "bold",
          color: "#fff8e8",
        })
        .setOrigin(0.5);
      this.add
        .text(x, 378, title, {
          fontFamily: FONT,
          fontSize: "16px",
          fontStyle: "bold",
          color: "#146c6b",
        })
        .setOrigin(0.5);
      this.add
        .text(x, 409, copy, {
          fontFamily: FONT,
          fontSize: "13px",
          color: "#5b4034",
          align: "center",
          wordWrap: { width: 160 },
        })
        .setOrigin(0.5);
    });

    addTextButton(
      this,
      352,
      512,
      "START GAME",
      386,
      68,
      () => this.startGame(),
      { color: COLORS.tomato, fontSize: 27 },
    );
    addTextButton(
      this,
      352,
      596,
      "VIEW LEADERBOARD",
      300,
      48,
      () => this.openLeaderboard(),
      { color: COLORS.teal, fontSize: 16 },
    );
  }

  private renderSkillPanel(): void {
    addPanel(this, 925, 379, 500, 522, COLORS.creamLight, 0.98);
    this.add
      .text(925, 145, "CHOOSE FRACTION SKILLS", {
        fontFamily: FONT,
        fontSize: "25px",
        fontStyle: "bold",
        color: "#8f2d2d",
      })
      .setOrigin(0.5);
    this.add
      .text(925, 178, "Teachers can tailor every 90-second game", {
        fontFamily: FONT,
        fontSize: "13px",
        fontStyle: "bold",
        color: "#146c6b",
      })
      .setOrigin(0.5);

    const selected = new Set(gameStore.snapshot().selectedSkills);
    FRACTION_SKILLS.forEach((skill, index) => {
      const y = 226 + index * 73;
      const isSelected = selected.has(skill.id);
      const shadow = this.add.rectangle(929, y + 4, 440, 62, COLORS.shadow, 0.18);
      const background = this.add
        .rectangle(925, y, 440, 62, isSelected ? 0xffedb7 : 0xeee4d1, 0.98)
        .setStrokeStyle(3, isSelected ? COLORS.gold : 0xb8aa91);
      const shortcut = this.add
        .circle(724, y, 20, isSelected ? COLORS.teal : 0x8d8274)
        .setStrokeStyle(2, COLORS.cream);
      const number = this.add
        .text(724, y, String(index + 1), {
          fontFamily: FONT,
          fontSize: "16px",
          fontStyle: "bold",
          color: "#fff8e8",
        })
        .setOrigin(0.5);
      const title = this.add
        .text(758, y - 14, skill.title.toUpperCase(), {
          fontFamily: FONT,
          fontSize: "15px",
          fontStyle: "bold",
          color: isSelected ? "#38241d" : "#665b50",
        });
      const description = this.add
        .text(758, y + 10, skill.description, {
          fontFamily: FONT,
          fontSize: "12px",
          color: isSelected ? "#5b4034" : "#7d7267",
        });
      const check = this.add
        .text(1120, y, isSelected ? "✓" : "", {
          fontFamily: FONT,
          fontSize: "25px",
          fontStyle: "bold",
          color: "#146c6b",
        })
        .setOrigin(0.5);
      const hitArea = this.add
        .zone(925, y, 440, 62)
        .setInteractive({ useHandCursor: true })
        .on("pointerup", () => this.toggleSkill(skill.id));
      void [shadow, background, shortcut, number, title, description, check, hitArea];
    });

    this.selectionHint = this.add
      .text(925, 602, this.selectionSummary(), {
        fontFamily: FONT,
        fontSize: "13px",
        fontStyle: "bold",
        color: "#6d5144",
        align: "center",
      })
      .setOrigin(0.5);
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

  private openLeaderboard(): void {
    if (this.leaderboardOverlay) return;
    gameAudio.tap();
    const selectedSkills = gameStore.snapshot().selectedSkills;
    const entries = gameStore.leaderboardForSkills(selectedSkills);
    const objects: Phaser.GameObjects.GameObject[] = [];
    const dimmer = this.add
      .rectangle(640, 360, 1280, 720, COLORS.tealDeep, 0.9)
      .setInteractive();
    const shadow = this.add.rectangle(648, 368, 800, 610, COLORS.shadow, 0.36);
    const panel = this.add
      .rectangle(640, 360, 800, 610, COLORS.creamLight, 1)
      .setStrokeStyle(6, COLORS.gold);
    objects.push(dimmer, shadow, panel);
    objects.push(
      this.add
        .text(640, 104, "LOCAL TOP 10", {
          fontFamily: FONT,
          fontSize: "38px",
          fontStyle: "bold",
          color: "#8f2d2d",
        })
        .setOrigin(0.5),
      this.add
        .text(640, 154, this.skillSummary(selectedSkills), {
          fontFamily: FONT,
          fontSize: "14px",
          fontStyle: "bold",
          color: "#146c6b",
          align: "center",
          wordWrap: { width: 650 },
        })
        .setOrigin(0.5),
    );

    if (entries.length === 0) {
      objects.push(
        this.add.image(640, 345, ASSET.chefCelebrate).setDisplaySize(170, 170),
        this.add
          .text(640, 468, "No scores for this skill setup yet.\nSet the first one!", {
            fontFamily: FONT,
            fontSize: "19px",
            fontStyle: "bold",
            color: "#6d5144",
            align: "center",
            lineSpacing: 8,
          })
          .setOrigin(0.5),
      );
    } else {
      objects.push(
        this.add
          .text(340, 205, "RANK   PLAYER", {
            fontFamily: FONT,
            fontSize: "13px",
            fontStyle: "bold",
            color: "#8f2d2d",
          }),
        this.add
          .text(936, 205, "SCORE", {
            fontFamily: FONT,
            fontSize: "13px",
            fontStyle: "bold",
            color: "#8f2d2d",
          })
          .setOrigin(1, 0),
      );
      entries.forEach((entry, index) => {
        const y = 246 + index * 32;
        if (index % 2 === 0) {
          objects.push(this.add.rectangle(640, y, 620, 29, index < 3 ? 0xffe7a8 : 0xf2e7cf, 0.72));
        }
        objects.push(
          this.add
            .text(350, y, `${index + 1}.`, {
              fontFamily: FONT,
              fontSize: "15px",
              fontStyle: "bold",
              color: index < 3 ? "#8f2d2d" : "#6d5144",
            })
            .setOrigin(0, 0.5),
          this.add
            .text(415, y, entry.name.toUpperCase(), {
              fontFamily: FONT,
              fontSize: "15px",
              fontStyle: "bold",
              color: "#38241d",
            })
            .setOrigin(0, 0.5),
          this.add
            .text(930, y, entry.score.toLocaleString(), {
              fontFamily: FONT,
              fontSize: "15px",
              fontStyle: "bold",
              color: "#146c6b",
            })
            .setOrigin(1, 0.5),
        );
      });
    }

    const close = addTextButton(
      this,
      640,
      618,
      "BACK",
      190,
      48,
      () => this.closeLeaderboard(),
      { color: COLORS.teal, fontSize: 17 },
    );
    objects.push(close);
    this.leaderboardOverlay = this.add.container(0, 0, objects).setDepth(100);
  }

  private closeLeaderboard(): void {
    this.leaderboardOverlay?.destroy(true);
    this.leaderboardOverlay = undefined;
  }

  private toggleSkill(skill: FractionSkillId): void {
    if (this.leaderboardOverlay) return;
    if (!gameStore.toggleSkill(skill)) {
      gameAudio.miss();
      this.selectionHint?.setText("Keep at least one skill selected");
      this.time.delayedCall(1_400, () => this.selectionHint?.setText(this.selectionSummary()));
      return;
    }
    gameAudio.tap();
    this.scene.restart();
  }

  private selectionSummary(): string {
    const count = gameStore.snapshot().selectedSkills.length;
    return `${count} skill${count === 1 ? "" : "s"} selected  •  Press 1–5 to change`;
  }

  private skillSummary(skills: readonly FractionSkillId[]): string {
    const selected = new Set(skills);
    return FRACTION_SKILLS
      .filter((skill) => selected.has(skill.id))
      .map((skill) => skill.shortTitle)
      .join("  •  ");
  }

  private handleKeyboard(event: KeyboardEvent): void {
    if (this.leaderboardOverlay) {
      if (event.code === "Escape") this.closeLeaderboard();
      return;
    }
    const shortcuts: Record<string, FractionSkillId | undefined> = {
      Digit1: FRACTION_SKILLS[0]?.id,
      Digit2: FRACTION_SKILLS[1]?.id,
      Digit3: FRACTION_SKILLS[2]?.id,
      Digit4: FRACTION_SKILLS[3]?.id,
      Digit5: FRACTION_SKILLS[4]?.id,
      Numpad1: FRACTION_SKILLS[0]?.id,
      Numpad2: FRACTION_SKILLS[1]?.id,
      Numpad3: FRACTION_SKILLS[2]?.id,
      Numpad4: FRACTION_SKILLS[3]?.id,
      Numpad5: FRACTION_SKILLS[4]?.id,
    };
    const skill = shortcuts[event.code];
    if (skill) {
      this.toggleSkill(skill);
    } else if (event.code === "Enter") {
      this.startGame();
    } else if (event.code === "KeyL") {
      this.openLeaderboard();
    }
  }

  private startGame(): void {
    if (this.leaderboardOverlay) return;
    gameStore.acknowledgeInstructions();
    gameAudio.ding();
    this.scene.start("game");
  }

  private cleanUp(): void {
    this.input.keyboard?.off("keydown", this.handleKeyboard, this);
    this.closeLeaderboard();
  }
}
