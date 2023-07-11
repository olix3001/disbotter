import { PathLike } from "fs";
import { globSync } from "glob";
import signale from "signale";
import chalk from "chalk";
import { Collection } from "discord.js";
import { BotClient } from "./BotClient";

export abstract class BaseHandler<T> {
    loadedModules: Collection<string, T[]> = new Collection();
    path: PathLike;
    canHaveMultiple: boolean;
    client: BotClient;

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

    private async loadModules(path: PathLike): Promise<void> {
        const files = globSync(
            `${path.toString().replace(/\\/gi, "/")}/**/*.js`
        );
        for (const file of files) {
            const moduleImport = require(file) as any;
            const module = new moduleImport.default();
            const moduleID = this.getModuleID(module);

            if (!this.loadedModules.has(moduleID)) {
                this.loadedModules.set(moduleID, []);
            }

            if (
                !this.canHaveMultiple &&
                this.loadedModules.get(moduleID)?.length
            ) {
                signale.warn(
                    `Module ${chalk.yellow(
                        moduleID
                    )} already exists! Skipping...`
                );
                continue;
            }

            this.loadedModules.get(moduleID)?.push(module);
            this.handlerAdded(module);
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
