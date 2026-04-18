/**
 * Fixes native binary installation when npm is run from Git Bash on Windows.
 * Git Bash reports as Linux, so npm skips win32 optional dependencies.
 * This script detects the mismatch and manually installs the correct binaries.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

if (process.platform !== "win32") {
  process.exit(0);
}

const nodeModules = path.join(__dirname, "..", "node_modules");
const tmpDir = os.tmpdir();
const winTar = path.join(process.env.SYSTEMROOT || "C:\\Windows", "System32", "tar.exe");

const binaries = [
  {
    pkg: "lightningcss-win32-x64-msvc",
    dir: path.join(nodeModules, "lightningcss-win32-x64-msvc"),
  },
  {
    pkg: "@tailwindcss/oxide-win32-x64-msvc",
    dir: path.join(nodeModules, "@tailwindcss", "oxide-win32-x64-msvc"),
  },
];

for (const { pkg, dir } of binaries) {
  if (fs.existsSync(dir)) continue;

  console.log(`Missing ${pkg} — installing manually...`);
  try {
    const tgz = execSync(`npm pack ${pkg}`, {
      cwd: tmpDir,
      encoding: "utf-8",
    }).trim().split("\n").pop();

    const tgzPath = path.join(tmpDir, tgz);
    fs.mkdirSync(dir, { recursive: true });
    execSync(`"${winTar}" -xzf "${tgzPath}" -C "${dir}" --strip-components=1`);
    fs.unlinkSync(tgzPath);
    console.log(`Installed ${pkg}`);
  } catch (err) {
    console.warn(`Warning: could not install ${pkg}: ${err.message}`);
  }
}
