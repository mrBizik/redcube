import { Camera } from '../objects';

export abstract class PostProcessor {
    canvas: HTMLCanvasElement;
    camera: Camera;
    abstract postProcessing(screenTexture, positionTexture, normalTexture, depthTexture)
    abstract buildScreenBuffer(pp)
    abstract setGL(gl)
    abstract attachUniform(program)
    setCanvas(canvas) {
        this.canvas = canvas;
    }
    setCamera(camera) {
        this.camera = camera;
    }
    get width() {
        return this.canvas.offsetWidth;
    }
    get height() {
        return this.canvas.offsetHeight;
    } 
}