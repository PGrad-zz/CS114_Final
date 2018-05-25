const vsSrc = `
	attribute vec4 aVtxPos;
	
	uniform mat4 uMV;
	uniform mat4 uProj;
	varying vec3 pos;

	void main() {
		pos = aVtxPos.xyz;
		gl_Position = uProj * uMV * aVtxPos;
	}
`;
