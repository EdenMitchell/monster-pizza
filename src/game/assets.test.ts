import { access } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { IMAGE_ASSET_MANIFEST } from "./assets";

describe("image asset manifest", () => {
  it("has unique keys and paths", () => {
    const keys = IMAGE_ASSET_MANIFEST.map(({ key }) => key);
    const paths = IMAGE_ASSET_MANIFEST.map((asset) => asset.path);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("points only to existing public files", async () => {
    await Promise.all(
      IMAGE_ASSET_MANIFEST.map(({ path: assetPath }) =>
        access(path.join(process.cwd(), "public", assetPath.replace(/^\//, ""))),
      ),
    );
  });
});
