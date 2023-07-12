import { Client, ClientOptions, Locale } from "discord.js";
import signale from "signale";
import chalk from "chalk";
import { EventHandler } from "../event/EventHandler.js";
import { CommandHandler } from "../command/CommandHandler.js";
import { Translations } from "../localization/Translations.js";
import path from "path";
import { execa } from "execa";

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
    enableHotReload?: boolean;
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
    public translations: Translations;

    started: boolean = false;

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

        if (this.config.enableHotReload) {
            signale.warn(
                chalk.yellow(
                    "Hot reload is enabled! This is not recommended for production use!"
                )
            );

            this.commandHandler.startHotReload();
            this.eventHandler.startHotReload();
            this.translations.startHotReload();
            this.startHotReloadTSC();
        }

        this.started = true;
    }

    private async startHotReloadTSC(): Promise<void> {
        const tscSignale = signale.scope("tsc");
        tscSignale.info("Starting typescript compiler...");
        // Run tsc --watch --preserveWatchOutput in background

        const tsc = execa("npx", ["tsc", "--watch", "--preserveWatchOutput"], {
            cwd: path.join(this.config.baseDir, ".."),
        });

        tsc.stdout?.on("data", (data: any) => {
            tscSignale.info(data.toString().trim());
        });

        tsc.stderr?.on("data", (data: any) => {
            tscSignale.error(data.toString().trim());
        });

        tsc.on("exit", (code: any) => {
            tscSignale.error(`Exited with code ${code}`);
        });

        tscSignale.success("Typescript compiler started!");
    }
}
