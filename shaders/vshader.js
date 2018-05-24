const vsSrc = `
	attribute vec4 aVtxPos;
	
	uniform mat4 uMV;
	uniform mat4 uProj;

	void main() {
		gl_Position = uProj * uMV * aVtxPos;
	}
`;
