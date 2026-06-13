import { promises as fs } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const commandsRoot = path.join(repoRoot, ".cursor", "commands");
const flowsRoot = path.join(repoRoot, ".cursor", "flows");
const agentsRoot = path.join(repoRoot, ".cursor", "agents");
const skillsIndexPath = path.join(repoRoot, ".cursor", "skills", "skills.index.json");

const requiredCommandFlows = [
  { command: "fix", flow: "delivery-fix", trigger: "command:/fix" },
  { command: "feature", flow: "delivery-feature", trigger: "command:/feature" },
  { command: "epic", flow: "delivery-epic", trigger: "command:/epic" },
];

const builtInAgents = new Set(["explore", "bash", "browser"]);

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function relativePosix(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function parseInlineList(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return null;
  }
  return trimmed
    .slice(1, -1)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return null;
  }

  const fields = {};
  let currentListKey = null;

  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const listItem = trimmed.match(/^-\s+(.+)$/);
    if (listItem && currentListKey) {
      fields[currentListKey].push(listItem[1].trim());
      continue;
    }

    const kv = trimmed.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!kv) {
      currentListKey = null;
      continue;
    }

    const [, key, rawValue] = kv;
    const inlineList = parseInlineList(rawValue);
    if (inlineList) {
      fields[key] = inlineList;
      currentListKey = null;
    } else if (rawValue === "") {
      fields[key] = [];
      currentListKey = key;
    } else {
      fields[key] = rawValue.trim();
      currentListKey = null;
    }
  }

  return fields;
}

function extractSection(content, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`^## ${escaped}\\r?\\n([\\s\\S]*?)(?=^## |$)`, "m"));
  return match?.[1] ?? "";
}

function extractSkillReferences(content) {
  const skillChain = extractSection(content, "Skill chain");
  return [...skillChain.matchAll(/\*\*([a-z][a-z0-9-]*)\*\*/g)].map((match) => match[1]);
}

function extractAgentReferences(content) {
  const roster = extractSection(content, "Subagent roster");
  return [...roster.matchAll(/`([a-z][a-z0-9-]*)`/g)].map((match) => match[1]);
}

async function collectAgentNames() {
  const entries = await fs.readdir(agentsRoot, { withFileTypes: true });
  return new Set(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
      .map((entry) => entry.name.replace(/\.md$/, ""))
  );
}

async function collectFlowFiles() {
  const entries = await fs.readdir(flowsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
    .map((entry) => path.join(flowsRoot, entry.name));
}

async function main() {
  const failures = [];

  if (!(await fileExists(flowsRoot))) {
    console.error("Missing .cursor/flows directory");
    process.exit(1);
  }

  if (!(await fileExists(skillsIndexPath))) {
    console.error(`Missing skills index: ${relativePosix(skillsIndexPath)}`);
    process.exit(1);
  }

  const skillsIndex = JSON.parse(await fs.readFile(skillsIndexPath, "utf8"));
  const skillNames = new Set((skillsIndex.skills ?? []).map((skill) => skill.name).filter(Boolean));
  const agentNames = await collectAgentNames();
  const flowFiles = await collectFlowFiles();
  const flowsByName = new Map();

  for (const file of flowFiles) {
    const content = await fs.readFile(file, "utf8");
    const frontmatter = parseFrontmatter(content);
    const rel = relativePosix(file);
    const expectedName = path.basename(file, ".md");

    if (!frontmatter) {
      failures.push(`${rel}: missing YAML frontmatter`);
      continue;
    }

    if (frontmatter.name !== expectedName) {
      failures.push(`${rel}: frontmatter name must be '${expectedName}'`);
    }

    if (!frontmatter.description) {
      failures.push(`${rel}: missing frontmatter description`);
    }

    if (!Array.isArray(frontmatter.triggers) || frontmatter.triggers.length === 0) {
      failures.push(`${rel}: frontmatter triggers must be a non-empty list`);
    }

    if (!Array.isArray(frontmatter.pillars) || frontmatter.pillars.length === 0) {
      failures.push(`${rel}: frontmatter pillars must be a non-empty list`);
    }

    if (!Array.isArray(frontmatter.lanes) || frontmatter.lanes.length === 0) {
      failures.push(`${rel}: frontmatter lanes must be a non-empty list`);
    }

    for (const skillName of extractSkillReferences(content)) {
      if (!skillNames.has(skillName)) {
        failures.push(`${rel}: references missing skill '${skillName}'`);
      }
    }

    for (const agentName of extractAgentReferences(content)) {
      if (!agentNames.has(agentName) && !builtInAgents.has(agentName)) {
        failures.push(`${rel}: references missing subagent '${agentName}'`);
      }
    }

    if (frontmatter.name) {
      flowsByName.set(frontmatter.name, { frontmatter, rel });
    }
  }

  for (const { command, flow, trigger } of requiredCommandFlows) {
    const commandPath = path.join(commandsRoot, `${command}.md`);
    if (!(await fileExists(commandPath))) {
      failures.push(`missing command file .cursor/commands/${command}.md`);
      continue;
    }

    const flowEntry = flowsByName.get(flow);
    if (!flowEntry) {
      failures.push(`missing flow '${flow}' for /${command}`);
      continue;
    }

    if (!flowEntry.frontmatter.triggers.includes(trigger)) {
      failures.push(`${flowEntry.rel}: missing trigger '${trigger}'`);
    }
  }

  if (failures.length > 0) {
    console.error("Flow validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `Flow validation passed (${flowFiles.length} flow(s), ${requiredCommandFlows.length} delivery command(s)).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
