# Component Design

Read before designing a feature for the plugin, when deciding which component type (MCP tool, skill, hook, subagent,
command, rule, Pi extension) carries which part of it, and when writing or reviewing a skill, a subagent body, a hook,
or a tool description. `architecture.md` says where each component lives and how it is generated; this file says what
goes into each and how to cut a feature into components. The plugin's skills and the project's own skills under
`.agents/skills/` follow the same skill rules; OpenSpec's generated skills are exempt because they are regenerated.

## From a feature to components

Start from the job the user states, then separate four things the job contains. Each maps to one component type; nothing
maps to two.

| Part of the job                                                                      | Component                                                   | Why that one                                                                                                                                     |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| A computation, lookup, or side effect every agent should perform identically         | an MCP tool in `mcp/<server>/`                              | Deterministic work belongs in code the agent calls, not in prose it re-derives; one implementation gives every framework the same answer         |
| A procedure with judgment, ordering, confirmation, or a validation gate              | a skill in `skills/<name>/`                                 | Instructions restrict how the agent works while leaving the judgment to it; a skill is loaded only when its trigger fires                        |
| A reaction to a framework event (after an edit, before a commit, on session start)   | a hook in `integrations/<fw>/hooks/`, one per framework     | Events and their output contracts differ per framework and cannot be shared; the hook decides only whether to speak and points at the tool/skill |
| A delegated role that works with a narrowed context and reports back                 | a shared subagent in `agents/` plus per-framework overrides | The body is instructions like a skill's; the framework fields (tools, model) are integration facts                                               |
| A human-typed entry point, a style constraint, or a registration the framework needs | a command, prompt, rule, or extension under `integrations/` | Framing for one framework; it names the tool or skill to use and implements nothing                                                              |

Decision order: first ask whether a part is deterministic (tool) or needs judgment (skill); then whether the agent
starts it (skill or command) or an event does (hook); then whether it should run in a narrowed context (subagent). A
part that the base agent already does well without instructions becomes no component: the feature adds what the agent
lacks, and nothing else.

Write the design into the OpenSpec change (`design.md`) before implementing when the feature adds a component type or
spans more than one; the delta spec per capability then states the tool contract, the skill's steps, and the hook's
output as separate requirements.

## Splitting rules

- **One capability, one implementation.** A capability is implemented once, in the component whose job it is (Component
  roles). A second place that needs it calls the tool or names the skill; it never copies the code.
- **One question per tool.** A tool answers one question with a stable input and output shape (`list_todos` answers
  "what markers are there", `scan_file` answers it for one file). A step sequence or a decision is never a tool: the
  agent cannot adapt a procedure that is hidden in code. The text result's first line is the verdict the skill repeats;
  `structuredContent` carries the data a skill or subagent composes.
- **One work unit per skill.** Too narrow and it conflicts with other loaded skills; too broad and its trigger fires
  unreliably. Split a skill only when a distinct leading word should trigger the new part on its own (by invocation), or
  when later steps tempt the agent to rush the current one and the split lands across a real context boundary such as a
  subagent hand-off (by sequence). Each split adds a description that loads on every turn; it must earn that.
- **A hook is minimal.** It detects, decides whether to speak, and points at the tool or skill that holds the authority;
  silence is its normal output. A hook that computes an answer duplicates a tool. Where a framework lets a hook call an
  MCP tool directly (Codex's `mcp_tool` handler, `frameworks.md`), prefer that over a script: the hook is then only the
  event binding and the server stays the one implementation.
- **A format two components must know** (the marker syntax a tool parses and a hook detects) is defined once in a
  reference file and each implementation is held to the same test fixture; the code stays separate.
- **A subagent narrows, it does not own.** It receives the tool's data or calls the tool itself; it returns decisions in
  the shape the calling skill's script accepts; it edits nothing.

## Component roles

One capability, one implementation, in the component whose job it is; the other components call it or stay in their
lane:

- **MCP servers** (`mcp/<server>/`) own connectivity: a capability an agent can call is implemented once there and
  exposed as tools. Nothing else imports a server's modules.
- **Skills** own procedure: they name the MCP tools they call and compose their results. A skill may ship its own
  `scripts/` for work that is the skill's alone (the triage skill's edit applier); those scripts import nothing outside
  the skill directory, because a skill is distributed on its own.
- **Hooks** own one framework's lifecycle: deciding when to speak after an event, in that framework's contract. A hook
  that must look at a file carries its own minimal check and points the agent at the MCP tool for the authoritative
  answer; it imports nothing outside its directory.
- **Framework extensions** (the Pi extension, Claude commands, Antigravity rules) own registration and framing for that
  framework and reimplement nothing.

`just validate` enforces the import boundary for skill and hook scripts.

## Skill rules

A skill runs on every framework's model, including the weakest one an adopter's users bring, so every judgment below is
made against that model: a stronger model tolerates a restriction it does not need; a weaker one breaks without it.

**Value.** A skill earns its load by supplying what the agent lacks (project conventions, exact tool contracts,
non-obvious order) or by restricting output variance (one default per decision, alternatives in one sentence). It
teaches the approach, not one worked instance, and explains no standard concept. If the agent does the task well bare,
there is no skill.

**Description.** The only text read before activation, so it names the capability in one third-person sentence that
opens on the skill's leading word, then spends the rest on triggers: the direct request, the indirect phrasings, the
scenario the user is in, the material at hand, the lifecycle moment, and the adjacent task that must not fire it ("Not
for …"). One trigger per branch; nothing the body says again; well under the 1024-character limit.

**Body.** Steps first, in order; a `Done when:` or `Check:` line where the step has an observable boundary or is prone
to premature completion, exhaustive where thoroughness matters ("every edited file re-checked", not "re-check"). Then
the in-file reference the steps need. Material only some runs need goes behind a pointer with its load condition ("Read
`references/<file>.md` when …"), never "see the references directory". A gotcha is a non-obvious fact the agent would
get wrong by reasonable assumption, added when a correction revealed it; general advice is deleted. Prohibitions are
rewritten as the target behavior, kept only as a hard guardrail beside the positive form.

**Bundled files.** The `scripts`, `references`, and `assets` directories exist only when a file goes in; every file is
linked from `SKILL.md` by a relative link at its first mention; no link leaves the directory. A script exists only when
the same logic would be regenerated identically every run: it takes input by flags, prints data to stdout (JSON
preferred) and diagnostics to stderr, exits 0/1/2 (success, error, bad arguments), is idempotent, carries `--help` with
an example, states what is wrong and how to fix it, and names its runtime in the `compatibility` field. Plugin skills'
scripts are Node ESM (Component roles); project skills' scripts are Deno TypeScript (`maintenance.md`). An asset is
copied, so it holds fixed material only; what needs task-specific judgment is instructions, not a template.

**Prune** before committing: collapse each meaning to one place, delete lines that no longer bear on the task, then ask
of each sentence whether it changes what the weakest supported model does; delete whole sentences that do not.

**Checks.** `just validate` (plugin skills) and `just harness-check` (project skills) hold the mechanical rules: name
equals directory, description with a trigger clause and no filler opening, bundled files linked, links inside the
directory, no nested skill, no `README.md`. The rest of this section is reviewed by reading.

## Subagent, hook, and tool rules

- A shared subagent body is written like a skill body (steps, one default per decision, the output shape it returns);
  its description is the delegation trigger, read by the skill or user who hands work over. Framework fields stay in the
  overrides (`architecture.md`, Subagent discovery rules).
- A hook says in one sentence when it speaks and what it points at; it reads only the event payload and the files it
  names; it writes the framework's output contract exactly (`frameworks.md`); its silence is a `{}` or an empty output,
  never an error.
- A tool description states the question it answers, each argument's meaning and default, and what the text and
  `structuredContent` results hold; a skill quotes the tool name and arguments literally, so renaming either is a
  behavior change with a spec delta.

## Update this file when

- A component type is added or removed (`architecture.md` changes too).
- A skill rule becomes mechanical (move it into `scripts/lib/skills.ts` and the Checks paragraph) or a check is removed.
- A framework changes how it loads skills, hooks, or subagents in a way that changes a rule above.
