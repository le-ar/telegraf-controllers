export function action(name: string = 'default') {
    return (target: any, key: string, value: any) => {
        if (typeof target.actions === 'undefined') {
            target.actions = {};
        }

        target.actions[name] = value.value;
    }
}

export function controller(name: string) {
    let getAllActions = (actions: any, prototype: any) => {
        Object.assign(actions, prototype.actions);

        if (prototype === Controller.prototype) {
            return;
        }
    }

    return (constructor: any) => {
        var original = constructor;

        function construct(constructor: any, ...args: any[]) {
            var c: any = function () {
                return constructor.bind(this, ...args);
            }
            c.prototype = constructor.prototype;
            return new new c()();
        }

        var f: any = function (...args: any[]) {
            let actions = {};

            getAllActions(actions, constructor.prototype);

            let obj = construct(original, ...args);

            obj.name = name;
            obj.actions = actions;

            return obj;
        }

        f.prototype = original.prototype;

        return f;
    }
}

export type ActionProps = {
    route: string;
    isRedirect: boolean;
    changeRoute: (route: string, routeData?: any) => Promise<any>;
}

export type Rule = {
    rule: (props: ActionProps, ...args: any[]) => Promise<boolean>,
    onRuleError?: (props: ActionProps, ...args: any[]) => Promise<any>
};

export class Controller {
    name: string;
    actions: { [key: string]: ((props: ActionProps) => Promise<any>) };

    onRulesError: ((props: ActionProps, ...args: any[]) => Promise<any>) | null = null;
    rulesController: Rule[] = [];
    rulesActions: { [key: string]: Rule[] } = {};

    async routing(props: ActionProps, onRulesErrorRouter: ((props: ActionProps, ...args: any[]) => Promise<any>) | null, ...args: any[]) {
        let action = 'default';
        let splittedRoute = props.route.split('/');
        if (splittedRoute.length > 1) {
            if (this.actions.hasOwnProperty(splittedRoute[1])) {
                action = splittedRoute[1];
            }
        }

        if (this.actions.hasOwnProperty(action)) {
            if (this.rulesActions.hasOwnProperty(action)) {
                for (let rule of this.rulesActions[action]) {
                    if (! await rule.rule({ route: props.route, changeRoute: props.changeRoute, isRedirect: props.isRedirect }, ...args)) {
                        if (typeof rule.onRuleError !== 'undefined') {
                            return await rule.onRuleError({ route: props.route, changeRoute: props.changeRoute, isRedirect: props.isRedirect }, ...args);
                        }
                        if (this.onRulesError !== null) {
                            return await this.onRulesError({ route: props.route, changeRoute: props.changeRoute, isRedirect: props.isRedirect }, ...args);
                        }
                        if (onRulesErrorRouter !== null) {
                            return await onRulesErrorRouter({ route: props.route, changeRoute: props.changeRoute, isRedirect: props.isRedirect }, ...args);
                        }
                        return;
                    }
                }
            }

            return await this.actions[action].apply(this, [props, ...args]);
        }

        throw new Error(`Action ${props.route} not found`);
    }
}

export default class Router {
    private controllers: { [key: string]: Controller };
    private updateUserRoute: (route: string, routeData: any, userId: any) => Promise<any>;
    private onRulesError: ((props: ActionProps, ...args: any[]) => Promise<any>) | null = null;

    rulesRouter: Rule[] = [];

    constructor(
        controllers: Controller[] = [],
        updateUserRoute: (route: string, routeData: any, userId: any) => Promise<any>,
        rulesRouter: Rule[] = [],
        onRulesError?: (props: ActionProps, ...args: any[]) => Promise<any>,
    ) {
        if (typeof onRulesError !== 'undefined') {
            this.onRulesError = onRulesError;
        }
        this.rulesRouter = rulesRouter;
        this.controllers = controllers.reduce((acc, val) => Object.assign(acc, { [val.name]: val }), {});
        this.updateUserRoute = updateUserRoute;
    }

    async go(userId: any, route: string, ...args: any[]) {
        return await this.route(userId, route, false, ...args);
    }

    private async route(userId: any, route: string, isRedirect: boolean, ...args: any[]) {
        let changeRoute = this.generateChangeRoute(userId, ...args);

        for (let rule of this.rulesRouter) {
            if (! await rule.rule({ route, changeRoute, isRedirect }, ...args)) {
                if (typeof rule.onRuleError !== 'undefined') {
                    return await rule.onRuleError({ route, changeRoute, isRedirect }, ...args);
                }
                if (this.onRulesError !== null) {
                    return await this.onRulesError({ route, changeRoute, isRedirect }, ...args);
                }
                return;
            }
        }

        let controllerName = route.split('/')[0];
        if (this.controllers.hasOwnProperty(controllerName)) {
            let controller = this.controllers[controllerName];

            for (let rule of controller.rulesController) {
                if (! await rule.rule({ route, changeRoute, isRedirect }, ...args)) {
                    if (typeof rule.onRuleError !== 'undefined') {
                        return await rule.onRuleError({ route, changeRoute, isRedirect }, ...args);
                    }
                    if (controller.onRulesError !== null) {
                        return await controller.onRulesError({ route, changeRoute, isRedirect }, ...args);
                    }
                    if (this.onRulesError !== null) {
                        return await this.onRulesError({ route, changeRoute, isRedirect }, ...args);
                    }
                    return;
                }
            }

            return await controller.routing({ route, changeRoute, isRedirect }, this.onRulesError, ...args)
        }

        throw new Error(`Controller ${controllerName} not found`);
    }

    private generateChangeRoute(userId: any, ...args: any[]) {
        return async (route: string, routeData?: any) => {
            let newRouteData = null;
            if (typeof routeData !== 'undefined') {
                newRouteData = routeData;
            }

            await this.updateUserRoute(route, newRouteData, userId);
            return await this.route.call(this, userId, route, true, ...args);
        }
    }
}