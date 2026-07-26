import * as Phaser from "phaser";
import { formatFraction } from "../../domain/fractions";
import { sanitizePlayerName } from "../../domain/gameStore";
import { generateOrderForSkill, SkillDeck } from "../../domain/orderGenerator";
import {
  countTopping,
  createEmptySelection,
  selectionMatches,
  toggleWedge,
} from "../../domain/selection";
import { GameSession } from "../../domain/gameSession";
import type {
  FractionSkillId,
  GameSnapshot,
  LeaderboardEntry,
  OrderChallenge,
  OrderSelection,
  RunResult,
  ToppingId,
} from "../../domain/types";
import { ASSET } from "../assets";
import { gameAudio, gameStore } from "../runtime";
import { addBackdrop, addPanel, addTextButton, COLORS, FONT } from "../ui";

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

export class GameScene extends Phaser.Scene {
  private session!: GameSession;
  private skillDeck!: SkillDeck;
  private runSkills: readonly FractionSkillId[] = ["simple"];
  private snapshot!: GameSnapshot;
  private challenge!: OrderChallenge;
  private selection!: OrderSelection;
  private activeTopping: ToppingId = "pepperoni";
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
  private nameEntry?: Phaser.GameObjects.DOMElement;
  private visibilityHandler?: () => void;

  constructor() {
    super({ key: "game" });
  }

  create(): void {
    addBackdrop(this, ASSET.interior, 0.18);
    this.add.rectangle(640, 48, 1280, 96, COLORS.tealDeep, 0.92).setDepth(20);

    this.add
      .text(30, 24, "SLICE RUSH  •  90 SECOND SERVICE", {
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
    addTextButton(this, 1201, 48, "MENU", 112, 44, () => this.scene.start("menu"), {
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

    this.session = new GameSession();
    this.snapshot = this.session.begin(this.now());
    this.runSkills = [...gameStore.snapshot().selectedSkills];
    this.skillDeck = new SkillDeck(this.runSkills);
    this.challenge = this.nextChallenge();
    this.selection = createEmptySelection(this.challenge);
    this.activeTopping = this.challenge.requirements[0]!.topping;
    this.orderStartedAt = this.now();

    this.renderChallenge();
    this.bindKeyboard();

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
    if (this.snapshot.complete && !this.feedbackPending) this.finishGame();
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
    const hasChoice = available.length > 1;
    const panelX = 1145;
    const panelY = hasChoice ? 318 : 258;
    const panelHeight = hasChoice ? 410 : 290;
    const panelShadow = this.add.rectangle(
      panelX + 6,
      panelY + 8,
      232,
      panelHeight,
      COLORS.shadow,
      0.3,
    );
    const panel = this.add
      .rectangle(panelX, panelY, 232, panelHeight, COLORS.creamLight, 0.97)
      .setStrokeStyle(4, COLORS.gold, 0.95);
    const heading = this.add
      .text(panelX, 142, hasChoice ? "CHOOSE TOPPING" : "TOPPING READY", {
        fontFamily: FONT,
        fontSize: "18px",
        fontStyle: "bold",
        color: "#8f2d2d",
      })
      .setOrigin(0.5);
    const subheading = this.add
      .text(
        panelX,
        169,
        hasChoice ? "Tap a topping before the pizza" : "This order uses one topping",
        {
          fontFamily: FONT,
          fontSize: "11px",
          fontStyle: "bold",
          color: "#146c6b",
          align: "center",
        },
      )
      .setOrigin(0.5);
    container.add([panelShadow, panel, heading, subheading]);

    available.forEach((topping, index) => {
      const x = panelX;
      const y = hasChoice ? 244 + index * 132 : 250;
      const height = hasChoice ? 112 : 126;
      const selected = topping === this.activeTopping;
      const glow = this.add.rectangle(
        x,
        y,
        selected ? 212 : 202,
        selected ? height + 12 : height + 2,
        selected ? COLORS.gold : COLORS.shadow,
        selected ? 0.46 : 0.18,
      );
      const shadow = this.add.rectangle(x + 4, y + 5, 198, height, COLORS.shadow, 0.3);
      const plate = this.add
        .rectangle(x, y, 198, height, selected ? 0xffdf85 : 0x3f5550, 1)
        .setStrokeStyle(selected ? 6 : 3, selected ? COLORS.teal : 0x9faaa3);
      const icon = this.add
        .image(x - 55, y + 4, ASSET.toppings[topping])
        .setDisplaySize(hasChoice ? 66 : 74, hasChoice ? 66 : 74)
        .setAlpha(selected ? 1 : 0.48);
      const shortcutCircle = this.add
        .circle(x - 78, y - height / 2 + 18, 16, selected ? COLORS.teal : 0x78817c)
        .setStrokeStyle(2, COLORS.cream);
      const shortcut = this.add
        .text(x - 78, y - height / 2 + 18, String(index + 1), {
          fontFamily: FONT,
          fontSize: "14px",
          fontStyle: "bold",
          color: "#fff8e8",
        })
        .setOrigin(0.5);
      const label = this.add
        .text(x + 31, y - 13, TOPPING_LABELS[topping], {
          fontFamily: FONT,
          fontSize: "15px",
          fontStyle: "bold",
          color: selected ? "#38241d" : "#fff8e8",
        })
        .setOrigin(0.5);
      const status = this.add
        .text(x + 31, y + 20, selected ? "✓  SELECTED" : "TAP TO SELECT", {
          fontFamily: FONT,
          fontSize: selected ? "13px" : "11px",
          fontStyle: "bold",
          color: selected ? "#146c6b" : "#f9d77c",
        })
        .setOrigin(0.5);
      const button = this.add
        .zone(x, y, 198, height)
        .setInteractive({ useHandCursor: true })
        .on("pointerup", () => {
          this.activeTopping = topping;
          gameAudio.tap();
          this.renderToppingToolbar();
        });
      container.add([
        glow,
        shadow,
        plate,
        icon,
        shortcutCircle,
        shortcut,
        label,
        status,
        button,
      ]);
    });

    const instruction = this.add
      .text(panelX, hasChoice ? 482 : 363, "←  TAP PIZZA SLICES", {
        fontFamily: FONT,
        fontSize: "13px",
        fontStyle: "bold",
        color: "#fff8e8",
        backgroundColor: "#8f2d2d",
        padding: { x: 12, y: 8 },
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
    const reduced = gameStore.snapshot().settings.reducedMotion;
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
        this.finishGame();
        return;
      }
      this.challenge = this.nextChallenge();
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
      gameStore.snapshot().settings.reducedMotion ? 0 : 170,
      0.006,
    );
    const pip = this.add
      .image(370, 175, ASSET.chefHint)
      .setDisplaySize(132, 132)
      .setDepth(42);
    this.time.delayedCall(820, () => {
      pip.destroy();
      this.hintText.setVisible(false);
      this.feedbackPending = false;
      if (this.snapshot.complete) this.finishGame();
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

  private finishGame(): void {
    if (this.resultShown) return;
    this.resultShown = true;
    this.feedbackPending = false;
    this.snapshot = this.session.finish(this.now());
    const result: RunResult = {
      score: this.snapshot.score,
      served: this.snapshot.served,
      bestStreak: this.session.getBestStreak(),
    };
    const playedAt = Date.now();
    const qualifies = gameStore.qualifiesForLeaderboard(result, this.runSkills, playedAt);
    if (qualifies) gameAudio.finale();
    else gameAudio.ding();

    this.add.rectangle(640, 360, 1280, 720, COLORS.tealDeep, 0.84).setDepth(100);
    addPanel(this, 640, 365, 830, 592, COLORS.creamLight, 0.99).setDepth(101);
    this.add
      .image(415, 294, qualifies ? ASSET.chefCelebrate : ASSET.chefWelcome)
      .setDisplaySize(230, 230)
      .setDepth(102);
    this.add
      .text(760, 142, "TIME!", {
        fontFamily: FONT,
        fontSize: "48px",
        fontStyle: "bold",
        color: "#8f2d2d",
      })
      .setOrigin(0.5)
      .setDepth(102);
    this.add
      .text(760, 224, this.snapshot.score.toLocaleString(), {
        fontFamily: FONT,
        fontSize: "64px",
        fontStyle: "bold",
        color: "#146c6b",
      })
      .setOrigin(0.5)
      .setDepth(102);
    this.add
      .text(760, 270, "POINTS", {
        fontFamily: FONT,
        fontSize: "16px",
        fontStyle: "bold",
        color: "#6d5144",
      })
      .setOrigin(0.5)
      .setDepth(102);
    this.add
      .text(
        760,
        324,
        `PIZZAS SERVED  ${this.snapshot.served}     •     BEST STREAK  ${this.session.getBestStreak()}`,
        {
          fontFamily: FONT,
          fontSize: "19px",
          fontStyle: "bold",
          color: "#38241d",
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setDepth(102);

    if (qualifies) {
      this.showNameEntry(result, playedAt);
    } else {
      this.showResultActions("Great rush — chase the local top 10!");
    }
  }

  private showNameEntry(result: RunResult, playedAt: number): void {
    this.add
      .text(760, 372, "YOU MADE THE TOP 10!", {
        fontFamily: FONT,
        fontSize: "24px",
        fontStyle: "bold",
        color: "#8f2d2d",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(102);

    const form = document.createElement("form");
    form.className = "score-entry";
    form.setAttribute("aria-label", "Save a top ten score");
    const label = document.createElement("label");
    label.htmlFor = "slice-rush-player-name";
    label.textContent = "ENTER YOUR NAME";
    const input = document.createElement("input");
    input.id = "slice-rush-player-name";
    input.name = "playerName";
    input.type = "text";
    input.maxLength = 12;
    input.setAttribute("autocomplete", "nickname");
    input.placeholder = "PLAYER";
    input.setAttribute("aria-describedby", "slice-rush-name-error");
    const error = document.createElement("span");
    error.id = "slice-rush-name-error";
    error.className = "score-entry__error";
    error.setAttribute("aria-live", "polite");
    const actions = document.createElement("div");
    actions.className = "score-entry__actions";
    const save = document.createElement("button");
    save.type = "submit";
    save.textContent = "SAVE SCORE";
    const skip = document.createElement("button");
    skip.type = "button";
    skip.className = "score-entry__skip";
    skip.textContent = "SKIP";
    actions.append(save, skip);
    form.append(label, input, error, actions);

    const closeEntry = (entry?: LeaderboardEntry) => {
      this.nameEntry?.destroy();
      this.nameEntry = undefined;
      this.showResultActions(entry ? `Score saved as ${entry.name}!` : "Score not saved — ready for another rush?");
    };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const cleanName = sanitizePlayerName(input.value);
      if (!cleanName) {
        error.textContent = "Please enter at least one letter or number.";
        input.focus();
        return;
      }
      const entry = gameStore.addLeaderboardEntry(cleanName, result, this.runSkills, playedAt);
      if (entry) gameAudio.unlock();
      closeEntry(entry);
    });
    skip.addEventListener("click", () => closeEntry());
    this.nameEntry = this.add.dom(760, 493, form).setDepth(110);
    this.time.delayedCall(100, () => input.focus());
  }

  private showResultActions(message: string): void {
    this.add
      .text(760, 438, message, {
        fontFamily: FONT,
        fontSize: "19px",
        fontStyle: "bold",
        color: "#6d5144",
        align: "center",
        wordWrap: { width: 470 },
      })
      .setOrigin(0.5)
      .setDepth(102);
    addTextButton(
      this,
      605,
      562,
      "PLAY AGAIN",
      220,
      62,
      () => this.scene.restart(),
      { color: COLORS.tomato, fontSize: 19 },
    ).setDepth(103);
    addTextButton(
      this,
      850,
      562,
      "LEADERBOARD",
      220,
      62,
      () => this.scene.start("menu"),
      { color: COLORS.teal, fontSize: 18 },
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
    keyboard.on("keydown-ESC", this.returnToMenu, this);
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
    if (this.resultShown) return;
    const topping = this.challenge.requirements[index]?.topping;
    if (topping) {
      this.activeTopping = topping;
      this.renderToppingToolbar();
    }
  }

  private returnToMenu(): void {
    if (!this.resultShown) this.scene.start("menu");
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
    keyboard?.off("keydown-ESC", this.returnToMenu, this);
    this.nameEntry?.destroy();
  }

  private orderTitle(): string {
    if (this.challenge.kind === "equivalent") return "SAME SHARE, NEW CUTS!";
    if (this.challenge.kind === "split") return "TWO-TOPPING SPECIAL!";
    if (this.challenge.kind === "mixed") return "BIG TABLE ORDER!";
    return "MAKE IT JUST RIGHT!";
  }

  private nextChallenge(): OrderChallenge {
    return generateOrderForSkill(this.skillDeck.next(), this.snapshot.served);
  }

  private now(): number {
    return Date.now();
  }
}
