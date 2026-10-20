// VideoMill CLI entry point.
import { FORMAT_IDS, type Format } from "../constants.js";
import { fail, VideoMillError } from "../pipeline/step.js";
import { approve, storyboard } from "./approve.js";
import { newProject } from "./new.js";
import { record, render } from "./render.js";

const USAGE = `usage:
  videomill new <slug> --type <site-promo|build-in-public> --brand <id> --url <page>
  videomill record <slug> [--format <16x9|9x16>] [--force]
  videomill storyboard <slug> [--force]       script + a still per camera move → out/<slug>/storyboard.html
  videomill approve <slug>                   approve the current script/storyboard (render needs this)
  videomill render <slug> [--scene <id>] [--format <16x9|9x16>] [--force]

  --scene <id> --force   re-render just that scene (others come from cache)`;

function parse(argv: string[]) {
  const pos: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { pos.push(a); continue; }
    const name = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) { flags[name] = next; i++; } else flags[name] = true;
  }
  return { pos, flags };
}

const str = (v: string | true | undefined) => (typeof v === "string" ? v : undefined);

async function main(argv: string[]): Promise<number> {
  const { pos, flags } = parse(argv);
  const [cmd, slug] = pos;
  try {
    if (!cmd) { console.log(USAGE); return 0; }
    if (!slug) throw new VideoMillError(`missing <slug>\n${USAGE}`);
    const format = str(flags.format) as Format | undefined;
    if (format && !FORMAT_IDS.includes(format)) throw new VideoMillError(`--format must be one of: ${FORMAT_IDS.join(", ")}`);
    const opts = { force: flags.force === true, scene: str(flags.scene), format };
    switch (cmd) {
      case "new": newProject(slug, { type: str(flags.type), brand: str(flags.brand), url: str(flags.url) }); return 0;
      case "record": await record(slug, opts); return 0;
      case "storyboard": await storyboard(slug, opts); return 0;
      case "approve": await approve(slug); return 0;
      case "render": await render(slug, opts); return 0;
      default: throw new VideoMillError(`unknown command "${cmd}"\n${USAGE}`);
    }
  } catch (e) {
    if (e instanceof VideoMillError) { fail(e.message); return 1; }
    throw e;
  }
}

process.exitCode = await main(process.argv.slice(2));
