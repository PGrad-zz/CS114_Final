const commonSrc = `
	precision highp float;

	uniform mat4 uMV;
	uniform vec3 cameraPos;
	uniform float focalLength;
	uniform vec2 windowSize;
	uniform samplerCube envMap;
	uniform sampler2D filmDepth;
	uniform float time;

	varying vec3 pos;
	struct obj_props {
		float dist;
		vec4 color;
		int type;
		vec3 n;
	};
	//mat3(dist, type, alpha, color, n)

	#define MIN_DIST .05
	#define MAX_STEPS 80
	#define PI 3.14159
	#define EPSILON .0001
	#define SPECULAR_EXPONENT 10.
	#define FAR 100.
	#define NULL_COL vec3(0)
	#define NULL_ALPHA 0
	#define BOX_COL vec3(.7, .5, .2)
	#define BOX_ALPHA 1.
	#define SIDE 1.5

	vec3 get_highlights(vec3 n, vec3 iXPos, vec3 rd, mat3 view);
	vec4 raymarch(vec3 ro, vec3 rd, mat3 view);
	vec4 raymarch2(vec3 ro, vec3 rd, mat3 view);
	mat3 sceneSDF(vec3 p);
	mat3 lookAt(vec3 eye);

	mat3 intersect(mat3 a, mat3 b) {
		mat3 m;
		if(a[0][0] >= b[0][0])
			m = a;
		else
			m = b;
		return m;
	}
	mat3 _union(mat3 a, mat3 b) {
		mat3 m;
		if(a[0][0] <= b[0][0])
			m = a;
		else
			m = b;
		return m;
	}
	mat3 diff(mat3 a, mat3 b) {
		return intersect(a, mat3(-b[0][0], a[0][1], a[0][2], a[1], a[2]));
	}
	float sphereSDF(vec3 p, vec3 c, float r) {
		return length(p - c) - r;
	}
	vec3 sphereTexMap(vec3 n, sampler2D tex) {
		float r = sqrt(n.x * n.x + n.z * n.z);
		float phi = atan(n.y / r);
		float theta = atan(n.z / n.x);
		return texture2D(tex, vec2(theta, phi)).rgb;
	}
	float roundBoxSDF(vec3 p, vec3 b, float r) {
		return length(max(abs(p) - b, 0.)) - r;
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
		                 sceneSDF(iXPos + diff.xyy)[0][0] - sceneSDF(iXPos - diff.xyy)[0][0],
		                 sceneSDF(iXPos + diff.yxy)[0][0] - sceneSDF(iXPos - diff.yxy)[0][0],
		                 sceneSDF(iXPos + diff.yyx)[0][0] - sceneSDF(iXPos - diff.yyx)[0][0]
		       ));
	}
	vec3 phong(vec3 n, vec3 l, vec3 eye) {
		vec3 r = -reflect(l, n);
		return vec3(pow(max(0., dot(r, eye)), SPECULAR_EXPONENT));
	}
	vec3 env_map(vec3 n, vec3 eye, vec3 iXPos, mat3 view) {
		vec3 r = -reflect(eye, n);
		return raymarch2(iXPos, r, lookAt(r)).rgb;
	}
	vec3 diffuse(vec3 n, vec3 l) {
		return vec3(.7, .8, .4) * max(0., dot(n,l));
	}
	vec4 calc_color(vec3 ro, vec3 rd, float dist, mat3 props, mat3 view, vec3 n, vec3 iXPos) {
		vec3 col = props[1];
		float alpha = props[0][2];
		vec3 highlights = get_highlights(n, iXPos, rd, view);
		if(props[0][1] == 1.) {
			col *= highlights + .4 * env_map(n, -rd, iXPos, view);
		} else if(props[0][1] == 2.)
			col *= highlights + env_map(n, -rd, iXPos, view);
		else
			col *= diffuse(n, -rd) + highlights;
		col = clamp(col, 0., .9);
		return vec4(col, alpha);
	}
	vec4 over(vec4 dest, vec4 src) {
		return src * src.a + dest * (1. - src.a);
	}
	vec3 blend3(vec3 x) {
		vec3 y = 1. - x * x; //Bump function
		y = max(y, vec3(0));
		return y;
	}
	float get_reflect_alpha(vec3 n, vec3 i, vec3 t, float n1, float n2) {
		float ndoti = clamp(dot(n, -i), 0., 1.);
		float ndott = clamp(dot(-n, t), 0., 1.);
		float Rperp = (n1 * ndoti - n2 * ndott) / (n1 * ndoti + n2 * ndott);
		Rperp *= Rperp;
		float Rparl = (n2 * ndoti - n1 * ndott) / (n2 * ndoti + n1 * ndott);
		Rparl *= Rparl;
		return sin(ndoti) <= (n2 / n1) ? ((Rperp + Rparl) / 2.) : 1.;
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
		return phong(n, topl, -rd) + phong(n, bottoml, -rd);
	}
	vec3 env_map2(vec3 n, vec3 eye, vec3 iXPos, mat3 view) {
		vec3 r = -reflect(eye, n);
		return textureCube(envMap, r).rgb;
	}
	vec4 calc_color2(vec3 ro, vec3 rd, float dist, mat3 props, mat3 view, vec3 n, vec3 iXPos) {
		vec3 col = props[1];
		float alpha = props[0][2];
		vec3 highlights = get_highlights(n, iXPos, rd, view);
		col *= diffuse(n, -rd) + highlights;
		return vec4(col, alpha);
	}
`
