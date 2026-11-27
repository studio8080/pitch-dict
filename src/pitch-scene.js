import {
  CanvasTexture, CylinderGeometry, DirectionalLight, IcosahedronGeometry,
  Float32BufferAttribute, BufferGeometry, HemisphereLight, LineBasicMaterial,
  LineSegments, Mesh, MeshBasicMaterial, MeshLambertMaterial, OrthographicCamera,
  PlaneGeometry, Scene, SphereGeometry, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createAthletes } from './pitch-athletes.js';

export const initialCamera = { yaw: -0.17, pitch: 0.83, zoom: 1 };

function texture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  return map;
}

function turf() {
  return texture(600, 336, (ctx, width, height) => {
    ctx.fillStyle = '#317847';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#286540';
    for (let x = 0; x < width; x += 120) ctx.fillRect(x, 0, 60, height);

    const light = ctx.createRadialGradient(255, 85, 20, 280, 155, 360);
    light.addColorStop(0, '#b8df851f');
    light.addColorStop(1, '#081b2080');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, width, height);

    // A repeatable grain keeps the surface stable between frames and platforms.
    let seed = 49;
    for (let i = 0; i < 19000; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      ctx.fillStyle = i % 2 ? '#d7efaa21' : '#07281a30';
      ctx.fillRect(seed % width, (seed >>> 12) % height, 1 + (i % 3 === 0), 1);
    }
  });
}

function shadowMap() {
  return texture(64, 64, (ctx) => {
    const shade = ctx.createRadialGradient(32, 32, 6, 32, 32, 32);
    shade.addColorStop(0, '#0009');
    shade.addColorStop(1, '#0000');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 64, 64);
  });
}

// Project the 12 pentagonal and 20 hexagonal panels of a classic football onto a sphere.
let paintedBall;
function footballMap() {
  if (paintedBall) {
    const map = new CanvasTexture(paintedBall);
    map.colorSpace = SRGBColorSpace;
    return map;
  }
  const polyhedron = new IcosahedronGeometry(1);
  const positions = polyhedron.attributes.position;
  const vertices = new Map();
  const faces = [];
  for (let i = 0; i < positions.count; i += 3) {
    const triangle = [0, 1, 2].map(j => new Vector3().fromBufferAttribute(positions, i + j));
    triangle.forEach(v => vertices.set(v.toArray().map(n => n.toFixed(4)).join(','), v));
    faces.push(new Vector3().add(triangle[0]).add(triangle[1]).add(triangle[2]).normalize());
  }
  polyhedron.dispose();
  const directions = [...vertices.values(), ...faces];
  const darkPanels = vertices.size;
  const map = texture(192, 96, (ctx, width, height) => {
    const image = ctx.createImageData(width, height);
    const point = new Vector3();
    for (let y = 0; y < height; y++) {
      const latitude = (y + 0.5) * Math.PI / height;
      const sin = Math.sin(latitude);
      for (let x = 0; x < width; x++) {
        const longitude = (x + 0.5) * 2 * Math.PI / width;
        point.set(-Math.cos(longitude) * sin, Math.cos(latitude), Math.sin(longitude) * sin);
        let best = -1, next = -1, panel = 0;
        directions.forEach((direction, index) => {
          const score = point.dot(direction);
          if (score > best) { next = best; best = score; panel = index; }
          else next = Math.max(next, score);
        });
        const seam = best - next < 0.007;
        const color = seam ? [119, 130, 128] : panel < darkPanels ? [29, 38, 50] : [245, 246, 231];
        image.data.set([...color, 255], (y * width + x) * 4);
      }
    }
    ctx.putImageData(image, 0, 0);
  });
  paintedBall = map.image;
  return map;
}

export function createScene(canvas, { width, depth, pieces }) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  const scene = new Scene();
  const resources = new Set();
  const use = (resource) => {
    resources.add(resource);
    return resource;
  };
  const camera = new OrthographicCamera(-1, 1, 1, -1, 1, 2500);
  scene.add(new HemisphereLight('#ebf6ff', '#52714d', 1.76));
  const sun = new DirectionalLight('#fff2da', 2.4);
  sun.position.set(-235, 360, -130);
  scene.add(sun);

  const lit = (color) => use(new MeshLambertMaterial({ color }));
  const box = (w, h, d, material, y) => {
    const mesh = new Mesh(use(new RoundedBoxGeometry(w, h, d, 2, 2)), material);
    mesh.position.y = y;
    scene.add(mesh);
  };
  box(width + 7, 9, depth + 7, lit('#19283a'), -8.5);
  box(width + 3, 5, depth + 3, lit('#2a553e'), -2.5);

  const makePlane = (w, d, material, y) => {
    const plane = new Mesh(use(new PlaneGeometry(w, d)), material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = y;
    return plane;
  };
  scene.add(makePlane(width, depth, use(new MeshBasicMaterial({ map: use(turf()) })), 0.08));

  const goalMetal = lit('#baccc6');
  const post = use(new CylinderGeometry(1.12, 1.12, 1, 6));
  const netMaterial = use(new LineBasicMaterial({ color: '#b8d9c7', opacity: 0.43, transparent: true }));
  const addBar = (start, end) => {
    const a = new Vector3(...start);
    const b = new Vector3(...end);
    const delta = b.clone().sub(a);
    const mesh = new Mesh(post, goalMetal);
    mesh.position.copy(a).lerp(b, 0.5);
    mesh.scale.y = delta.length();
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize());
    scene.add(mesh);
  };
  for (const side of [-1, 1]) {
    const front = (width / 2 - 7) * side;
    const back = front + 18 * side;
    const edge = depth * 0.09;
    const goalHeight = 19;
    for (const z of [-edge, edge]) {
      addBar([front, 0, z], [front, goalHeight, z]);
      addBar([front, goalHeight, z], [back, 0, z]);
    }
    addBar([front, goalHeight, -edge], [front, goalHeight, edge]);
    addBar([back, 0, -edge], [back, 0, edge]);
    const weave = [];
    for (let i = 1; i < 11; i++) {
      const z = edge * (i / 5.5 - 1);
      weave.push(front, goalHeight, z, back, 0, z);
    }
    for (let i = 1; i < 5; i++) {
      const x = front + (back - front) * i / 5;
      const y = goalHeight * (1 - i / 5);
      weave.push(x, y, -edge, x, y, edge);
    }
    for (const z of [-edge, edge]) {
      for (let i = 1; i < 5; i++) {
        const t = i / 5;
        const x = front + (back - front) * t;
        const y = goalHeight * (1 - t);
        weave.push(x, 0, z, x, y, z, front, y, z, x, y, z);
      }
    }
    const net = use(new BufferGeometry());
    net.setAttribute('position', new Float32BufferAttribute(weave, 3));
    scene.add(new LineSegments(net, netMaterial));
  }

  const contact = use(new MeshBasicMaterial({ transparent: true, depthWrite: false, map: use(shadowMap()) }));
  const shadow = use(new PlaneGeometry(1, 1));
  shadow.rotateX(-Math.PI / 2);
  const footballRadius = 6.65;
  const hasBall = pieces.some(piece => piece.kind === 'ball');
  const ballGeometry = hasBall ? use(new SphereGeometry(footballRadius, 24, 18)) : null;
  const ballMaterial = hasBall ? use(new MeshLambertMaterial({ map: use(footballMap()) })) : null;
  const teams = Object.fromEntries(['blue', 'red'].map(team => [team,
    createAthletes(scene, use, team, pieces.filter(piece => piece.kind === team).length),
  ]));
  const axis = new Vector3();

  function addPiece(kind, animatedOpacity) {
    const ball = kind === 'ball';
    const shade = new Mesh(shadow, contact);
    shade.scale.set(ball ? 20 : 23, 1, ball ? 17 : 22);
    scene.add(shade);
    const moveAthlete = ball ? null : teams[kind].add();
    const surface = ball && animatedOpacity ? use(ballMaterial.clone()) : ballMaterial;
    if (ball && animatedOpacity) surface.transparent = true;
    const football = ball ? new Mesh(ballGeometry, surface) : null;
    if (football) scene.add(football);
    let lastX, lastZ;
    return (x, z, opacity, elapsed, still, lift = 0, heading, strike) => {
      x -= width / 2;
      z -= depth / 2;
      shade.visible = opacity > 0.12;
      shade.position.set(x + 2.5, 0.32, z + 2.4);
      if (!football) {
        moveAthlete(x, z, opacity, elapsed, still, heading, strike);
        return;
      }
      const dx = lastX === undefined ? 0 : x - lastX;
      const dz = lastZ === undefined ? 0 : z - lastZ;
      const travelled = Math.hypot(dx, dz);
      if (!still && travelled > 0.005 && travelled < 34) {
        axis.set(dz, 0, -dx).normalize();
        football.rotateOnWorldAxis(axis, travelled / footballRadius * (lift > 1 ? 0.25 : 1));
      }
      lastX = x;
      lastZ = z;
      football.visible = opacity > 0.01;
      football.position.set(x, footballRadius + 0.24 + lift, z);
      if (animatedOpacity) surface.opacity = opacity;
    };
  }

  const projected = new Vector3();
  function configureView(w, h, { yaw, pitch, zoom }) {
    const sine = Math.sin(pitch);
    const cosine = Math.cos(pitch);
    const fieldWidth = width + 55;
    const fieldDepth = depth + 29;
    const fitWidth = Math.abs(Math.cos(yaw)) * fieldWidth + Math.abs(Math.sin(yaw)) * fieldDepth;
    const fitHeight = sine * (Math.abs(Math.sin(yaw)) * fieldWidth + Math.abs(Math.cos(yaw)) * fieldDepth) + cosine * 65;
    const unit = Math.max(fitWidth / w, fitHeight / h) / zoom;
    camera.left = -w * unit / 2;
    camera.right = w * unit / 2;
    camera.top = h * unit / 2;
    camera.bottom = -h * unit / 2;
    camera.position.set(Math.sin(yaw) * cosine * 1000, sine * 1000 + 9, Math.cos(yaw) * cosine * 1000);
    camera.lookAt(0, 9, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const project = (x, z) => {
      projected.set(x - width / 2, 0, z - depth / 2).project(camera);
      return [(projected.x + 1) * w / 2, (1 - projected.y) * h / 2];
    };
    const [ox, oy] = project(0, 0);
    const [rx, ry] = project(width, 0);
    const [dx, dy] = project(0, depth);
    const a = (rx - ox) / width, b = (ry - oy) / width;
    const c = (dx - ox) / depth, d = (dy - oy) / depth;
    const inverse = 1 / (unit * (a * d - b * c));
    return {
      plane: `matrix(${a},${b},${c},${d},${ox},${oy})`,
      lettering: `matrix(${d * inverse},${-b * inverse},${-c * inverse},${a * inverse},0,0)`,
      scale: 1 / unit,
      labelLift: 27 * cosine,
    };
  }

  return {
    addPiece,
    configureView,
    resize(w, h) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(w, h, false);
    },
    draw() {
      Object.values(teams).forEach(team => team?.upload());
      renderer.render(scene, camera);
    },
    dispose() {
      resources.forEach(resource => resource.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
