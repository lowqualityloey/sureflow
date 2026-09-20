/**
 * Sureflow CLI entrypoint (T1 scaffold stub).
 *
 * T1 scope: prove the toolchain only. The approved M1 commands
 * (init/run/status/verify) land in T5–T7; this stub exists so the
 * `sureflow` bin resolves and prints the M1 boundary. Exit codes
 * follow the approved contract: 0 = accepted/pass, 2 = halt.
 */
const args: readonly string[] = process.argv.slice(2);
const command: string | undefined = args[0];

if (command === undefined || command === "--help" || command === "-h") {
  console.log("sureflow (M1 scaffold): approved commands are init, run, status, verify (T5-T7).");
  process.exit(0);
}

console.error(`sureflow (M1 scaffold): '${command}' not implemented yet (lands in T5-T7).`);
process.exit(2);
