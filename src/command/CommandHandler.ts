import {
    Collection,
    RESTPostAPIApplicationCommandsJSONBody,
    Routes,
} from "discord.js";
import { BotClient } from "../client/BotClient.js";
import { BaseHandler } from "../client/Handler.js";
import { Command } from "./Command.js";
import path from "path";
import signale from "signale";
import chalk from "chalk";

export class CommandHandler extends BaseHandler<Command> {
    private readonly handlerFunction: (interaction: any) => Promise<void>;
    private devCommandCache: Collection<string, string> = new Collection();

    public constructor(client: BotClient) {
        super(
            client,
            path.join(
                client.config.baseDir,
                client.config.commandsDir || "commands"
            )
        );

        this.handlerFunction = async (interaction) => {
            if (!interaction.isCommand()) return;

            const command = this.loadedModules.get(interaction.commandName);

            if (!command) return;

            try {
                await command[0]?._handleInteraction(interaction);
            } catch (error) {
                signale.error(error);
                const errorMessage = command[0]
                    ?.getTranslator(interaction)
                    .translate("internal.command.error");
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: errorMessage,
                        ephemeral: true,
                    });
                } else {
                    await interaction.reply({
                        content: errorMessage,
                        ephemeral: true,
                    });
                }

                if (this.client.config.enableDevMode) {
                    let errorMsg = (error as any).toString();

                    // Trim the error message to 1500 characters
                    if (errorMsg.length > 1500) {
                        errorMsg = errorMsg.slice(0, 1500);
                    }

                    await interaction.followUp({
                        content: `Dev Mode Logs:\n\`\`\`js\n${errorMsg}\`\`\``,
                        ephemeral: true,
                    });
                }
            }
        };
    }

    public startHandler(): void {
        this.client.on("interactionCreate", this.handlerFunction);
    }

    public stopHandler(): void {
        this.client.off("interactionCreate", this.handlerFunction);
    }

    public getModuleID(module: Command): string {
        return module.builder.name;
    }

    public async registerGlobalCommands(): Promise<void> {
        signale.info("Registering global commands...");
        await this.client.rest.put(
            Routes.applicationCommands(this.client.config.clientID as string),
            { body: this.getAllCommandsJSON() }
        );
    }

    public async registerGlobalCommand(commandID: string): Promise<void> {
        await this.client.rest.put(
            Routes.applicationCommands(this.client.config.clientID as string),
            { body: [this.loadedModules.get(commandID)?.[0]?.builder.toJSON()] }
        );
    }

    public async updateDevCommand(commandID: string): Promise<void> {
        if (!this.client.started) return;
        const cached = this.devCommandCache.get(commandID);
        if (cached) {
            if (
                cached ===
                JSON.stringify(
                    this.loadedModules.get(commandID)?.[0]?.builder.toJSON()
                )
            )
                return;
        }

        this.devCommandCache.set(
            commandID,
            JSON.stringify(
                this.loadedModules.get(commandID)?.[0]?.builder.toJSON()
            )
        );

        for (const guildID of this.client.config.devGuilds || []) {
            await this.registerGuildCommand(commandID, guildID);
        }
    }

    public async registerGuildCommand(
        commandID: string,
        guildID: string
    ): Promise<void> {
        await this.client.rest.put(
            Routes.applicationGuildCommands(
                this.client.config.clientID as string,
                guildID
            ),
            { body: [this.loadedModules.get(commandID)?.[0]?.builder.toJSON()] }
        );

        signale.info(
            `Registered command ${chalk.yellow(
                commandID
            )} in guild ${chalk.yellow(guildID)}`
        );
    }

    public async registerGuildCommands(guildID: string): Promise<void> {
        await this.client.rest.put(
            Routes.applicationGuildCommands(
                this.client.config.clientID as string,
                guildID
            ),
            { body: this.getAllCommandsJSON() }
        );
    }

    public getAllCommandsJSON(): RESTPostAPIApplicationCommandsJSONBody[] {
        return this.loadedModules.map((m) => {
            if (this.client.config.enableHotReload) {
                this.devCommandCache.set(
                    m[0]?.builder.name as string,
                    JSON.stringify(m[0]?.builder.toJSON())
                );
            }
            return m[0]?.builder.toJSON() as RESTPostAPIApplicationCommandsJSONBody;
        });
    }

    public override handlerAdded(handler: Command): void {
        handler.setClient(this.client);
        if (this.client.config.enableHotReload) {
            this.updateDevCommand(handler.builder.name);
        }
    }
}
