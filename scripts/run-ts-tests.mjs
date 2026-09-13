import {
  existsSync,
} from "node:fs";

import {
  readdir,
} from "node:fs/promises";

import {
  join,
  relative,
} from "node:path";

import {
  spawnSync,
} from "node:child_process";

const root =
  process.cwd();

async function collectTests(
  directory
) {
  const entries =
    await readdir(
      directory,
      {
        withFileTypes:
          true,
      }
    );

  const files = [];

  for (
    const entry of
    entries
  ) {
    const fullPath =
      join(
        directory,
        entry.name
      );

    if (
      entry.isDirectory()
    ) {
      files.push(
        ...await collectTests(
          fullPath
        )
      );

      continue;
    }

    if (
      entry.isFile() &&
      entry.name.endsWith(
        ".test.ts"
      )
    ) {
      files.push(
        relative(
          root,
          fullPath
        )
      );
    }
  }

  return files;
}

const sourceDirectory =
  join(
    root,
    "src"
  );

const testFiles =
  (
    await collectTests(
      sourceDirectory
    )
  ).sort();

if (
  testFiles.length ===
  0
) {
  throw new Error(
    "No TypeScript tests found."
  );
}

console.log(
  `AYZO test files: ${testFiles.length}`
);

const tsxBinary =
  process.platform ===
  "win32"
    ? join(
        root,
        "node_modules",
        ".bin",
        "tsx.cmd"
      )
    : join(
        root,
        "node_modules",
        ".bin",
        "tsx"
      );

if (
  !existsSync(
    tsxBinary
  )
) {
  throw new Error(
    "tsx binary is missing. Run npm ci first."
  );
}

const nodeOptions =
  [
    process.env.NODE_OPTIONS,
    "--conditions=react-server",
  ]
    .filter(Boolean)
    .join(" ");

const result =
  spawnSync(
    tsxBinary,
    [
      "--test",
      ...testFiles,
    ],
    {
      stdio:
        "inherit",

      env: {
        ...process.env,

        NODE_OPTIONS:
          nodeOptions,
      },
    }
  );

if (
  result.error
) {
  throw result.error;
}

process.exit(
  result.status ??
  1
);
