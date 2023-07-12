import { PathLike } from "fs";
import { globSync } from "glob";
import signale from "signale";
import chalk from "chalk";
import { Collection } from "discord.js";
import { BotClient } from "./BotClient.js";
import chokidar from "chokidar";
import { pathToFileURL } from "url";

export abstract class BaseHandler<T> {
    loadedModules: Collection<string, T[]> = new Collection();
    path: PathLike;
    canHaveMultiple: boolean;
    client: BotClient;
    private watcher: chokidar.FSWatcher | null = null;
    private fileMap: Collection<string, string> = new Collection();
    private readonly hotReloadSignale = signale.scope("hot-reload");

    public constructor(
        client: BotClient,
        path: PathLike,
        canHaveMultiple = false
    ) {
        this.client = client;
        this.path = path;
        this.canHaveMultiple = canHaveMultiple;
        this.loadModules(path);
    }

    public startHotReload(): void {
        this.watcher = chokidar.watch(
            `${this.path.toString().replace(/\\/gi, "/")}/**/*.js`,
            {
                persistent: true,
            }
        );

        this.watcher.on("ready", () => {
            this.hotReloadSignale.watch(
                `Watching ${chalk.yellow(this.path.toString())}`
            );

            if (!this.watcher) {
                return;
            }

            this.watcher.on("change", async (path) => {
                await this.loadModule(path, true);
                this.hotReloadSignale.complete(
                    `Reloaded ${chalk.yellow(path.toString())}`
                );
            });

            this.watcher.on("add", async (path) => {
                await this.loadModule(path);
                this.hotReloadSignale.complete(
                    `Loaded ${chalk.yellow(path.toString())}`
                );
            });

            this.watcher.on("unlink", async (path) => {
                await this.unloadModule(path);
                this.hotReloadSignale.complete(
                    `Unloaded ${chalk.yellow(path.toString())}`
                );
            });
        });
    }

    public stopHotReload(): void {
        if (!this.watcher) {
            return;
        }

        this.watcher.close();
        this.watcher = null;
    }

    private async unloadModule(path: PathLike): Promise<void> {
        const moduleID = this.fileMap.get(path.toString());
        if (!moduleID) {
            return;
        }
        this.fileMap.delete(path.toString());

        const modules = this.loadedModules.get(moduleID);
        if (!modules?.length) {
            return;
        }

        for (const module of modules) {
            this.handlerRemoved(module);
        }

        this.loadedModules.set(moduleID, []);
    }

    private invalidateURLCache(url: string): string {
        if (this.client.config.enableHotReload)
            return `${url}?updateTime=${Date.now()}`;
        return url;
    }

    private async loadModule(
        path: PathLike,
        reload: boolean = false
    ): Promise<T> {
        const moduleURL = pathToFileURL(path as string).toString();
        const moduleImport = (await import(
            this.invalidateURLCache(moduleURL)
        )) as any;
        const module = new moduleImport.default();
        const moduleID = this.getModuleID(module);
        this.fileMap.set(path.toString(), moduleID);

        if (!this.loadedModules.has(moduleID)) {
            this.loadedModules.set(moduleID, []);
        }

        if (
            !this.canHaveMultiple &&
            this.loadedModules.get(moduleID)?.length !== 0 &&
            !reload
        ) {
            signale.warn(
                `Module ${chalk.yellow(moduleID)} already exists! Skipping...`
            );
            return module;
        }

        if (reload && this.canHaveMultiple) {
            throw new Error(
                `Could not reload module ${chalk.yellow(
                    moduleID
                )} because many handlers for same ID are not hot-reload supported!`
            );
        }

        if (reload) {
            this.unloadModule(path);
        }

        // Add the module to the cache
        this.loadedModules.get(moduleID)?.push(module);
        this.handlerAdded(module);
        return module;
    }

    private async loadModules(path: PathLike): Promise<void> {
        const files = globSync(
            `${path.toString().replace(/\\/gi, "/")}/**/*.js`
        );
        for (const file of files) {
            await this.loadModule(file);
        }
        signale.success(
            `Loaded ${chalk.yellow(
                this.loadedModules.size
            )} modules from ${chalk.yellow(path)}`
        );
    }

    public async reloadModules(): Promise<void> {
        for (const modules of this.loadedModules.values()) {
            for (const module of modules) {
                this.handlerRemoved(module);
            }
        }
        this.loadedModules.clear();
        await this.loadModules(this.path);
    }

    public getModules(moduleID: string): T[] | undefined {
        return this.loadedModules.get(moduleID);
    }

    public getAllModules(): Collection<string, T[]> {
        return this.loadedModules;
    }

    public abstract getModuleID(module: T): string;
    public handlerAdded(_handler: T): void {}
    public handlerRemoved(_handler: T): void {}
}
