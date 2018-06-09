const glassFsSrc = `
	#define GLASS_COL vec3(1.)
	#define GLASS_ALPHA .8
	#define GLASS_N vec3(1.5, 1.7, 1.6)
	#define GLASS_RADIUS 1.
	mat3 sceneSDF(vec3 p) {
		mat3 box = mat3(roundBoxSDF(p, vec3(SIDE), .1), 0, BOX_ALPHA, BOX_COL, vec3(.239));
		mat3 horiz = mat3(roundBoxSDF(p, vec3(SIDE + .1, SIDE - .2, SIDE - .2), .1), -1, 0, NULL_COL, vec3(-1.));
		mat3 vert = mat3(roundBoxSDF(p, vec3(SIDE - .2, SIDE + .1, SIDE - .2), .1), -1, 0, NULL_COL, vec3(-1.));
		mat3 zed = mat3(roundBoxSDF(p, vec3(SIDE - .2, SIDE - .2, SIDE + .1), .1), -1, 0, NULL_COL, vec3(-1.));
		mat3 glass_sphere = mat3(sphereSDF(p, vec3(0, 0, 0), GLASS_RADIUS), 2, GLASS_ALPHA, GLASS_COL, GLASS_N);
		mat3 mergebox = diff(diff(diff(box, horiz), vert), zed);
		return _union(glass_sphere, mergebox);
	}
	mat3 sceneSDFwoSphere(vec3 p) {
		mat3 box = mat3(roundBoxSDF(p, vec3(SIDE), .1), 0, BOX_ALPHA, BOX_COL, vec3(.239));
		mat3 horiz = mat3(roundBoxSDF(p, vec3(SIDE + .1, SIDE - .2, SIDE - .2), .1), -1, 0, NULL_COL, vec3(-1.));
		mat3 vert = mat3(roundBoxSDF(p, vec3(SIDE - .2, SIDE + .1, SIDE - .2), .1), -1, 0, NULL_COL, vec3(-1.));
		mat3 zed = mat3(roundBoxSDF(p, vec3(SIDE - .2, SIDE - .2, SIDE + .1), .1), -1, 0, NULL_COL, vec3(-1.));
		mat3 mergebox = diff(diff(diff(box, horiz), vert), zed);
		return mergebox;
	}
	vec4 raymarch(vec3 ro, vec3 rd, mat3 view) {
		vec3 origro = ro;
		vec3 origrd = rd;
		vec4 cum_color = vec4(0);
		for(int rgb_i = 0; rgb_i < 3; ++rgb_i)
		{
			rd = origrd;
			ro = origro;
			float dist = MIN_DIST;
			mat3 oprops;
			vec4 color = vec4(0);
			vec4 cb = vec4(0);
			vec3 n = vec3(0);
			vec3 oldrd = vec3(0.);
			for(int i = 0; i < MAX_STEPS; ++i) {
				if(dist > FAR)
					break;
				oprops = sceneSDF((ro + rd * dist));
				if(oprops[0][0] <= EPSILON) {
					n = getNormal(ro + rd * dist);
					color = calc_color(ro, rd, dist, oprops, view, n, ro + rd * dist);
					if(oprops[0][1] == 2.) {
						ro += rd * dist;
						oldrd = rd;
						rd = refract(rd, n, 1. / oprops[2][rgb_i]);
						color.a = get_reflect_alpha(n, oldrd, rd, 1., oprops[2][rgb_i]);
						dist = GLASS_RADIUS * 2.1;
						dist -= sphereSDF(ro + rd * dist, vec3(0), GLASS_RADIUS);
						ro += rd * dist;
						oldrd = rd;
						n = -getNormal(ro);
						rd = refract(rd, n, oprops[2][rgb_i]);
						color.a *= get_reflect_alpha(n, oldrd, rd, oprops[2][rgb_i], 1.);
						dist = .1;
					}
					cb = over(color, cb);
					if(cb.a == 1.)
						break;
				}
				dist += abs(oprops[0][0]);
			}
			cb = over(textureCube(envMap, ro + rd * dist), cb);
			cum_color[rgb_i] = cb[rgb_i];
			cum_color.a += cb.a;
		}
		cum_color.a = 1.;
		return cum_color;
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
			oprops = sceneSDFwoSphere(ro + rd * dist);
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
