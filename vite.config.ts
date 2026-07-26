import { defineConfig } from "vite";

export default defineConfig({
  // The production site lives at EdenMitchell.github.io/monster-pizza/.
  // Keep local development at the domain root for the normal npm workflow.
  base: process.env.GITHUB_ACTIONS ? "/monster-pizza/" : "/",
});
