import * as Phaser from "phaser";
import { IMAGE_ASSET_MANIFEST } from "../assets";
import { COLORS, FONT } from "../ui";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "preload" });
  }

  preload(): void {
    this.cameras.main.setBackgroundColor(COLORS.tomatoDeep);
    const plate = this.add.circle(640, 330, 86, COLORS.cream).setStrokeStyle(8, COLORS.gold);
    const pizza = this.add.circle(640, 330, 62, 0xf6c85f).setStrokeStyle(8, 0xc86a2f);
    const slice = this.add
      .arc(640, 330, 54, -90, 30, false, COLORS.tomato)
      .setStrokeStyle(3, COLORS.cream);
    this.tweens.add({
      targets: [plate, pizza, slice],
      angle: 360,
      duration: 1600,
      repeat: -1,
    });
    const loading = this.add
      .text(640, 455, "HEATING THE OVEN…", {
        fontFamily: FONT,
        fontSize: "30px",
        fontStyle: "bold",
        color: "#fff8e8",
      })
      .setOrigin(0.5);
    this.load.on("complete", () => loading.setText("READY TO RUSH!"));
    IMAGE_ASSET_MANIFEST.forEach(({ key, path }) => this.load.image(key, path));
  }

  create(): void {
    this.scene.start("menu");
  }
}
