import { Command } from 'commander';
import fs from 'node:fs';
import http from 'node:http';

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

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

fs.access(input, (err) => {
  if (err) {
    console.error('Cannot find input file');
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      sendJson(res, 400, { error: 'Некоректна адреса запиту' });
      return;
    }

    if (url.pathname !== '/') {
      sendJson(res, 404, { error: 'Маршрут не знайдено' });
      return;
    }

    sendJson(res, 200, []); // тимчасово, дані додамо на наступному кроці
  });

  server.listen(portNumber, host, () => {
    console.log(`Сервер запущено на http://${host}:${portNumber}`);
  });
});
