import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const runtime = require("../../electron/runtime.cjs") as {
  createRotatingLogger(logPath: string, options?: { maxBytes?: number; maxFiles?: number }): (message: string) => void;
  createSingleFlight<T>(task: () => Promise<T>): () => Promise<T>;
  requestLocal(url: URL, options?: { timeoutMs?: number }): Promise<number>;
  stopChildProcess(child: EventEmitter & { exitCode: number | null; signalCode: string | null; kill(signal: string): boolean }): Promise<void>;
  waitForServer(url: URL, options?: { attempts?: number; delayMs?: number; timeoutMs?: number }): Promise<void>;
};

const temporaryDirectories: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("Electron runtime helpers", () => {
  it("rotates child-process logs instead of growing without a bound", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "gamehall-log-"));
    temporaryDirectories.push(directory);
    const logPath = path.join(directory, "server.log");
    const log = runtime.createRotatingLogger(logPath, { maxBytes: 100, maxFiles: 2 });

    log("first message that consumes most of the deliberately tiny test log file");
    log("second message rotates the previous log");

    expect(existsSync(logPath)).toBe(true);
    expect(existsSync(`${logPath}.1`)).toBe(true);
    expect(readFileSync(logPath, "utf8")).toContain("second message");
  });

  it("drains successful local responses and rejects HTTP failures", async () => {
    const server = createServer((request, response) => {
      response.statusCode = request.url === "/ok" ? 204 : 503;
      response.end(request.url === "/ok" ? undefined : "not ready");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind.");

    await expect(runtime.requestLocal(new URL(`http://127.0.0.1:${address.port}/ok`))).resolves.toBe(204);
    await expect(runtime.requestLocal(new URL(`http://127.0.0.1:${address.port}/fail`))).rejects.toThrow("HTTP 503");
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("waits for a genuine successful readiness response", async () => {
    let checks = 0;
    const server = createServer((_request, response) => {
      checks += 1;
      response.statusCode = checks < 3 ? 503 : 200;
      response.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind.");

    await runtime.waitForServer(new URL(`http://127.0.0.1:${address.port}/health`), {
      attempts: 4,
      delayMs: 1,
      timeoutMs: 100,
    });
    expect(checks).toBe(3);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("coalesces overlapping scheduled requests into one flight", async () => {
    let runs = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const task = runtime.createSingleFlight(async () => {
      runs += 1;
      await gate;
      return runs;
    });

    const first = task();
    const second = task();
    expect(first).toBe(second);
    expect(runs).toBe(0);
    release();
    await expect(first).resolves.toBe(1);
    expect(runs).toBe(1);
  });

  it("asks the server process to stop gracefully before forcing it", async () => {
    class FakeChild extends EventEmitter {
      exitCode: number | null = null;
      signalCode: string | null = null;
      signals: string[] = [];

      kill(signal: string) {
        this.signals.push(signal);
        this.signalCode = signal;
        queueMicrotask(() => this.emit("exit", null, signal));
        return true;
      }
    }
    const child = new FakeChild();

    await runtime.stopChildProcess(child);
    expect(child.signals).toEqual(["SIGTERM"]);
  });

  it("rejects an installer accidentally traced into the packaged server", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "gamehall-package-"));
    temporaryDirectories.push(directory);
    const staleRelease = path.join(directory, "artifacts");
    mkdirSync(staleRelease);
    writeFileSync(path.join(staleRelease, "GameHall-Setup-0.1.3.exe"), "stale installer");
    const { assertNoNestedInstaller } = await import("../../scripts/desktop-package-guard.mjs");

    expect(() => assertNoNestedInstaller(directory)).toThrow("Refusing to package a nested installer");
  });
});
