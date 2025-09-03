// Instruções na tela
const instructions = document.createElement('div');
instructions.textContent = 'Toque para posicionar. Arraste para mover. Pinça para escalar. Dois dedos para girar.';
instructions.style.position = 'fixed';
instructions.style.top = '10px';
instructions.style.left = '50%';
instructions.style.transform = 'translateX(-50%)';
instructions.style.background = 'rgba(0,0,0,0.7)';
instructions.style.color = '#fff';
instructions.style.padding = '10px 20px';
instructions.style.borderRadius = '12px';
instructions.style.fontSize = '16px';
instructions.style.zIndex = '1001';
instructions.style.pointerEvents = 'none';
document.body.appendChild(instructions);
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
let reticle, model;
let hitTestSource = null;
let hitTestSourceRequested = false;

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
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // ARButton disparado após tocar
  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  );

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // Não cria retículo visual
  reticle = null;

  // Controller
  controller = renderer.xr.getController(0);
  controller.addEventListener("select", onSelect);
  scene.add(controller);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onSelect() {
  // Adiciona ou reposiciona o modelo exatamente onde o usuário clicar
  // Obtém coordenadas de toque
  let touchX = window.innerWidth / 2;
  let touchY = window.innerHeight / 2;
  if (renderer.xr.isPresenting && renderer.domElement.lastTouch) {
    touchX = renderer.domElement.lastTouch.clientX;
    touchY = renderer.domElement.lastTouch.clientY;
  }
  // Converte para coordenadas normalizadas
  const x = (touchX / window.innerWidth) * 2 - 1;
  const y = -(touchY / window.innerHeight) * 2 + 1;
  // Raycast do ponto de toque
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera({ x, y }, camera);
  // Interseção com plano Y=0 (chão)
  const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersect = new THREE.Vector3();
  raycaster.ray.intersectPlane(planeY, intersect);
  if (!model) {
    const loader = new GLTFLoader();
    loader.load("/elefante.glb", (gltf) => {
      model = gltf.scene;
      model.scale.set(0.1, 0.1, 0.1);
      model.position.copy(intersect);
      scene.add(model);
      enableGestures(model);
    });
  } else {
    model.position.copy(intersect);
  }
  // Captura último toque para raycast
  renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      renderer.domElement.lastTouch = e.touches[0];
    }
  });
// Adiciona controles de toque para arrastar, rotacionar e escalar
function enableGestures(obj) {
  let isDragging = false;
  let lastX = 0, lastY = 0;
  let lastDist = 0;
  let lastRotation = 0;

  renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      lastDist = getDistance(e.touches[0], e.touches[1]);
      lastRotation = getAngle(e.touches[0], e.touches[1]);
    }
  });

  renderer.domElement.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastX;
      const dy = e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      // Sensibilidade melhorada para arrastar
      obj.position.x += dx * 0.003;
      obj.position.z -= dy * 0.003;
    } else if (e.touches.length === 2) {
      // Escala com limite mínimo/máximo
      const newDist = getDistance(e.touches[0], e.touches[1]);
      let scaleChange = newDist / lastDist;
      let newScale = obj.scale.x * scaleChange;
      newScale = Math.max(0.05, Math.min(newScale, 2));
      obj.scale.set(newScale, newScale, newScale);
      lastDist = newDist;
      // Rotação mais suave
      const newRotation = getAngle(e.touches[0], e.touches[1]);
      const rotChange = newRotation - lastRotation;
      obj.rotation.y += rotChange * Math.PI / 360;
      lastRotation = newRotation;
    }
  });

  renderer.domElement.addEventListener('touchend', (e) => {
    isDragging = false;
  });
}

function getDistance(t1, t2) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getAngle(t1, t2) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.atan2(dy, dx) * 180 / Math.PI;
}
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  renderer.render(scene, camera);
}
