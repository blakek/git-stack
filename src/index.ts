import { commandMap } from "@/commands";
import { displayHelp, parseArguments, wasHelpRequested } from "@/lib";

const [, , commandName, ...args] = process.argv;

async function main() {
  if (!commandName) {
    displayHelp();
    return;
  }

  if (wasHelpRequested(process.argv)) {
    displayHelp(commandName, args);
    return;
  }

  const command = commandMap.get(commandName);
  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    displayHelp();
    process.exit(1);
  }

  const parsedArgs = parseArguments(args, command.args);

  try {
    await command.run(parsedArgs);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
