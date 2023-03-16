import {Vec2} from "planck";
import {vec} from "./planck";
import Color from "color";

let pi = Math.PI

// copy paste from: https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
export function sfc32(a: number, b: number, c: number, d: number) {
    return function() {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        var t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

let random = Math.random

export function seed(x: number) {
    random = sfc32(x, x, x, x)
}

/**
 * Random between a, b. Order doesn't matter, [0..a) if b omitted
 * ```
 * rnd(10)          0..10
 * rnd(2, 5)        2..5
 * rnd(5, 2)        5..2
 * ```
 */
function rnd(a: number, b: number = 0) {
    return random() * (b - a) + a
}

/**
 * Random integer [a, b). Order doesn't matter, [0..a) if b omitted
 * ```
 * rndi(10)          0..9
 * rndi(2, 5)        2..4
 * rndi(5, 2)        2..4
 * ```
 */
function rndi(a: number, b: number = 0) {
    return Math.floor(random() * (b - a) + a)
}

/**
 * Random between -a, a
 */
function rnda(a: number): number {
    return random() * 2 * a - a
}

/**
 * Random vector of length [a, b], or [0, a] if b omitted
 */
function rndv(a: number, b: number = 0): Vec2 {
    return vec(rnd(a, b), 0).rotRad(rnda(pi))
}

/**
 * Random vector of length r (or [r, r2])
 */
function rndring(r: number, r2?: number): Vec2 {
    if (r2) {
        return vec(rnd(r, r2), 0).rotRad(rnda(pi))
    } else {
        return vec(r, 0).rotRad(rnda(pi))
    }
}

/**
 * Random vector of length [0, r]
 */
function rndball(r: number): Vec2 {
    return vec(rnd(r), 0).rotRad(rnda(pi))
}

/**
 * Random vector in box (rectangle) of a, b, square of a if b omitted
 */
function rndbox(a: number, b: number = a): Vec2 {
    return vec(rnda(a/2), rnda(b/2))
}

/**
 * Random error around a, rnderr(1, 0.2) is same as rnd(0.8, 1.2)
 */
function rnderr(a: number, error: number): number {
    return rnd(a * (1 - error), a * (1 + error))
}

/**
 * Linearly interpolate between a and b, where t is in [0, 1].
 * Equivalent of mix() in OpenGL shading language.
 */
function mix(a: number, b: number, t: number): number {
    return a + t * (b - a)
}

/**
 * Mix color between a and b, where t is in [0, 1].
 */
function mixColor(a: Color, b: Color, t: number): Color {
    return Color.rgb(
        mix(a.red(), b.red(), t),
        mix(a.green(), b.green(), t),
        mix(a.blue(), b.blue(), t),
    )
}

function interpolate(x: number, points: number[]): number {
    let count = points.length
    if (x <= points[0]) {
        return points[1]
    } else if (x >= points[count - 2]) {
        return points[count - 1]
    } else {
        let i = 0
        while(points[i * 2] < x) {
            i++
        }
        let x0 = points[(i-1)*2]
        let y0 = points[(i-1)*2 + 1]
        let x1 = points[i*2]
        let y1 = points[i*2 + 1]
        return y0 * (1 - (x - x0)/(x1 - x0)) + y1 * (x - x0)/(x1 - x0)
    }
}

interface Filter {
    update(input: number, timeStep: number): number
}

class SpringDamper implements Filter {
    // Taki wyimaginowany układ, położenie wraca asymptotycznie do zera, wejście to siła (impuls), który wytrąca położenie
    x: number
    private c: number
    private d: number

    constructor(c: number = 0.1, d: number = 1, init: number = 0) {
        this.c = c
        this.d = d
        this.x = init
    }

    update(input: number, timeStep: number) {
        this.x = this.x + this.d * input - timeStep * this.c * this.x
        return this.x
    }


    toString() {
        return `SpringDamper(c: ${this.c}, d: ${this.d})`
    }
}

class LowPassFilter implements Filter {
    // https://en.wikipedia.org/wiki/Low-pass_filter
    x: number
    alpha: number
    gain: number

    /**
     * @param alpha smoothing factor, powinien być w przedziale [0, 1], ale mamy duży timeStep, więc można większe
     * Im większe alpha, tym szybciej dojdzie do wartości input. Wynik po jednej sekundzie, zakładając step 0.016s:
     * alpha = 0.5 -> 0.38
     * alpha = 1   -> 0.62
     * alpha = 2   -> 0.85
     * alpha = 3   -> 0.94
     */
    constructor(alpha: number = 1, gain: number = 1, x: number = 0) {
        this.x = x
        this.alpha = alpha
        this.gain = gain
    }

    update(input: number, timeStep: number): number {
        this.x = this.x + this.alpha * (this.gain * input - this.x) * timeStep
        return this.x
    }

    toString() {
        return `LowPassFilter(alpha: ${this.alpha})`
    }
}

class SmoothStep {
    x: number
    target: number
    alpha: number

    /*
    @param alpha smoothing factor, powinien być w przedziale [0, 1], ale mamy duży timeStep, więc można większe
     */
    constructor(alpha: number = 1, x: number = 0) {
        this.x = x
        this.target = x
        this.alpha = alpha
    }

    update(timeStep: number): number {
        this.x = this.x + this.alpha * (this.target - this.x) * timeStep
        return this.x
    }

    toString() {
        return `LowPassFilter(alpha: ${this.alpha})`
    }
}

class MovingAverage {
    values: number[]
    size: number
    sum: number

    constructor(size: number) {
        this.values = [];
        this.size = size;
        this.sum = 0;
    }

    push(value: number) {
        while (this.values.length >= this.size) {
            this.sum -= this.values.pop()!;
        }
        this.sum += value;
        this.values.push(value);
    }

    get() {
        return this.sum / this.values.length
    }
}

export {pi, rnd, rndi, rnda, rndv, rndring, rndball, rndbox, rnderr, mix, mixColor, MovingAverage, SpringDamper, LowPassFilter, SmoothStep, interpolate}