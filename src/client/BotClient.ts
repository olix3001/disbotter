import { Client, ClientOptions, Locale } from "discord.js";
import signale from "signale";
import chalk from "chalk";
import { EventHandler } from "../event/EventHandler.js";
import { CommandHandler } from "../command/CommandHandler.js";
import { Translations } from "../localization/Translations.js";

/**
 * Bot client configuration.
 * @interface BotClientConfig
 * @extends {ClientOptions}
 * @property {string} token - The bot token.
 */
export interface BotClientConfig extends ClientOptions {
    token: string;
    clientID: string;
    baseDir: string;
    commandsDir?: string;
    eventsDir?: string;
    localesDir?: string;
    devGuilds?: string[];
    fallbackLocale?: Locale;

    // This enables additional logging for debugging purposes.
    enableDevMode?: boolean;
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
    commandHandler: CommandHandler;
    translations: Translations;

    public constructor(config: BotClientConfig) {
        super(config as ClientOptions);
        this.config = config;

        this.translations = new Translations(this);
        this.translations.setFallbackLocale(
            config.fallbackLocale || Locale.EnglishUS
        );
        this.eventHandler = new EventHandler(this);
        this.commandHandler = new CommandHandler(this);
    }

    public async start(): Promise<void> {
        signale.info("Starting bot client...");
        this.translations.loadAll();
        signale.success(
            `Loaded ${chalk.yellow(
                this.translations.countTranslations()
            )} translations!`
        );

        await this.login(this.config.token);
        signale.success(`Bot logged in as ${chalk.yellow(this.user?.tag)}!`);

        await this.commandHandler.registerGlobalCommands();
        for (const guildID of this.config.devGuilds || []) {
            await this.commandHandler.registerGuildCommands(guildID);
            signale.info(
                `Registered commands for dev guild ${chalk.yellow(guildID)}`
            );
        }
        await this.commandHandler.startHandler();
        signale.success("Command handler started!");
    }
}
