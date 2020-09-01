import Router, { controller, action, ActionProps, Controller } from "./controller";
import Telegraf from 'telegraf';
import { TelegrafContext } from "telegraf/typings/context";

@controller('main')
class MainController extends Controller {
    @action()
    async actionDefault(props: ActionProps, ctx: TelegrafContext) {
        if (!props.isRedirect) {
            if (ctx.message.text === '1') {
                return await props.changeRoute('main/balance');
            }
        }

        ctx.reply('Hi\nRedirect: ' + (props.isRedirect ? 1 : 0));
    }

    @action('balance')
    async actionBalance(props: ActionProps, ctx: any, user: any) {
        if (!props.isRedirect) {
            if (ctx.message.text === '1') {
                return await props.changeRoute('main');
            }
        }

        ctx.reply(user.money + '\nRedirect: ' + (props.isRedirect ? 1 : 0));
    }
}


let telegraf = new Telegraf('1241310269:AAF1IQLerztDRkAXLwQJyMGKwbUj3TBsjyU');

let users = {};

let router = new Router([
    new MainController()
], async (route: string, routeData: any, userId: any) => {
    users[userId].route = route;
    users[userId].routeData = routeData;
});

telegraf.on('text', async (ctx) => {
    if (!(ctx.from.id in users)) {
        users[ctx.from.id] = {
            route: 'main',
            routeData: null,
            money: 0
        };
    }

    router.route(ctx.from.id, users[ctx.from.id].route, false, ctx, users[ctx.from.id]);
});

telegraf.launch();