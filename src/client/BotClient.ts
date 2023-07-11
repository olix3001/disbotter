import { Client, ClientOptions } from "discord.js";
import signale from "signale";
import chalk from "chalk";
import { EventHandler } from "../event/EventHandler.js";

/**
 * Bot client configuration.
 * @interface BotClientConfig
 * @extends {ClientOptions}
 * @property {string} token - The bot token.
 */
export interface BotClientConfig extends ClientOptions {
    token: string;
    baseDir: string;
    commandsDir?: string;
    eventsDir?: string;
}

/**
 * Base class for the discord bot client.
 * @class BotClient
 * @extends {Client}
 * @param {BotClientConfig} config - The bot client configuration.
 */
export class BotClient extends Client {
    config: BotClientConfig;

    eventHandler: EventHandler;

    public constructor(config: BotClientConfig) {
        super(config as ClientOptions);
        this.config = config;

        this.eventHandler = new EventHandler(this);
    }

    public async start(): Promise<void> {
        signale.info("Starting bot client...");
        await this.login(this.config.token);
        signale.success(`Bot logged in as ${chalk.yellow(this.user?.tag)}!`);
    }
}
