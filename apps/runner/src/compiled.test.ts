import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { RunnableLanguage } from "@collab/shared";
import { runInSandbox } from "./executor.js";
import { TERMINAL_IMAGE } from "./terminal/image.js";

function toolchainReady() {
  try {
    execFileSync("docker", ["image", "inspect", TERMINAL_IMAGE], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const suite = toolchainReady() ? describe : describe.skip;

async function run(language: RunnableLanguage, code: string, entry?: string) {
  const out: string[] = [];
  const err: string[] = [];
  const result = await runInSandbox(
    { runId: randomUUID(), language, code, entry },
    (stream, chunk) => (stream === "stdout" ? out : err).push(chunk),
  );
  return { result, stdout: out.join(""), stderr: err.join("") };
}

suite("compiled languages (real docker)", { timeout: 60_000 }, () => {
  it("compiles and runs C, with the math library", async () => {
    const { result, stdout } = await run("c", '#include <stdio.h>\n#include <math.h>\nint main(void) { printf("%.0f\\n", sqrt(1764)); return 0; }\n');
    expect(result).toMatchObject({ status: "ok", exitCode: 0 });
    expect(stdout).toBe("42\n");
  });

  it("reports the line of a C compile error", async () => {
    const { result, stderr } = await run("c", "int main(void) {\n  return 0\n}\n");
    expect(result.status).toBe("error");
    expect(stderr).toContain("error");
    expect(result.errorLine).toBe(2);
  });

  it("compiles and runs C++", async () => {
    const { result, stdout } = await run("cpp", '#include <iostream>\n#include <vector>\nint main() { std::vector<int> v{1, 2, 3}; int s = 0; for (int x : v) s += x; std::cout << s << "\\n"; }\n');
    expect(result).toMatchObject({ status: "ok", exitCode: 0 });
    expect(stdout).toBe("6\n");
  });

  it("runs Java from source and finds the line of an exception", async () => {
    const ok = await run("java", 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("hello " + (6 * 7));\n  }\n}\n');
    expect(ok.result).toMatchObject({ status: "ok", exitCode: 0 });
    expect(ok.stdout).toBe("hello 42\n");

    const failed = await run("java", "public class Main {\n  public static void main(String[] args) {\n    int[] a = new int[1];\n    System.out.println(a[5]);\n  }\n}\n");
    expect(failed.result.status).toBe("error");
    expect(failed.result.errorLine).toBe(4);
  });

  it("keeps the network away from compiled programs too", async () => {
    const code = [
      "#include <stdio.h>",
      "#include <sys/socket.h>",
      "#include <netinet/in.h>",
      "#include <arpa/inet.h>",
      "int main(void) {",
      "  int s = socket(AF_INET, SOCK_STREAM, 0);",
      "  struct sockaddr_in a = { .sin_family = AF_INET, .sin_port = htons(80) };",
      '  inet_pton(AF_INET, "1.1.1.1", &a.sin_addr);',
      '  printf(connect(s, (struct sockaddr *)&a, sizeof a) == 0 ? "connected\\n" : "no network\\n");',
      "  return 0;",
      "}",
    ].join("\n");
    const { stdout } = await run("c", code);
    expect(stdout).toBe("no network\n");
  });
});
