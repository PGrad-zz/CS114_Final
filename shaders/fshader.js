const fsSrc = `
	precision highp float;

	uniform mat4 uMV;
	uniform vec3 cameraPos;
	uniform float focalLength;
	uniform vec2 windowSize;
	uniform samplerCube envMap;
	uniform float time;

	varying vec3 pos;
	struct obj_props {
		float dist;
		vec4 color;
		int type;
	};

	#define MIN_DIST .05
	#define MAX_STEPS 64
	#define PI 3.14159
	#define EPSILON .0001
	#define SPECULAR_EXPONENT 20.
	#define FAR 100.
	#define NUM_METABALLS 2
	#define ISOPOTENTIAL .4
	#define NULL_COL vec4(0)
	#define BOX_COL vec4(.7, .5, .2, 1)
	#define BUBBLE_COL vec4(vec3(1.), .2)
	vec3 get_highlights(vec3 n, vec3 iXPos, vec3 rd, mat3 view);

	obj_props intersect(obj_props a, obj_props b) {
		if(a.dist > b.dist)
			return a;
		else
			return b;
	}
	obj_props _union(obj_props a, obj_props b) {
		if(a.dist < b.dist)
			return a;
		else
			return b;
	}
	obj_props diff(obj_props a, obj_props b) {
		if(a.dist > -b.dist)
			return a;
		else
			return b;
	}
	float sphereSDF(vec3 p, vec3 c, float r) {
		return length(p - c) - r;
	}
	float metaballSDF(vec3 p) {
		float sumDensity = 0.;
		float sumRi = 0.;
		float minDist = FAR;
		vec3 centers[NUM_METABALLS]; centers[0] = vec3(0.); centers[1] = vec3(cos(time * .5));
		float radii[NUM_METABALLS]; radii[0] = .5; radii[1] = .5;
		float r = 0.;
		for(int i = 0; i < NUM_METABALLS; ++i) {
			r = length(centers[i] - p);
			if(r <= radii[i])
				sumDensity += 2. * (r * r * r) / (radii[i] * radii[i] * radii[i]) - 3. * (r * r) / (radii[i] * radii[i]) + 1.;
			minDist = min(minDist, r - radii[i]);
			sumRi += 1.;
		}
		return max(minDist, (ISOPOTENTIAL - sumDensity) / (1.5 * sumRi));
	}
	float roundBoxSDF(vec3 p, vec3 b, float r) {
		return length(max(abs(p) - b, 0.)) - r;
	}
	obj_props sceneSDF(vec3 p) {
		obj_props box = obj_props(roundBoxSDF(p, vec3(1.5), .1), BOX_COL, 0);
		obj_props horiz = obj_props(roundBoxSDF(p, vec3(1.6, 1., 1.), .1), NULL_COL, -1);
		obj_props vert = obj_props(roundBoxSDF(p, vec3(1., 1.6, 1.), .1), NULL_COL, -1);
		obj_props zed = obj_props(roundBoxSDF(p, vec3(1., 1., 1.6), .1), NULL_COL, -1);
		obj_props mergebox = diff(diff(diff(box, horiz), vert), zed);
		obj_props bubble_bounds = obj_props(roundBoxSDF(p, vec3(1), .1), NULL_COL, -1);
		if(mergebox.type == -1)
			return obj_props(metaballSDF(p), BUBBLE_COL, 1);
		return mergebox;
	}
	vec3 getRd(vec2 fragCoord, float fov) {
		vec2 uv = 2. * fragCoord / windowSize - 1.;
		fov = fov * PI / 180.;
		float focal = 1. / tan(fov / 2.);
		return normalize(vec3(uv, focal));
	}
	vec3 getNormal(vec3 iXPos) {
		vec2 diff = vec2(EPSILON, 0.);
		return normalize(vec3(
		                 sceneSDF(iXPos + diff.xyy).dist - sceneSDF(iXPos - diff.xyy).dist,
		                 sceneSDF(iXPos + diff.yxy).dist - sceneSDF(iXPos - diff.yxy).dist,
		                 sceneSDF(iXPos + diff.yyx).dist - sceneSDF(iXPos - diff.yyx).dist
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
	vec4 calc_color(vec3 ro, vec3 rd, obj_props props, mat3 view) {
		vec3 col = props.color.rgb;
		vec3 iXPos = ro + rd * props.dist;
		vec3 n = getNormal(iXPos);
		vec3 highlights = get_highlights(n, iXPos, rd, view);
		if(props.type == 1)
			col *= mix(highlights, env_map(n, -rd), .2) + 0.4;
		else
			col *= diffuse(n, -rd) + highlights;
		return vec4(col, 1);
	}
	vec4 raymarch(vec3 ro, vec3 rd, mat3 view) {
		float dist = MIN_DIST;
		obj_props oprops;
		vec4 color = vec4(0);
		for(int i = 0; i < MAX_STEPS; ++i) {
			if(dist > FAR)
				break;
			if((oprops = sceneSDF(ro + rd * dist)).dist <= EPSILON)
				return calc_color(ro, rd, oprops, view);
			dist += oprops.dist;
		}
		return vec4(textureCube(envMap, -rd));
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
	vec3 get_highlights(vec3 n, vec3 iXPos, vec3 rd, mat3 view) {
		vec3 toplight = view * vec3(0., 5., 3.);
		vec3 bottomlight = view * vec3(0., -5., 3.);
		vec3 topl = normalize(toplight - iXPos);
		vec3 bottoml = normalize(bottomlight - iXPos);
		return blinn_phong(n, topl, -rd) + blinn_phong(n, bottoml, -rd) + blinn_phong(n, -rd, -rd);
	}
	void main() {
		float timestep = time * .5;
		vec3 ro = -7. * vec3(sin(timestep), 0, cos(timestep));
		mat3 view = lookAt(vec3(0.) - ro);
		vec3 rd = view * getRd(gl_FragCoord.xy, 35.);
		vec4 color = raymarch(ro, rd, view);
//		float dist = objID.x;
//		float type = objID.y;
//		float infore = float(dist <= FAR) * float(type >= 0.);
//		float isbox = float(type > 0.);
//		vec3 col = (1. - isbox) * vec3(infore) + isbox * ;
//		if(type == 0.) {
//			col *= mix(highlights, env_map(n, -rd), .2) + 0.4;
//			col = (1. - infore) * back + infore * mix(back, col, .5);
//		} else {
//			col *= diffuse(n, -rd) + highlights;
//			col = (1. - infore) * back + infore * col;
//		}
		gl_FragColor = color;
	}
`;
