# RedCube.js

A javascript library for rendering webgl. RedCube is a minimalistic viewer used [Khronos glTF 1.0 format](https://github.com/KhronosGroup/glTF).

## Install
```
npm install redcube.js
```

## Features

&bull; Create 3D model in Blender and others, then render it in Browser;

&bull; No dependencies;

&bull; Small file size [34 kb];

&bull; Support textures, transform animation, skinned animation.

## How to convert 3D model to gltf

&bull; [COLLADA2GLTF](https://github.com/KhronosGroup/COLLADA2GLTF/) - Command-line tool to convert COLLADA to glTF

## Usage

[Demo](https://reon90.github.io/redcube/examples/index.html)

```js
const canvas = document.querySelector('canvas');
const renderer = new RedCube('./box.gltf', canvas);
renderer.init()
    .then(() => {
        console.log('loaded');
    });
```
