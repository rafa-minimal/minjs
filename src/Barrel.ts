import {Body, Circle} from "planck";
import {Engine, engine, Ent} from "./engine";
import {rndbox} from "./math";

export class Barrel extends Ent {
    body: Body

    constructor() {
        super()
        this.body = engine.world.createDynamicBody({
            position: rndbox(20, 20),
            fixedRotation: true,
            allowSleep: false,
            linearDamping: 4,
            userData: this
        })
        this.body.fixture({
            shape: Circle(0.5),
            filterCategoryBits: 1,
            filterMaskBits: 1,
            userData: this
        })
    }

    render(ctx: CanvasRenderingContext2D, engine: Engine) {
        ctx.save()
        ctx.shadowOffsetY = 10
        ctx.shadowOffsetX = 5
        ctx.shadowBlur = 10
        ctx.shadowColor = 'black'
        ctx.fillCircle(this.body.pos, 0.5, '#517e42')
        ctx.restore()
    }
}