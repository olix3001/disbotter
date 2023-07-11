import signale from "signale";
import chalk from "chalk";
import { BotClient } from "../client/BotClient.js";
import { ClientEvents } from "discord.js";

export type AnyEvent = Event<keyof ClientEvents>;

export abstract class Event<N extends keyof ClientEvents> {
    public readonly name: string;
    public readonly once: boolean;

    protected readonly client: BotClient | null = null;
    private listener: (...args: any[]) => Promise<void>;
    private isAdded: boolean = false;

    public constructor(name: N, once = false) {
        this.name = name as string;
        this.once = once;

        this.listener = async (...args) => {
            if (!this.client) {
                signale.warn(
                    `Event ${chalk.yellow.bold(
                        this.constructor.name
                    )} has no client! Skipping handler...`
                );
                return;
            }
            this.handle(...(args as ClientEvents[N]));
        };
    }

    public setClient(client: BotClient): void {
        if (this.client) {
            signale.warn(
                `Event ${chalk.yellow(
                    this.constructor.name
                )} already has a client! It will be overwritten...`
            );
        }

        // @ts-ignore
        this.client = client;
    }

    public start() {
        if (this.isAdded) {
            signale.warn(
                `Event ${chalk.yellow(
                    this.constructor.name
                )} is already added to client! Skipping...`
            );
            return;
        }

        if (this.once) {
            this.client?.once(this.name, this.listener);
        } else {
            this.client?.on(this.name, this.listener);
        }

        this.isAdded = true;
    }

    public stop(): void {
        if (!this.isAdded) {
            signale.warn(
                `Event ${chalk.yellow(
                    this.constructor.name
                )} is not added to client! Skipping...`
            );
            return;
        }

        if (this.once) {
            this.client?.removeListener(this.name, this.listener);
        }

        this.isAdded = false;
    }

    public abstract handle(...args: ClientEvents[N]): Promise<void>;
}
