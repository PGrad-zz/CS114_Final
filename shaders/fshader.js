const fsSrc = `
	precision highp float;
	uniform mat4 uMV;
	uniform vec3 cameraPos;
	uniform float focalLength;
	uniform vec2 windowSize;
	uniform samplerCube envMap;
	uniform float time;
	varying vec3 pos;
	#define MIN_DIST .1
	#define MAX_STEPS 64
	#define PI 3.14159
	#define EPSILON .0001
	#define SPECULAR_EXPONENT 20.
	#define FAR 100.
	#define NUM_METABALLS 2
	struct Ray {
		vec3 ro;
		vec3 rd;
	};
	float sphereSDF(vec3 p, vec3 c, float r) {
		return length(p - c) - r;
	}
	float metaballSDF(vec3 p) {
		float sumDensity = 0.;
		float sumRi = 0.;
		float minDist = FAR;
		vec3 centers[NUM_METABALLS]; centers[0] = vec3(0.); centers[1] = vec3(1.);
		float r = 0.;
		for(int i = 0; i < NUM_METABALLS; ++i) {
			r = length(centers[i] - p);
			if(r <= 1.)
				sumDensity += 2. * (r * r * r) - 3. * (r * r) + 1.;
			minDist = min(minDist, r - 1.);
			sumRi += 1.;
		}
		return max(minDist, (.2 - sumDensity) / (1.5 * sumRi));
	}
	float sceneSDF(vec3 p) {
		return metaballSDF(p);
	}
	vec3 getRd(vec2 fragCoord, float fov) {
		vec2 uv = 2. * fragCoord / windowSize - 1.;
		fov = fov * PI / 180.;
		float focal = 1. / tan(fov / 2.);
		return normalize(vec3(uv, focal));
	}
	float raymarch(vec3 ro, vec3 rd) {
		float dist = MIN_DIST;
		float d = 0.;
		for(int i = 0; i < MAX_STEPS; ++i) {
			if(dist > FAR)
				break;
			if((d = sceneSDF(ro + rd * dist)) <= EPSILON)
				return dist;
			dist += d;
		}
		return dist;
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
	vec3 env_map(vec3 n, vec3 eye) {
		vec3 r = -reflect(eye, n);
		return textureCube(envMap, r).rgb;
	}
	vec3 diffuse(vec3 n, vec3 l) {
		return vec3(.7, .8, .4) * max(0., dot(n,l));
	}
	vec3 gamma_correct(vec3 col, float expon) {
		return vec3(pow(col.r, expon), pow(col.g, expon), pow(col.b, expon));
	}
	mat3 lookAt(vec3 eye) {
		vec3 strafe = cross(vec3(0, 1, 0), eye);
		vec3 up = cross(eye, strafe);
		mat3 view = mat3(0.);
		return mat3(normalize(strafe),
                normalize(up),
		            normalize(eye));
	}
	void main() {
		vec3 rd = getRd(gl_FragCoord.xy, 35.);
		vec3 ro = -5. * vec3(cos(time), 0, sin(time));
		mat3 view = lookAt(vec3(0.) - ro);
		rd = view * rd;
		float dist = raymarch(ro, rd);
		float infore = float(dist <= FAR);
		vec3 col = vec3(infore);
		vec3 iXPos = ro + rd * dist;
		vec3 n = getNormal(iXPos);
		vec3 toplight = vec3(0., 5., -4.) * view;
		vec3 bottomlight = vec3(0., -5., -4.) * view;
		vec3 topl = normalize(toplight - iXPos);
		vec3 bottoml = normalize(bottomlight - iXPos);
		vec3 highlights = blinn_phong(n, topl, -rd) + blinn_phong(n, bottoml, -rd);
		col *= mix(highlights, env_map(n, -rd), .2) + 0.4;
		vec3 back = textureCube(envMap, rd).rgb;
		col = (1. - infore) * back + infore * mix(back, col, .5);
		gl_FragColor = vec4(col, 1.);
	}
`;
