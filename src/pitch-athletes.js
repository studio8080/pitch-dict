import {
  Color, CylinderGeometry, DynamicDrawUsage, Float32BufferAttribute, InstancedMesh,
  MeshLambertMaterial, Object3D, SphereGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KITS = {
  blue: { shirt: '#287ddd', trim: '#91ddfc', shorts: '#ddedff', socks: '#397bd0' },
  red: { shirt: '#db4247', trim: '#ffe0c7', shorts: '#242c3e', socks: '#d92d3f' },
};

function tinted(geometry, color, x, y, z, sx = 1, sy = 1, sz = 1) {
  const part = geometry.index ? geometry.toNonIndexed() : geometry;
  if (part !== geometry) geometry.dispose();
  const tint = new Color(color);
  const colors = new Float32Array(part.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) tint.toArray(colors, i);
  part.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return part.scale(sx, sy, sz).translate(x, y, z);
}

function assemble(...parts) {
  const geometry = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  return geometry;
}

function model(kit) {
  const skin = '#c8825a';
  const ball = (tint, x, y, z, sx, sy, sz) => tinted(new SphereGeometry(1, 9, 6), tint, x, y, z, sx, sy, sz);
  const cylinder = (top, bottom, length, tint, x, y, z, sz = 1) =>
    tinted(new CylinderGeometry(top, bottom, length, 9), tint, x, y, z, 1, 1, sz);
  return {
    body: assemble(
      cylinder(4.1, 2.9, 7.8, kit.shirt, 0, 4, 0, 0.68),
      cylinder(3.1, 3.35, 2.2, kit.shorts, 0, 0, 0, 0.69),
      cylinder(1.45, 1.73, 1.6, kit.trim, 0, 8, 0, 0.83),
      ball(skin, 0, 10.9, 0.3, 2.15, 2.7, 2),
      ball('#271f23', 0, 12.05, 0.13, 2.14, 1.5, 2.04),
      ball(skin, 0, 10.65, 2.02, 0.56, 0.53, 0.48),
      ball(kit.trim, 1.78, 5.76, 2.12, 0.61, 0.73, 0.17),
    ),
    arm: assemble(
      ball(kit.shirt, 0, -0.45, 0, 1.58, 2.12, 1.63),
      cylinder(1.3, 1.2, 1.1, kit.trim, 0, -2.05, 0),
      cylinder(1.13, 0.82, 3.9, skin, 0, -4.05, 0.19),
      ball(skin, 0, -6.05, 0.68, 0.86, 1.22, 0.86),
    ),
    leg: assemble(
      cylinder(1.96, 1.61, 4.4, kit.shorts, 0, -1.75, 0),
      cylinder(1.55, 1.23, 2.2, skin, 0, -4.68, 0),
    ),
    shin: assemble(
      cylinder(1.22, 0.85, 5.2, kit.socks, 0, -2.42, 0),
      cylinder(1.26, 1.17, 0.48, kit.trim, 0, -0.59, 0),
      ball('#151d2b', 0, -4.94, 0.78, 1.21, 0.89, 2.19),
      ball('#eff8f6', 0, -5.38, 0.86, 1.13, 0.38, 2.02),
    ),
  };
}

function joint(parent, x, y, z = 0) {
  const node = new Object3D();
  node.position.set(x, y, z);
  parent.add(node);
  return node;
}

export function createAthletes(scene, use, team, count) {
  if (!count) return null;
  const geometry = model(KITS[team]);
  const material = use(new MeshLambertMaterial({ vertexColors: true }));
  const meshes = {};
  for (const part of Object.keys(geometry)) {
    const mesh = meshes[part] = use(new InstancedMesh(use(geometry[part]), material, count * (part === 'body' ? 1 : 2)));
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    scene.add(mesh);
  }
  let next = 0;
  let dirty = false;

  return {
    add() {
      const index = next++;
      const root = new Object3D();
      const hips = joint(root, 0, 12.35);
      const upper = joint(hips, 0, 0);
      const arms = [-1, 1].map(side => joint(upper, side * 3.98, 6.52));
      const knees = [-1, 1].map(side => joint(hips, side * 1.75, -0.45));
      const shins = knees.map(knee => joint(knee, 0, -5.75));
      let lastX, lastZ, phase = index * 0.71;
      let heading = team === 'blue' ? Math.PI * 0.48 : -Math.PI * 0.48;

      return (x, z, opacity, elapsed, still) => {
        const dx = lastX === undefined ? 0 : x - lastX;
        const dz = lastZ === undefined ? 0 : z - lastZ;
        lastX = x;
        lastZ = z;
        const travel = Math.hypot(dx, dz);
        const moving = !still && travel > 0.07 && travel < 30;
        const effort = moving ? Math.min(1, travel * 26 / Math.max(16, elapsed)) : 0;
        if (moving) {
          const facing = Math.atan2(dx, dz);
          const turn = Math.atan2(Math.sin(facing - heading), Math.cos(facing - heading));
          heading += turn * 0.42;
          phase += travel * 0.34;
        }
        const gait = Math.sin(phase) * 0.93 * effort;
        root.position.set(x, 0, z);
        root.rotation.y = heading;
        root.scale.setScalar(opacity > 0.015 ? 0.9 + opacity * 0.19 : 0);
        hips.position.y = 12.35 + Math.abs(gait) * 1.06;
        upper.rotation.x = 0.07 + effort * 0.19;
        upper.rotation.z = Math.sin(phase) * 0.08 * effort;
        for (let i = 0; i < 2; i++) {
          const swing = i === 0 ? gait : -gait;
          knees[i].rotation.x = 0.06 + swing;
          shins[i].rotation.x = 0.11 + Math.max(0, -swing) * 1.13;
          arms[i].rotation.x = -0.22 - swing * 0.94;
          arms[i].rotation.z = i === 0 ? -0.11 : 0.11;
        }
        root.updateMatrixWorld(true);
        meshes.body.setMatrixAt(index, upper.matrixWorld);
        for (let i = 0; i < 2; i++) {
          const slot = index * 2 + i;
          meshes.arm.setMatrixAt(slot, arms[i].matrixWorld);
          meshes.leg.setMatrixAt(slot, knees[i].matrixWorld);
          meshes.shin.setMatrixAt(slot, shins[i].matrixWorld);
        }
        dirty = true;
      };
    },
    upload() {
      if (!dirty) return;
      Object.values(meshes).forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
      dirty = false;
    },
  };
}
