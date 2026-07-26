import * as Phaser from "phaser";
import { MAX_LOCAL_PROFILES } from "../../domain/profileStore";
import type { ChefProfile } from "../../domain/types";
import { ASSET } from "../assets";
import { gameAudio, profileStore } from "../runtime";
import { addBackdrop, addTextButton, COLORS, FONT } from "../ui";

const AVATAR_COLORS = [COLORS.gold, 0x7fc7c5, 0xf08f75, 0x88a95b];

export class ChefScene extends Phaser.Scene {
  constructor() {
    super({ key: "chefs" });
  }

  create(): void {
    profileStore.ensureDefaultProfile();
    addBackdrop(this, ASSET.exterior, 0.22);

    this.add
      .text(640, 82, "SLICE RUSH", {
        fontFamily: FONT,
        fontSize: "58px",
        fontStyle: "bold",
        color: "#fff8e8",
        stroke: "#8f2d2d",
        strokeThickness: 9,
      })
      .setOrigin(0.5)
      .setShadow(0, 5, "#332018", 0.45);
    this.add
      .text(640, 138, "WHO'S COOKING?", {
        fontFamily: FONT,
        fontSize: "23px",
        fontStyle: "bold",
        color: "#fff4cf",
        stroke: "#163c3b",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    const profiles = profileStore.snapshot().profiles;
    const spacing = profiles.length >= 4 ? 230 : 250;
    const startX = 640 - ((profiles.length - 1) * spacing) / 2;
    profiles.forEach((profile, index) => this.createChefCard(profile, startX + index * spacing));

    if (profiles.length < MAX_LOCAL_PROFILES) {
      addTextButton(
        this,
        640,
        586,
        "+  ADD CHEF",
        210,
        52,
        () => {
          profileStore.createProfile();
          gameAudio.unlock();
          this.scene.restart();
        },
        { color: COLORS.teal, fontSize: 19 },
      );
    }

    const settings = profileStore.snapshot().settings;
    addTextButton(
      this,
      104,
      676,
      settings.muted ? "SOUND OFF" : "SOUND ON",
      176,
      40,
      () => {
        profileStore.setSettings({ muted: !settings.muted });
        this.scene.restart();
      },
      { color: COLORS.tealDeep, fontSize: 14 },
    );
    addTextButton(
      this,
      1176,
      676,
      settings.reducedMotion ? "CALM MOTION" : "FULL MOTION",
      176,
      40,
      () => {
        profileStore.setSettings({ reducedMotion: !settings.reducedMotion });
        this.scene.restart();
      },
      { color: COLORS.tealDeep, fontSize: 14 },
    );
    this.add
      .text(640, 681, "Progress stays on this device", {
        fontFamily: FONT,
        fontSize: "14px",
        fontStyle: "bold",
        color: "#fff8e8",
        stroke: "#163c3b",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
  }

  private createChefCard(profile: ChefProfile, x: number): void {
    const totalStars = profileStore.totalStars(profile);
    const width = 210;
    const height = 328;
    const card = this.add.container(x, 360);
    const shadow = this.add.rectangle(8, 10, width, height, COLORS.shadow, 0.4);
    const panel = this.add
      .rectangle(0, 0, width, height, COLORS.creamLight, 0.98)
      .setStrokeStyle(6, AVATAR_COLORS[profile.avatarIndex] ?? COLORS.gold);
    const portrait = this.add
      .image(0, -62, ASSET.customers[profile.avatarIndex] ?? ASSET.customers[0])
      .setDisplaySize(148, 148);
    const name = this.add
      .text(0, 44, profile.name.toUpperCase(), {
        fontFamily: FONT,
        fontSize: "25px",
        fontStyle: "bold",
        color: "#38241d",
      })
      .setOrigin(0.5);
    const stars = this.add
      .text(0, 80, `★ ${totalStars} / 15`, {
        fontFamily: FONT,
        fontSize: "16px",
        fontStyle: "bold",
        color: "#8f2d2d",
      })
      .setOrigin(0.5);
    const playBackground = this.add
      .rectangle(0, 124, 142, 48, COLORS.tomato)
      .setStrokeStyle(3, COLORS.gold);
    const play = this.add
      .text(0, 124, "PLAY", {
        fontFamily: FONT,
        fontSize: "20px",
        fontStyle: "bold",
        color: "#fff8e8",
      })
      .setOrigin(0.5);
    card.add([shadow, panel, portrait, name, stars, playBackground, play]);
    card.setSize(width, height).setInteractive({ useHandCursor: true });
    card.on("pointerdown", () => card.setScale(0.975));
    card.on("pointerout", () => card.setScale(1));
    card.on("pointerup", () => {
      card.setScale(1);
      gameAudio.tap();
      profileStore.selectProfile(profile.id);
      this.scene.start("shop");
    });

    if (profileStore.snapshot().profiles.length > 1) {
      const remove = this.add
        .text(x + 89, 214, "×", {
          fontFamily: FONT,
          fontSize: "22px",
          fontStyle: "bold",
          color: "#fff8e8",
          backgroundColor: "#8f2d2d",
          padding: { x: 8, y: 3 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      remove.on("pointerup", () => {
        if (window.confirm(`Remove ${profile.name} from this device?`)) {
          profileStore.deleteProfile(profile.id);
          this.scene.restart();
        }
      });
    }
  }
}
