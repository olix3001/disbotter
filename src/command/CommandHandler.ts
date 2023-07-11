import { RESTPostAPIApplicationCommandsJSONBody, Routes } from "discord.js";
import { BotClient } from "../client/BotClient";
import { BaseHandler } from "../client/Handler";
import { Command } from "./Command";
import path from "path";

export class CommandHandler extends BaseHandler<Command> {
    private readonly handlerFunction: (interaction: any) => Promise<void>;

    public constructor(client: BotClient) {
        super(
            client,
            path.join(
                client.config.baseDir,
                client.config.commandsDir || "commands"
            ),
            false
        );

        this.handlerFunction = async (interaction) => {
            if (!interaction.isCommand()) return;

            const command = this.loadedModules.get(interaction.commandName);

            if (!command) return;

            try {
                await command[0]?.handle(interaction);
            } catch (error) {
                console.error(error);
                // TODO: Implement translation
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content:
                            "There was an error while executing this command!",
                        ephemeral: true,
                    });
                } else {
                    await interaction.reply({
                        content:
                            "There was an error while executing this command!",
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
        await this.client.rest.put(
            Routes.applicationCommands(this.client.config.clientID as string),
            { body: this.getAllCommandsJSON() }
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
        return this.loadedModules.map(
            (m) =>
                m[0]?.builder.toJSON() as RESTPostAPIApplicationCommandsJSONBody
        );
    }
}
