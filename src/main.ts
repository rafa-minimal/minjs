import {Engine, EngineConfig, setEngine, SmoothCamera} from "./engine";
import {vec} from "./planck";
import {Player} from "./Player";
import {Barrel} from "./Barrel";
import {repeat} from "./global";


let canvas = document.getElementById('canvas') as HTMLCanvasElement

class Game extends Engine {
    viewport = 20

    camera = new SmoothCamera(0, 0, 20, 20)
    bgColor = '#6c6c6c'

    constructor(conf: EngineConfig) {
        super(conf)
        this.camera.fit(this.viewport)
        this.camera.setPos(vec(0, 0))
        this.onkeydown('KeyS', () => {this.step = true; console.log('tick')})
        this.onkeydown('KeyP', () => {this.pause = !this.pause; console.log('pause: ' + this.pause)})
        this.onkeydown('KeyD', () => { this.renderWorld = !this.renderWorld })
        this.onkeydown('KeyR', () => { this.init() })
    }

    onResize() {
    }

    init() {
        this.camera.zoom = 1
        this.ecs.clear()
        this.add(new Player())
        repeat(20, () => {

            this.add(new Barrel())
        })
    }

    render(timeMs: number) {
        super.render(timeMs);
    }

    update(stepSec: number) {
        super.update(stepSec);
    }

    glRender(gl: WebGLRenderingContext) {
    }
}

let game = new Game({
    canvas: canvas,
    fullScreen: true,
    gravity: vec(0, 0)
})
setEngine(game)
game.init()
