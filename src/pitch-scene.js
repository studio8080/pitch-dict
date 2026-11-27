import {
  CanvasTexture, CircleGeometry, CylinderGeometry, DirectionalLight,
  Float32BufferAttribute, BufferGeometry, Group, HemisphereLight, LineBasicMaterial,
  LineSegments, Mesh, MeshBasicMaterial, MeshLambertMaterial, OrthographicCamera,
  PlaneGeometry, Scene, SphereGeometry, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const elevation = 0.76; // Sine of the camera angle, also used by the SVG overlay.
export const rise = Math.sqrt(1 - elevation ** 2);

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
    ctx.fillStyle = '#2e7951';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#276849';
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

function footballMap() {
  return texture(128, 64, (ctx, width, height) => {
    ctx.fillStyle = '#f7f8ed';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#14253a';
    for (const [cx, cy] of [[0, 24], [32, 36], [64, 24], [96, 36], [128, 24], [18, 11], [79, 51]]) {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5 - 0.25) * Math.PI * 2;
        ctx.lineTo(cx + 9 * Math.cos(angle), cy + 7 * Math.sin(angle));
      }
      ctx.closePath();
      ctx.fill();
    }
  });
}

export function createScene(canvas, { width, depth, frameWidth, frameHeight }) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  const scene = new Scene();
  const resources = new Set();
  const use = (resource) => {
    resources.add(resource);
    return resource;
  };
  const camera = new OrthographicCamera(-frameWidth / 2, frameWidth / 2, frameHeight / 2, -frameHeight / 2, 1, 2500);
  camera.position.set(0, elevation * 1000, rise * 1000);
  camera.lookAt(0, 0, 0);
  scene.add(new HemisphereLight('#f9ffef', '#496985', 2.0));
  const sun = new DirectionalLight('#fff3d1', 2.15);
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

  const rim = lit('#eef1d4');
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
    const net = use(new BufferGeometry());
    net.setAttribute('position', new Float32BufferAttribute(weave, 3));
    scene.add(new LineSegments(net, netMaterial));
  }

  const contact = use(new MeshBasicMaterial({ transparent: true, depthWrite: false, map: use(shadowMap()) }));
  const shadow = use(new PlaneGeometry(1, 1));
  shadow.rotateX(-Math.PI / 2);
  const base = use(new CylinderGeometry(11, 12.6, 3, 22));
  const chip = use(new CylinderGeometry(10.2, 11.4, 8, 22));
  const inlay = use(new CircleGeometry(8, 22));
  inlay.rotateX(-Math.PI / 2);
  const blue = lit('#1478dc');
  const blueTop = lit('#2588e3');
  const red = lit('#dc4546');
  const redTop = lit('#eb5a4d');
  const ballGeometry = use(new SphereGeometry(7.3, 16, 12));
  const ballMaterial = use(new MeshLambertMaterial({ map: use(footballMap()) }));

  function addPiece(kind, animatedOpacity) {
    const piece = new Group();
    const fading = [];
    function add(geometry, material, y) {
      const surface = animatedOpacity ? use(material.clone()) : material;
      if (animatedOpacity) {
        surface.transparent = true;
        surface.depthWrite = false;
        fading.push(surface);
      }
      const mesh = new Mesh(geometry, surface);
      mesh.position.y = y;
      piece.add(mesh);
      return mesh;
    }
    const ball = kind === 'ball';
    const shade = add(shadow, contact, 0.3);
    shade.position.set(2.5, 0.3, 3);
    shade.scale.set(ball ? 25 : 37, 1, ball ? 21 : 32);
    if (ball) {
      add(ballGeometry, ballMaterial, 8);
    } else {
      add(base, rim, 1.6);
      add(chip, kind === 'blue' ? blue : red, 6.8);
      add(inlay, kind === 'blue' ? blueTop : redTop, 10.9);
    }
    scene.add(piece);
    return (x, z, opacity) => {
      piece.visible = opacity > 0.01;
      piece.position.set(x - width / 2, 0, z - depth / 2);
      fading.forEach(material => { material.opacity = opacity; });
    };
  }

  return {
    addPiece,
    resize(w, h) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(w, h, false);
    },
    draw() {
      renderer.render(scene, camera);
    },
    dispose() {
      resources.forEach(resource => resource.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
