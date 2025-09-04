// Variável global para controlar gesto de rotação
window.isRotating = false;

import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Cria botão único centralizado para iniciar AR
const startBtn = document.createElement("button");
startBtn.id = "startBtn";
startBtn.textContent = "Start AR";
startBtn.style.position = "fixed";
startBtn.style.top = "50%";
startBtn.style.left = "50%";
startBtn.style.transform = "translate(-50%, -50%)";
startBtn.style.padding = "20px 40px";
startBtn.style.fontSize = "24px";
startBtn.style.background = "#007bff";
startBtn.style.color = "white";
startBtn.style.border = "none";
startBtn.style.borderRadius = "8px";
startBtn.style.cursor = "pointer";
startBtn.style.zIndex = "1000";
document.body.appendChild(startBtn);

let camera, scene, renderer;
let controller;
let model = null;
let modelLoading = false; // Flag para evitar duplicação

startBtn.addEventListener("click", () => {
  startBtn.style.display = "none";
  init();
  animate();
});

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  );

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  controller = renderer.xr.getController(0);
  controller.addEventListener("select", onSelect);
  scene.add(controller);

  window.addEventListener("resize", onWindowResize);

  renderer.domElement.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      renderer.domElement.lastTouch = e.touches[0];
    }
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onSelect() {
  if (window.isRotating) return;

  // Ponto de toque central por padrão
  let touchX = window.innerWidth / 2;
  let touchY = window.innerHeight / 2;
  if (renderer.xr.isPresenting && renderer.domElement.lastTouch) {
    touchX = renderer.domElement.lastTouch.clientX;
    touchY = renderer.domElement.lastTouch.clientY;
  }

  // Coordenadas normalizadas
  const x = (touchX / window.innerWidth) * 2 - 1;
  const y = -(touchY / window.innerHeight) * 2 + 1;

  // Raycast
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera({ x, y }, camera);

  const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersect = new THREE.Vector3();
  raycaster.ray.intersectPlane(planeY, intersect);

  const modeloEscala = 0.02;

  if (!model && !modelLoading) {
    modelLoading = true;
    const loader = new GLTFLoader();
    loader.load(
      "/elefante.glb",
      (gltf) => {
        model = gltf.scene;
        model.scale.set(modeloEscala, modeloEscala, modeloEscala);
        model.position.copy(intersect);
        scene.add(model);
        enableScaleAndRotation(model);
        modelLoading = false;
      },
      undefined,
      (err) => {
        console.error("Erro ao carregar modelo:", err);
        modelLoading = false;
      }
    );
  } else if (model) {
    // Move o modelo existente sem alterar escala
    model.position.copy(intersect);
  }
}

function enableScaleAndRotation(obj) {
  let rotating = false;
  let lastAngle = 0;
  let lastDistance = 0;

  renderer.domElement.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      lastAngle = getAngle(e.touches[0], e.touches[1]);
      lastDistance = getDistance(e.touches[0], e.touches[1]);
      rotating = true;
      window.isRotating = true;
    }
  });

  renderer.domElement.addEventListener("touchmove", (e) => {
    if (rotating && e.touches.length === 2) {
      const newAngle = getAngle(e.touches[0], e.touches[1]);
      const angleDiff = newAngle - lastAngle;
      obj.rotation.y += (angleDiff * Math.PI) / 180;
      lastAngle = newAngle;

      const newDistance = getDistance(e.touches[0], e.touches[1]);
      let scaleChange = newDistance / lastDistance;
      obj.scale.multiplyScalar(scaleChange);

      // Limita a escala
      obj.scale.clamp(
        new THREE.Vector3(0.01, 0.01, 0.01),
        new THREE.Vector3(2, 2, 2)
      );

      lastDistance = newDistance;
    }
  });

  renderer.domElement.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
      rotating = false;
      window.isRotating = false;
    }
  });
}

// Helpers para gestos
function getAngle(t1, t2) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function getDistance(t1, t2) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  renderer.render(scene, camera);
}
