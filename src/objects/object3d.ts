import { Matrix4, Vector3 } from '../matrix';

export class Object3D {
    uuid: number;
    name: string;
    id: string;
    children: Array<Object3D>;
    matrix: Matrix4;
    matrixWorld: Matrix4;
    parent: Object3D;
    reflow: boolean;

    constructor(name, parent) {
        this.uuid = Math.floor(Date.now() * Math.random());
        this.name = name;
        this.children = [];
        this.matrix = new Matrix4();
        this.matrixWorld = new Matrix4();
        this.parent = parent;
    }

    getPosition() {
        return new Float32Array([this.matrixWorld.elements[12], this.matrixWorld.elements[13], this.matrixWorld.elements[14]]);
    }

    setPosition(translation, rotation, scale) {
        if (rotation) {
            this.matrix.makeRotationFromQuaternion(rotation);
        }
        if (scale) {
            this.matrix.scale(new Vector3(scale));
        }
        if (translation) {
            this.matrix.setTranslate(new Vector3(translation));
        }
    }

    setMatrix(matrix) {
        this.matrix.set(matrix);
    }

    setMatrixWorld(matrix) {
        this.matrixWorld.set(matrix);
    }

    updateMatrix() {
        const m = new Matrix4();
        m.multiply(this.parent.matrixWorld);
        m.multiply(this.matrix);
        this.setMatrixWorld(m.elements);
    }
}
