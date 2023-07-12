import signale from "signale";
import chalk from "chalk";
import { BotClient } from "../client/BotClient.js";
import { BaseHandler } from "../client/Handler.js";
import { AnyEvent } from "./Event.js";
import path from "path";

export class EventHandler extends BaseHandler<AnyEvent> {
    public constructor(client: BotClient) {
        super(
            client,
            path.join(
                client.config.baseDir,
                client.config.eventsDir || "events"
            )
        );

        signale.success(`Loaded ${chalk.yellow(this.countEvents())} events!`);
    }

    countEvents(): number {
        if (this.loadedModules.size === 0) return 0;
        return this.loadedModules
            .map((m) => (m.length > 0 ? m.length : 1))
            .reduce((a, b) => a + b);
    }

    public getModuleID(module: AnyEvent): string {
        return module.uniqueID;
    }

    public override handlerAdded(handler: AnyEvent): void {
        handler.setClient(this.client);
        handler.start();
    }

    public override handlerRemoved(handler: AnyEvent): void {
        handler.stop();
    }
}
