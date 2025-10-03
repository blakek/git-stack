const tee = "├─";
const last = "└─";
const indent = "   ";

export class Tree {
  children: Tree[] = [];

  static fromMap(map: Map<string, string>): Tree {
    const root = new Tree();
    const nodes = new Map<string, Tree>();
    nodes.set("", root);

    for (const [branch, parent] of map) {
      if (!nodes.has(parent)) {
        nodes.set(parent, new Tree(parent));
      }
      if (!nodes.has(branch)) {
        nodes.set(branch, new Tree(branch));
      }
      const parentNode = nodes.get(parent)!;
      const branchNode = nodes.get(branch)!;
      parentNode.addChild(branchNode);
    }

    // Roots are branches that are not anyone's child
    const allChildren = new Set<string>();
    for (const child of nodes.values()) {
      for (const c of child.children) {
        allChildren.add(c.name!);
      }
    }

    for (const [name, node] of nodes) {
      if (name && !allChildren.has(name)) {
        root.addChild(node);
      }
    }

    return root;
  }

  constructor(public name?: string) {}

  addChild(child: Tree) {
    this.children.push(child);
  }

  print(level: number = 0, character = last) {
    let prefix = "";
    if (level > 0) {
      prefix = indent.repeat(level - 1) + character + " ";
    }

    if (this.name) {
      console.log(`${prefix}${this.name}`);
    }

    this.children.forEach((child, index) => {
      const isLast = index === this.children.length - 1;
      const nextDepth = this.name ? level + 1 : level;

      child.print(nextDepth, isLast ? last : tee);
    });
  }
}
