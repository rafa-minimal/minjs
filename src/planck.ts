import {Body, Box, Chain, Circle, Edge, Fixture, FixtureDef, Polygon, Vec2 as Vec, Vec2, Vec3} from 'planck'
import {rnda} from "./math";

let cos = Math.cos
let sin = Math.sin
let pi = Math.PI

interface FixtureDefinition {
    shape: Edge | Circle | Polygon | Chain | Box;
    userData?: any;
    friction?: number;
    restitution?: number;
    density?: number;
    isSensor?: boolean;
    filterGroupIndex?: number;
    filterCategoryBits?: number;
    filterMaskBits?: number;
}

// Musiałem tutaj powtórzyć definicję BodyType i BodyDef z planck'a, bo tamte nie zostały wyeksportowane
type BodyType = "static" | "kinematic" | "dynamic";

interface BodyDef {
    type?: BodyType;
    position?: Vec2;
    angle?: number;
    linearVelocity?: Vec2;
    angularVelocity?: number;
    linearDamping?: number;
    angularDamping?: number;
    fixedRotation?: boolean;
    bullet?: boolean;
    gravityScale?: number;
    allowSleep?: boolean;
    awake?: boolean;
    active?: boolean;
    userData?: any;
}

declare module 'planck' {
    interface Body {
        fixture(def: FixtureDefinition): Fixture
        edge(v1: Vec, v2: Vec): Fixture
        ball(r: number): Fixture
        destroy(): void
        pos: Vec
        x: number
        y: number
        vel: Vec
        angle: number
        omega: number
    }
    // Planck nie eksportuje swojej definicji ContactImpulse
    interface ContactImpulse {
        normalImpulses: number[];
        tangentImpulses: number[];
    }
    interface Vec2 {
        rotDeg(angleDeg: number): Vec2
        rotRad(angleRad: number): Vec2
        rnd(ratio: number): Vec2
        rndDeg(deg?: number): Vec2
        sub(other: Vec2): Vec2
        normal(): Vec2
        array(): number[]
        angleRad(): number
        angleDeg(): number
        vec3(z: number): Vec3
    }
    interface Vec3 {
        clone(): Vec3
        normal(): Vec3
        length(): number
        cross(b: Vec3): Vec3
        dot(b: Vec3): number
        xy(): Vec2
    }
}

Vec2.prototype.rotDeg = function(angleDeg: number): Vec2 {
    return this.rotRad(angleDeg / 180 * pi)
}

Vec2.prototype.rotRad = function(a: number): Vec2 {
    let x = cos(a)*this.x - sin(a)*this.y
    let y = sin(a)*this.x + cos(a)*this.y
    this.x = x
    this.y = y
    return this
}

/**
 * Randomize vectors length. Multiply by 1 + [-ratio, ratio]
 * @param ratio
 */
Vec2.prototype.rnd = function(ratio: number): Vec2 {
    return this.mul(1 + rnda(ratio))
}

/**
 * Randomize vector by +-deg. Rotate vector by random degrees in [-deg, deg], 180deg by default
 * @param deg
 */
Vec2.prototype.rndDeg = function(deg: number): Vec2 {
    deg = deg ?? 180
    return this.rotDeg(rnda(deg))
}

Vec2.prototype.sub = function(other: Vec2) {
    return this.addMul(-1, other)
}

/**
 * Normalize vector returning this.
 * Note the original normalize function returns length, thus this additional function
 */
Vec2.prototype.normal = function() {
    this.normalize()
    return this
}

/**
 * Destructure to [x, y] array
 */
Vec2.prototype.array = function() {
    return [this.x, this.y]
}

/**
 * Angle of vector in radians
 */
Vec2.prototype.angleRad = function() {
    return Math.atan2(this.y, this.x)
}

/**
 * Angle of vector in degrees
 */
Vec2.prototype.angleDeg = function() {
    return Math.atan2(this.y, this.x) * 180 / Math.PI
}

Vec2.prototype.vec3 = function(z: number) {
    return Vec3(this.x, this.y, z)
}

Vec2.prototype.toString = function () {
    return this.x.toFixed(2) + ", " + this.y.toFixed(2)
}

Vec3.prototype.clone = function() {
    return Vec3(this.x, this.y, this.z)
}

Vec3.prototype.length = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
}

/**
 * Normalize vector returning this.
 */
Vec3.prototype.normal = function() {
    const length = this.length();
    const epsilon = 1e-9
    if (length < epsilon) {
        return Vec3();
    }
    this.x /= length;
    this.y /= length;
    this.z /= length;
    return this
}

Vec3.prototype.cross = function(b: Vec3) {
    const a = this
    return Vec3(
        a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x
    )
}

Vec3.prototype.dot = function(b: Vec3) {
    const a = this
    return a.x * b.x + a.y * b.y + a.z * b.z
}

Vec3.prototype.toString = function () {
    return this.x.toFixed(2) + ", " + this.y.toFixed(2) + ", " + this.z.toFixed(2)
}

Vec3.prototype.xy = function () {
    return Vec2(this.x, this.y)
}

Body.prototype.fixture = function(def: FixtureDefinition) {
    return this.createFixture({
        shape: def.shape,
        userData : def.userData ??= null,
        friction : def.friction ??= 0.0,
        restitution : def.restitution ??= 0.0,
        density : def.density ??= 1.0,
        isSensor : def.isSensor ??= false,

        filterGroupIndex : def.filterGroupIndex ??= 0,
        filterCategoryBits : def.filterCategoryBits ??= 0x0001,
        filterMaskBits : def.filterMaskBits ??= 0xFFFF
    } as unknown as FixtureDef)
}

Body.prototype.edge = function(v1: Vec, v2: Vec): Fixture {
    return this.fixture({
        shape: Edge(v1, v2)
    })
}

Body.prototype.ball = function(r: number): Fixture {
    return this.fixture({
        shape: Circle(r)
    })
}

Body.prototype.destroy = function() {
    this.m_world.destroyBody(this)
}

Object.defineProperty(Body.prototype, 'pos', { get: function() { return this.getPosition() } })
Object.defineProperty(Body.prototype, 'x', { get: function() { return this.getPosition().x } })
Object.defineProperty(Body.prototype, 'y', { get: function() { return this.getPosition().y } })
Object.defineProperty(Body.prototype, 'vel', { get: function() { return this.getLinearVelocity() } })
Object.defineProperty(Body.prototype, 'angle', { get: function() { return this.getAngle() } })
Object.defineProperty(Body.prototype, 'omega', { get: function() { return this.getAngularVelocity() } })

// Musiałem rozdzielić Vec typ, vec - funkcja, bo inaczej rozszerzanie (augmentation) przykrywało funkcję
function vec(x: number = 0, y: number = 0): Vec {
    return new Vec(x, y)
}

export { Vec, vec, BodyType, BodyDef }