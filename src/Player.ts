import {Engine, engine, Ent} from "./engine";
import {vec} from "./planck";
import {Body, Circle} from "planck";

export class Player extends Ent {
    body: Body

    forceP = 20
    speed = 12
    mass: number
    inertia: number

    constructor() {
        super()
        this.body = engine.world.createDynamicBody({
            position: vec(0, 0),
            fixedRotation: true,
            allowSleep: false,
            linearDamping: 0.5,
            angularDamping: 0.3,
            userData: this
        })
        this.body.fixture({
            shape: Circle(0.5),
            filterCategoryBits: 1,
            filterMaskBits: 1,
            userData: this
        })
        this.mass = this.body.getMass()
        this.inertia = this.body.getInertia()
    }
    update(game: Engine, deltaSec: number) {
        // speed
        let vx = (Number(game.key("ArrowRight")) - Number(game.key("ArrowLeft")))
        let vy = (Number(game.key("ArrowUp")) - Number(game.key("ArrowDown")))
        let f = vec(vx, vy).mul(this.speed).sub(this.body.vel).mul(this.forceP * this.mass)

        // y control

        // apply force
        this.body.applyForceToCenter(f.mul(this.mass), true)
    }

    render(ctx: CanvasRenderingContext2D) {
        ctx.save()
        ctx.shadowOffsetY = 10
        ctx.shadowOffsetX = 5
        ctx.shadowColor = 'black'
        ctx.shadowBlur = 10
        ctx.fillCircle(this.body.pos, 0.5, '#b96767')
        ctx.restore()
    }
}