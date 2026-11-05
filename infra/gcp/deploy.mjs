// Deploys the committed code to the Google Compute Engine VM made in docs/deploy-gcp.md.
//   node infra/gcp/deploy.mjs                 # project from `gcloud config`, VM "collab" in europe-north1-a
//   GCP_ZONE=… GCP_INSTANCE=… node infra/gcp/deploy.mjs
//
// The web app is built here (the VM would need much more memory for it); the services are built on
// the VM from `git archive HEAD`, so changes that are not committed are not deployed.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const state = path.join(repo, "infra/gcp/.state");
const ZONE = process.env.GCP_ZONE ?? "europe-north1-a";
const INSTANCE = process.env.GCP_INSTANCE ?? "collab";

const run = (command, options = {}) => {
  console.log(`\n$ ${command}`);
  // Git Bash sets HOME to /c/Users/…, where gcloud on Windows cannot find its SSH key.
  const home = process.platform === "win32" ? { HOME: os.homedir() } : {};
  return execSync(command, { cwd: repo, stdio: options.capture ? ["ignore", "pipe", "inherit"] : "inherit", encoding: "utf8", env: { ...process.env, ...home, ...options.env } });
};
const gcloud = (args, options) => run(`gcloud ${args} --quiet`, options);
// The first connection would otherwise stop to ask about the VM's host key.
const ssh = "--strict-host-key-checking=no";

const ip = gcloud(`compute instances describe ${INSTANCE} --zone ${ZONE} --format="value(networkInterfaces[0].accessConfigs[0].natIP)"`, { capture: true }).trim();
if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) throw new Error(`no external address for ${INSTANCE}: "${ip}"`);
const domain = `${ip.replaceAll(".", "-")}.sslip.io`;
console.log(`\nsite: https://${domain}`);

if (run("git status --porcelain", { capture: true }).trim()) console.warn("\n! Uncommitted changes are not deployed.");
const commit = run("git rev-parse --short HEAD", { capture: true }).trim();

rmSync(state, { recursive: true, force: true });
mkdirSync(state, { recursive: true });

// The web app talks to the API, the sync server and the terminals on its own address.
run("pnpm --filter @collab/web build", {
  env: { VITE_API_URL: "/api", VITE_COLLAB_URL: "/collab", VITE_TERMINAL_URL: "/terminal" },
});
run(`pnpm --filter @collab/local-host exec tsx -e "import('./src/compress.ts').then((m) => m.compressWebRoot('${path.join(repo, "apps/web/dist").replaceAll("\\", "/")}'))"`);
run(`tar -czf infra/gcp/.state/web.tar.gz -C apps/web/dist .`);
// Without autocrlf, so the shell scripts reach Linux with LF endings whatever this checkout uses.
run(`git -c core.autocrlf=false archive --format=tar.gz -o infra/gcp/.state/src.tar.gz HEAD`);

gcloud(`compute scp infra/gcp/.state/src.tar.gz infra/gcp/.state/web.tar.gz ${INSTANCE}:/tmp/ --zone ${ZONE} ${ssh}`);
const remote = [
  "set -e",
  "mkdir -p /tmp/collab-deploy",
  "tar -xzf /tmp/src.tar.gz -C /tmp/collab-deploy infra/gcp/remote-deploy.sh",
  `sudo bash /tmp/collab-deploy/infra/gcp/remote-deploy.sh /tmp/src.tar.gz /tmp/web.tar.gz ${domain}`,
  "rm -rf /tmp/collab-deploy",
].join(" && ");
gcloud(`compute ssh ${INSTANCE} --zone ${ZONE} ${ssh} --command "${remote}"`);

// The owner's code for running programs on the site stays on this computer, out of git.
const code = gcloud(`compute ssh ${INSTANCE} --zone ${ZONE} ${ssh} --command "sudo grep ^RUN_ACCESS_CODE= /opt/collab/.env"`, { capture: true })
  .trim()
  .split("=")[1];
if (code) writeFileSync(path.join(state, "run-access-code.txt"), `${code}\n`);
rmSync(path.join(state, "src.tar.gz"), { force: true });
rmSync(path.join(state, "web.tar.gz"), { force: true });

console.log(`\nDeployed ${commit} to https://${domain}`);
if (existsSync(path.join(state, "run-access-code.txt"))) console.log("The access code for running code is in infra/gcp/.state/run-access-code.txt");
