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

        function construct(constructor: any, args: any[]) {
            var c: any = function () {
                return constructor.bind(this, args);
            }
            c.prototype = constructor.prototype;
            return new new c()();
        }

        var f: any = function (...args: any[]) {
            let actions = {};

            getAllActions(actions, constructor.prototype);

            let obj = construct(original, args);

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

export class Controller {
    name: string;
    actions: { [key: string]: ((props: ActionProps) => Promise<any>) }

    async routing(props: ActionProps, ...args: any[]) {
        let action = 'default';
        let splittedRoute = props.route.split('/');
        if (splittedRoute.length > 1) {
            if (this.actions.hasOwnProperty(splittedRoute[1])) {
                action = splittedRoute[1];
            }
        }

        if (this.actions.hasOwnProperty(action)) {
            return await this.actions[action].apply(this, [props, ...args]);
        }

        throw new Error(`Action ${props.route} not found`);
    }
}

export default class Router {
    controllers: { [key: string]: Controller };
    updateUserRoute: (route: string, routeData: any, userId: any) => Promise<any>;

    constructor(controllers: Controller[] = [], updateUserRoute: (route: string, routeData: any, userId: any) => Promise<any>) {
        this.controllers = controllers.reduce((acc, val) => Object.assign(acc, { [val.name]: val }), {});
        this.updateUserRoute = updateUserRoute;
    }

    async route(userId: any, route: string, isRedirect: boolean, ...args: any[]) {
        let controller = route.split('/')[0];
        if (this.controllers.hasOwnProperty(controller)) {
            return await this.controllers[controller].routing({ route, changeRoute: this.generateChangeRoute(userId, ...args), isRedirect }, ...args)
        }

        throw new Error(`Controller ${controller} not found`);
    }

    generateChangeRoute(userId: any, ...args: any[]) {
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