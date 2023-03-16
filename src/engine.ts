import {
    Body,
    Contact,
    ContactImpulse,
    DistanceJoint,
    Edge,
    Fixture,
    Joint,
    Manifold,
    Polygon,
    RevoluteJoint,
    World
} from "planck"
import {BodyDef, Vec, vec} from './planck'
import {LowPassFilter, rnda, SmoothStep} from "./math";
import {error} from "./global";
import {Vec2} from "planck/dist/planck-with-testbed";

export class Ent {
    engine?: Ecs
    index?: number
    body?: Body
    z: number = 0
    dead = false
    dieAt: number

    constructor(dieAt: number = Number.MAX_VALUE) {
        this.dieAt = dieAt
    }

    update(engine: Engine, stepSec: number) {

    }

    render(ctx: CanvasRenderingContext2D, engine: Engine) {

    }

    beforeDie() {

    }

    die() {
        if (this.dead) {
            return
        }
        assert(this.engine !== undefined)
        assert(this.index !== undefined)
        this.engine.die(this)
        this.dead = true
    }

    beginContact(contact: Contact, other: Ent, thisFixture: Fixture, otherFixture: Fixture) {

    }

    endContact(contact: Contact, other: Ent, thisFixture: Fixture, otherFixture: Fixture) {

    }

    preSolve(contact: Contact, manifold: Manifold, other: Ent) {

    }

    postSolve(contact: Contact, impulse: ContactImpulse, other: Ent) {

    }
}

export class Ecs {
    ents: Ent[]
    dying: Ent[]
    zmap: ZetMap = new ZetMap()

    constructor() {
        this.ents = []
        this.dying = []
    }

    add<T extends Ent>(e: T): T {
        assert(e.engine === undefined)
        assert(e.index === undefined)
        e.engine = this
        e.index = this.ents.length
        this.ents.push(e)
        this.zmap.add(e)
        return e
    }

    remove(e: Ent) {
        assert(e.engine !== undefined)
        assert(e.index !== undefined)
        if (e === this.ents[this.ents.length - 1]) {
            this.ents.pop()
        } else {
            let last = this.ents.pop()!
            last.index = e.index
            this.ents.splice(e.index, 1, last)
        }
        e.body?.destroy()
        delete e.index
        delete e.engine
        this.zmap.remove(e)
    }

    die(e: Ent) {
        assert(e.engine !== undefined)
        assert(e.index !== undefined)
        this.dying.push(e)
    }

    letDie() {
        for (let e of this.dying) {
            e.beforeDie?.apply(e)
            this.remove(e)
        }
        this.dying = []
    }

    clear() {
        for (let e of this.ents) {
            e.body?.destroy()
            e.engine = undefined
            e.index = undefined
        }
        this.ents = []
        this.dying = []
        this.zmap = new ZetMap()
    }
}

export interface EngineConfig {
    canvas?: HTMLCanvasElement
    fullScreen?: boolean
    gravity?: Vec
}

export class Engine {
    ecs = new Ecs()
    ctx: CanvasRenderingContext2D
    gl?: WebGLRenderingContext
    bgColor: string | CanvasPattern | CanvasGradient = 'black'
    private _keyPrevious: any = {}
    private _key: any = {}
    private _onkeydown: MultiMap<string, (event: KeyboardEvent) => void | undefined> = new MultiMap()
    touch: Array<Vec | undefined> = []
    mouseScreenPos: Vec = vec()
    mouseOpenGlPos: Vec = vec()
    mouseDown: Boolean = false

    lastUpdateTimeMs = 0
    gameTimeSec = 0
    lastFpsUpdate: number
    fps = 0
    frameCount = 0

    scheduler = new Scheduler()

    maxStepSec = 1 / 30

    world: World
    worldStepInProgress = false
    base: Body
    camera = new Camera(0, 0, 20, 20)
    renderWorld = false
    pause = false
    step = false
    debugLines: string[] = []
    worldTimeScale = 1

    constructor(cfg: EngineConfig = {}) {
        let canvas = cfg.canvas ?? document.getElementById('canvas') as HTMLCanvasElement | undefined
        if (canvas === undefined)
            throw 'cfg.canvas is undefined and HTML element #canvas not found'
        this.ctx = canvas.getContext('2d') ?? error(`Failed to get 2d context from element ${canvas}`)

        let bottomCanvas = document.getElementById('bottom') as HTMLCanvasElement
        if (bottomCanvas) {
            this.gl = bottomCanvas.getContext('webgl') ?? error("Failed to get webgl context from element bottom")
        }

        let fullScreen = cfg.fullScreen ?? true
        if (fullScreen) {
            this.canvasFullScreen();
            window.addEventListener('resize', this.canvasFullScreen.bind(this));
        }
        canvas.addEventListener('keydown', this.keydown.bind(this))
        canvas.addEventListener('keyup', this.keyup.bind(this))
        canvas.addEventListener('touchstart', this.touchUpdate.bind(this))
        canvas.addEventListener('touchmove', this.touchUpdate.bind(this))
        canvas.addEventListener('touchend', this.touchEnd.bind(this))
        canvas.addEventListener('touchcancel', this.touchEnd.bind(this))
        canvas.addEventListener('mousemove', this.mouseMove.bind(this))
        canvas.addEventListener('mousedown', () => this.mouseDown = true)
        canvas.addEventListener('mouseup', () => this.mouseDown = false)
        canvas.focus()

        requestAnimationFrame(this.render.bind(this));
        this.lastFpsUpdate = Date.now()
        window.setInterval(this.fpsUpdate.bind(this), 1000)

        this.world = new World({
            gravity: cfg.gravity ?? vec()
        });
        this.base = this.world.createBody()

        this.world.on('begin-contact', (contact: Contact) => {
            let a = contact.getFixtureA().getUserData() as Ent
            let b = contact.getFixtureB().getUserData() as Ent
            if (a?.beginContact) {
                a.beginContact(contact, b, contact.getFixtureA(), contact.getFixtureB())
            }
            if (b?.beginContact) {
                b.beginContact(contact, a, contact.getFixtureB(), contact.getFixtureA())
            }
        })

        this.world.on('pre-solve', (contact, manifold) => {
            let a = contact.getFixtureA().getUserData() as Ent
            let b = contact.getFixtureB().getUserData() as Ent
            if (a?.preSolve) {
                a.preSolve(contact, manifold, b)
            }
            if (b?.preSolve) {
                b.preSolve(contact, manifold, a)
            }
        })

        this.world.on('post-solve', (contact, impulse) => {
            let a = contact.getFixtureA().getUserData() as Ent
            let b = contact.getFixtureB().getUserData() as Ent
            if (a?.postSolve) {
                a.postSolve(contact, impulse, b)
            }
            if (b?.postSolve) {
                b.postSolve(contact, impulse, a)
            }
        })

        this.world.on('end-contact', (contact: Contact) => {
            let a = contact.getFixtureA().getUserData() as Ent
            let b = contact.getFixtureB().getUserData() as Ent
            if (a?.endContact) {
                a.endContact(contact, b, contact.getFixtureA(), contact.getFixtureB())
            }
            if (b?.endContact) {
                b.endContact(contact, a, contact.getFixtureB(), contact.getFixtureA())
            }
        })
    }

    elapsedFrom(timeSec: number) {
        return this.gameTimeSec - timeSec
    }

    fpsUpdate() {
        let now = Date.now()
        this.fps = this.frameCount * 1000 / (now - this.lastFpsUpdate)
        this.lastFpsUpdate = now
        this.frameCount = 0
    }

    private keydown(e: KeyboardEvent) {
        // console.log("key pressed ", e)
        this._key[e.code] = true
        for (let callback of this._onkeydown.get(e.code)) {
            callback(e)
        }
    }

    /*
    Sześć stref, górna zaczyna się w 2/3 wysokości
    +-----------------------+
    | LU        .        RU |
    |-----------------------|
    | L /       .       \ B |
    | /  R      .      A  \ |
    +-----------------------+
     */

    touched(test: (x: number, y: number, w: number, h: number) => boolean): boolean {
        let w = this.ctx.canvas.width
        let h = this.ctx.canvas.height
        return this.touch.some((p) => p && test(p.x, p.y, w, h)) ||
            (this.mouseDown && test(this.mouseScreenPos.x, this.mouseScreenPos.y, w, h))
    }

    touchLeft(): boolean {
        return this.touched((x, y, w, h) => x < w / 2 && y < h * 2 / 3 && y > x)
    }

    touchLeftUp(): boolean {
        return this.touched((x, y, w, h) => x < w / 2 && y > h * 2 / 3)
    }

    touchRight(): boolean {
        return this.touched((x, y, w, h) => x < w / 2 && y < h * 2 / 3 && y <= x)
    }

    touchA(): boolean {
        return this.touched((x, y, w, h) => x > w / 2 && y < h * 2 / 3 && y > this.ctx.canvas.width - x)
    }

    touchB(): boolean {
        return this.touched((x, y, w, h) => x > w / 2 && y < h * 2 / 3 && y <= this.ctx.canvas.width - x)
    }

    touchLeftSide(): boolean {
        return this.touched((x, y, w, h) => x < w / 2)
    }

    touchRightSide(): boolean {
        return this.touched((x, y, w, h) => x > w / 2)
    }

    touchRightUp(): boolean {
        return this.touched((x, y, w, h) => x > w / 2 && y > h * 2 / 3)
    }

    onkeydown(key: string, action: (event: KeyboardEvent) => void) {
        this._onkeydown.add(key, action)
    }

    private keyup(e: KeyboardEvent) {
        this._key[e.code] = false
    }

    key(code: string): boolean {
        return this._key[code] ?? false
    }

    keyJustPressed(code: string): boolean {
        return (this._key[code] ?? false) && !(this._keyPrevious[code] ?? false)
    }

    touchUpdate(e: TouchEvent) {
        for (let touch of e.changedTouches) {
            this.touch[touch.identifier] = vec(touch.clientX, this.ctx.canvas.height - touch.clientY)
        }
        // simulate mouse on mobile
        this.mouseDown = this.touch[0] != undefined
        if (this.mouseDown) {
            this.mouseScreenPos = vec(e.changedTouches[0].clientX, this.ctx.canvas.height - e.changedTouches[0].clientY)
            this.mouseOpenGlPos = vec(this.mouseScreenPos.x / this.ctx.canvas.width * 2 - 1, this.mouseScreenPos.y / this.ctx.canvas.height * 2 - 1)
        }
    }

    touchEnd(e: TouchEvent) {
        for (let touch of e.changedTouches) {
            this.touch[touch.identifier] = undefined
        }
        this.mouseDown = this.touch[0] != undefined
    }

    mouseMove(e: MouseEvent) {
        this.mouseScreenPos = vec(e.clientX, this.ctx.canvas.height - e.clientY)
        this.mouseOpenGlPos = vec(this.mouseScreenPos.x / this.ctx.canvas.width * 2 - 1, this.mouseScreenPos.y / this.ctx.canvas.height * 2 - 1)
    }

    canvasFullScreen() {
        console.log("Resize, update canvas size", this.ctx.canvas)
        this.ctx.canvas.width = window.innerWidth;
        this.ctx.canvas.height = window.innerHeight;
        if (this.gl) {
            this.gl.canvas.width = window.innerWidth;
            this.gl.canvas.height = window.innerHeight;
            this.gl.viewport(0, 0, window.innerWidth, window.innerHeight);
        }
        this.onResize()
    }

    onResize() {
    }

    schedule(gameTimeSec: number, action: () => void) {
        this.scheduler.schedule(gameTimeSec, action)
    }

    /*
     * Defer action until next update (usually used to defer entity creation until after world step is finished)
     */
    defer(action: () => void) {
        this.scheduler.schedule(0, action)
    }

    delay(timeSec: number, action: () => void) {
        this.scheduler.schedule(this.gameTimeSec + timeSec, action)
    }

    add<T extends Ent>(ent: T): T {
        return this.ecs.add(ent)
    }

    render(timeMs: number) {
        if (this.pause) {
            if (this.step) {
                this.step = false
            } else {
                requestAnimationFrame(this.render.bind(this))
                return
            }
        }
        this.frameCount += 1
        requestAnimationFrame(this.render.bind(this))
        let rawStepSec = (timeMs - this.lastUpdateTimeMs) / 1000
        let stepSec = Math.min(rawStepSec, this.maxStepSec) * this.worldTimeScale
        // Jeśli chcemy nagrać film / gif, to warto ustawić stałą prędkość
        // let stepSec = 1 / 50
        if (stepSec !== 0) {
            this.clearScreen()
            this.worldStepInProgress = true
            this.world.step(stepSec)
            this.worldStepInProgress = false
            this.gameTimeSec += stepSec
            this.update(stepSec)
            this.ecs.ents.forEach((e) => {
                if (this.gameTimeSec >= e.dieAt) {
                    e.die()
                } else {
                    e.update(this, stepSec)
                }
            })
            if (this.gl) {
                this.camera.update(this.ctx, stepSec, 0)
                this.glRender(this.gl)
            }
            this.ecs.letDie()
            for (let [z, ents] of this.ecs.zmap) {
                this.camera.update(this.ctx, stepSec, z)
                for (let e of ents) {
                    e.render(this.ctx, this)
                }
            }
            // this.ecs.ents.forEach((e) => {
            //     e.render(this.ctx, this)
            // })
            this.scheduler.update(this.gameTimeSec)
            if (this.renderWorld) {
                this.doRenderWorld()
            }
            if (this.renderWorld) {
                this.printStats()
                this.printDebugLines()
            }
        } else {
            console.log("zero skipping frame")
        }
        this.lastUpdateTimeMs = timeMs
        this._keyPrevious = {...this._key}
    }

    glRender(gl: WebGLRenderingContext) {

    }

    update(stepSec: number) {

    }

    lineWidth = 1

    doRenderWorld() {
        let scale = this.camera.scale

        this.ctx.save()
        this.ctx.lineWidth = this.lineWidth / scale
        this.ctx.lineCap = 'round'
        this.ctx.fillStyle = 'red'

        for (let body = this.world.getBodyList(); body; body = body.getNext()) {
            let {x, y} = body.getPosition()
            this.ctx.save()
            // todo: Nie wygląda na to, żeby body przechodziło kiedykolwiek w stan uśpienia
            this.ctx.strokeStyle = body.isAwake() ? 'green' : 'grey'
            this.ctx.translate(x, y)
            this.ctx.rotate(body.getAngle())
            this.ctx.fillRect(-2 * this.lineWidth / scale, -2 * this.lineWidth / scale, 4 * this.lineWidth / scale, 4 * this.lineWidth / scale)
            for (let f = body.getFixtureList(); f; f = f.getNext()) {
                let shape = f.getShape()
                let vertices: Vec[]
                // a trick here, it applies for polygon and chain shapes
                vertices = (shape as unknown as Polygon).m_vertices;
                switch (shape.getType()) {
                    case "circle":
                        this.ctx.beginPath()
                        this.ctx.arc(0, 0, shape.getRadius(), 0, 2 * Math.PI)
                        this.ctx.lineTo(0, 0)
                        this.ctx.stroke()
                        break;
                    case "edge":
                        let edge = (shape as unknown as Edge)
                        vertices = [edge.m_vertex1, edge.m_vertex2]
                    case "polygon":
                    // a trick here, it would override edge vertices
                    // vertices = (shape as unknown as PolygonShape).m_vertices;
                    case "chain":
                        // a trick here, it would override edge vertices
                        // vertices = (shape as unknown as ChainShape).m_vertices;
                        this.ctx.beginPath();
                        for (let i = 0; i < vertices.length; ++i) {
                            const {x, y} = vertices[i]
                            if (i === 0)
                                this.ctx.moveTo(x, y)
                            else
                                this.ctx.lineTo(x, y)
                        }
                        this.ctx.closePath()
                        this.ctx.stroke()
                        break;
                }
            }
            this.ctx.restore()
        }
        for (let joint = this.world.getJointList(); joint != null; joint = joint.getNext()) {
            switch (joint.getType()) {
                case DistanceJoint.TYPE:
                    this.ctx.strokeStyle = 'yellow'
                    this.ctx.beginPath()
                    this.ctx.moveToVec(joint.getAnchorA())
                    this.ctx.lineToVec(joint.getAnchorB())
                    this.ctx.stroke()
                    break
                case RevoluteJoint.TYPE:
                    this.ctx.strokeStyle = 'blue'
                    this.ctx.beginPath()
                    this.ctx.moveToVec(joint.getBodyA().pos)
                    this.ctx.lineToVec(joint.getAnchorA())
                    this.ctx.lineToVec(joint.getAnchorB())
                    this.ctx.lineToVec(joint.getBodyB().pos)
                    this.ctx.stroke()
                    break
            }
        }
        this.ctx.restore()
    }

    clearScreen() {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.fillStyle = this.bgColor;
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }

    printDebugLines() {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.font = '10px sans-serif';
        this.ctx.strokeStyle = '#fff';
        this.ctx.fillStyle = '#fff';
        for (let [index, line] of this.debugLines.entries()) {
            this.ctx.fillText(line, 0, (index + 1) * 20)
        }
    }

    printStats() {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.font = '10px sans-serif';
        this.ctx.strokeStyle = '#fff';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`fps: ${Math.round(this.fps)}, ents: ${this.ecs.ents.length}, bodies: ${this.world.getBodyCount()}`, 5, this.ctx.canvas.height - 5);
        if (this.mouseDown) this.ctx.fillStyle = '#f00'; else this.ctx.fillStyle = '#fff';
        let mouseWorld = this.camera.screenToWorld(this.mouseScreenPos)
        this.ctx.fillText(`mouse: [${this.mouseScreenPos.x.toFixed(0)}, ${this.mouseScreenPos.y.toFixed(0)}]px, [${mouseWorld.x.toFixed(2)},${mouseWorld.y.toFixed(2)}]m`, 5, this.ctx.canvas.height - 25);
        this.ctx.fillStyle = '#fff'
        let touch = this.touch.map(t => {
            if (t) {
                return `[${t.x.toFixed(0)}, ${t.y.toFixed(0)}]`
            } else {
                return "[-]"
            }
        })
        this.ctx.fillText(`touch: ${touch.join(", ")}`, 5, this.ctx.canvas.height - 45);
    }

    body(def: BodyDef): Body {
        if (this.worldStepInProgress) {
            throw error("Trying to create a body while the world step is in progress")
        }
        def.type = def.type ?? "dynamic"
        return this.world.createBody(def)
    }

    distanceJoint(def: DistanceJointDef): Joint {
        if (this.worldStepInProgress) {
            throw error("Trying to create a joint while the world step is in progress")
        }
        let d = DistanceJoint({
                length: def.length,
                collideConnected: def.collideConnected,
                dampingRatio: def.dampingRatio,
                frequencyHz: def.frequencyHz
            }, def.bodyA, def.bodyB,
            def.bodyA.getWorldPoint(vec(0, 0)), def.bodyB.getWorldPoint(vec(0, 0)))
        return engine.world.createJoint(d as any as Joint) as Joint
    }
}

export interface DistanceJointDef {
    bodyA: Body
    bodyB: Body
    localAnchorA: Vec2
    localAnchorB: Vec2
    collideConnected: false,
    frequencyHz?: number
    dampingRatio?: number
    length?: number
}

export class Camera {
    d = 30

    mode: 'fill' | 'fit' = 'fit'

    // viewport, czyli współrzędne w układzie świata, które są widoczne na ekranie (widoczna szerokość to right - left)
    right = 0
    left = 0
    top = 0
    bottom = 0

    canvasWidth = 0
    canvasHeight = 0

    shakeFilter = new LowPassFilter(10, 1)
    shakeInput = 0
    angleFilter = new LowPassFilter(3, 1)
    angleInput = 0
    scale: number = 1
    zoom: number = 1;

    w: number
    h: number
    x: number
    y: number

    constructor(x: number = 0, y: number = 0, w: number = 1, h: number = w, mode: 'fill' | 'fit' = 'fit') {
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.mode = mode
    }

    // Allows multiple shakes in a single step
    shake(factor: number = 1) {
        this.shakeInput += factor
    }

    rotate(factor: number = 1) {
        this.angleInput += factor
    }

    update(ctx: CanvasRenderingContext2D, stepSec: number, z: number = 0) {
        this.canvasWidth = ctx.canvas.width
        this.canvasHeight = ctx.canvas.height

        let zFactor = (this.d + z) / this.d
        ctx.setTransform(1, 0, 0, -1, ctx.canvas.width / 2, ctx.canvas.height / 2)
        const scaleX = ctx.canvas.width / this.w / zFactor
        const scaleY = ctx.canvas.height / this.h / zFactor
        this.scale = this.mode == 'fit' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY)
        this.scale *= this.zoom
        this.right = this.x + ctx.canvas.width / 2 / this.scale
        this.left = this.x - ctx.canvas.width / 2 / this.scale
        this.top = this.y + ctx.canvas.height / 2 / this.scale
        this.bottom = this.y - ctx.canvas.height / 2 / this.scale
        ctx.scale(this.scale, this.scale)
        ctx.translate(-this.x, -this.y)

        // rotate
        let angle = this.angleFilter.update(this.angleInput, stepSec) * 0.8
        this.angleInput = 0
        ctx.rotate(angle)

        // shake
        let shake = this.shakeFilter.update(this.shakeInput, stepSec)
        this.shakeInput = 0
        ctx.translate(rnda(shake), rnda(shake))
    }

    // Screen coordinates in px ([0, 0] at left bottom) to world coordinates
    screenToWorld(screen: Vec): Vec {
        // todo: nie uwzględnia rotacji
        let scalex = 1 / (this.right - this.left)
        let scaley = 1 / (this.top - this.bottom)
        return vec((screen.x / this.canvasWidth - 0.5) / scalex + this.x, (screen.y / this.canvasHeight - 0.5) / scaley + this.y)
    }

    worldToScreen(world: Vec2): Vec2 {
        // todo: rotate
        let scalex = this.canvasWidth / (this.right - this.left)
        let scaley = this.canvasHeight / (this.top - this.bottom)
        let p = world.clone().sub(this.getPos())
        p.x *= scalex
        p.y *= scaley
        p.x += this.canvasWidth / 2
        p.y = (this.canvasHeight / 2 - p.y)
        return p
    }

    fill(w: number, h: number = w) {
        this.mode = 'fill'
        this.viewport(w, h)
    }

    fit(w: number, h: number = w) {
        this.mode = 'fit'
        this.viewport(w, h)
    }

    viewport(w: number, h: number = w) {
        this.w = w
        this.h = h
    }

    setPos(v: Vec) {
        this.x = v.x
        this.y = v.y
    }

    getPos() {
        return vec(this.x, this.y)
    }

    mat2() {
        // todo: brakuje rotacji
        // w openGL pozycja w zakresie [-1, 1], dlatego mnożymy razy 2 (scale x, scale y)
        return [2 / (this.right - this.left), 0.0, 0.0, 2 / (this.top - this.bottom)];
    }

    mat3() {
        // todo: brakuje rotacji
        let scalex = 1 / (this.right - this.left)
        let scaley = 1 / (this.top - this.bottom)
        return [scalex, 0.0, 0.0,
            0.0, scaley, 0.0,
            -this.x * scalex, -this.y * scaley, 1.0];
    }
}

export class SmoothCamera extends Camera {
    tw: SmoothStep
    th: SmoothStep
    tx: SmoothStep
    ty: SmoothStep

    constructor(x: number = 0, y: number = 0, w: number = 1, h: number = w, mode: 'fill' | 'fit' = 'fit') {
        super(x, y, w, h, mode)
        this.tx = new SmoothStep(1, x)
        this.ty = new SmoothStep(1, y)
        this.tw = new SmoothStep(1, w)
        this.th = new SmoothStep(1, h)
    }

    update(ctx: CanvasRenderingContext2D, stepSec: number, z: number = 0) {
        this.w = this.tw.update(stepSec)
        this.h = this.th.update(stepSec)
        this.x = this.tx.update(stepSec)
        this.y = this.ty.update(stepSec)

        super.update(ctx, stepSec, z);
    }

    viewport(w: number, h: number = w) {
        this.tw.target = w
        this.th.target = h
    }

    setPos(v: Vec) {
        this.tx.target = v.x
        this.ty.target = v.y
    }
}

function assert(cond: any): asserts cond {
    if (!cond) {
        throw Error("Assertion failed")
    }
}

class MultiMap<K, V> {
    map: Map<K, Array<V> | undefined> = new Map()

    add(key: K, value: V) {
        let list = this.map.get(key)
        if (list) {
            list.push(value)
        } else {
            this.map.set(key, [value])
        }
    }

    get(key: K) {
        return this.map.get(key) ?? []
    }

    keys(): IterableIterator<K> {
        return this.map.keys()
    }
}

class ZetMap implements Iterable<[number, Array<Ent>]> {
    map: Map<number, Array<Ent> | undefined> = new Map()
    ordered: Array<number> = []

    add(e: Ent) {
        let list = this.map.get(e.z)
        if (list) {
            list.push(e)
        } else {
            this.map.set(e.z, [e])
            this.ordered.push(e.z)
            // descending order: b-a
            this.ordered.sort((a, b) => b - a)
        }
    }

    remove(e: Ent) {
        let list = this.map.get(e.z)
        if (list) {
            let index = list.indexOf(e)
            if (index > -1) {
                list.splice(index, 1)
                if (list.length == 0) {
                    this.map.delete(e.z)
                    let zindex = this.ordered.indexOf(e.z)
                    if (zindex > -1) {
                        this.ordered.splice(zindex, 1)
                    }
                }
            } else {
                console.warn("Entity not found, z: ", e.z, ", entity: ", e, ", it was never added, or z value was changed in meantime")
            }
        } else {
            console.warn("z value not found: ", e.z, ", probably entity wasn't ever added to ZetMap, entity: ", e)
        }
    }

    * [Symbol.iterator](): Generator<[number, Array<Ent>]> {
        for (let z of this.ordered) {
            yield [z, this.map.get(z)!]
        }
    }
}

interface Event {
    gameTimeSec: number
    action: () => void
}

class Scheduler {
    scheduledEvents: Event[] = []

    schedule(gameTimeSec: number, action: () => void) {
        const event = {
            gameTimeSec: gameTimeSec,
            action: action
        };
        for (let i = 0; i < this.scheduledEvents.length; i++) {
            if (gameTimeSec < this.scheduledEvents[i].gameTimeSec) {
                this.scheduledEvents.splice(i, 0, event)
                return
            }
        }
        this.scheduledEvents.push(event)
    }

    update(gameTimeSec: number) {
        while (this.scheduledEvents.length > 0 && gameTimeSec >= this.scheduledEvents[0].gameTimeSec) {
            this.scheduledEvents.splice(0, 1)[0].action()
        }
    }
}

// Eksperymentalnie, globalny dostęp do silnika tak, żeby pomiędzy modułami można było używać klas, które potrzebują tego dostępu
export let engine: Engine

export function setEngine(e: Engine) {
    engine = e
}