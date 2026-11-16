import { Readable } from "node:stream";
import type Docker from "dockerode";
import { buildTar } from "../tar.js";

export const TERMINAL_IMAGE = "collab-terminal:2";

const DOCKERFILE = `FROM node:22-alpine
RUN apk add --no-cache bash python3 coreutils ncurses less build-base openjdk21-jdk \\
 && ln -sf /usr/bin/python3 /usr/local/bin/python
COPY bashrc /etc/collab.bashrc
ENV TERM=xterm-256color LANG=C.UTF-8 HOME=/project HISTFILE=/tmp/.bash_history \\
    PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 NODE_DISABLE_COLORS=
`;

const BASHRC = String.raw`PS1='\[\e[32m\]$COLLAB_USER@collab \[\e[35m\]sandbox \[\e[33m\]\w\[\e[0m\]\n\$ '
alias ls='ls --color=auto'
alias ll='ls -la --color=auto'
alias grep='grep --color=auto'
`;

let ready: Promise<void> | null = null;

export function ensureTerminalImage(docker: Docker): Promise<void> {
  ready ??= (async () => {
    try {
      await docker.getImage(TERMINAL_IMAGE).inspect();
      return;
    } catch {
    }
    const context = buildTar([
      { path: "Dockerfile", content: DOCKERFILE },
      { path: "bashrc", content: BASHRC },
    ]);
    const stream = await docker.buildImage(Readable.from(context), { t: TERMINAL_IMAGE });
    await new Promise<void>((resolve, reject) => {
      docker.modem.followProgress(stream, (error, output: { error?: string }[]) => {
        const failed = error ?? output.find((step) => step.error)?.error;
        if (failed) reject(failed instanceof Error ? failed : new Error(String(failed)));
        else resolve();
      });
    });
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}
