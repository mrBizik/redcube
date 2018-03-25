import { Vector3 } from './matrix';
import { compileShader } from './utils';
import { Camera } from './objects';
import { SSAO } from './postprocessors/ssao';
import { Bloom } from './postprocessors/bloom';
import { PostProcessor } from './postprocessors/base';

import quadShader from './shaders/quad.glsl';
import bloomShader from './shaders/bloom.glsl';

let gl;
let screenTextureCount = 1;

interface Texture extends WebGLTexture {
    index: number;
}

export class PostProcessing {
    screenTexture: Texture;
    normalTexture: Texture;
    depthTexture: Texture;
    positionTexture: Texture;
    camera: Camera;
    canvas: HTMLCanvasElement;
    framebuffer: WebGLFramebuffer;
    postprocessors: Array<PostProcessor>;
    VAO: WebGLBuffer;
    program: WebGLProgram;

    constructor() {
        this.postprocessors = [
            new SSAO,
            new Bloom
        ];
    }

    setCamera(camera) {
        this.camera = camera;
        this.postprocessors.forEach(postProcessor => {
            postProcessor.setCamera(camera);
        });
    }

    setGl(g) {
        gl = g;
        this.postprocessors.forEach(postProcessor => {
            postProcessor.setGL(gl);
        });
    }

    setCanvas(canvas) {
        this.canvas = canvas;
        this.postprocessors.forEach(postProcessor => {
            postProcessor.setCanvas(canvas);
        });
    }

    get width() {
        return this.canvas.offsetWidth;
    }

    get height() {
        return this.canvas.offsetHeight;
    }

    bindBuffer() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.screenTexture, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.normalTexture, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, this.positionTexture, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);
    }

    postProcessing() {
        gl.bindVertexArray(this.VAO);
        this.postprocessors.forEach(
            postProcessor => postProcessor.postProcessing(this.screenTexture, this.positionTexture, this.normalTexture, this.depthTexture)
        );

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.useProgram(this.program);

        this.postprocessors.forEach(postProcessor => {
            postProcessor.attachUniform(this.program);
        });

        gl.uniform1i( gl.getUniformLocation(this.program, 'uOriginal'), this.screenTexture.index);

        gl.drawArrays( gl.TRIANGLES, 0, 6 );
    }

    createTexture() {
        const texture = gl.createTexture();
        gl.activeTexture(gl[`TEXTURE${screenTextureCount}`]);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        texture.index = screenTextureCount;
        screenTextureCount++;
        
        return texture;
    }

    createMipmapTexture() {
        const texture = this.createTexture();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
        if (this.postprocessors.find(p => p instanceof Bloom) === undefined) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }

        return texture;
    }

    createDefaultTexture() {
        const texture = this.createTexture();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
        return texture;
    }

    createOneChannelTexture() {
        const texture = this.createTexture();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, this.width, this.height, 0, gl.RED, gl.UNSIGNED_BYTE, null);
        return texture;
    }

    createDepthTexture() {
        const texture = this.createTexture();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, this.width, this.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
        return texture;
    }

    createNoiceTexture(size, data) {
        const texture = this.createTexture();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB16F, size, size, 0, gl.RGB, gl.FLOAT, data);
        return texture;
    }

    buildScreenBuffer() {
        gl.getExtension('EXT_color_buffer_float');
        gl.getExtension('OES_texture_float_linear');

        const defines = this.postprocessors.map(postProcessor => postProcessor.buildScreenBuffer(this));
        const defineStr = defines.map(define => `#define ${define.name} ${define.value || 1}` + '\n').join('');

        const verts = [
            1.0, 1.0,
            -1.0, 1.0,
            -1.0, -1.0,
            -1.0, -1.0,
            1.0, -1.0,
            1.0, 1.0
        ];
        this.VAO = gl.createVertexArray();
        gl.bindVertexArray(this.VAO);
        const VBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
        
        this.framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

        this.screenTexture = this.createMipmapTexture();
        this.normalTexture = this.createDefaultTexture();
        this.depthTexture = this.createDepthTexture();
        this.positionTexture = this.createDefaultTexture();

        //const renderbuffer = gl.createRenderbuffer();
        //gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
        //gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.screenTexture, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.normalTexture, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, this.positionTexture, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
        //gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        this.program = gl.createProgram();
        compileShader(gl.VERTEX_SHADER, quadShader.replace(/\n/, `\n${ defineStr}`), this.program);
        compileShader(gl.FRAGMENT_SHADER, bloomShader.replace(/\n/, `\n${ defineStr}`), this.program);
        gl.linkProgram(this.program);

        return true;
    }
}
