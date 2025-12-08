# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is ae-cc: a Claude Code plugin providing slash commands, skills, and subagents for prompt engineering, meta-prompting, planning, and productivity workflows. It's a fork/extension of TÂCHES's work, focusing on building Claude Code resources for real workflows.

The repository is structured as a Claude Code plugin with:
- **commands/**: 27 slash commands that expand into structured workflows
- **skills/**: 7 autonomous workflow skills (SKILL.md files with references/, workflows/, templates/, scripts/)
- **agents/**: 3 specialized subagent definitions for auditing
- **docs/**: Supporting documentation for meta-prompting, todo management, and context handoff patterns
- **.claude-plugin/**: Plugin configuration (plugin.json, marketplace.json)

## Architecture Patterns

### Skills Structure (Router Pattern)

Skills follow a filesystem-based modular architecture:

```
skill-name/
├── SKILL.md              # Entry point: router + essential principles
├── workflows/            # Step-by-step procedures (multi-step tasks)
├── references/           # Domain knowledge and patterns
├── templates/            # Output structures (plans, configs, specs)
└── scripts/              # Executable code
```

**Key principles:**
- SKILL.md is always loaded when skill is invoked - contains essential principles and routing logic
- Use pure XML structure (no markdown headings in skill body)
- Progressive disclosure: SKILL.md < 500 lines, references one level deep
- Router pattern: SKILL.md asks "what do you want to do?" → routes to appropriate workflow
- Workflows specify which references to read for context

### Slash Commands Structure

Commands are markdown files with YAML frontmatter:
```yaml
---
description: What the command does
argument-hint: [optional args]
allowed-tools: [Read, Write, Grep, etc.]
---
```

Commands expand into full prompts when invoked. They use XML structuring with tags like `<objective>`, `<process>`, `<context>`, `<critical_workflow>`.

### Subagents Structure

Subagents are markdown files with YAML frontmatter defining specialized Claude instances:
```yaml
---
name: agent-name
description: When to use this agent
tools: Read, Grep, Glob  # Optional, inherits all if omitted
model: sonnet  # Optional: sonnet, opus, haiku, or inherit
---
```

Body contains the system prompt that defines the agent's role, constraints, and behavior.

## Key Concepts

### Meta-Prompting System
Separates analysis from execution:
1. **Analysis phase** (main context): Describe what you want → Claude generates rigorous prompt
2. **Execution phase** (fresh sub-agent): Generated prompt runs in clean context

Commands: `/create-prompt`, `/run-prompt`

### Hierarchical Planning (create-plans skill)
Plans are prompts, not documents. PLAN.md IS the prompt that executes the phase.

**Critical insight:** Plans must complete within ~50% of context to maintain quality. Claude degrades at 40-50% when it enters "completion mode."

**Solution:** Aggressive atomicity - split into many small plans (2-3 tasks each):
- `01-01-PLAN.md` - Phase 1, Plan 1 (database schema)
- `01-02-PLAN.md` - Phase 1, Plan 2 (database client)
- `01-03-PLAN.md` - Phase 1, Plan 3 (API routes)

Hierarchy: BRIEF.md → ROADMAP.md → phases/NN-phase-name/NN-NN-PLAN.md → SUMMARY.md

### Domain Expertise Skills
Exhaustive knowledge bases (5k-10k+ lines) in `skills/expertise/` that provide framework-specific context to other skills like create-plans. Examples: iphone-apps, macos-apps.

Created with `/create-agent-skill` as domain expertise type.

### XML Structure Convention
All skills and commands use semantic XML tags instead of markdown headings:
- `<objective>`, `<process>`, `<success_criteria>`
- `<critical_workflow>`, `<constraints>`, `<focus_areas>`
- Keep markdown formatting within content (bold, lists, code blocks)

### Progressive Disclosure
Complex skills use progressive disclosure:
- SKILL.md: Essential principles + routing (< 500 lines)
- Workflows: Detailed procedures loaded on demand
- References: Domain knowledge loaded when needed
- Never dump everything at once

## Common Development Tasks

### Testing Changes to Skills
When modifying a skill:
1. Read the skill's SKILL.md and relevant references/ to understand structure
2. Make changes following XML structure conventions
3. Test by invoking the skill in a fresh Claude Code session
4. Use `/audit-skill <path>` to validate against best practices

### Testing Changes to Commands
When modifying a command:
1. Read the command file to understand YAML frontmatter and XML structure
2. Make changes maintaining allowed-tools restrictions
3. Test by running the slash command
4. Use `/audit-slash-command <path>` to validate

### Testing Changes to Subagents
When modifying a subagent:
1. Read the agent file to understand role definition
2. Ensure tools list is minimal and appropriate for the role
3. Test by invoking via Task tool or command that uses it
4. Use `/audit-subagent <path>` to validate

### Adding New Resources
- New skill: Use `/create-agent-skill` or follow router pattern in existing skills
- New command: Use `/create-slash-command` or copy structure from existing commands
- New subagent: Use `/create-subagent` or copy structure from agents/

## Important Files and Locations

### Plugin Configuration
- `.claude-plugin/plugin.json` - Plugin metadata (name, version, description, author)
- `.claude-plugin/marketplace.json` - Marketplace configuration

### Key Skills to Understand
- `skills/create-agent-skills/SKILL.md` - Meta-skill for building skills, contains core principles
- `skills/create-plans/SKILL.md` - Hierarchical planning system, scope management principles
- `skills/create-meta-prompts/SKILL.md` - Staged workflow prompt generation

### Reference Documentation
- `docs/meta-prompting.md` - Meta-prompting system overview
- `docs/todo-management.md` - Todo capture and resume patterns
- `docs/context-handoff.md` - Context transfer patterns

### Auditors
- `agents/skill-auditor.md` - Validates SKILL.md files against best practices
- `agents/slash-command-auditor.md` - Validates command files
- `agents/subagent-auditor.md` - Validates subagent configurations

## Working with This Repository

### File Naming Conventions
- Skills: lowercase-with-hyphens, verb-noun pattern (create-*, manage-*, setup-*)
- Commands: lowercase-with-hyphens, match skill names for wrapper commands
- Subagents: lowercase-with-hyphens, descriptive role names

### XML Tag Guidelines
Required tags in skills:
- `<objective>` - What this skill does and why it exists
- `<quick_start>` - Fastest path to using the skill
- `<success_criteria>` - How to know it worked

Conditional tags (based on complexity):
- `<critical_workflow>` - When order/accuracy matters
- `<constraints>` - What NOT to do (use strong modals: MUST/NEVER/ALWAYS)
- `<focus_areas>` - What to prioritize
- `<examples>` - Concrete demonstrations

### Constraint Strength
Use strong modal verbs for hard requirements:
- MUST, NEVER, ALWAYS - Non-negotiable requirements
- Avoid: "should", "consider", "try to" for critical constraints

### Progressive Disclosure Strategy
Simple skill (< 100 lines): Everything in SKILL.md
Medium skill (100-500 lines): SKILL.md + 2-3 references/
Complex skill (> 500 lines): Router pattern with workflows/ and references/

## File and Directory Conventions

The workflows in this codebase create various files and directories in the user's project. Understanding these patterns is critical for working with the codebase.

### Project-Specific Directories

These directories are created in the user's working directory (the project being worked on):

**Prompts Directory** (`./ae-cc/prompts/`)
- Created by: `/create-prompt` command
- Contains: Numbered prompt files for meta-prompting system
- Naming: `001-descriptive-name.md`, `002-another-prompt.md`
- Format: XML-structured prompts that `/run-prompt` executes in fresh contexts
- Automatically created if missing when first prompt is generated

**Planning Directory** (`./ae-cc/planning/`)
- Created by: `create-plans` skill
- Structure:
  ```
  ae-cc/planning/
  ├── BRIEF.md                    # Project vision and requirements
  ├── ROADMAP.md                  # Phase breakdown with progress tracking
  └── phases/
      ├── 01-phase-name/
      │   ├── 01-01-PLAN.md       # Executable plan (IS the prompt)
      │   ├── 01-01-SUMMARY.md    # Execution results
      │   ├── 01-02-PLAN.md       # Next plan in phase
      │   └── 01-02-SUMMARY.md
      └── 02-next-phase/
          └── ...
  ```
- PLAN.md files are NOT documentation - they ARE executable prompts
- SUMMARY.md files are created after plan execution with results
- Phase numbering: `NN-phase-name/NN-NN-PLAN.md`
- Git versioned: Each SUMMARY.md triggers commit with format `feat(XX-NN): [summary]`

**Todos File** (`./ae-cc/TO-DOS.md`)
- Created by: `/add-to-todos` command
- Contains: Context-rich todo items with timestamps
- Format: Markdown sections with headings like `## Task Title - YYYY-MM-DD HH:MM`
- Each todo includes: Problem, Files (with line numbers), Solution (optional)
- Items removed by `/check-todos` when work begins
- Lives in working directory root

**Context Handoff File** (`./ae-cc/whats-next.md`)
- Created by: `/whats-next` command
- Contains: Comprehensive handoff document for continuing work in fresh context
- Format: XML structure with tags like `<original_task>`, `<work_completed>`, `<work_remaining>`
- Used by referencing with `@./ae-cc/whats-next.md` in next conversation
- Captures: completed work, remaining work, attempted approaches, critical context, current state
- Lives in working directory root

### User-Level Directories

These directories are in the user's home directory (`~/.claude/`):

**Commands** (`~/.claude/commands/`)
- Global slash commands installed by plugin
- Available in all projects

**Skills** (`~/.claude/skills/`)
- Global skills installed by plugin
- Subdirectory: `~/.claude/skills/expertise/` for domain expertise skills (e.g., iphone-apps, macos-apps)
- Available in all projects

**Subagents** (`~/.claude/agents/`)
- Global subagent definitions installed by plugin
- Available in all projects

### File Lifecycle Patterns

**Planning Lifecycle:**
1. BRIEF.md created (project vision)
2. ROADMAP.md created (phase breakdown)
3. For each phase: NN-NN-PLAN.md created (executable prompt)
4. `/run-plan` executes PLAN.md
5. NN-NN-SUMMARY.md created (results)
6. ROADMAP.md updated (progress tracking)
7. Git commit created
8. Repeat for next plan

**Meta-Prompting Lifecycle:**
1. `/create-prompt` analyzes request
2. Generates numbered prompt in `./ae-cc/prompts/NNN-name.md`
3. User runs `/run-prompt NNN` or `/run-prompt name`
4. Fresh subagent executes prompt
5. Results returned to main conversation

**Todo Lifecycle:**
1. `/add-to-todos` captures context during work
2. Todo appended to ./ae-cc/TO-DOS.md with timestamp
3. Later: `/check-todos` lists all todos
4. User selects todo
5. Full context loaded
6. Todo removed from file when work begins

**Context Handoff Lifecycle:**
1. `/whats-next` analyzes current conversation
2. Creates `./ae-cc/whats-next.md` with comprehensive state
3. New conversation: Reference with `@./ae-cc/whats-next.md`
4. Fresh Claude instance has full context
5. Work continues seamlessly

### File Reference Patterns

Throughout the codebase, files reference each other using specific patterns:

**@-references in Plans:**
```markdown
<context>
@./ae-cc/planning/BRIEF.md
@./ae-cc/planning/ROADMAP.md
@src/components/Button.tsx
</context>
```

**Numbered references in run-prompt:**
- `/run-prompt 001` - Run prompt by number
- `/run-prompt name` - Run prompt by partial name match
- `/run-prompt 1,2,3 --parallel` - Run multiple prompts in parallel
- `/run-prompt 1,2,3 --sequential` - Run multiple prompts sequentially

**Path conventions:**
- Planning artifacts: Always in `./ae-cc/planning/` directory
- Prompts: Always in `./ae-cc/prompts/` directory
- Todos: Always `./ae-cc/TO-DOS.md` in working directory root
- Handoffs: Always `./ae-cc/whats-next.md` in working directory root

### Relative Path Convention

All file output instructions throughout the codebase use relative paths starting with `./` to indicate files should be created in the current working directory:

**Standard patterns:**
- Single file: `./filename.md`
- Subdirectory: `./subfolder/filename.md`
- Numbered sequence: `./ae-cc/prompts/001-name.md`, `./ae-cc/prompts/002-name.md`
- Variable numbering: `./ae-cc/prompts/[N]-[name].md`, `./ae-cc/prompts/[N+1]-[name].md`
- Planning phases: `./ae-cc/planning/phases/NN-phase-name/NN-NN-PLAN.md`

**Examples from commands:**
- `/create-prompt` → `./ae-cc/prompts/[number]-[name].md`
- `/run-plan` → `./ae-cc/planning/phases/XX-phase/XX-XX-SUMMARY.md`
- `/add-to-todos` → `./ae-cc/TO-DOS.md`
- `/whats-next` → `./ae-cc/whats-next.md`

**Distinction from absolute paths:**
- Relative paths (`./filename`) = current working directory (project-specific)
- Absolute paths (`~/.claude/commands/`) = user home directory (global installation)

This convention ensures consistency across all workflows and makes it clear where files should be created.

## Installation Pattern

This plugin installs globally:
- Commands → `~/.claude/commands/`
- Skills → `~/.claude/skills/`
- Subagents → `~/.claude/agents/`

Project-specific data (prompts, todos, plans) lives in each project's working directory.

## Testing and Validation

All three auditor subagents are available for quality validation:
- `/audit-skill <path>` - Comprehensive skill evaluation
- `/audit-slash-command <path>` - Command structure validation
- `/audit-subagent <path>` - Agent configuration review

Each auditor reads best practices documentation before evaluating, providing contextual findings with file:line locations.
