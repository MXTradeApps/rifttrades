'use strict';

// Keeps the Opus leader out of the editor: file writes are only allowed from the
// Grok implementer subagents. See .cursor/rules/port-orchestration.mdc.
//
// Cursor's preToolUse payload has no field saying whether a tool call came from
// the main agent or a subagent, so this discriminates on the model instead. That
// only holds while the leader and the workers run different models.
//
// This is a guardrail, not a security boundary — it fails open on every error.

const fs = require('fs');
const path = require('path');

// Verified on Cursor 3.13.13: a leader write logs model "claude-opus-5" and a
// port-implementer write logs "cursor-grok-4.5-high-fast", so the two are
// distinguishable. Set back to "observe" to log without blocking.
const MODE = 'enforce';

const LEADER_MODEL = /opus/i;

// preToolUse only fires for Write and Delete here (see hooks.json matcher), but
// match broadly in case the matcher widens. "Tab*" is excluded so Cursor Tab
// completions are never caught.
const WRITE_TOOL = /write|edit|delete|create|patch|rename|move/i;
const TAB_TOOL = /^tab/i;

// Repo-relative POSIX paths the leader may write even under enforce: its own
// team config, and the phase status table it is responsible for.
const LEADER_WRITABLE = [/^\.cursor\//, /^docs\/port\/README\.md$/];

// Derived from this file's own location (<repo>/.cursor/hooks/). Deriving it from
// CURSOR_PROJECT_DIR silently broke every write: Cursor sets it to a "/c:/Users/..."
// URI, which joins into "C:\c:\Users\..." and throws ENOENT into the catch below.
const PROJECT_DIR = path.resolve(__dirname, '..', '..');
const LOG = path.join(__dirname, 'tool-use.log.jsonl');

// Write and Delete both use file_path; the rest are for tools we have not seen.
const PATH_KEYS = [
  'path',
  'file_path',
  'filePath',
  'target_file',
  'targetFile',
  'relative_workspace_path',
  'absolute_path',
];

function repoRelative(raw) {
  if (typeof raw !== 'string' || raw === '') return null;
  const abs = path.isAbsolute(raw) ? raw : path.join(PROJECT_DIR, raw);
  return path.relative(PROJECT_DIR, abs).split(path.sep).join('/');
}

function targetPath(toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return null;
  for (const key of PATH_KEYS) {
    const found = repoRelative(toolInput[key]);
    if (found) return found;
  }
  return null;
}

// The whole payload minus the file body, which would put every byte the agent
// writes — including anything secret — into the log a second time.
function withoutFileBody(payload) {
  if (!payload || typeof payload.tool_input !== 'object' || !payload.tool_input) {
    return payload;
  }
  const { content, contents, new_string, ...rest } = payload.tool_input;
  return { ...payload, tool_input: rest };
}

function emit(decision, record) {
  try {
    fs.mkdirSync(path.dirname(LOG), { recursive: true });
    fs.appendFileSync(LOG, JSON.stringify(record) + '\n');
  } catch {
    // Losing the log must never block the agent.
  }
  process.stdout.write(JSON.stringify(decision));
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(0, 'utf8'));
} catch (err) {
  // Fail open: a broken hook should not wedge the workspace.
  process.stdout.write(JSON.stringify({ permission: 'allow' }));
  process.exit(0);
}

const base = {
  at: new Date().toISOString(),
  mode: MODE,
  event: payload.hook_event_name,
  // A subagent's tool calls carry its own conversation_id, not the leader's.
  conversation_id: payload.conversation_id,
  generation_id: payload.generation_id,
  // model_id is documented but absent on 3.13.13; model is the populated one.
  model: payload.model,
  model_id: payload.model_id,
  raw: withoutFileBody(payload),
};

if (payload.hook_event_name !== 'preToolUse') {
  emit({ permission: 'allow' }, base);
  process.exit(0);
}

const tool = payload.tool_name || '';
const isWrite = WRITE_TOOL.test(tool) && !TAB_TOOL.test(tool);
const target = targetPath(payload.tool_input);
const fromLeader = LEADER_MODEL.test(payload.model_id || payload.model || '');
const exempt = target !== null && LEADER_WRITABLE.some((re) => re.test(target));
const deny = MODE === 'enforce' && isWrite && fromLeader && !exempt;

const record = {
  ...base,
  tool_name: tool,
  is_write: isWrite,
  target,
  from_leader: fromLeader,
  exempt,
  decision: deny ? 'deny' : 'allow',
};

if (!deny) {
  emit({ permission: 'allow' }, record);
  process.exit(0);
}

emit(
  {
    permission: 'deny',
    user_message: `Leader tried to write ${target || 'a file'}. Delegate it instead.`,
    agent_message:
      'Blocked: you are the leader and do not write code. Dispatch this edit to a ' +
      'port-implementer subagent, naming the phase file and the exact numbered steps ' +
      '(subagents start with no context). You may write only .cursor/** and ' +
      'docs/port/README.md yourself.',
  },
  record
);
