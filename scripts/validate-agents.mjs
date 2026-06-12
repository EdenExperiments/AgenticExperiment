import { promises as fs } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const agentsRoot = path.join(repoRoot, ".cursor", "agents");

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

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return null;
  }
  const fields = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (kv) {
      fields[kv[1]] = kv[2].trim();
    }
  }
  return fields;
}

function validateAgentMarkdown(content, fileName) {
  const issues = [];
  const frontmatter = parseFrontmatter(content);
  if (!frontmatter) {
    issues.push("missing YAML frontmatter");
    return issues;
  }

  const expectedName = fileName.replace(/\.md$/, "");
  if (!frontmatter.name) {
    issues.push("missing frontmatter name");
  } else if (frontmatter.name !== expectedName) {
    issues.push(`frontmatter name '${frontmatter.name}' does not match file '${expectedName}'`);
  }

  if (!frontmatter.description) {
    issues.push("missing frontmatter description");
  } else if (!/use when/i.test(frontmatter.description)) {
    issues.push("description should include 'Use when' for routing discoverability");
  }

  if (!content.includes("## ")) {
    issues.push("missing at least one markdown section heading");
  }

  return issues;
}

async function main() {
  const failures = [];

  if (!(await fileExists(agentsRoot))) {
    console.error("Missing .cursor/agents directory");
    process.exit(1);
  }

  const entries = await fs.readdir(agentsRoot, { withFileTypes: true });
  const agentFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md") && e.name !== "README.md")
    .map((e) => path.join(agentsRoot, e.name));

  if (agentFiles.length === 0) {
    failures.push("no agent definition files found in .cursor/agents/");
  }

  const seenNames = new Set();
  for (const file of agentFiles) {
    const rel = relativePosix(file);
    const content = await fs.readFile(file, "utf8");
    const issues = validateAgentMarkdown(content, path.basename(file));
    for (const issue of issues) {
      failures.push(`${rel}: ${issue}`);
    }

    const frontmatter = parseFrontmatter(content);
    if (frontmatter?.name) {
      if (seenNames.has(frontmatter.name)) {
        failures.push(`${rel}: duplicate agent name '${frontmatter.name}'`);
      }
      seenNames.add(frontmatter.name);
    }
  }

  if (failures.length > 0) {
    console.error("Agent validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`Agent validation passed (${agentFiles.length} agent definition(s)).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
