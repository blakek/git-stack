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

  try {
    const parsedArgs = parseArguments(args, command.args);
    await command.run(parsedArgs);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

main();
