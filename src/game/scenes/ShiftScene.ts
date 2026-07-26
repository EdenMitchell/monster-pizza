import * as Phaser from "phaser";
import { SLICE_RUSH_SHIFTS, starsForServed } from "../../config/shifts";
import { formatFraction } from "../../domain/fractions";
import { generateOrder } from "../../domain/orderGenerator";
import {
  countTopping,
  createEmptySelection,
  selectionMatches,
  toggleWedge,
} from "../../domain/selection";
import { ShiftSession } from "../../domain/shiftSession";
import type {
  OrderChallenge,
  OrderSelection,
  ShiftSnapshot,
  ToppingId,
} from "../../domain/types";
import { ASSET } from "../assets";
import { gameAudio, profileStore } from "../runtime";
import { addBackdrop, addPanel, addTextButton, COLORS, FONT } from "../ui";

interface ShiftSceneData {
  readonly shiftIndex?: number;
}

const TOPPING_LABELS: Record<ToppingId, string> = {
  pepperoni: "PEPPERONI",
  mushroom: "MUSHROOM",
  olive: "OLIVES",
  pepper: "PEPPERS",
};

const TOPPING_COLORS: Record<ToppingId, number> = {
  pepperoni: 0xdc493a,
  mushroom: 0xe0ad47,
  olive: 0x156d6b,
  pepper: 0x6a9d43,
};

const TOPPING_MARKS: Record<ToppingId, string> = {
  pepperoni: "●",
  mushroom: "◆",
  olive: "○",
  pepper: "≈",
};

const CUSTOMER_NAMES = ["Koa", "Milly", "Ollie", "Tui"];

export class ShiftScene extends Phaser.Scene {
  private shiftIndex = 0;
  private profileId = "";
  private session!: ShiftSession;
  private snapshot!: ShiftSnapshot;
  private challenge!: OrderChallenge;
  private selection!: OrderSelection;
  private activeTopping: ToppingId = "pepperoni";
  private orderIndex = 0;
  private orderStartedAt = 0;
  private focusedWedge = 0;
  private feedbackPending = false;
  private resultShown = false;
  private timeText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private streakText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private orderContainer?: Phaser.GameObjects.Container;
  private pizzaContainer?: Phaser.GameObjects.Container;
  private toppingContainer?: Phaser.GameObjects.Container;
  private tutorialContainer?: Phaser.GameObjects.Container;
  private visibilityHandler?: () => void;

  constructor() {
    super({ key: "shift" });
  }

  init(data: ShiftSceneData): void {
    this.shiftIndex = Math.min(4, Math.max(0, data.shiftIndex ?? 0));
  }

  create(): void {
    const profile = profileStore.activeProfile();
    if (!profile) {
      this.scene.start("chefs");
      return;
    }
    this.profileId = profile.id;
    const shift = SLICE_RUSH_SHIFTS[this.shiftIndex]!;
    addBackdrop(this, ASSET.interiors[this.shiftIndex]!, 0.18);
    this.add.rectangle(640, 48, 1280, 96, COLORS.tealDeep, 0.92).setDepth(20);

    this.add
      .text(30, 24, `${shift.name}  •  90s`, {
        fontFamily: FONT,
        fontSize: "19px",
        fontStyle: "bold",
        color: "#fff8e8",
      })
      .setDepth(21);
    this.scoreText = this.add
      .text(30, 58, "SCORE 0", {
        fontFamily: FONT,
        fontSize: "17px",
        fontStyle: "bold",
        color: "#f9d77c",
      })
      .setDepth(21);
    this.timeText = this.add
      .text(640, 48, "1:30", {
        fontFamily: FONT,
        fontSize: "39px",
        fontStyle: "bold",
        color: "#fff8e8",
        stroke: "#8f2d2d",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(21);
    this.streakText = this.add
      .text(985, 28, "SERVE STREAK 0", {
        fontFamily: FONT,
        fontSize: "16px",
        fontStyle: "bold",
        color: "#f9d77c",
      })
      .setDepth(21);
    addTextButton(this, 1201, 48, "SHOP", 112, 44, () => this.scene.start("shop"), {
      color: COLORS.tomatoDeep,
      fontSize: 15,
    }).setDepth(22);

    this.hintText = this.add
      .text(760, 108, "", {
        fontFamily: FONT,
        fontSize: "18px",
        fontStyle: "bold",
        color: "#fff8e8",
        backgroundColor: "#8f2d2d",
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setVisible(false);

    this.session = new ShiftSession({
      maximumTier: shift.maximumTier,
      waitForFirstServe: this.shiftIndex === 0 && !profile.tutorialSeen,
    });
    this.snapshot = this.session.begin(this.now());
    this.challenge = generateOrder(this.shiftIndex, this.snapshot.tier, this.orderIndex);
    this.selection = createEmptySelection(this.challenge);
    this.activeTopping = this.challenge.requirements[0]!.topping;
    this.orderStartedAt = this.now();

    this.renderChallenge();
    this.bindKeyboard();
    if (!this.snapshot.started) this.showTutorial();

    this.visibilityHandler = () => {
      if (document.hidden) {
        this.snapshot = this.session.pause(this.now());
      } else {
        this.snapshot = this.session.resume(this.now());
        this.orderStartedAt = this.now();
      }
      this.refreshHud();
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanUp());
    this.input.on("pointerdown", () => this.game.canvas.focus());
  }

  update(): void {
    if (this.resultShown) return;
    this.snapshot = this.session.snapshot(this.now());
    this.refreshHud();
    if (this.snapshot.complete && !this.feedbackPending) this.finishShift();
  }

  private renderChallenge(): void {
    this.orderContainer?.destroy(true);
    this.pizzaContainer?.destroy(true);
    this.toppingContainer?.destroy(true);
    this.renderOrderCard();
    this.renderPizzas();
    this.renderToppingToolbar();
  }

  private renderOrderCard(): void {
    const container = this.add.container(0, 0).setDepth(10);
    addPanel(this, 158, 348, 252, 448, COLORS.creamLight, 0.98).setDepth(9);
    const customer = this.add
      .image(158, 202, ASSET.customers[this.challenge.customerIndex] ?? ASSET.customers[0])
      .setDisplaySize(152, 152);
    const name = this.add
      .text(158, 290, `${CUSTOMER_NAMES[this.challenge.customerIndex] ?? "Guest"}'S ORDER`, {
        fontFamily: FONT,
        fontSize: "19px",
        fontStyle: "bold",
        color: "#38241d",
      })
      .setOrigin(0.5);
    container.add([customer, name]);

    const title = this.add
      .text(158, 322, this.orderTitle(), {
        fontFamily: FONT,
        fontSize: "14px",
        fontStyle: "bold",
        color: "#8f2d2d",
        align: "center",
      })
      .setOrigin(0.5);
    container.add(title);

    this.challenge.requirements.forEach((requirement, index) => {
      const y = this.challenge.requirements.length === 1 ? 402 : 376 + index * 108;
      const icon = this.add
        .image(98, y, ASSET.toppings[requirement.topping])
        .setDisplaySize(64, 64);
      const fraction = this.add
        .text(198, y - 13, formatFraction(requirement.fraction), {
          fontFamily: FONT,
          fontSize: "31px",
          fontStyle: "bold",
          color: "#38241d",
        })
        .setOrigin(0.5);
      const topping = this.add
        .text(198, y + 25, TOPPING_LABELS[requirement.topping], {
          fontFamily: FONT,
          fontSize: "13px",
          fontStyle: "bold",
          color: "#146c6b",
        })
        .setOrigin(0.5);
      container.add([icon, fraction, topping]);
    });

    const helper = this.add
      .text(
        158,
        537,
        this.challenge.pizzaCount === 2
          ? "Fill the order across both pizzas"
          : `This pizza has ${this.challenge.boardDenominator} slices`,
        {
          fontFamily: FONT,
          fontSize: "13px",
          fontStyle: "bold",
          color: "#6d5144",
          align: "center",
          wordWrap: { width: 200 },
        },
      )
      .setOrigin(0.5);
    container.add(helper);
    this.orderContainer = container;
  }

  private renderPizzas(): void {
    this.pizzaContainer?.destroy(true);
    const container = this.add.container(0, 0).setDepth(6);
    const centers = this.challenge.pizzaCount === 1
      ? [{ x: 730, y: 365 }]
      : [{ x: 610, y: 365 }, { x: 875, y: 365 }];
    centers.forEach((center, pizzaIndex) => {
      const base = this.add.image(center.x, center.y, ASSET.pizzaBase).setDisplaySize(258, 258);
      container.add(base);
      for (let sliceIndex = 0; sliceIndex < this.challenge.boardDenominator; sliceIndex += 1) {
        const flatIndex = pizzaIndex * this.challenge.boardDenominator + sliceIndex;
        const topping = this.selection.wedges[flatIndex];
        const start = -Math.PI / 2 + (sliceIndex * Math.PI * 2) / this.challenge.boardDenominator;
        const end = -Math.PI / 2 + ((sliceIndex + 1) * Math.PI * 2) / this.challenge.boardDenominator;
        const points: Phaser.Types.Math.Vector2Like[] = [{ x: 0, y: 0 }];
        for (let step = 0; step <= 10; step += 1) {
          const angle = start + ((end - start) * step) / 10;
          points.push({ x: Math.cos(angle) * 113, y: Math.sin(angle) * 113 });
        }
        const wedge = this.add.graphics({ x: center.x, y: center.y });
        wedge.fillStyle(topping ? TOPPING_COLORS[topping] : COLORS.creamLight, topping ? 0.58 : 0.08);
        wedge.lineStyle(flatIndex === this.focusedWedge ? 6 : 3, flatIndex === this.focusedWedge ? COLORS.gold : 0xffffff, 0.9);
        wedge.beginPath();
        wedge.moveTo(points[0]!.x!, points[0]!.y!);
        points.slice(1).forEach((point) => wedge.lineTo(point.x!, point.y!));
        wedge.closePath();
        wedge.fillPath();
        wedge.strokePath();
        const hitArea = new Phaser.Geom.Polygon(points);
        wedge.setInteractive(hitArea, Phaser.Geom.Polygon.Contains);
        wedge.on("pointerup", () => this.toggleSlice(flatIndex));
        container.add(wedge);

        if (topping) {
          const angle = (start + end) / 2;
          const mark = this.add
            .text(
              center.x + Math.cos(angle) * 71,
              center.y + Math.sin(angle) * 71,
              TOPPING_MARKS[topping],
              {
                fontFamily: FONT,
                fontSize: this.challenge.boardDenominator >= 6 ? "21px" : "27px",
                fontStyle: "bold",
                color: "#fff8e8",
                stroke: "#38241d",
                strokeThickness: 3,
              },
            )
            .setOrigin(0.5);
          container.add(mark);
        }
      }
    });
    this.pizzaContainer = container;
  }

  private renderToppingToolbar(): void {
    const container = this.add.container(0, 0).setDepth(12);
    const available = this.challenge.requirements.map((requirement) => requirement.topping);
    const startX = available.length === 1 ? 586 : 520;
    available.forEach((topping, index) => {
      const x = startX + index * 146;
      const selected = topping === this.activeTopping;
      const shadow = this.add.rectangle(x + 4, 635, 126, 92, COLORS.shadow, 0.26);
      const plate = this.add
        .rectangle(x, 630, 126, 92, selected ? COLORS.creamLight : 0xe7d8b9, 0.98)
        .setStrokeStyle(selected ? 6 : 3, selected ? COLORS.gold : COLORS.teal);
      const icon = this.add.image(x - 32, 624, ASSET.toppings[topping]).setDisplaySize(62, 62);
      const shortcut = this.add
        .text(x + 37, 608, String(index + 1), {
          fontFamily: FONT,
          fontSize: "14px",
          fontStyle: "bold",
          color: "#fff8e8",
          backgroundColor: "#146c6b",
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5);
      const label = this.add
        .text(x + 25, 648, TOPPING_LABELS[topping], {
          fontFamily: FONT,
          fontSize: "11px",
          fontStyle: "bold",
          color: "#38241d",
        })
        .setOrigin(0.5);
      const button = this.add
        .zone(x, 630, 126, 92)
        .setInteractive({ useHandCursor: true })
        .on("pointerup", () => {
          this.activeTopping = topping;
          gameAudio.tap();
          this.renderToppingToolbar();
        });
      container.add([shadow, plate, icon, shortcut, label, button]);
    });
    const instruction = this.add
      .text(800, 626, "TAP SLICES", {
        fontFamily: FONT,
        fontSize: "16px",
        fontStyle: "bold",
        color: "#38241d",
        backgroundColor: "#fff2cf",
        padding: { x: 15, y: 9 },
      })
      .setOrigin(0.5);
    container.add(instruction);
    const serve = addTextButton(
      this,
      1080,
      630,
      "SERVE!",
      222,
      70,
      () => this.serveOrder(),
      { color: COLORS.tomato, fontSize: 27 },
    );
    container.add(serve);
    this.toppingContainer = container;
  }

  private toggleSlice(index: number): void {
    if (this.feedbackPending || this.resultShown) return;
    this.focusedWedge = index;
    this.selection = toggleWedge(this.selection, index, this.activeTopping);
    gameAudio.topping();
    this.renderPizzas();
  }

  private serveOrder(): void {
    if (this.feedbackPending || this.resultShown) return;
    this.feedbackPending = true;
    const now = this.now();
    const responseTime = Math.max(500, now - this.orderStartedAt);
    if (selectionMatches(this.challenge, this.selection)) {
      this.snapshot = this.session.recordCorrect(responseTime, now);
      gameAudio.success(this.snapshot.streak);
      if (this.snapshot.streak >= 3) gameAudio.streak();
      const profile = profileStore.activeProfile();
      if (profile && !profile.tutorialSeen) {
        profileStore.setTutorialSeen(profile.id);
        this.tutorialContainer?.destroy(true);
        this.tutorialContainer = undefined;
      }
      this.showSuccessFeedback();
    } else {
      this.snapshot = this.session.recordMiss(responseTime, now);
      gameAudio.miss();
      this.showMissFeedback();
    }
    this.refreshHud();
  }

  private showSuccessFeedback(): void {
    const label = this.add
      .text(730, 184, this.snapshot.streak >= 3 ? `HOT STREAK ×${this.snapshot.streak}!` : "ORDER SERVED!", {
        fontFamily: FONT,
        fontSize: "28px",
        fontStyle: "bold",
        color: "#fff8e8",
        backgroundColor: this.snapshot.streak >= 3 ? "#d88919" : "#5b8d3a",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(40);
    const box = this.add.image(760, 390, ASSET.pizzaBox).setDisplaySize(190, 190).setDepth(41);
    const reduced = profileStore.snapshot().settings.reducedMotion;
    if (!reduced) {
      box.setScale(0.2);
      this.tweens.add({
        targets: box,
        x: 180,
        y: 245,
        scale: 0.58,
        angle: -12,
        alpha: 0,
        ease: "Back.In",
        duration: 620,
      });
      this.tweens.add({
        targets: label,
        y: 160,
        alpha: 0,
        delay: 320,
        duration: 350,
      });
    }
    gameAudio.box();
    this.time.delayedCall(reduced ? 300 : 700, () => {
      box.destroy();
      label.destroy();
      if (this.snapshot.complete) {
        this.feedbackPending = false;
        this.finishShift();
        return;
      }
      this.orderIndex += 1;
      this.challenge = generateOrder(this.shiftIndex, this.snapshot.tier, this.orderIndex);
      this.selection = createEmptySelection(this.challenge);
      this.activeTopping = this.challenge.requirements[0]!.topping;
      this.focusedWedge = 0;
      this.orderStartedAt = this.now();
      this.feedbackPending = false;
      this.renderChallenge();
    });
  }

  private showMissFeedback(): void {
    this.hintText.setText(this.hintMessage()).setVisible(true);
    this.cameras.main.shake(
      profileStore.snapshot().settings.reducedMotion ? 0 : 170,
      0.006,
    );
    const pip = this.add
      .image(1120, 220, ASSET.chefHint)
      .setDisplaySize(132, 132)
      .setDepth(42);
    this.time.delayedCall(820, () => {
      pip.destroy();
      this.hintText.setVisible(false);
      this.feedbackPending = false;
      if (this.snapshot.complete) this.finishShift();
    });
  }

  private hintMessage(): string {
    return this.challenge.requirements
      .map((requirement) => {
        const current = countTopping(this.selection, requirement.topping);
        return `${TOPPING_LABELS[requirement.topping]} ${current}/${requirement.requiredWedges}`;
      })
      .join("  •  ");
  }

  private showTutorial(): void {
    const shadow = this.add.rectangle(648, 130, 640, 64, COLORS.shadow, 0.32);
    const panel = this.add
      .rectangle(640, 124, 640, 64, COLORS.creamLight, 0.98)
      .setStrokeStyle(4, COLORS.gold);
    const pip = this.add.image(344, 124, ASSET.chefHint).setDisplaySize(76, 76);
    const text = this.add
      .text(668, 124, "Tap pizza slices to match the order — then press SERVE!", {
        fontFamily: FONT,
        fontSize: "18px",
        fontStyle: "bold",
        color: "#38241d",
      })
      .setOrigin(0.5);
    this.tutorialContainer = this.add.container(0, 0, [shadow, panel, pip, text]).setDepth(50);
    if (!profileStore.snapshot().settings.reducedMotion) {
      this.tweens.add({
        targets: panel,
        alpha: { from: 0.88, to: 1 },
        duration: 900,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private finishShift(): void {
    if (this.resultShown) return;
    this.resultShown = true;
    this.feedbackPending = false;
    this.snapshot = this.session.finish(this.now());
    const before = profileStore.activeProfile();
    const shift = SLICE_RUSH_SHIFTS[this.shiftIndex]!;
    const previousStars = before?.shiftRecords[shift.id]?.stars ?? 0;
    const saved = profileStore.completeShift(
      this.profileId,
      this.shiftIndex,
      this.snapshot.score,
      this.snapshot.served,
      this.session.getBestStreak(),
    );
    const stars = starsForServed(this.shiftIndex, this.snapshot.served);
    const newUpgrade = stars >= 1 && previousStars === 0;
    if (stars === 3) gameAudio.finale();
    else gameAudio.ding();

    this.add.rectangle(640, 360, 1280, 720, COLORS.tealDeep, 0.84).setDepth(100);
    addPanel(this, 640, 365, 830, 592, COLORS.creamLight, 0.99).setDepth(101);
    this.add
      .image(424, 270, stars > 0 ? ASSET.chefCelebrate : ASSET.chefWelcome)
      .setDisplaySize(230, 230)
      .setDepth(102);
    this.add
      .text(760, 146, "SHIFT COMPLETE!", {
        fontFamily: FONT,
        fontSize: "42px",
        fontStyle: "bold",
        color: "#8f2d2d",
      })
      .setOrigin(0.5)
      .setDepth(102);
    this.add
      .text(760, 222, this.starText(stars), {
        fontFamily: FONT,
        fontSize: "58px",
        fontStyle: "bold",
        color: stars > 0 ? "#d89a19" : "#aa9a88",
      })
      .setOrigin(0.5)
      .setDepth(102);
    this.add
      .text(
        760,
        330,
        `PIZZAS SERVED  ${this.snapshot.served}\nSCORE  ${this.snapshot.score}\nBEST STREAK  ${this.session.getBestStreak()}`,
        {
          fontFamily: FONT,
          fontSize: "21px",
          fontStyle: "bold",
          color: "#38241d",
          align: "center",
          lineSpacing: 13,
        },
      )
      .setOrigin(0.5)
      .setDepth(102);

    const message = newUpgrade
      ? `MAKEOVER UNLOCKED!\n${shift.upgrade}`
      : stars === 0
        ? `Serve ${shift.starThresholds[0]} pizzas to unlock the makeover.\nYour best score is safe — have another go!`
        : `Great shift! ${saved.shiftRecords[shift.id]?.bestServed ?? 0} is your best service.`;
    this.add
      .text(640, 472, message, {
        fontFamily: FONT,
        fontSize: "19px",
        fontStyle: "bold",
        color: newUpgrade ? "#146c6b" : "#6d5144",
        align: "center",
        lineSpacing: 8,
        wordWrap: { width: 680 },
      })
      .setOrigin(0.5)
      .setDepth(102);

    addTextButton(
      this,
      410,
      592,
      "PLAY AGAIN",
      205,
      58,
      () => this.scene.restart({ shiftIndex: this.shiftIndex }),
      { color: COLORS.tomato, fontSize: 18 },
    ).setDepth(103);
    const nextUnlocked =
      this.shiftIndex < SLICE_RUSH_SHIFTS.length - 1 &&
      profileStore.isShiftUnlocked(saved, this.shiftIndex + 1);
    if (nextUnlocked) {
      addTextButton(
        this,
        640,
        592,
        "NEXT SHIFT",
        205,
        58,
        () => this.scene.restart({ shiftIndex: this.shiftIndex + 1 }),
        { color: COLORS.basil, fontSize: 18 },
      ).setDepth(103);
    }
    addTextButton(
      this,
      nextUnlocked ? 870 : 755,
      592,
      "BACK TO SHOP",
      205,
      58,
      () => this.scene.start("shop"),
      { color: COLORS.teal, fontSize: 17 },
    ).setDepth(103);
  }

  private refreshHud(): void {
    const remainingSeconds = Math.ceil(this.snapshot.timeRemainingMs / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = String(remainingSeconds % 60).padStart(2, "0");
    this.timeText.setText(this.snapshot.started ? `${minutes}:${seconds}` : "READY!");
    this.timeText.setColor(remainingSeconds <= 10 && this.snapshot.started ? "#ffb2a1" : "#fff8e8");
    this.scoreText.setText(`SCORE ${this.snapshot.score}  •  SERVED ${this.snapshot.served}`);
    this.streakText.setText(
      this.snapshot.streak >= 3
        ? `HOT STREAK ×${this.snapshot.streak}`
        : `SERVE STREAK ${this.snapshot.streak}`,
    );
  }

  private bindKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    keyboard.on("keydown-LEFT", this.focusPrevious, this);
    keyboard.on("keydown-UP", this.focusPrevious, this);
    keyboard.on("keydown-RIGHT", this.focusNext, this);
    keyboard.on("keydown-DOWN", this.focusNext, this);
    keyboard.on("keydown-SPACE", this.toggleFocused, this);
    keyboard.on("keydown-ENTER", this.serveOrder, this);
    keyboard.on("keydown-ESC", this.returnToShop, this);
    keyboard.on("keydown-ONE", () => this.chooseTopping(0));
    keyboard.on("keydown-TWO", () => this.chooseTopping(1));
  }

  private focusPrevious(): void {
    if (this.feedbackPending || this.resultShown) return;
    const count = this.selection.wedges.length;
    this.focusedWedge = (this.focusedWedge - 1 + count) % count;
    this.renderPizzas();
  }

  private focusNext(): void {
    if (this.feedbackPending || this.resultShown) return;
    this.focusedWedge = (this.focusedWedge + 1) % this.selection.wedges.length;
    this.renderPizzas();
  }

  private toggleFocused(event?: KeyboardEvent): void {
    event?.preventDefault();
    this.toggleSlice(this.focusedWedge);
  }

  private chooseTopping(index: number): void {
    const topping = this.challenge.requirements[index]?.topping;
    if (topping) {
      this.activeTopping = topping;
      this.renderToppingToolbar();
    }
  }

  private returnToShop(): void {
    if (!this.resultShown) this.scene.start("shop");
  }

  private cleanUp(): void {
    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
    }
    const keyboard = this.input.keyboard;
    keyboard?.off("keydown-LEFT", this.focusPrevious, this);
    keyboard?.off("keydown-UP", this.focusPrevious, this);
    keyboard?.off("keydown-RIGHT", this.focusNext, this);
    keyboard?.off("keydown-DOWN", this.focusNext, this);
    keyboard?.off("keydown-SPACE", this.toggleFocused, this);
    keyboard?.off("keydown-ENTER", this.serveOrder, this);
    keyboard?.off("keydown-ESC", this.returnToShop, this);
  }

  private orderTitle(): string {
    if (this.challenge.kind === "equivalent") return "SAME SHARE, NEW CUTS!";
    if (this.challenge.kind === "split") return "TWO-TOPPING SPECIAL!";
    if (this.challenge.kind === "mixed") return "BIG TABLE ORDER!";
    return "MAKE IT JUST RIGHT!";
  }

  private starText(stars: number): string {
    return Array.from({ length: 3 }, (_, index) => (index < stars ? "★" : "☆")).join(" ");
  }

  private now(): number {
    return Date.now();
  }
}
