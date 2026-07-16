const { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } = require("node:fs");
const http = require("node:http");
const path = require("node:path");

function formatError(error) {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}

function rotateLogFiles(logPath, maxFiles) {
  rmSync(`${logPath}.${maxFiles}`, { force: true });

  for (let index = maxFiles - 1; index >= 1; index -= 1) {
    const source = `${logPath}.${index}`;
    if (existsSync(source)) {
      renameSync(source, `${logPath}.${index + 1}`);
    }
  }

  if (existsSync(logPath)) {
    renameSync(logPath, `${logPath}.1`);
  }
}

function createRotatingLogger(logPath, options = {}) {
  const maxBytes = options.maxBytes ?? 1024 * 1024;
  const maxFiles = options.maxFiles ?? 3;
  mkdirSync(path.dirname(logPath), { recursive: true });

  return (message) => {
    const line = `[${new Date().toISOString()}] ${String(message).trimEnd()}\n`;
    const lineBytes = Buffer.byteLength(line);
    const currentBytes = existsSync(logPath) ? statSync(logPath).size : 0;

    if (currentBytes > 0 && currentBytes + lineBytes > maxBytes) {
      rotateLogFiles(logPath, maxFiles);
    }

    appendFileSync(logPath, line, "utf8");
  };
}

function requestLocal(url, options = {}) {
  const {
    method = "GET",
    headers = {},
    timeoutMs = 10_000,
    signal,
  } = options;

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      if (signal) signal.removeEventListener("abort", abort);
      callback(value);
    };

    const request = http.request(url, { method, headers }, (response) => {
      response.resume();
      response.once("end", () => {
        const statusCode = response.statusCode ?? 0;
        if (statusCode >= 200 && statusCode < 400) {
          finish(resolve, statusCode);
        } else {
          finish(reject, new Error(`Local request failed with HTTP ${statusCode}.`));
        }
      });
      response.once("error", (error) => finish(reject, error));
    });

    const abort = () => request.destroy(new Error("Local request was cancelled."));
    if (signal) {
      if (signal.aborted) {
        abort();
      } else {
        signal.addEventListener("abort", abort, { once: true });
      }
    }

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Local request timed out after ${timeoutMs} ms.`));
    });
    request.once("error", (error) => finish(reject, error));
    request.end();
  });
}

async function waitForServer(url, options = {}) {
  const {
    attempts = 80,
    delayMs = 250,
    timeoutMs = 1_000,
    headers = {},
    signal,
  } = options;
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (signal?.aborted) {
      throw new Error("GameHall's local server startup was cancelled.");
    }

    try {
      await requestLocal(url, { headers, timeoutMs, signal });
      return;
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const reason = lastError instanceof Error ? ` Last error: ${lastError.message}` : "";
  throw new Error(`GameHall's local server did not start in time.${reason}`);
}

function createSingleFlight(task) {
  let inFlight = null;

  return () => {
    if (!inFlight) {
      inFlight = Promise.resolve()
        .then(task)
        .finally(() => {
          inFlight = null;
        });
    }

    return inFlight;
  };
}

function childHasExited(child) {
  return !child || child.exitCode !== null || child.signalCode !== null;
}

function stopChildProcess(child, options = {}) {
  const timeoutMs = options.timeoutMs ?? 4_000;
  if (childHasExited(child)) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(forceTimer);
      clearTimeout(finalTimer);
      child.removeListener("exit", finish);
      child.removeListener("close", finish);
      resolve();
    };

    child.once("exit", finish);
    child.once("close", finish);

    const forceTimer = setTimeout(() => {
      if (!childHasExited(child)) child.kill("SIGKILL");
    }, timeoutMs);
    const finalTimer = setTimeout(finish, timeoutMs + 1_000);
    forceTimer.unref?.();
    finalTimer.unref?.();

    try {
      child.kill("SIGTERM");
    } catch {
      finish();
    }
  });
}

module.exports = {
  childHasExited,
  createRotatingLogger,
  createSingleFlight,
  formatError,
  requestLocal,
  rotateLogFiles,
  stopChildProcess,
  waitForServer,
};
