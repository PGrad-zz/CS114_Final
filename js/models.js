function createPlane() {
	return {
		vertices: [
		  // Front face
		  -1., -1.,  0.,
		   1., -1.,  0.,
		   1.,  1.,  0.,
		  -1.,  1.,  0.
		],
		indices: [
			0,  1,  2,
			0,  2,  3    // front
		]
	}
}
