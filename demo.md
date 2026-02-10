# Attractor Pipeline Runner Demo

*2026-02-10T23:49:56Z*

This demo showcases the Attractor pipeline runner, a DOT-based workflow orchestration system for multi-stage AI workflows.

## Running Tests

First, let's run the test suite to verify everything works:

```bash
npm test 2>&1 | tail -20
```

```output
✔ ExecutionEngine - finds start and exit nodes (0.505979ms)
✔ ExecutionEngine - edge selection by weight (7.410646ms)
✔ parseDot - simple graph (2.892859ms)
✔ parseDot - graph attributes (0.534283ms)
✔ parseDot - node attributes (1.762307ms)
✔ parseDot - edge attributes (0.495269ms)
✔ parseDot - chained edges (0.418936ms)
✔ parseDot - comments (0.323688ms)
✔ ToolHandler - echo command (17.977818ms)
✔ ToolHandler - failing command (6.910138ms)
✔ WaitForHumanHandler - auto approve (11.039168ms)
✔ WaitForHumanHandler - queue interviewer (4.599872ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 159.723692
```

## Example Workflows

Let's examine a simple workflow example:

```bash
cat examples/simple.dot
```

```output
// Simple linear workflow
digraph Simple {
    graph [goal="Run tests and report"]
    rankdir=LR

    start [shape=Mdiamond, label="Start"]
    exit  [shape=Msquare, label="Exit"]

    run_tests [label="Run Tests", prompt="Run the test suite and report results"]
    report    [label="Report", prompt="Summarize the test results"]

    start -> run_tests -> report -> exit
}
```

Now let's run this example workflow:

```bash
node src/cli.js examples/simple.dot ./logs/demo-run 2>&1 | head -15
```

```output
Reading examples/simple.dot...
Parsed graph: Simple
Goal: Run tests and report
Nodes: 4
Edges: 3

Starting execution...
Logs directory: ./logs/demo-run


=== Pipeline Complete ===
Status: completed
Completed nodes: start -> run_tests -> report

Logs saved to: ./logs/demo-run
```

## Tool Execution Example

The tool handler can execute external commands. Let's see an example:

```bash
cat examples/tool.dot
```

```output
// Example with tool execution
digraph ToolExample {
    graph [goal="Execute shell commands"]
    rankdir=LR

    start [shape=Mdiamond, label="Start"]
    exit  [shape=Msquare, label="Exit"]

    list_files [
        shape=parallelogram,
        type="tool",
        label="List Files",
        tool_command="ls -la",
        timeout="5s"
    ]
    
    echo_test [
        shape=parallelogram,
        type="tool",
        label="Echo Test",
        tool_command="echo 'Hello from Attractor'",
        timeout="5s"
    ]

    start -> list_files -> echo_test -> exit
}
```

```bash
node src/cli.js examples/tool.dot ./logs/tool-demo 2>&1 | grep -E '(Parsed|Status|Completed)'
```

```output
Parsed graph: ToolExample
Status: completed
Completed nodes: start -> list_files -> echo_test
```

## Project Structure

The project has a clean modular structure:

```bash
tree -L 2 -I 'node_modules|logs' . 2>/dev/null || find . -maxdepth 2 -not -path '*/\.*' -not -path '*/node_modules/*' -not -path '*/logs/*' | head -30
```

```output
.
├── IMPLEMENTATION.md
├── README.md
├── demo.md
├── examples
│   ├── branch.dot
│   ├── human-gate.dot
│   ├── retry.dot
│   ├── simple.dot
│   └── tool.dot
├── package.json
├── src
│   ├── cli.js
│   ├── engine
│   ├── handlers
│   ├── index.js
│   ├── models
│   ├── parser
│   └── utils
└── test
    ├── engine.test.js
    ├── parser.test.js
    ├── tool-handler.test.js
    └── wait-human-handler.test.js

9 directories, 15 files
```

## Key Features

- **DOT Parser**: Parses Graphviz DOT files with full attribute support
- **Execution Engine**: Graph traversal with checkpointing and retry logic
- **Multiple Handlers**: Start/Exit, Codergen, Conditional, Tool, WaitForHuman
- **Edge Selection**: Routing based on conditions, weights, and preferred labels
- **Human-in-the-loop**: Support for interactive decision points
- **Test Coverage**: 13 passing tests across all core functionality
