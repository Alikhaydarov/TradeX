import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

const shellPath = "src/components/app-shell.tsx";
let shell = readFileSync(shellPath, "utf8");
shell = shell.replace(
  '() => import("./account").then((module) => module.Account),',
  '() =>\n    import("./profile/profile-page").then((module) => module.ProfilePage),',
);
writeFileSync(shellPath, shell);

const authPath = "src/components/tailwind/auth-tailwind-classes.ts";
let auth = readFileSync(authPath, "utf8");
auth = auth.replace(
  /"\[&_\.auth3-noise\]:pointer-events-none \[&_\.auth3-noise\]:absolute \[&_\.auth3-noise\]:inset-0 \[&_\.auth3-noise\]:opacity-\[\.032\] \[&_\.auth3-noise\]:bg-\[url\([^\n]+\)\]",/,
  '"[&_.auth3-noise]:pointer-events-none [&_.auth3-noise]:absolute [&_.auth3-noise]:inset-0 [&_.auth3-noise]:opacity-[.055] [&_.auth3-noise]:bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.16)_0_1px,transparent_1.25px)] [&_.auth3-noise]:bg-[length:5px_5px]",',
);
writeFileSync(authPath, auth);

for (const path of [
  "tools/fix-final-build.mjs",
  ".github/workflows/fix-final-build.yml",
]) {
  try {
    unlinkSync(path);
  } catch {
    // Ignore missing one-time files on retry.
  }
}
