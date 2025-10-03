type Node = {
  name: string;
  parent?: string;
  children: string[];
  cyclic?: boolean;
  missingParent?: boolean;
};

export function buildStackGraph(lookup: Map<string, string>) {
  const nodes = new Map<string, Node>();

  // ensure node exists helper
  const ensure = (n: string) => {
    if (!nodes.has(n))
      nodes.set(n, { name: n, parent: undefined, children: [] });
    return nodes.get(n)!;
  };

  // 1) create nodes and record parent links
  for (const [child, parent] of lookup) {
    const c = ensure(child);
    c.parent = parent;
    ensure(parent); // create a node for parent name even if it's not real branch (we'll validate)
  }

  // 2) build children arrays
  nodes.forEach((n) => (n.children = [])); // reset
  nodes.forEach((n) => {
    if (n.parent) {
      const p = nodes.get(n.parent);
      if (p) p.children.push(n.name);
    }
  });

  // 3) detect cycles & missing parents
  const errors: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(name: string) {
    if (visited.has(name)) return;
    visiting.add(name);
    const n = nodes.get(name)!;
    if (n.parent) {
      if (!nodes.has(n.parent)) {
        n.missingParent = true;
        errors.push(`Missing parent '${n.parent}' for '${name}'`);
      } else {
        const parent = nodes.get(n.parent)!;
        if (visiting.has(parent.name)) {
          // cycle
          n.cyclic = true;
          parent.cyclic = true;
          errors.push(`Cycle detected: '${parent.name}' ↔ '${name}'`);
        } else {
          dfs(parent.name);
        }
      }
    }
    visiting.delete(name);
    visited.add(name);
  }

  nodes.forEach((_n, name) => dfs(name));

  // 4) roots = nodes with no valid parent (undefined/missing/cyclic parent)
  const roots: string[] = [];
  nodes.forEach((n) => {
    const parent = n.parent ? nodes.get(n.parent) : undefined;
    if (!n.parent || !parent) roots.push(n.name);
  });

  // 5) sort children for stable output
  nodes.forEach((n) => n.children.sort((a, b) => a.localeCompare(b)));

  return { nodes, roots, errors };
}

export function printStacks(
  roots: string[],
  nodes: Map<string, Node>,
  current?: string
) {
  const tee = "├─";
  const last = "└─";
  const indent = "   ";

  function line(name: string) {
    const n = nodes.get(name)!;
    const marks = [
      current === name ? "*" : "",
      n.cyclic ? "↻ cycle" : "",
      n.missingParent ? "⚠ parent missing" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return marks ? `${name} (${marks})` : name;
  }

  function printSubtree(name: string, prefix = "", isLast = true) {
    console.log(`${prefix}${isLast ? last : tee} ${line(name)}`);
    const kids = nodes.get(name)!.children;
    const nextPrefix = prefix + (isLast ? indent : "│  ");
    kids.forEach((k, idx) => {
      printSubtree(k, nextPrefix, idx === kids.length - 1);
    });
  }

  // If multiple roots, print each root line plainly, then its subtree
  roots.forEach((r, idx) => {
    // Root line without tee/last for the first root
    if (idx === 0) console.log(line(r));
    else console.log(line(r));
    const kids = nodes.get(r)!.children;
    kids.forEach((k, i) => printSubtree(k, "", i === kids.length - 1));
    if (idx < roots.length - 1) console.log(""); // blank line between stacks
  });
}

export function findRootOf(
  branch: string,
  nodes: Map<string, Node>
): string | undefined {
  let n = nodes.get(branch);
  if (!n) return undefined;
  const seen = new Set<string>();
  while (n && n.parent && nodes.has(n.parent) && !seen.has(n.parent)) {
    seen.add(n.name);
    n = nodes.get(n.parent)!;
  }
  return n ? n.name : undefined;
}
