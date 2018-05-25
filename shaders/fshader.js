const fsSrc = `
	precision highp float;
	uniform mat4 uMV;
	uniform vec3 cameraPos;
	uniform float focalLength;
	uniform vec2 windowSize;
	varying vec3 pos;
	#define MIN_DIST .1
	#define MAX_STEPS 64
	#define PI 3.14159
	#define EPSILON .0001
	struct Ray {
		vec3 ro;
		vec3 rd;
	};
	float sphereSDF(vec3 p, float r) {
		return length(p) - r;
	}
	vec3 getRd(vec2 fragCoord, float fov) {
		vec2 uv = 2. * fragCoord / windowSize - 1.;
		fov = fov * PI / 180.;
		float focal = 1. / tan(fov / 2.);
		return normalize(vec3(uv, -focal));
	}
	void main() {
		vec3 col = vec3(0.);
		vec3 rd = getRd(gl_FragCoord.xy, 35.);
		float d = 0.;
		float dist = MIN_DIST;
		vec3 ro = vec3(0., 0., -5.);
		for(int i = 0; i < MAX_STEPS; ++i) {
			if((d = sphereSDF(ro - rd * dist, .5)) <= EPSILON) {
				col = vec3(1.);
				break;
			}
			dist += d;
		}
		gl_FragColor = vec4(col, 1.);
	}
`;
