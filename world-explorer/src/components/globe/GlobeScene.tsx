// The 3D globe scene proper — sphere + world-atlas texture, raised border
// lines, atmosphere rim, starfield, drag/inertia/auto-rotate, tap picking.
// All game state lives OUTSIDE (zustand via Atlas); this layer only renders
// and reports picks. three.js stays fenced inside src/components/globe/.
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, invalidate } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { borderSegmentPositions } from "./borders";
import { createGlobeCanvas, repaintGlobeTexture } from "./texture";
import { pickCountryAt, type CountryPick } from "./pick";
import { vec3ToLonLat, lonLatToVec3, focusAnglesFor } from "../../lib/globe-math";
import { centroidOf } from "../../game/geo";

export interface GlobeFocus {
  lon: number;
  lat: number;
  key: string; // change of key triggers a new focus ease
}

const GLOBE_R = 1;
const BORDER_R = 1.0015;
const MARKER_R = 1.012;
const PITCH_MAX = 1.15; // rad
const AUTO_SPEED = 0.055; // rad/s idle spin
const IDLE_MS = 2600;
const TAP_SLOP_PX = 8;
const TAP_MAX_MS = 700;

function clampPitch(p: number): number {
  return Math.max(-PITCH_MAX, Math.min(PITCH_MAX, p));
}

/** Shortest-path wrap: retarget `target` within ±π of `current`. */
function nearestAngle(current: number, target: number): number {
  let t = target;
  while (t - current > Math.PI) t -= Math.PI * 2;
  while (t - current < -Math.PI) t += Math.PI * 2;
  return t;
}

export function GlobeScene({
  visited,
  selectedIso3,
  focus,
  reduced,
  onPick,
}: {
  visited: Set<string>;
  selectedIso3: string | null;
  focus: GlobeFocus | null;
  reduced: boolean;
  onPick: (pick: CountryPick | null) => void;
}) {
  const { gl, camera } = useThree();

  const pitchGroup = useRef<THREE.Group>(null);
  const yawGroup = useRef<THREE.Group>(null);
  const sphere = useRef<THREE.Mesh>(null);
  const markerPulse = useRef<THREE.Mesh>(null);

  // ── Texture (painted 2D canvas → CanvasTexture) ───────────────────────────
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(createGlobeCanvas());
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  useEffect(() => {
    repaintGlobeTexture(texture, { visited, selectedIso3 });
    invalidate(); // repaint promptly under demand frameloop
  }, [texture, visited, selectedIso3]);
  useEffect(() => () => texture.dispose(), [texture]);

  // ── Border lines (real lon/lat → sphere-surface geometry) ─────────────────
  const borderGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(borderSegmentPositions(BORDER_R), 3));
    return g;
  }, []);
  useEffect(() => () => borderGeometry.dispose(), [borderGeometry]);

  // ── Atmosphere rim (fresnel-ish backside shell) ────────────────────────────
  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float i = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
            gl_FragColor = vec4(0.38, 0.62, 0.78, 1.0) * i;
          }`,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => atmosphereMaterial.dispose(), [atmosphereMaterial]);

  // ── Rotation rig state ─────────────────────────────────────────────────────
  const initialAngles = focus ? focusAnglesFor(focus.lon, focus.lat) : focusAnglesFor(-85, 12);
  const rot = useRef({
    yaw: initialAngles.yaw,
    pitch: clampPitch(initialAngles.pitch),
    vyaw: 0,
    vpitch: 0,
  });
  const focusTarget = useRef<{ yaw: number; pitch: number } | null>(null);
  const lastInteract = useRef(0);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    t: number;
    moved: boolean;
  } | null>(null);

  // Focus ease on key change (instant under reduced motion).
  useEffect(() => {
    if (!focus) return;
    const a = focusAnglesFor(focus.lon, focus.lat);
    const target = { yaw: nearestAngle(rot.current.yaw, a.yaw), pitch: clampPitch(a.pitch) };
    if (reduced) {
      rot.current.yaw = target.yaw;
      rot.current.pitch = target.pitch;
      rot.current.vyaw = 0;
      rot.current.vpitch = 0;
      focusTarget.current = null;
      invalidate();
    } else {
      focusTarget.current = target;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key, reduced]);

  // ── Pointer drag / tap on the canvas element ───────────────────────────────
  useEffect(() => {
    const el = gl.domElement;
    let lastMoveT = 0;

    const onDown = (e: PointerEvent) => {
      if (drag.current) return;
      drag.current = {
        id: e.pointerId,
        x: e.offsetX,
        y: e.offsetY,
        startX: e.offsetX,
        startY: e.offsetY,
        t: performance.now(),
        moved: false,
      };
      lastMoveT = performance.now();
      lastInteract.current = performance.now();
      focusTarget.current = null; // player takes the wheel
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* capture unsupported — drag still tracks within the canvas */
      }
    };

    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.id) return;
      const rect = el.getBoundingClientRect();
      const k = Math.PI / Math.max(200, rect.width); // full width ≈ half turn
      const dx = e.offsetX - d.x;
      const dy = e.offsetY - d.y;
      d.x = e.offsetX;
      d.y = e.offsetY;
      if (Math.hypot(e.offsetX - d.startX, e.offsetY - d.startY) > TAP_SLOP_PX) d.moved = true;
      rot.current.yaw += dx * k;
      rot.current.pitch = clampPitch(rot.current.pitch + dy * k);
      const now = performance.now();
      const dt = Math.max(8, now - lastMoveT) / 1000;
      lastMoveT = now;
      if (!reduced) {
        // low-pass the release velocity for inertia
        rot.current.vyaw = 0.75 * rot.current.vyaw + 0.25 * ((dx * k) / dt);
        rot.current.vpitch = 0.75 * rot.current.vpitch + 0.25 * ((dy * k) / dt);
      }
      lastInteract.current = now;
      invalidate();
    };

    const endDrag = (e: PointerEvent, allowTap: boolean) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.id) return;
      drag.current = null;
      lastInteract.current = performance.now();
      if (reduced) {
        rot.current.vyaw = 0;
        rot.current.vpitch = 0;
      }
      if (
        allowTap &&
        !d.moved &&
        performance.now() - d.t < TAP_MAX_MS &&
        sphere.current
      ) {
        const rect = el.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          (e.offsetX / rect.width) * 2 - 1,
          -(e.offsetY / rect.height) * 2 + 1,
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObject(sphere.current, false);
        if (hits.length) {
          const local = sphere.current.worldToLocal(hits[0].point.clone());
          const lonLat = vec3ToLonLat([local.x, local.y, local.z]);
          onPick(pickCountryAt(lonLat));
        } else {
          onPick(null);
        }
      }
      invalidate();
    };

    const onUp = (e: PointerEvent) => endDrag(e, true);
    const onCancel = (e: PointerEvent) => endDrag(e, false);

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
    };
  }, [gl, camera, reduced, onPick]);

  // ── Frame loop: inertia, auto-rotate, focus ease, marker pulse ─────────────
  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const r = rot.current;

    if (!drag.current) {
      const ft = focusTarget.current;
      if (ft) {
        r.yaw = THREE.MathUtils.damp(r.yaw, ft.yaw, 4.2, d);
        r.pitch = THREE.MathUtils.damp(r.pitch, ft.pitch, 4.2, d);
        if (Math.abs(r.yaw - ft.yaw) < 0.004 && Math.abs(r.pitch - ft.pitch) < 0.004) {
          focusTarget.current = null;
        }
      } else if (!reduced) {
        r.yaw += r.vyaw * d;
        r.pitch = clampPitch(r.pitch + r.vpitch * d);
        const decay = Math.exp(-2.6 * d);
        r.vyaw *= decay;
        r.vpitch *= decay;
        if (performance.now() - lastInteract.current > IDLE_MS) {
          r.yaw += AUTO_SPEED * d; // gentle idle spin
        }
      }
    }

    if (yawGroup.current) yawGroup.current.rotation.y = r.yaw;
    if (pitchGroup.current) pitchGroup.current.rotation.x = r.pitch;

    if (markerPulse.current) {
      const s = reduced ? 1 : 1 + 0.16 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2.6));
      markerPulse.current.scale.setScalar(s);
    }
  });

  // ── Selected-country marker (soft pulse on the current target) ────────────
  const marker = useMemo(() => {
    if (!selectedIso3) return null;
    const [lon, lat] = centroidOf(selectedIso3);
    // centroidOf returns [0,0] for iso3s outside the featured set — no marker.
    if (lon === 0 && lat === 0) return null;
    const p = lonLatToVec3([lon, lat], MARKER_R);
    const pos = new THREE.Vector3(p[0], p[1], p[2]);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      pos.clone().normalize(),
    );
    return { pos, quat };
  }, [selectedIso3]);

  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight position={[3, 2, 4]} intensity={1.1} />
      <Stars radius={40} depth={25} count={1100} factor={2.6} saturation={0} fade speed={reduced ? 0 : 0.5} />

      <group ref={pitchGroup}>
        <group ref={yawGroup}>
          <mesh ref={sphere}>
            <sphereGeometry args={[GLOBE_R, 96, 64]} />
            <meshPhongMaterial map={texture} specular="#1d2f40" shininess={16} />
          </mesh>

          <lineSegments geometry={borderGeometry}>
            <lineBasicMaterial color="#a9bac6" transparent opacity={0.32} />
          </lineSegments>

          {marker && (
            <group position={marker.pos} quaternion={marker.quat}>
              <mesh>
                <circleGeometry args={[0.008, 24]} />
                <meshBasicMaterial color="#e7c876" />
              </mesh>
              <mesh ref={markerPulse}>
                <ringGeometry args={[0.02, 0.027, 48]} />
                <meshBasicMaterial color="#d4a843" transparent opacity={0.9} side={THREE.DoubleSide} />
              </mesh>
            </group>
          )}
        </group>
      </group>

      <mesh scale={1.12}>
        <sphereGeometry args={[GLOBE_R, 48, 32]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>
    </>
  );
}
