let context;
var squareRotation = 0.0;

export default function start() {
	console.log('TestWebGL');
	const canvas = document.getElementById('canvas');
	context = canvas.getContext('webgl');
	if (!!context) {
		init();
	} else {
		alert('No WebGL support :[');
	}
}

function init() {
	context.clearColor(0.0, 0.0, 0.0, 1.0);
	context.clear(context.COLOR_BUFFER_BIT);

	const vsSource = `
    attribute vec4 aVertexPosition;
	attribute vec2 aTextureCoord;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

	varying highp vec2 vTextureCoord;

    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
		vTextureCoord = aTextureCoord;
    }
  `;

	const fsSource = `
	varying highp vec2 vTextureCoord;

    uniform sampler2D uSampler;

	void main() {
	    gl_FragColor = texture2D(uSampler, vTextureCoord);
	}
	`;

	const shaderProgram = initShaderProgram(context, vsSource, fsSource);

	programInfo = {
		program: shaderProgram,
		attribLocations: {
			vertexPosition: context.getAttribLocation(shaderProgram, 'aVertexPosition'),
			textureCoord: context.getAttribLocation(shaderProgram, 'aTextureCoord'),
		},
		uniformLocations: {
			projectionMatrix: context.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
			modelViewMatrix: context.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
			uSampler: context.getUniformLocation(shaderProgram, 'uSampler'),
		}
	};

	buffers = initBuffers(context);

	texture = loadTexture(context, 'res/grass_tile.png');

	requestAnimationFrame(render);
}

let programInfo;
let buffers;
let texture;

let then = 0.0;

function render(now) {
	now *= 0.001;
	const dt = now - then;
	then = now;

	drawScene(context, programInfo, buffers, dt);

	requestAnimationFrame(render);
}

function initShaderProgram(context, vsSource, fsSource) {
	const vertexShader = loadShader(context, context.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(context, context.FRAGMENT_SHADER, fsSource);

	const shaderProgram = context.createProgram();
	context.attachShader(shaderProgram, vertexShader);
	context.attachShader(shaderProgram, fragmentShader);
	context.linkProgram(shaderProgram);

	if (!context.getProgramParameter(shaderProgram, context.LINK_STATUS)) {
		alert('Unable to initialize the shader program: ' + context.getProgramInfoLog(shaderProgram));
		return null;
	}

    return shaderProgram;
}

function loadShader(context, type, source) {
	const shader = context.createShader(type);
	context.shaderSource(shader, source);
	context.compileShader(shader);

	if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
		alert('An error occurred compiling the shaders: ' + context.getShaderInfoLog(shader));
		context.deleteShader(shader);
		return null;
	}

	return shader;
}

function initBuffers(context) {
	const positionBuffer = context.createBuffer();

    context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);

    const positions = [
        -1.0,  1.0,
        1.0,  1.0,
    	-1.0, -1.0,
     	1.0, -1.0,
	];

    context.bufferData(context.ARRAY_BUFFER, new Float32Array(positions), context.STATIC_DRAW);

	const textureCoordinates = [
		0.0,  1.0,
	    1.0,  1.0,
	    0.0,  0.0,
	    1.0,  0.0,
    ];

	const textureCoordBuffer = context.createBuffer();
    context.bindBuffer(context.ARRAY_BUFFER, textureCoordBuffer);
	context.bufferData(context.ARRAY_BUFFER, new Float32Array(textureCoordinates), context.STATIC_DRAW);

    return {
        position: positionBuffer,
    	textureCoord: textureCoordBuffer,
    };
}

function drawScene(context, programInfo, buffers, dt) {
	context.clearColor(0.0, 0.0, 0.0, 1.0);
	context.clearDepth(1.0)
	context.enable(context.DEPTH_TEST);
	context.depthFunc(context.LEQUAL);

	context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);

	const fieldOfView = 45 * Math.PI / 180;
	const aspect = context.canvas.clientWidth / context.canvas.clientHeight;
	const zNear = 0.1;
	const zFar = 100.0;
	const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  	const modelViewMatrix = mat4.create();

	mat4.rotate(modelViewMatrix, modelViewMatrix, squareRotation, [0, 0, 1]);

  	mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);

  	{
    	const numComponents = 2;
    	const type = context.FLOAT;
    	const normalize = false;
    	const stride = 0;
		const offset = 0;
    	context.bindBuffer(context.ARRAY_BUFFER, buffers.position);
    	context.vertexAttribPointer(
        	programInfo.attribLocations.vertexPosition,
        	numComponents,
        	type,
        	normalize,
        	stride,
        	offset
		);
    	context.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  	}

	{
	    const numComponents = 2;
	    const type = context.FLOAT;
	    const normalize = false;
	    const stride = 0;
	    const offset = 0;
	    context.bindBuffer(context.ARRAY_BUFFER, buffers.textureCoord);
	    context.vertexAttribPointer(
	        programInfo.attribLocations.textureCoord,
	        numComponents,
	        type,
	        normalize,
	        stride,
	        offset
		);
	    context.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
  	}

    context.useProgram(programInfo.program);

    context.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    context.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

	context.activeTexture(context.TEXTURE0);

	context.bindTexture(context.TEXTURE_2D, texture);

	context.uniform1i(programInfo.uniformLocations.uSampler, 0);

    {
        const offset = 0;
        const vertexCount = 4;
        context.drawArrays(context.TRIANGLE_STRIP, offset, vertexCount);
    }

	squareRotation += dt;
}

function loadTexture(context, url) {
	const texture = context.createTexture();
	context.bindTexture(context.TEXTURE_2D, texture);

	const level = 0;
	const internalFormat = context.RGBA;
	const width = 1;
	const height = 1;
	const border = 0;
	const srcFormat = context.RGBA;
	const srcType = context.UNSIGNED_BYTE;
	const pixel = new Uint8Array([0, 0, 255, 255]);
	context.texImage2D(context.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);

	const image = new Image();
	image.onload = function() {
		context.bindTexture(context.TEXTURE_2D, texture);
		context.texImage2D(context.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);

		if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
			context.generateMipmap(context.TEXTURE_2D);
		} else {
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
		}

		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
	};
	image.src = url;

	return texture;
}

function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}
