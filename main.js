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

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(text);
}

function sendJson(res, statusCode, body) {
  sendText(res, statusCode, JSON.stringify(body));
}

// Перетворює значення з файлу на число; порожнє, null чи нечислове дає null
function toNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function buildResponse(records, showMfo, onlyNormal) {
  const result = [];

  for (const record of records) {
    const stateCode = toNumber(record?.COD_STATE);

    if (onlyNormal && stateCode !== 1) {
      continue;
    }

    const item = {};
    if (showMfo) {
      item.mfo_code = toNumber(record?.MFO);
    }
    item.name = record?.SHORTNAME ?? null;
    item.state_code = stateCode;
    result.push(item);
  }

  return result;
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

    const showMfo = url.searchParams.get('mfo') === 'true';
    const onlyNormal = url.searchParams.get('normal') === 'true';

    fs.readFile(input, 'utf8', (readErr, text) => {
      if (readErr) {
        sendJson(res, 500, { error: 'Не вдалося прочитати файл даних' });
        return;
      }

      let records;
      try {
        records = JSON.parse(text.replace(/^\uFEFF/, ''));
      } catch {
        sendJson(res, 500, { error: 'Файл даних пошкоджений: некоректний JSON' });
        return;
      }

      if (!Array.isArray(records)) {
        sendJson(res, 500, { error: 'Файл даних має містити JSON-масив' });
        return;
      }

      const responseText = JSON.stringify(buildResponse(records, showMfo, onlyNormal));

      if (!output) {
        sendText(res, 200, responseText);
        return;
      }

      fs.writeFile(output, responseText, 'utf8', (writeErr) => {
        if (writeErr) {
          sendJson(res, 500, { error: 'Не вдалося записати відповідь у файл' });
          return;
        }
        sendText(res, 200, responseText);
      });
    });
  });

  server.listen(portNumber, host, () => {
    console.log(`Сервер запущено на http://${host}:${portNumber}`);
  });
});
