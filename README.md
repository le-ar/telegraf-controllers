# Using
1. Add ```"experimentalDecorators": true``` to tsconfig.
2. Create a class that will inherit from the controller.
3. Add decorator ```@controller(name)``` to the created class.
4. Add methods in created class with decorator ```@action(name)```.
5. Initialize class ```Router``` and pass created class to contructor.
6. Call method ```go``` from ```Router```


- Router.go() - take userId and route. Route must be separated with "```/```" (```controller/action```). If passed without action then action sets to ```default```. You can pass addition params after route (Ex. ```router.go(userId, route, ctx, user, other)```).
- @controller(name)
- @action(name) // default name is "default"
- ActionProps - object 
- - route - Current route
- - isRedirect
- - changeRoute(route: string, routeData?: any) => Promise<any>

# Simple example:
```typescript
import Router, { controller, action, ActionProps, Controller } from "telegraf-controllers";
import Telegraf, { Markup } from 'telegraf';
import { TelegrafContext } from "telegraf/typings/context";

@controller('main')
class MainController extends Controller {
    @action()
    async actionDefault({ changeRoute, isRedirect }: ActionProps, ctx: TelegrafContext) {
        if (!isRedirect) {
            switch (ctx.message.text) {
                case 'Me':
                    return await changeRoute('main/me');
            }
        }

        ctx.reply('Hello', Markup.keyboard(['Me']).resize().extra());
    }

    @action('me')
    async actionMe({ changeRoute, isRedirect }: ActionProps, ctx: TelegrafContext) {
        if (!isRedirect) {
            switch (ctx.message.text) {
                case 'Back':
                    return await changeRoute('main');
            }
        }

        ctx.reply(`Id: ${ctx.from.id}\nUsername: ${ctx.from.username}`, 
            Markup.keyboard(['Back']).resize().extra()
        );
    }
}

let users = {};

async function updateUserRoute(route: string, routeData: any, userId: any) {
    users[userId].route = route;
    users[userId].routeData = routeData;
}

let router = new Router([
    new MainController()
], updateUserRoute);

let telegraf = new Telegraf('<token>');

telegraf.on('text', async (ctx) => {
    if (!(ctx.from.id in users)) {
        users[ctx.from.id] = {
            id: ctx.from.id,
            route: 'main',
            routeData: null,
            money: 0
        };
    }

    router.go(ctx.from.id, users[ctx.from.id].route, ctx, users[ctx.from.id]);
});

telegraf.launch();
```
---
# Advanced Example
```typescript
import Router, { controller, action, ActionProps, Controller } from "telegraf-controllers";
import Telegraf, { Markup } from 'telegraf';
import { TelegrafContext } from "telegraf/typings/context";

@controller('main')
class MainController extends Controller {
    @action()
    async actionDefault({ isRedirect, changeRoute }: ActionProps, ctx: TelegrafContext) {
        if (!isRedirect) {
            switch (ctx.message.text) {
                case 'Balance':
                    return await changeRoute('balance');
            }
        }

        ctx.reply('Hi\nRedirect: ' + (isRedirect ? 1 : 0), Markup.keyboard(['Balance']).resize().extra());
    }
}

@controller('balance')
class BalanceController extends Controller {
    addBalance: (userId: number, sum: number) => any;

    constructor(addBalance: (userId: number, sum: number) => any) {
        super();

        this.addBalance = addBalance;
    }

    @action()
    async actionBalance({ changeRoute, isRedirect }: ActionProps, ctx: any, user: any) {
        if (!isRedirect) {
            switch (ctx.message.text) {
                case 'Back':
                    return await changeRoute('main');
                case 'Add':
                    return await changeRoute('balance/add');
            }
        }

        ctx.reply(user.money + '\nRedirect: ' + (isRedirect ? 1 : 0), Markup.keyboard(['Add', 'Back']).resize().extra());
    }

    @action('add')
    async actionAdd({ changeRoute, isRedirect }: ActionProps, ctx: TelegrafContext, user: any) {
        if (!isRedirect) {
            if (!isRedirect) {
                switch (ctx.message.text) {
                    case 'Back':
                        return await changeRoute('balance');
                }
            }
            let sum = parseInt(ctx.message.text);
            if (!Number.isNaN(sum)) {
                await this.addBalance(user.id, sum);
                return await changeRoute('balance');
            }
        }

        ctx.reply('Enter sum:', Markup.keyboard(['Back']).resize().extra());
    }
}




async function updateUserBalance(userId: number, sum: number) {
    users[userId].money += sum;
}


let users = {};

async function updateUserRoute(route: string, routeData: any, userId: any) {
    users[userId].route = route;
    users[userId].routeData = routeData;
}

let router = new Router([
    new MainController(),
    new BalanceController(updateUserBalance)
], updateUserRoute);

let telegraf = new Telegraf('<token>');

telegraf.on('text', async (ctx) => {
    if (!(ctx.from.id in users)) {
        users[ctx.from.id] = {
            id: ctx.from.id,
            route: 'main',
            routeData: null,
            money: 0
        };
    }

    router.go(ctx.from.id, users[ctx.from.id].route, ctx, users[ctx.from.id]);
});

telegraf.launch();
```

# Rules
```typescript
import Router, { controller, action, ActionProps, Controller } from "telegraf-controllers";
import Telegraf, { Markup } from 'telegraf';
import { TelegrafContext } from "telegraf/typings/context";

@controller('main')
class MainController extends Controller {
    @action()
    async actionDefault({ isRedirect, changeRoute }: ActionProps, ctx: TelegrafContext) {
        if (!isRedirect) {
            switch (ctx.message.text) {
                case 'Balance':
                    return await changeRoute('balance');
            }
        }

        ctx.reply('Hi\nRedirect: ' + (isRedirect ? 1 : 0), Markup.keyboard(['Balance']).resize().extra());
    }
}

@controller('balance')
class BalanceController extends Controller {
    addBalance: (userId: number, sum: number) => any;
    
    rulesController = [
        {
            rule: async ({ changeRoute, isRedirect }: ActionProps, ctx: TelegrafContext, user: any) => {
                return user.isUser;
            },
            onRuleError: async ({ changeRoute }: ActionProps, ctx: TelegrafContext, user: any) => {
                await ctx.reply('Permission denied');
                return await changeRoute('main');
            }
        }
    ];

    rulesActions = {
        'add': {
            rule: async ({ changeRoute, isRedirect }: ActionProps, ctx: TelegrafContext, user: any) => {
                return user.isAdmin;
            },
            onRuleError: async ({ changeRoute }: ActionProps, ctx: TelegrafContext, user: any) => {
                await ctx.reply('Permission denied');
                return await changeRoute('balance');
            }
        }
    };

    constructor(addBalance: (userId: number, sum: number) => any) {
        super();

        this.addBalance = addBalance;
    }

    @action()
    async actionBalance({ changeRoute, isRedirect }: ActionProps, ctx: any, user: any) {
        if (!isRedirect) {
            switch (ctx.message.text) {
                case 'Back':
                    return await changeRoute('main');
                case 'Add':
                    return await changeRoute('balance/add');
            }
        }

        ctx.reply(user.money + '\nRedirect: ' + (isRedirect ? 1 : 0), Markup.keyboard(['Add', 'Back']).resize().extra());
    }

    @action('add')
    async actionAdd({ changeRoute, isRedirect }: ActionProps, ctx: TelegrafContext, user: any) {
        if (!isRedirect) {
            if (!isRedirect) {
                switch (ctx.message.text) {
                    case 'Back':
                        return await changeRoute('balance');
                }
            }
            let sum = parseInt(ctx.message.text);
            if (!Number.isNaN(sum)) {
                await this.addBalance(user.id, sum);
                return await changeRoute('balance');
            }
        }

        ctx.reply('Enter sum:', Markup.keyboard(['Back']).resize().extra());
    }
}


async function updateUserBalance(userId: number, sum: number) {
    users[userId].money += sum;
}


let users = {};

async function updateUserRoute(route: string, routeData: any, userId: any) {
    users[userId].route = route;
    users[userId].routeData = routeData;
}

let router = new Router(
    [
        new MainController(),
        new BalanceController(updateUserBalance)
    ],
    updateUserRoute,
    [{
        rule: async ({ changeRoute, isRedirect }: ActionProps, ctx: TelegrafContext, user: any) => {
            return !user.isBanned;
        },
        onRuleError: async ({ changeRoute }: ActionProps, ctx: TelegrafContext, user: any) => {
            await ctx.reply('You are banned');
        }
    }],
    async ({ changeRoute }: ActionProps, ctx: TelegrafContext, user: any) => {
            await ctx.reply('Permission denied on router');
    }
]);

let telegraf = new Telegraf('<token>');

telegraf.on('text', async (ctx) => {
    if (!(ctx.from.id in users)) {
        users[ctx.from.id] = {
            id: ctx.from.id,
            isBanned: false,
            isUser: true,
            isAdmin: true,
            route: 'main',
            routeData: null,
            money: 0
        };
    }

    router.go(ctx.from.id, users[ctx.from.id].route, ctx, users[ctx.from.id]);
});

telegraf.launch();
```