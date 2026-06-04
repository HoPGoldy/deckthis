import chokidar from "chokidar";

export interface FileWatcher {
  onChange(callback: () => void): void;
  close(): Promise<void>;
}

export function createFileWatcher(folder: string): FileWatcher {
  const watcher = chokidar.watch(["**/*.html", "**/*.ts"], {
    cwd: folder,
    ignoreInitial: true,
  });

  const callbacks: Array<() => void> = [];

  watcher.on("all", () => {
    callbacks.forEach((cb) => cb());
  });

  return {
    onChange(callback: () => void) {
      callbacks.push(callback);
    },
    async close() {
      await watcher.close();
    },
  };
}
