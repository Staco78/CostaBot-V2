import Bot from "../bot";
import ICommand from "./ICommand";

export default class GlobalCommand extends ICommand {
    constructor(bot: Bot, data: CommandConfig) {
        super(bot, data);

        bot.client.application.commands.create(data.command).then(command => {
            this.command = command;
        });
    }
}
