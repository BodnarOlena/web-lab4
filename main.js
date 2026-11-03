import { Command } from 'commander';
import fs from 'node:fs';

const program = new Command();

program
  .helpOption('--help', 'показати довідку')
  .requiredOption('-i, --input <path>', 'шлях до файлу даних')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .option('-o, --output <path>', 'файл, у який записується остання відповідь');

program.parse();
const { input, host, port, output } = program.opts();

const portNumber = Number(port);
if (!Number.isInteger(portNumber) || portNumber < 0 || portNumber > 65535) {
  program.error('порт має бути цілим числом від 0 до 65535');
}

fs.access(input, (err) => {
  if (err) {
    console.error('Cannot find input file');
    process.exit(1);
  }
  console.log(`input=${input}, host=${host}, port=${port}, output=${output ?? '(не задано)'}`);
});
