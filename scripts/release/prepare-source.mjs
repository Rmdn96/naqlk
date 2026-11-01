import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const listed = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: root, encoding: "utf8" },
);
const files = [...new Set(listed.split("\0").filter(Boolean))].sort();
for (const path of files) {
  if (
    /[\r\n]/.test(path) ||
    path.startsWith("-") ||
    path
      .split("/")
      .some(
        (part) =>
          [".git", ".aws", ".codex", ".agents", "node_modules", ".next"].includes(part) ||
          (part.startsWith(".env") && part !== ".env.example"),
      )
  ) {
    throw new Error(`Refusing unsafe or private archive path: ${path}`);
  }
  if (!lstatSync(join(root, path)).isFile())
    throw new Error(`Archive requires regular files: ${path}`);
}
for (const path of [
  "docs/security-ads-remediation-2026-11-01.md",
  "src/features/public-request/lib/draft-storage.ts",
  "tests/features/public-request/draft-storage.test.tsx",
]) {
  if (!files.includes(path)) throw new Error(`Missing required remediation file: ${path}`);
}
const entries = files.map((path) => ({
  path,
  sha256: createHash("sha256")
    .update(readFileSync(join(root, path)))
    .digest("hex"),
}));
const directory = mkdtempSync(join(tmpdir(), "naqlk-release-source-"));
const archive = join(directory, "naqlk-source.zip");
const staging = join(directory, "source");
for (const path of files) {
  const destination = join(staging, path);
  mkdirSync(dirname(destination), { recursive: true, mode: 0o755 });
  writeFileSync(destination, readFileSync(join(root, path)), { mode: 0o644 });
  utimesSync(destination, new Date("2000-01-01T00:00:00Z"), new Date("2000-01-01T00:00:00Z"));
}
execFileSync("zip", ["-q", "-X", archive, "-@"], {
  cwd: staging,
  input: files.join("\n") + "\n",
  env: { ...process.env, TZ: "UTC" },
});
const archived = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" })
  .trim()
  .split("\n")
  .sort();
if (JSON.stringify(archived) !== JSON.stringify(files))
  throw new Error("Archive membership mismatch");
for (const entry of entries) {
  // unzip treats member names as patterns, including Next.js [locale] paths.
  const exactMember = [...entry.path]
    .map((character) => ("*?[]\\".includes(character) ? `\\${character}` : character))
    .join("");
  const bytes = execFileSync("unzip", ["-p", archive, exactMember], {
    maxBuffer: 64 * 1024 * 1024,
  });
  if (createHash("sha256").update(bytes).digest("hex") !== entry.sha256)
    throw new Error(`Archive hash mismatch: ${entry.path}`);
}
const manifest = {
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  containsUncommittedChanges:
    execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
      cwd: root,
      encoding: "utf8",
    }).trim().length > 0,
  archiveSha256: createHash("sha256").update(readFileSync(archive)).digest("hex"),
  files: entries,
};
writeFileSync(join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", {
  mode: 0o600,
});
console.log(
  JSON.stringify(
    {
      directory,
      archive,
      files: files.length,
      archiveSha256: manifest.archiveSha256,
      verified: true,
    },
    null,
    2,
  ),
);
