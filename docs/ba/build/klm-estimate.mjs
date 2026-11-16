const TIME = { M: 1.35, P: 1.1, K: 0.2, H: 0.4 };

const SCENARIOS = {
  "AS-IS: both people prepared": [
    ["Owner: open repository settings, then Collaborators", { M: 1, H: 1, P: 2, K: 2, R: 2 }],
    ["Owner: add the partner by user name", { M: 1, H: 2, P: 2, K: 12, R: 1 }],
    ["Owner: send the repository link in a messenger", { M: 2, H: 2, P: 1, K: 8 }],
    ["Partner: open the invitation and accept it", { M: 1, P: 2, K: 2, R: 4 }],
    ["Partner: clone the repository", { M: 1, H: 1, K: 15, R: 3 }],
    ["Partner: enter the folder and open the editor", { M: 2, K: 23, R: 3 }],
    ["Partner: install the dependencies", { M: 1, K: 12, R: 10 }],
    ["Partner: open the file", { M: 1, H: 1, P: 1, K: 1, R: 1 }],
  ],
  "AS-IS: the partner has no Git host account yet (added to the above)": [
    ["Partner: fill in the registration form", { M: 3, H: 2, P: 4, K: 46, R: 2 }],
    ["Partner: confirm the e-mail address with a code", { M: 2, H: 2, P: 2, K: 12, R: 12 }],
  ],
  "TO-BE on the platform": [
    ["Owner: create a project from the repository link", { M: 2, H: 2, P: 2, K: 16, R: 3 }],
    ["Owner: open Invite and copy the link", { M: 1, P: 2, K: 2, R: 1 }],
    ["Owner: send the link in a messenger", { M: 1, H: 1, K: 5 }],
    ["Guest: open the link", { M: 1, H: 1, P: 1, K: 1, R: 2 }],
    ["Guest: enter a name and confirm", { M: 1, H: 1, K: 9, R: 2 }],
  ],
};

const seconds = ({ M = 0, P = 0, K = 0, H = 0, R = 0 }) => M * TIME.M + P * TIME.P + K * TIME.K + H * TIME.H + R;
const actions = ({ P = 0, K = 0 }) => P + K;
const fmt = (value) => value.toFixed(1);

const totals = {};
for (const [name, steps] of Object.entries(SCENARIOS)) {
  console.log(`\n${name}\n`);
  console.log("| Step | M | P | K | H | R, s | Time, s |");
  console.log("|---|---|---|---|---|---|---|");
  const sum = { M: 0, P: 0, K: 0, H: 0, R: 0 };
  for (const [step, ops] of steps) {
    for (const key of Object.keys(sum)) sum[key] += ops[key] ?? 0;
    console.log(`| ${step} | ${ops.M ?? 0} | ${ops.P ?? 0} | ${ops.K ?? 0} | ${ops.H ?? 0} | ${ops.R ?? 0} | ${fmt(seconds(ops))} |`);
  }
  console.log(`| **Total** | ${sum.M} | ${sum.P} | ${sum.K} | ${sum.H} | ${sum.R} | **${fmt(seconds(sum))}** |`);
  totals[name] = { seconds: seconds(sum), actions: actions(sum) };
}

console.log("\nTotals");
for (const [name, total] of Object.entries(totals)) {
  console.log(`${name}: ${fmt(total.seconds)} s = ${(total.seconds / 60).toFixed(2)} min, ${total.actions} keystrokes and pointings`);
}
const [prepared, account, platform] = Object.values(totals);
console.log(`Partner without an account: ${fmt(prepared.seconds + account.seconds)} s = ${((prepared.seconds + account.seconds) / 60).toFixed(2)} min, ${prepared.actions + account.actions} actions`);
console.log(`Platform share of the prepared case: ${((platform.seconds / prepared.seconds) * 100).toFixed(0)}%`);
