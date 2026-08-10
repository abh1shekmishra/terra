/**
 * Hand-written GLSL for the planet. Three.js gives us the geometry, camera and
 * texture plumbing; the lighting model here is our own so we can do the two
 * things stock materials can't: blend a day and a night texture across the
 * real sun terminator (city lights only on the dark side), and add a physical
 * Fresnel atmosphere rim.
 */

// ---------------------------------------------------------------------------
// Earth
// ---------------------------------------------------------------------------

export const earthVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const earthFragmentShader = /* glsl */ `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform sampler2D uNormalMap;
  uniform vec3 uSunDirection;
  uniform vec2 uNormalScale;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;

  // Derivative-based tangent frame (Mikkelsen) so we can apply a tangent-space
  // normal map without precomputed tangents — this is what gives terrain depth.
  mat3 cotangentFrame(vec3 N, vec3 p, vec2 uv) {
    vec3 dp1 = dFdx(p);
    vec3 dp2 = dFdy(p);
    vec2 duv1 = dFdx(uv);
    vec2 duv2 = dFdy(uv);
    vec3 dp2perp = cross(dp2, N);
    vec3 dp1perp = cross(N, dp1);
    vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
    float invmax = inversesqrt(max(dot(T, T), dot(B, B)));
    return mat3(T * invmax, B * invmax, N);
  }

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 view = normalize(vViewDir);
    vec3 sun = normalize(uSunDirection);

    // Perturb the surface normal with the relief map for real terrain shading.
    vec3 mapN = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
    mapN.xy *= uNormalScale;
    vec3 n = normalize(cotangentFrame(N, vWorldPosition, vUv) * mapN);

    // Smooth day/night band from the geometric normal; relief lighting from n.
    float geoAlignment = dot(N, sun);
    float dayAmount = smoothstep(-0.12, 0.28, geoAlignment);
    float diffuse = clamp(dot(n, sun), 0.0, 1.0);

    vec3 dayColor = texture2D(uDayMap, vUv).rgb;
    vec3 nightColor = texture2D(uNightMap, vUv).rgb;

    vec3 litDay = dayColor * (diffuse * 1.08 + 0.04);

    // Warm sunset band through the terminator.
    float sunset = smoothstep(-0.05, 0.18, geoAlignment) *
                   (1.0 - smoothstep(0.18, 0.5, geoAlignment));
    litDay += dayColor * vec3(0.45, 0.16, 0.02) * sunset * 0.6;

    vec3 cityLights = nightColor * (1.0 - dayAmount) * 1.4;
    vec3 color = mix(cityLights, litDay, dayAmount);

    // Blue atmospheric limb on the lit side only.
    float rim = pow(1.0 - max(dot(N, view), 0.0), 3.5);
    color += vec3(0.25, 0.5, 1.0) * rim * dayAmount * 0.2;

    color = pow(color, vec3(1.0 / 2.2)); // linear -> sRGB
    gl_FragColor = vec4(color, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Clouds — a thin shell that is lit on the day side and fades to the terminator
// ---------------------------------------------------------------------------

export const cloudsVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

export const cloudsFragmentShader = /* glsl */ `
  uniform sampler2D uCloudMap;
  uniform vec3 uSunDirection;

  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vec4 tex = texture2D(uCloudMap, vUv);
    // Robust to how the PNG stores cloud shape (luminance vs alpha), then
    // smoothstep away the faint speckle so only real cloud mass shows.
    float density = smoothstep(0.08, 0.55, tex.r * tex.a);
    float sunAlignment = dot(normalize(vWorldNormal), normalize(uSunDirection));
    float light = max(sunAlignment, 0.0) * 0.9 + 0.06;
    gl_FragColor = vec4(vec3(light), density * 0.7);
  }
`;

// ---------------------------------------------------------------------------
// Earthquake ripples — instanced discs laid tangent to the surface, each one
// emitting expanding, fading shockwave rings (two, staggered) driven on the GPU
// ---------------------------------------------------------------------------

export const rippleVertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSeed;
  attribute float aSpeed;

  varying float vRadius;
  varying vec3 vColor;
  varying float vSeed;
  varying float vSpeed;

  void main() {
    vRadius = length(position.xy);       // 0 at centre → 1 at disc rim
    vColor = aColor;
    vSeed = aSeed;
    vSpeed = aSpeed;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

export const rippleFragmentShader = /* glsl */ `
  uniform float uTime;

  varying float vRadius;
  varying vec3 vColor;
  varying float vSeed;
  varying float vSpeed;

  float shockwave(float r, float t) {
    float edge = 0.07;
    float ring = smoothstep(t - edge, t, r) * (1.0 - smoothstep(t, t + edge, r));
    return ring * (1.0 - t); // dimmer as it expands outward
  }

  void main() {
    float phase = uTime * vSpeed + vSeed;
    float a = shockwave(vRadius, fract(phase)) +
              shockwave(vRadius, fract(phase + 0.5));
    a *= smoothstep(1.0, 0.72, vRadius); // vanish before the disc rim
    if (a <= 0.002) discard;
    gl_FragColor = vec4(vColor * 1.35, a);
  }
`;

// ---------------------------------------------------------------------------
// Atmosphere — a back-facing shell rendered additively for a scattering rim
// ---------------------------------------------------------------------------

export const atmosphereVertexShader = /* glsl */ `
  varying vec3 vViewNormal;

  void main() {
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragmentShader = /* glsl */ `
  varying vec3 vViewNormal;

  void main() {
    // Back-facing shell: intensity peaks at the limb, falls off toward centre.
    float intensity = pow(0.62 - dot(vViewNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    intensity = clamp(intensity, 0.0, 1.0);
    gl_FragColor = vec4(vec3(0.3, 0.56, 1.0) * intensity, intensity);
  }
`;
