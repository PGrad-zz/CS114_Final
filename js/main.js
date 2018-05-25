function getGLContext() {
	const canvas = document.querySelector("#glCanvas");
	if(!canvas) {
		console.log("Error getting canvas");
		return undefined;
	}
	return canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
}

function initShaderProgram(gl, vsSrc, fsSrc) {
	const vShader = loadShader(gl, gl.VERTEX_SHADER, vsSrc);
	const fShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSrc);

	if(!vShader || !fShader)
		return null;

	const shaderProg = gl.createProgram();
	gl.attachShader(shaderProg, vShader);
	gl.attachShader(shaderProg, fShader);
	gl.linkProgram(shaderProg);

	if(!gl.getProgramParameter(shaderProg, gl.LINK_STATUS)) {
		console.log("Cannot init shader program" + gl.getProgramInfoLog(shaderProg));
		gl.deleteProgram(shaderProg);
		return null;
	}

	return shaderProg;
}

function loadShader(gl, type, src) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, src);
	gl.compileShader(shader);

	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.log(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}

function getProgramInfo(gl, shaderProg) {
	return {
		program: shaderProg,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProg, 'aVtxPos')
		},
		uniformLocations: {
			projMatrix: gl.getUniformLocation(shaderProg, 'uProj'),
			mvMatrix: gl.getUniformLocation(shaderProg, 'uMV'),
			cameraPosition: gl.getUniformLocation(shaderProg, 'cameraPos'),
			focalLength: gl.getUniformLocation(shaderProg, "focalLength"),
			windowSize: gl.getUniformLocation(shaderProg, "windowSize"),
		}
	};
}

function initBuffers(gl) {
	const posBuf = gl.createBuffer();
	const indexBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

	const plane = createPlane();

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(plane.vertices), gl.STATIC_DRAW);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(plane.indices), gl.STATIC_DRAW);

	return {
		position: posBuf,
		indices: indexBuf
	};
}

function draw(gl, programInfo, bufs) {
	gl.clearColor(0, 0, 0, 1);
	gl.clearDepth(1);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const fov = 135. * Math.PI / 180;
	const focal = 1. / Math.tan(fov / 2);
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const zNear = .1;
	const zFar = 100;
	const projMatrix = mat4.perspective(mat4.create(), fov, aspect, zNear, zFar);
	const mvMatrix = mat4.create();
	mat4.translate(mvMatrix, mvMatrix, [0, 0, -focal]);

	gl.bindBuffer(gl.ARRAY_BUFFER, bufs.position);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs.indices);
	gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3,
		gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

	gl.useProgram(programInfo.program);

	setUniforms(gl, programInfo, {
		projMatrix: projMatrix,
		mvMatrix: mvMatrix,
		focalLength: focal,
		windowSize: [gl.canvas.clientWidth, gl.canvas.clientHeight]
	});

	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function setUniforms(gl, programInfo, uniforms) {
	gl.uniformMatrix4fv(programInfo.uniformLocations.projMatrix, false,
		uniforms.projMatrix);
	gl.uniformMatrix4fv(programInfo.uniformLocations.mvMatrix, false,
		uniforms.mvMatrix);
	gl.uniform3fv(programInfo.uniformLocations.cameraPosition, getCameraPos(uniforms.mvMatrix));
	gl.uniform1f(programInfo.uniformLocations.focalLength, uniforms.focalLength);
	gl.uniform2fv(programInfo.uniformLocations.windowSize, uniforms.windowSize);
}

function getCameraPos(mvMatrix) {
	let translate = vec3.fromValues(mvMatrix[12], mvMatrix[13], mvMatrix[14]);
	vec3.negate(translate, translate);
	let rotmtx = mat3.normalFromMat4(mat3.create(), mvMatrix);
	vec3.transformMat3(translate, translate, rotmtx);
	return new Float32Array(translate);
}

function main() {
	const gl = getGLContext();
	if(!gl) {
		console.log("Unable to initialize WebGL. Check if your browser supports it.");
		return;
	}
	if(vsSrc === undefined || fsSrc === undefined) {
		console.log("Define the shaders before using them");
		return;
	}
	const shaderProg = initShaderProgram(gl, vsSrc, fsSrc);
	const programInfo = getProgramInfo(gl, shaderProg);
	const bufs = initBuffers(gl);
	draw(gl, programInfo, bufs);
}
