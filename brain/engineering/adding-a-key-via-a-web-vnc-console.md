# Getting SSH access via a cloud web console (Hetzner/etc.)

When a server refuses password SSH (`Permission denied (publickey,password)`) and
your key isn't installed yet, the cloud provider's **web VNC console** logs you in
as root without SSH — use it to append your public key to `authorized_keys`, then
SSH in normally.

## The gotcha that cost time

**Do NOT type a long SSH key into the VNC console keystroke-by-keystroke** (e.g.
via browser automation `type`). The VNC keyboard bridge is lossy and layout-quirky:
shifted symbols get mangled (`&&` → `77`, `+` → `=`), and on a ~380-char string
whole runs of characters are dropped or reordered. A corrupted `authorized_keys`
line silently fails to grant access.

What works instead:
- **A human pastes** the `echo 'ssh-rsa …' >> ~/.ssh/authorized_keys` line into the
  console (paste goes through intact; per-character typing does not).
- If you must transfer programmatically, **hex-encode** the payload (`xxd -p`,
  only `0-9a-f`, no shifted keys) and `xxd -r -p` on the far side — but even then,
  the redirect/pipe chars (`>`, `|`) can mangle, so paste is still the reliable path.

## Sanity check afterwards

`ssh -o BatchMode=yes root@HOST 'whoami'` should return `root` with no prompt. If it
still asks for a password, the key line didn't land — re-check `authorized_keys` for
truncation.

## Update: the Hetzner console keyboard bridge inverts case (and drops modifiers)

On the LogicRush Hetzner console, the browser→noVNC keyboard bridge (driven via
automation) had two quirks worth knowing:
- **Case is inverted.** Typing `whoami` produced `WHOAMI` (command not found);
  typing `WHOAMI` produced `whoami` → ran. So drive lowercase commands by sending
  them in UPPERCASE.
- **Modifiers are dropped.** Ctrl+C types a literal `C` (no SIGINT); Shift is not
  transmitted, so shifted symbols collapse to their unshifted key (`&`→`7`,
  `+`→`=`, `_`→`-`, `>`→`.`, `"`→`'`). That makes `_ > < | " $ & ( ) : * + ?` and
  real uppercase effectively untypeable — you can only produce lowercase letters,
  digits, and unshifted punctuation (`- . / , ; ' [ ] =` space backtick).
- To exit a stuck `>` heredoc/quote continuation without Ctrl+C, type a matching
  quote and Enter.

Consequence: anything needing those symbols (an SSH key with `+/=`, a shell
redirect, an env-var name with `_`) cannot be typed through this console. When a
DB port is already exposed, dumping directly over it from your own machine beats
fighting the console. Reading a credentials file to do so may be blocked by the
agent's own secret-file classifier — that is a per-action approval for the human
to grant, not something to work around.
