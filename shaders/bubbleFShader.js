const bubbleFsSrc = `
	#define NUM_METABALLS 3
	#define BUBBLE_COL vec4(vec3(1.), .8)
	#define BUBBLE_RADIUS 1.
	float get_thickness(vec3 n) {
		return 1. - .2 * sphereTexMap(n, filmDepth).r;
	}
	float metaballSDF(vec3 p) {
		float sumDensity = 0.;
		float sumRi = 0.;
		float minDist = FAR;
		float radii = BUBBLE_RADIUS;
		vec3 centers[NUM_METABALLS]; centers[0] = vec3(0.); centers[1] = vec3(cos(time * .4)); centers[2] = vec3(-cos(time * .4), -cos(time * .4), cos(time * .4));
		float r = 0.;
		for(int i = 0; i < NUM_METABALLS; ++i) {
			r = length(centers[i] - p);
			if(r <= radii)
				sumDensity += 2. * (r * r * r) / (radii * radii * radii) - 3. * (r * r) / (radii * radii) + 1.;
			minDist = min(minDist, (r - radii));
			sumRi += BUBBLE_RADIUS;
		}
		return max(minDist, (ISOPOTENTIAL - sumDensity) / (1.5 * sumRi));
	}
	int firsthit = 0;
	obj_props sceneSDF(vec3 p) {
		obj_props metaballs = obj_props(metaballSDF(p), BUBBLE_COL, 1, vec3(1.05));
		return metaballs;
	}
	vec4 raymarch(vec3 ro, vec3 rd, mat3 view) {
		float dist = MIN_DIST;
		obj_props oprops;
		vec4 color = vec4(0);
		vec4 cb = vec4(0);
		vec3 n = vec3(0);
		vec3 oldrd = vec3(0.);
		int hit = 0;
		for(int i = 0; i < MAX_STEPS; ++i) {
			if(dist > FAR)
				break;
			oprops = sceneSDF((ro + rd * dist));
			if(oprops.dist <= EPSILON) {
				color = calc_color(ro, rd, dist, oprops, view);
				n = getNormal(ro + rd * dist);
				if(oprops.type == 1) {
					float u = 2. * oprops.n.x * get_thickness(n) * dot(refract(rd, n, oprops.n.x), -n);
					float C = 4.;
					vec3 cdiff = vec3(0);
					for (float m = 1.5; m < 9.; m += 1.) { //Sum contributions of wave
						float y = 2. * u / (float(m) - .5) - 1.; //Bound from .5 to 1 micron
						cdiff.xyz += blend3(vec3(C * (y - 0.75), C * (y - 0.5),
								    C * (y - 0.25)));
					}
					color.rgb = mix(color.rgb, cdiff, .2);
					dist += BUBBLE_RADIUS * 1.1;
					color.a = .8;
				}
				cb = over(color, cb);
			}
			dist += abs(oprops.dist);
			firsthit = 1;
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
