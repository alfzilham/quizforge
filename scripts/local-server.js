/**
 * scripts/local-server.js
 *
 * Dipakai oleh `npm run dev` / `npm run start` sebagai pengganti pemanggilan
 * `next dev|start -H 127.0.0.1` langsung.
 *
 * MASALAH (temuan audit Codex #1, DESIGN.md §7): argumen tambahan npm
 * (`npm run dev -- -H 0.0.0.0`) diteruskan apa adanya ke Next.js dan
 * MENGALAHKAN flag hardcoded, sehingga server bisa listen ke 0.0.0.0.
 *
 * PERILAKU (fail-closed):
 * - Setiap upaya override hostname (`-H` / `--hostname` dalam semua bentuk:
 *   terpisah, `=`, maupun menempel) DITOLAK dengan error + exit 1.
 *   Server tidak pernah dijalankan dalam kondisi ini.
 * - Argumen lain (mis. `-p`/`--port`) tetap diteruskan — hanya HOST yang
 *   dikunci ke 127.0.0.1, bukan port.
 *
 * Kenapa bukan next.config.ts? Next.js TIDAK menyediakan opsi config untuk
 * hostname (hanya CLI `-H`/`--hostname`), jadi config tidak bisa mencegah
 * override CLI. Wrapper ini satu-satunya titik yang bisa menegakkannya.
 *
 * Pakai: `node scripts/local-server.js dev [argumen-next...]`
 *        `node scripts/local-server.js start [argumen-next...]`
 */
"use strict";

const { spawnSync } = require("node:child_process");

const ENFORCED_HOST = "127.0.0.1";
const DEFAULT_PORT = "3000";

function fail(message) {
  console.error(`[quizforge] ERROR: ${message}`);
  process.exit(1);
}

function isHostnameOverride(arg) {
  // Bentuk terpisah: -H <val> | --hostname <val>  (nilai dicek di loop via arg itu sendiri)
  if (arg === "-H" || arg === "--hostname") return true;
  // Bentuk sama-dengan: --hostname=0.0.0.0
  if (arg.startsWith("--hostname=")) return true;
  // Bentuk menempel: -H0.0.0.0  (-H diikuti karakter non-flag)
  if (/^-H[^\s-]/.test(arg)) return true;
  return false;
}

function main() {
  const [subcommand, ...extraArgs] = process.argv.slice(2);

  if (subcommand !== "dev" && subcommand !== "start") {
    fail(
      `subcommand tidak dikenal: ${JSON.stringify(subcommand)}. ` +
        `Pakai "node scripts/local-server.js dev" atau "... start".`,
    );
  }

  for (const arg of extraArgs) {
    if (isHostnameOverride(arg)) {
      fail(
        `override hostname ditolak ("${arg}"). ` +
          `Server QuizForge hanya boleh bind ke ${ENFORCED_HOST} (DESIGN.md §7).`,
      );
    }
  }

  let nextBin;
  try {
    nextBin = require.resolve("next/dist/bin/next");
  } catch {
    fail('binari Next.js tidak ditemukan. Jalankan "npm install" dulu.');
  }

  const result = spawnSync(
    process.execPath,
    [nextBin, subcommand, "-H", ENFORCED_HOST, "-p", DEFAULT_PORT, ...extraArgs],
    { stdio: "inherit" },
  );
  process.exit(result.status ?? 1);
}

main();
