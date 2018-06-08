const bubbleFsSrc = `
	#define NUM_METABALLS 3
	#define BUBBLE_COL vec3(vec3(1.))
	#define BUBBLE_ALPHA .8
	#define BUBBLE_RADIUS 1.
	float get_thickness(vec3 n) {
		return 1. - .2 * sphereTexMap(n, filmDepth).r;
	}
	float metaballSDF(vec3 p) {
		float sumDensity = 0.;
		float sumRi = 0.;
		float minDist = FAR;
		float radii = BUBBLE_RADIUS;
		float r2 = radii * radii;
		float r3 = radii * radii * radii;
		mat3 centers = mat3(vec3(0.), vec3(cos(time * .4)), vec3(-cos(time * .4), -cos(time * .4), cos(time * .4)));
		float r = 0.;
		for(int i = 0; i < NUM_METABALLS; ++i) {
			r = length(centers[i] - p);
			if(r <= radii)
				sumDensity += 2. * (r * r * r) / r3 - 3. * (r * r) / r2 + 1.;
			minDist = min(minDist, (r - radii));
			sumRi += BUBBLE_RADIUS;
		}
		return max(minDist, (ISOPOTENTIAL - sumDensity) / (1.5 * sumRi));
	}
	mat3 sceneSDF(vec3 p) {
		mat3 box = mat3(roundBoxSDF(p, vec3(SIDE), .1), 0, BOX_ALPHA, BOX_COL, vec3(.239));
		mat3 horiz = mat3(roundBoxSDF(p, vec3(1.6, 1.3, 1.3), .1), -1, NULL_ALPHA, NULL_COL, vec3(-1.));
		mat3 vert = mat3(roundBoxSDF(p, vec3(1.3, 1.6, 1.3), .1), -1, NULL_ALPHA, NULL_COL, vec3(-1.));
		mat3 zed = mat3(roundBoxSDF(p, vec3(1.3, 1.3, 1.6), .1), -1, NULL_ALPHA, NULL_COL, vec3(-1.));
		mat3 mergebox = diff(diff(diff(box, horiz), vert), zed);
		mat3 metaballs = mat3(metaballSDF(p), 1, BUBBLE_ALPHA, BUBBLE_COL, vec3(1.05));
		return _union(metaballs, mergebox);
	}
	mat3 sceneSDFwoBalls(vec3 p) {
		mat3 box = mat3(roundBoxSDF(p, vec3(SIDE), .1), 0, BOX_ALPHA, BOX_COL, vec3(.239));
		mat3 horiz = mat3(roundBoxSDF(p, vec3(1.6, 1.3, 1.3), .1), 0, NULL_ALPHA, NULL_COL, vec3(-1.));
		mat3 vert = mat3(roundBoxSDF(p, vec3(1.3, 1.6, 1.3), .1), 0, NULL_ALPHA, NULL_COL, vec3(-1.));
		mat3 zed = mat3(roundBoxSDF(p, vec3(1.3, 1.3, 1.6), .1), 0, NULL_ALPHA, NULL_COL, vec3(-1.));
		mat3 mergebox = diff(diff(diff(box, horiz), vert), zed);
		return mergebox;
	}
	vec4 raymarch(vec3 ro, vec3 rd, mat3 view) {
		float dist = MIN_DIST;
		mat3 oprops;
		vec4 color = vec4(0);
		vec4 cb = vec4(0);
		vec3 n = vec3(0);
		vec3 oldrd = vec3(0.);
		for(int i = 0; i < MAX_STEPS; ++i) {
			if(dist > FAR)
				break;
			oprops = sceneSDF(ro + rd * dist);
			if(oprops[0][0] <= EPSILON) {
				n = getNormal(ro + rd * dist);
				color = calc_color(ro, rd, dist, oprops, view, n, ro + rd * dist);
				if(oprops[0][1] == 1.) {
					float u = 2. * oprops[2][0] * get_thickness(n) * dot(refract(rd, n, oprops[2][0]), -n);
					float C = 4.;
					vec3 cdiff = vec3(0);
					for (float m = 1.5; m < 9.; m += 1.) { //Sum contributions of wave
						float y = 2. * u / (m - .5) - 1.; //Bound from .5 to 1 micron
						cdiff.xyz += blend3(vec3(C * (y - 0.75), C * (y - 0.5),
								    C * (y - 0.25)));
					}
					color.rgb = mix(color.rgb, cdiff, .2);
					dist += BUBBLE_RADIUS * 1.1;
					color.a = .8;
				}
				cb = over(color, cb);
			}
			dist += abs(oprops[0][0]);
		}
		return over(textureCube(envMap, rd), cb);
	}
	vec4 raymarch2(vec3 ro, vec3 rd, mat3 view) {
		float dist = MIN_DIST;
		mat3 oprops;
		vec4 color = vec4(0);
		vec4 cb = vec4(0);
		vec3 n = vec3(0);
		vec3 oldrd = vec3(0.);
		int hit = 0;
		for(int i = 0; i < 32; ++i) {
			if(dist > FAR)
				break;
			oprops = sceneSDFwoBalls(ro + rd * dist);
			if(oprops[0][0] <= EPSILON) {
				n = getNormal(ro + rd * dist);
				color = calc_color2(ro, rd, dist, oprops, view, n, ro + rd * dist);
				cb = over(color, cb);
			}
			dist += abs(oprops[0][0]);
		}
		return over(textureCube(envMap, rd), cb);
	}
	void main() {
		float timestep = time * .5;
		vec3 ro = -7. * vec3(sin(timestep), 0, cos(timestep));
		mat3 view = lookAt(vec3(0.) - ro);
		vec3 rd = view * getRd(gl_FragCoord.xy, 35.);
		vec4 color = raymarch(ro, rd, view);
		gl_FragColor = color;
	}
`;
