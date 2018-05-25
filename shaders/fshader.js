const fsSrc = `
	precision highp float;
	uniform mat4 uMV;
	uniform vec3 cameraPos;
	uniform float focalLength;
	uniform vec2 windowSize;
	uniform samplerCube envMap;
	varying vec3 pos;
	#define MIN_DIST .1
	#define MAX_STEPS 64
	#define PI 3.14159
	#define EPSILON .0001
	#define SPECULAR_EXPONENT 20.
	struct Ray {
		vec3 ro;
		vec3 rd;
	};
	float sphereSDF(vec3 p, float r) {
		return length(p) - r;
	}
	float sceneSDF(vec3 p) {
		return sphereSDF(p, 1.);
	}
	vec3 getRd(vec2 fragCoord, float fov) {
		vec2 uv = 2. * fragCoord / windowSize - 1.;
		fov = fov * PI / 180.;
		float focal = 1. / tan(fov / 2.);
		return normalize(vec3(uv, -focal));
	}
	float raymarch(vec3 ro, vec3 rd) {
		float dist = MIN_DIST;
		float d = 0.;
		for(int i = 0; i < MAX_STEPS; ++i) {
			if((d = sceneSDF(ro - rd * dist)) <= EPSILON)
				return dist;
			dist += d;
		}
		return -1.;
	}
	vec3 getNormal(vec3 iXPos) {
		vec2 diff = vec2(EPSILON, 0.);
		return normalize(vec3(
		                 sceneSDF(iXPos + diff.xyy) - sceneSDF(iXPos - diff.xyy),
		                 sceneSDF(iXPos + diff.yxy) - sceneSDF(iXPos - diff.yxy),
		                 sceneSDF(iXPos + diff.yyx) - sceneSDF(iXPos - diff.yyx)
		       ));
	}
	vec3 blinn_phong(vec3 n, vec3 l, vec3 eye) {
		vec3 r = -reflect(l, n);
		return vec3(1.) * pow(max(0., dot(r, eye)), SPECULAR_EXPONENT);
	}
	vec3 env_map(vec3 n, vec3 l, vec3 eye) {
		vec3 r = -reflect(l, n);
		return textureCube(envMap, r).rgb;
	}
	vec3 diffuse(vec3 n, vec3 l) {
		return vec3(.7, .8, .4) * max(0., dot(n,l));
	}
	vec3 gamma_correct(vec3 col, float expon) {
		return vec3(pow(col.r, expon), pow(col.g, expon), pow(col.b, expon));
	}
	void main() {
		vec3 rd = getRd(gl_FragCoord.xy, 35.);
		vec3 ro = vec3(0., 0., -5.);
		float dist = raymarch(ro, rd);
		vec3 col = vec3(float(dist >= EPSILON));
		vec3 iXPos = ro - rd * dist;
		vec3 n = getNormal(iXPos);
		vec3 toplight = vec3(0., 5., -4.);
		vec3 centerlight = vec3(0., 0., 4.);
		vec3 bottomlight = vec3(0., -5., -3.);
		vec3 topl = normalize(toplight - iXPos);
		vec3 centerl = normalize(centerlight - iXPos);
		vec3 bottoml = normalize(bottomlight - iXPos);
		vec3 highlights = blinn_phong(n, topl, -rd) + blinn_phong(n, bottoml, -rd);
		col *= mix(highlights, env_map(n, centerl, -rd), .2) + 0.4;
		vec3 back = textureCube(envMap, rd).rgb;
		if(col.x == 0.)
			col = back;
		else
			col = mix(back, col, .5);
		gl_FragColor = vec4(col, 1.);
	}
`;
