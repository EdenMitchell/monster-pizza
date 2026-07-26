import * as Phaser from "phaser";
import { SLICE_RUSH_SHIFTS } from "../../config/shifts";
import type { ChefProfile } from "../../domain/types";
import { ASSET } from "../assets";
import { gameAudio, profileStore } from "../runtime";
import { addBackdrop, addTextButton, COLORS, FONT } from "../ui";

const STAGE_ACCENTS = [0xf4bd45, 0x6ebaa8, 0xe4775f, 0x85a954, 0xffd86d];

export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: "shop" });
  }

  create(): void {
    const profile = profileStore.activeProfile();
    if (!profile) {
      this.scene.start("chefs");
      return;
    }
    const makeover = profileStore.makeoverStage(profile);
    const backdropIndex = Math.min(4, Math.max(0, makeover));
    addBackdrop(this, ASSET.interiors[backdropIndex]!, 0.34);

    this.add.rectangle(640, 77, 1280, 154, COLORS.tealDeep, 0.86);
    this.add
      .text(640, 42, `${profile.name.toUpperCase()}'S PARLOUR`, {
        fontFamily: FONT,
        fontSize: "38px",
        fontStyle: "bold",
        color: "#fff8e8",
        stroke: "#8f2d2d",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.add
      .text(
        640,
        94,
        `★ ${profileStore.totalStars(profile)} / 15     •     ${this.makeoverLabel(makeover)}`,
        {
          fontFamily: FONT,
          fontSize: "18px",
          fontStyle: "bold",
          color: "#f9d77c",
        },
      )
      .setOrigin(0.5);

    addTextButton(this, 82, 124, "← CHEFS", 138, 38, () => this.scene.start("chefs"), {
      color: COLORS.tomatoDeep,
      fontSize: 14,
    });
    this.createSettingsButtons();

    SLICE_RUSH_SHIFTS.forEach((shift, index) => {
      const unlocked = profileStore.isShiftUnlocked(profile, index);
      this.createShiftCard(profile, index, unlocked);
    });

    const nextUpgrade = SLICE_RUSH_SHIFTS[Math.min(makeover, SLICE_RUSH_SHIFTS.length - 1)];
    this.add.rectangle(640, 662, 930, 54, COLORS.tealDeep, 0.9).setStrokeStyle(3, COLORS.gold);
    this.add
      .text(
        640,
        662,
        makeover >= SLICE_RUSH_SHIFTS.length
          ? "★★★★★  FIVE-STAR PARLOUR COMPLETE!  ★★★★★"
          : `NEXT MAKEOVER  •  ${nextUpgrade?.upgrade ?? ""}`,
        {
          fontFamily: FONT,
          fontSize: "18px",
          fontStyle: "bold",
          color: makeover >= SLICE_RUSH_SHIFTS.length ? "#ffe18d" : "#fff8e8",
        },
      )
      .setOrigin(0.5);
  }

  private createShiftCard(profile: ChefProfile, index: number, unlocked: boolean): void {
    const shift = SLICE_RUSH_SHIFTS[index]!;
    const record = profile.shiftRecords[shift.id];
    const x = 154 + index * 243;
    const y = 372;
    const width = 220;
    const height = 372;
    const accent = STAGE_ACCENTS[index] ?? COLORS.gold;
    const shadow = this.add.rectangle(8, 11, width, height, COLORS.shadow, 0.38);
    const background = this.add
      .rectangle(0, 0, width, height, unlocked ? COLORS.creamLight : 0x655d56, 0.97)
      .setStrokeStyle(5, unlocked ? accent : 0x8b8179);
    const numberBadge = this.add.circle(0, -132, 34, unlocked ? accent : 0x8b8179);
    const number = this.add
      .text(0, -132, String(index + 1), {
        fontFamily: FONT,
        fontSize: "28px",
        fontStyle: "bold",
        color: unlocked ? "#38241d" : "#d5ccc3",
      })
      .setOrigin(0.5);
    const name = this.add
      .text(0, -76, shift.name.replace(" ", "\n"), {
        fontFamily: FONT,
        fontSize: index === 4 ? "19px" : "21px",
        fontStyle: "bold",
        color: unlocked ? "#38241d" : "#d5ccc3",
        align: "center",
      })
      .setOrigin(0.5);
    const subtitle = this.add
      .text(0, 0, unlocked ? shift.subtitle : "Finish the previous shift", {
        fontFamily: FONT,
        fontSize: "14px",
        color: unlocked ? "#5b4034" : "#d5ccc3",
        align: "center",
        wordWrap: { width: 176 },
        lineSpacing: 5,
      })
      .setOrigin(0.5);
    const stars = this.add
      .text(0, 64, record ? this.starText(record.stars) : "☆ ☆ ☆", {
        fontFamily: FONT,
        fontSize: "30px",
        fontStyle: "bold",
        color: record ? "#d89a19" : unlocked ? "#8f8175" : "#b8afa7",
      })
      .setOrigin(0.5);
    const best = this.add
      .text(0, 99, record ? `BEST ${record.bestServed} SERVED` : unlocked ? "NEW SHIFT" : "LOCKED", {
        fontFamily: FONT,
        fontSize: "13px",
        fontStyle: "bold",
        color: unlocked ? "#8f2d2d" : "#d5ccc3",
      })
      .setOrigin(0.5);
    const actionBg = this.add
      .rectangle(0, 142, 156, 44, unlocked ? COLORS.tomato : 0x7d736b)
      .setStrokeStyle(2, unlocked ? COLORS.gold : 0xa89e96);
    const action = this.add
      .text(0, 142, record ? "PLAY AGAIN" : unlocked ? "START SHIFT" : "LOCKED", {
        fontFamily: FONT,
        fontSize: "15px",
        fontStyle: "bold",
        color: "#fff8e8",
      })
      .setOrigin(0.5);
    const card = this.add
      .container(x, y, [shadow, background, numberBadge, number, name, subtitle, stars, best, actionBg, action])
      .setSize(width, height);
    if (unlocked) {
      card.setInteractive({ useHandCursor: true });
      card.on("pointerdown", () => card.setScale(0.975));
      card.on("pointerout", () => card.setScale(1));
      card.on("pointerup", () => {
        card.setScale(1);
        gameAudio.tap();
        this.scene.start("shift", { shiftIndex: index });
      });
    }
  }

  private createSettingsButtons(): void {
    const settings = profileStore.snapshot().settings;
    addTextButton(
      this,
      1174,
      44,
      settings.muted ? "SOUND OFF" : "SOUND ON",
      158,
      36,
      () => {
        profileStore.setSettings({ muted: !settings.muted });
        this.scene.restart();
      },
      { color: COLORS.tomatoDeep, fontSize: 13 },
    );
    addTextButton(
      this,
      1174,
      91,
      settings.reducedMotion ? "CALM MOTION" : "FULL MOTION",
      158,
      36,
      () => {
        profileStore.setSettings({ reducedMotion: !settings.reducedMotion });
        this.scene.restart();
      },
      { color: COLORS.tomatoDeep, fontSize: 13 },
    );
  }

  private makeoverLabel(stage: number): string {
    if (stage >= 5) return "FIVE-STAR PARLOUR";
    return `MAKEOVER ${stage} / 5`;
  }

  private starText(stars: number): string {
    return Array.from({ length: 3 }, (_, index) => (index < stars ? "★" : "☆")).join(" ");
  }
}
