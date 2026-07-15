const endpoint = process.argv[2] ?? "http://127.0.0.1:9223";
const targets = await fetch(`${endpoint}/json/list`, { signal: AbortSignal.timeout(10_000) }).then((response) => response.json());
const target = targets.find((candidate) => candidate.type === "page");
if (!target?.webSocketDebuggerUrl) throw new Error("No packaged GameHall page was found.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const request = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});

function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeout = 10_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function navigate(pathname, readySelector) {
  const origin = new URL(target.url).origin;
  await call("Page.navigate", { url: `${origin}${pathname}` });
  await waitFor(`document.readyState === "complete" && Boolean(document.querySelector(${JSON.stringify(readySelector)}))`);
}

async function typeInto(selector, text) {
  const focused = await evaluate(`(() => { const field = document.querySelector(${JSON.stringify(selector)}); if (!field) return false; field.focus(); return document.activeElement === field; })()`);
  if (!focused) throw new Error(`Could not focus ${selector}.`);
  await call("Input.insertText", { text });
  await waitFor(`document.querySelector(${JSON.stringify(selector)})?.value === ${JSON.stringify(text)}`);
}

await call("Page.enable");
await call("Runtime.enable");

await navigate("/dashboard/events/new", "#title");
await typeInto("#title", "Packaged event input check");

await navigate("/dashboard/members", "main");
await evaluate(`[...document.querySelectorAll("button")].find((button) => button.textContent.includes("Add member"))?.click()`);
await waitFor(`Boolean(document.querySelector("#member-name"))`);
await typeInto("#member-name", "Packaged member input check");

await navigate("/dashboard/leagues", "main");
await evaluate(`[...document.querySelectorAll("button")].find((button) => button.textContent.includes("New league"))?.click()`);
await waitFor(`Boolean(document.querySelector("form input"))`);
await typeInto("form input", "Packaged league input check");

console.log("Packaged GameHall inputs accepted keyboard text on events, members, and leagues.");
socket.close();
