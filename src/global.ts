import {Vec2} from "planck";
import {vec} from "./planck";

declare global {
    interface CanvasRenderingContext2D {
        closedPath(vertices: Vec2[]|number[][], color?: string): void
        fillPolygon(vertices: Vec2[]|number[][], color?: string): void
        strokePolygon(vertices: Vec2[]|number[][], color?: string): void
        text(text: string, pos: Vec2, scale: number, style?: string, align?: CanvasTextAlign, baseline?: CanvasTextBaseline, width?: number): void
        moveToVec(v: Vec2): void
        lineToVec(v: Vec2): void
        translateVec(v: Vec2): void
        fillCircle(v: Vec2, r: number, color?: string): void
        strokeCircle(v: Vec2, r: number): void
        fillSquare(v: Vec2, a: number): void
        fillSquare(v: Vec2, a: number, angle: number): void
        fillBox(v: Vec2, w: number, h: number, angle: number): void
        fillBox(v: Vec2, w: number, h: number): void
        fillBox(v: Vec2, a: number): void
        strokeBox(v: Vec2, w: number, h: number, angle: number): void
        strokeBox(v: Vec2, w: number, h: number): void
        strokeBox(v: Vec2, a: number): void
        fillTriangle(v: Vec2, a: number, angle: number): void
        fillTriangle(v: Vec2, a: number): void
        strokeTriangle(v: Vec2, a: number, angle: number): void
        strokeTriangle(v: Vec2, a: number): void
        triangle(v: Vec2, a: number, angle: number, fill: boolean): void
        line(a: Vec2, b: Vec2): void
        image(img: HTMLImageElement, pos: Vec2, angle: number, w: number, h?: number, scaleX?: number, scaleY?: number): void
    }

    interface Array<T> {
        last(): number
        sum(): number
        max(): number | undefined
        rnd(): T
    }

    interface Number {
        clamp(min: number, max: number): number
    }
}

CanvasRenderingContext2D.prototype.line = function(a: Vec2, b: Vec2) {
    this.beginPath()
    this.moveToVec(a)
    this.lineToVec(b)
    this.stroke()
}

CanvasRenderingContext2D.prototype.fillCircle = function(v: Vec2, r: number, color?: string) {
    if (color) {
        this.fillStyle = color
    }
    this.beginPath()
    this.arc(v.x, v.y, r, 0, 2*Math.PI)
    this.fill()
}

CanvasRenderingContext2D.prototype.strokeCircle = function(v: Vec2, r: number) {
    this.beginPath()
    this.arc(v.x, v.y, r, 0, 2*Math.PI)
    this.stroke()
}

CanvasRenderingContext2D.prototype.fillSquare = function(v: Vec2, a: number, angle: number = 0) {
    if (angle == 0) {
        this.fillRect(v.x - a/2, v.y - a/2, a, a)
    } else {
        this.save()
        this.translateVec(v)
        this.rotate(angle)
        this.fillRect(-a/2, -a/2, a, a)
        this.restore()
    }
}

CanvasRenderingContext2D.prototype.fillBox = function(v: Vec2, w: number, h: number = w, angle: number = 0) {
    if (angle === 0) {
        this.fillRect(v.x - w/2, v.y - h/2, w, h)
    } else {
        this.save()
        this.translateVec(v)
        this.rotate(angle)
        this.fillRect(-w/2, -h/2, w, h)
        this.restore()
    }
}

CanvasRenderingContext2D.prototype.strokeBox = function(v: Vec2, w: number, h: number = w, angle: number = 0) {
    if (angle === 0) {
        this.beginPath()
        this.rect(v.x - w/2, v.y - h/2, w, h)
        this.stroke()
    } else {
        this.save()
        this.translateVec(v)
        this.rotate(angle)
        this.beginPath()
        this.rect(-w/2, -h/2, w, h)
        this.stroke()
        this.restore()
    }
}

CanvasRenderingContext2D.prototype.moveToVec = function(v: Vec2) {
    this.moveTo(v.x, v.y)
}

CanvasRenderingContext2D.prototype.lineToVec = function(v: Vec2) {
    this.lineTo(v.x, v.y)
}

CanvasRenderingContext2D.prototype.translateVec = function(v: Vec2) {
    this.translate(v.x, v.y)
}

CanvasRenderingContext2D.prototype.closedPath = function(verts: Vec2[]|number[][]) {
    this.beginPath()
    if (verts[0] instanceof Vec2) {
        this.moveTo(verts[0].x, verts[0].y)
        for (let i = 1; i < verts.length; i++) {
            this.lineToVec(verts[i])
        }
    } else {
        this.moveTo(verts[0][0], verts[0][1])
        for (let i = 1; i < verts.length; i++) {
            this.lineTo(verts[i][0], verts[i][1])
        }
    }
    this.closePath()
    this.stroke()
}

CanvasRenderingContext2D.prototype.fillPolygon = function(verts: Vec2[]|number[][], color?: string) {
    if (verts.length == 0) return
    if (color) {
        this.fillStyle = color
    }
    this.beginPath()
    if (verts[0] instanceof Vec2) {
        this.moveTo(verts[0].x, verts[0].y)
        for (let i = 1; i<verts.length; i++) {
            this.lineToVec(verts[i])
        }
    } else {
        this.moveTo(verts[0][0], verts[0][1])
        for (let i = 1; i<verts.length; i++) {
            this.lineTo(verts[i][0], verts[i][1])
        }
    }
    this.closePath()
    this.fill()
}

CanvasRenderingContext2D.prototype.strokePolygon = function(verts: Vec2[]|number[][], color?: string) {
    if (verts.length == 0) return
    if (color) {
        this.strokeStyle = color
    }
    this.beginPath()
    if (verts[0] instanceof Vec2) {
        this.moveTo(verts[0].x, verts[0].y)
        for (let i = 1; i<verts.length; i++) {
            this.lineToVec(verts[i])
        }
    } else {
        this.moveTo(verts[0][0], verts[0][1])
        for (let i = 1; i<verts.length; i++) {
            this.lineTo(verts[i][0], verts[i][1])
        }
    }
    this.closePath()
    this.stroke()
}

CanvasRenderingContext2D.prototype.text = function(text: string, pos: Vec2, scale: number, style: string = 'white', align: CanvasTextAlign = 'center', baseline: CanvasTextBaseline = "middle", width?: number): void {
    this.save()
    this.resetTransform()
    this.translateVec(pos)
    this.scale(scale, scale)
    this.fillStyle = style
    this.textAlign = align
    this.textBaseline = baseline
    this.fillText(text, 0, 0, width)
    this.restore()
}

CanvasRenderingContext2D.prototype.fillTriangle = function(v: Vec2, a: number, angle: number = 0) {
    this.triangle(v, a, angle, true)
}

CanvasRenderingContext2D.prototype.strokeTriangle = function(v: Vec2, a: number, angle: number = 0) {
    this.triangle(v, a, angle, false)
}

CanvasRenderingContext2D.prototype.triangle = function(v: Vec2, a: number, angle: number, fill: boolean) {
    this.save()
    this.translateVec(v)
    let p = vec(0, a).rotRad(angle)
    this.beginPath()
    this.moveToVec(p)
    this.lineToVec(p.rotDeg(120))
    this.lineToVec(p.rotDeg(120))
    this.closePath()
    fill ? this.fill() : this.stroke()
    this.restore()
}

CanvasRenderingContext2D.prototype.image = function(img: HTMLImageElement, pos: Vec2, angle: number, w: number, h?: number, scaleX: number = 1, scaleY: number = 1): void {
    this.save()
    this.translateVec(pos)
    this.rotate(angle)
    this.scale(scaleX, -scaleY)
    h = h ?? (w * img.height / img.width)
    this.drawImage(img, -w/2, -h/2, w, h)
    this.restore()
}

Array.prototype.last = function() {
    return this.length - 1
}

Array.prototype.sum = function () {
    return this.reduce((a, b) => a + b, 0)
}

Array.prototype.max = function () {
    return this.reduce((a, b) => Math.max(a, b))
}

Array.prototype.rnd = function () {
    return this[Math.floor(Math.random()*this.length)]
}

Number.prototype.clamp = function(min: number, max: number): number {
    if (min > max) {
        [min, max] = [max, min]
    }
    if (this < min) {
        return min
    }
    if (this > max) {
        return max
    }
    return this.valueOf()
}

function repeat(count: number, fun: (i: number) => void) {
    for (let i = 0; i < count; i++) {
        fun(i)
    }
}

function repeat2(x: number, y: number, fun: (xi: number, yi: number) => void) {
    for (let xi = 0; xi < x; xi++) {
        for(let yi = 0;yi < y; yi++) {
            fun(xi, yi)
        }
    }
}

/**
 * Pozwala zapisać:
 * ```
 * let x = y.z ?? error('y.z is null')
 * ```
 */
function error(message: string): never {
    throw new Error(message);
}

export { repeat, repeat2, error }
