const glassFsSrc = `
	#define GLASS_COL vec4(vec3(1.), .8)
	#define GLASS_N vec3(1.03, 1.05, 1.07)
	#define GLASS_RADIUS 1.
	obj_props sceneSDF(vec3 p) {
		obj_props box = obj_props(roundBoxSDF(p, vec3(SIDE), .1), BOX_COL, 0, vec3(.239));
		obj_props horiz = obj_props(roundBoxSDF(p, vec3(SIDE + .1, SIDE - .2, SIDE - .2), .1), NULL_COL, -1, vec3(-1.));
		obj_props vert = obj_props(roundBoxSDF(p, vec3(SIDE - .2, SIDE + .1, SIDE - .2), .1), NULL_COL, -1, vec3(-1.));
		obj_props zed = obj_props(roundBoxSDF(p, vec3(SIDE - .2, SIDE - .2, SIDE + .1), .1), NULL_COL, -1, vec3(-1.));
		obj_props glass_sphere = obj_props(sphereSDF(p, vec3(0, 0, 0), GLASS_RADIUS), GLASS_COL, 2, GLASS_N);
		obj_props mergebox = diff(diff(diff(box, horiz), vert), zed);
		return _union(glass_sphere, mergebox);
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
			obj_props oprops;
			vec4 color = vec4(0);
			vec4 cb = vec4(0);
			vec3 n = vec3(0);
			vec3 oldrd = vec3(0.);
			for(int i = 0; i < MAX_STEPS; ++i) {
				if(dist > FAR)
					break;
				oprops = sceneSDF((ro + rd * dist));
				if(oprops.dist <= EPSILON) {
					n = getNormal(ro + rd * dist);
					color = calc_color(ro, rd, dist, oprops, view);
					if(oprops.type == 2) {
						ro += rd * dist;
						oldrd = rd;
						rd = refract(rd, n, 1. / oprops.n[rgb_i]);
						dist = GLASS_RADIUS * 2.1;
						color.a = get_reflect_alpha(n, oldrd, rd, 1., oprops.n[rgb_i]);
					}
					cb = over(color, cb);
					if(cb.a == 1.)
						break;
				}
				dist += abs(oprops.dist);
			}
			cb = over(textureCube(envMap, ro + rd * dist), cb);
			cum_color[rgb_i] = cb[rgb_i];
			cum_color.a += cb.a;
		}
		cum_color.a = 1.;
		return cum_color;
	}
	vec4 raymarch2(vec3 ro, vec3 rd, mat3 view) {
		vec3 origro = ro;
		vec3 origrd = rd;
		vec4 cum_color = vec4(0);
		for(int rgb_i = 0; rgb_i < 3; ++rgb_i)
		{
			rd = origrd;
			ro = origro;
			float dist = MIN_DIST;
			obj_props oprops;
			vec4 color = vec4(0);
			vec4 cb = vec4(0);
			vec3 n = vec3(0);
			vec3 oldrd = vec3(0.);
			for(int i = 0; i < MAX_STEPS; ++i) {
				if(dist > FAR)
					break;
				oprops = sceneSDF((ro + rd * dist));
				if(oprops.dist <= EPSILON) {
					n = getNormal(ro + rd * dist);
					color = calc_color2(ro, rd, dist, oprops, view);
					if(oprops.type == 2) {
						ro += rd * dist;
						oldrd = rd;
						rd = refract(rd, n, 1. / oprops.n[rgb_i]);
						dist = GLASS_RADIUS * 2.1;
						color.a = get_reflect_alpha(n, oldrd, rd, 1., oprops.n[rgb_i]);
					}
					cb = over(color, cb);
					if(cb.a == 1.)
						break;
				}
				dist += abs(oprops.dist);
			}
			cb = over(textureCube(envMap, ro + rd * dist), cb);
			cum_color[rgb_i] = cb[rgb_i];
			cum_color.a += cb.a;
		}
		cum_color.a = 1.;
		return cum_color;
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
